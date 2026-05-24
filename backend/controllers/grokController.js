const fetch = global.fetch || require('node-fetch');
const https = require('https');
let HttpsProxyAgent;
try { HttpsProxyAgent = require('https-proxy-agent'); } catch (e) { HttpsProxyAgent = null; }

exports.chat = async (req, res) => {
  try {
    const { message, pet } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });

    // Support both GROQ_* and older GROK_* env var names for compatibility
    const GROK_URL = process.env.GROQ_API_URL || process.env.GROK_API_URL;
    const GROK_KEY = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
    const GROK_MODEL = process.env.GROQ_MODEL || process.env.GROK_MODEL || process.env.XAI_MODEL || 'grok-1';

    // Gemini (Google) support: prefer GEMINI_* env vars if present
    let GEMINI_URL = process.env.GEMINI_API_URL;
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.GEMINI_MODEL_NAME;

    // If model is provided but full URL not, construct a sensible default
    if (!GEMINI_URL && GEMINI_MODEL && GEMINI_KEY) {
      GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateText`;
    }

    // If Gemini credentials are present, try Gemini first for chat and fall back to Groq on quota/errors
    if (GEMINI_URL && GEMINI_KEY) {
      const promptText = `Pet context: ${pet ? JSON.stringify(pet) : '{}'}\nUser: ${message}`;
      const payload = {
        prompt: { text: promptText },
        generationConfig: { maxOutputTokens: 1024 }
      };

      const isGoogleApiKey = typeof GEMINI_KEY === 'string' && GEMINI_KEY.startsWith('AIza');
      let urlToCall = GEMINI_URL;
      if (isGoogleApiKey) {
        urlToCall = `${urlToCall}${urlToCall.includes('?') ? '&' : '?'}key=${encodeURIComponent(GEMINI_KEY)}`;
      }

      const headers = { 'Content-Type': 'application/json' };
      if (!isGoogleApiKey) headers['Authorization'] = `Bearer ${GEMINI_KEY}`;

      let bodyToSend = JSON.stringify(payload);
      if (urlToCall.includes(':generateContent')) {
        bodyToSend = JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] });
      } else if (urlToCall.includes(':generateText')) {
        bodyToSend = JSON.stringify(payload);
      }

      let resp;
      try {
        resp = await fetch(urlToCall, { method: 'POST', headers, body: bodyToSend });
      } catch (e) {
        console.warn('gemini chat fetch failed, will try Groq fallback if available:', e && e.message ? e.message : e);
        resp = null;
      }

      const json = resp ? await resp.json().catch(() => null) : null;
      console.debug('[grokController] provider json (chat):', JSON.stringify(json));

      if (resp && resp.ok) {
        const fullCandidateText = json?.candidates?.[0]?.content?.parts ? json.candidates[0].content.parts.map(p => p.text || '').join('') : null;
        const reply =
          fullCandidateText ||
          json?.choices?.[0]?.message?.content ||
          json?.choices?.[0]?.text ||
          json?.reply ||
          json?.text ||
          "No response";
        return res.json({ reply });
      }

      // If Gemini returned an error or was unavailable, detect quota-like errors and/or fall back to Groq
      let errMsg = resp ? (json && (json.error?.message || JSON.stringify(json))) || `HTTP ${resp.status}` : 'no-response';
      const isQuota = resp && (resp.status === 429 || /quota|exceed|exceeded|limit|rate limit|RESOURCE_EXHAUSTED/i.test(errMsg));
      if (!isQuota && resp && !resp.ok) {
        if (errMsg && errMsg.includes('Requested entity was not found')) {
          errMsg = `${errMsg} — the model or endpoint was not found. Check GEMINI_MODEL and GEMINI_API_URL in your backend .env, and ensure the Generative Language API is enabled for the project that owns your key.`;
        }
      }

      if (isQuota || !resp || !resp.ok) {
        console.warn('Gemini unavailable or quota exceeded for chat; attempting Groq fallback. Error:', errMsg);
        if (!GROK_URL || !GROK_KEY) {
          console.error('No Groq provider configured for fallback (GROQ_API_URL/GROQ_API_KEY missing)');
          return res.status(502).json({ error: errMsg });
        }

        // Call Groq as a fallback for chat
        try {
          const groqPayload = { model: GROK_MODEL, messages: [{ role: 'user', content: promptText }], max_tokens: 1500 };
          const groqResp = await fetch(GROK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROK_KEY}` },
            body: JSON.stringify(groqPayload)
          });
          const groqJson = await groqResp.json().catch(() => null);
          if (!groqResp.ok) {
            const gErr = groqJson?.error?.message || JSON.stringify(groqJson) || `HTTP ${groqResp.status}`;
            console.error('Groq fallback error (chat):', gErr);
            return res.status(502).json({ error: gErr });
          }
          const fullCandidateText = groqJson?.candidates?.[0]?.content?.parts ? groqJson.candidates[0].content.parts.map(p => p.text || '').join('') : null;
          const reply =
            fullCandidateText ||
            groqJson?.choices?.[0]?.message?.content ||
            groqJson?.choices?.[0]?.text ||
            groqJson?.reply ||
            groqJson?.text ||
            (typeof groqJson === 'string' ? groqJson : JSON.stringify(groqJson)) ||
            "No response";
          return res.json({ reply });
        } catch (gErr) {
          console.error('Groq fallback fetch failed (chat):', gErr && gErr.message ? gErr.message : gErr);
          return res.status(502).json({ error: errMsg });
        }
      }
    }

    // Fallback: simple rule-based reply
    const petDesc = pet ? `${pet.name || ''} (${pet.breed || pet.animal || 'pet'})` : 'your pet';
    let reply = `Hi — I can help with care for ${petDesc}. For diet, portion according to weight and age; avoid allergens: ${pet && pet.allergies && pet.allergies.length ? pet.allergies.join(', ') : 'none specified'}. If you want a tailored plan, provide the pet's daily activity level and any medical conditions.`;
    return res.json({ reply });
  } catch (err) {
    console.error('groq chat error', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Chat failed' });
  }
};

// Run three targeted prompts to produce diet, breed info and tips
exports.analysis = async (req, res) => {
  try {
    const pet = req.body?.pet;
    if (!pet) return res.status(400).json({ error: 'pet data required' });

    // Prefer GROQ_* env vars (new name); fall back to GROK_* for older setups
    const GROK_URL = process.env.GROQ_API_URL || process.env.GROK_API_URL;
    const GROK_KEY = process.env.GROQ_API_KEY || process.env.GROK_API_KEY || req.get('x-grok-key');
    const GROK_MODEL = process.env.GROQ_MODEL || process.env.GROK_MODEL || process.env.XAI_MODEL || 'grok-1';

    let GEMINI_URL = process.env.GEMINI_API_URL;
    const GEMINI_KEY = process.env.GEMINI_API_KEY || req.get('x-gemini-key');
    const GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.GEMINI_MODEL_NAME;

    if (!GEMINI_URL && GEMINI_MODEL && GEMINI_KEY) {
      GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateText`;
    }

    if (!GROK_URL && !GEMINI_URL) {
      return res.status(500).json({ error: 'No provider configured on server (set GROQ_API_URL/GROQ_API_KEY or GEMINI_API_URL/GEMINI_API_KEY in env).' });
    }

    // helper to call configured provider (Grok or Gemini) with a specific prompt
    // options: { preferGrok: boolean }
    async function callGrok(prompt, options = {}) {
      const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
      let agent = undefined;
      if (proxy && HttpsProxyAgent) {
        agent = new HttpsProxyAgent(proxy);
      }

      // If Gemini is configured and caller didn't request Groq first, call it. On quota/rate-limit errors, fall back to Groq.
      if (!options.preferGrok && GEMINI_URL && GEMINI_KEY) {
        const payload = {
          prompt: { text: prompt },
          generationConfig: { maxOutputTokens: 2048 }
        };
        let resp;
        try {
          resp = await doFetch(GEMINI_URL, GEMINI_KEY, payload, agent);
        } catch (e) {
          // If network/fetch error, log and fall back to Groq
            console.warn('gemini fetch failed, falling back to Groq:', e && e.message ? e.message : e);
          resp = null;
        }

        if (resp) {
          let json;
          try {
            json = await resp.json();
          } catch (parseErr) {
            const text = await resp.text().catch(() => '<no body>');
            const msg = `invalid-json-response: ${text}`;
            console.error('provider invalid JSON (analysis/gemini):', msg);
            // treat as non-retriable; fall back to Grok
            json = null;
          }

          console.debug('[grokController] provider json (analysis/gemini):', JSON.stringify(json));

          if (!resp.ok) {
            let errMsg = json?.error?.message || JSON.stringify(json) || `HTTP ${resp.status}`;
            if (errMsg && errMsg.includes('Requested entity was not found')) {
              errMsg = `${errMsg} — the model or endpoint was not found. Check GEMINI_MODEL and GEMINI_API_URL in your backend .env, and ensure the Generative Language API is enabled for the project that owns your key.`;
            }

            // Detect quota/rate-limit conditions and fall back to Groq instead of throwing
            const isQuota = resp.status === 429 || /quota|exceed|exceeded|limit|rate limit|RESOURCE_EXHAUSTED/i.test(errMsg);
            if (isQuota) {
              console.warn('Gemini indicates quota/rate limit; falling back to Groq provider. Error:', errMsg);
              // continue to Groq branch below
            } else {
              console.error('provider error (analysis):', errMsg);
              throw new Error(errMsg);
            }
          } else {
            // Successful response from Gemini: extract reply and return
            const fullCandidateText = json?.candidates?.[0]?.content?.parts ? json.candidates[0].content.parts.map(p => p.text || '').join('') : null;
            const reply =
              fullCandidateText ||
              json?.choices?.[0]?.message?.content ||
              json?.choices?.[0]?.text ||
              json?.reply ||
              json?.text ||
              (typeof json === 'string' ? json : JSON.stringify(json)) ||
              "No response";
            return reply;
          }
        }
        // If resp was null or we decided to fall back, continue on to Groq below
        console.debug('[grokController] Falling back to Groq for prompt.');
      }

      // Fallback to Grok if configured
      const payload = {
        model: GROK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        // Increase token limit to reduce truncated outputs for longer responses
        max_tokens: 1500
      };

      let resp;
        try {
        resp = await fetch(GROK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROK_KEY}`
          },
          body: JSON.stringify(payload),
          agent
        });
      } catch (fetchErr) {
        const msg = `fetch-error: ${fetchErr && fetchErr.message ? fetchErr.message : String(fetchErr)}`;
        console.error('groq provider fetch error (analysis):', msg);

        // If configured, retry with an insecure TLS agent (useful behind captive proxies or broken TLS setups).
        if (process.env.GROK_ALLOW_INSECURE === '1' || process.env.GROK_ALLOW_INSECURE === 'true') {
          try {
            console.warn('Retrying Groq request with insecure TLS (GROQ_ALLOW_INSECURE enabled)');
            // If proxy present and HttpsProxyAgent available, chain proxy with insecure agent if possible
            let insecureAgent = new https.Agent({ rejectUnauthorized: false });
            let agentToUse = insecureAgent;
            const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
            if (proxy && HttpsProxyAgent) {
              try {
                agentToUse = new HttpsProxyAgent(proxy);
                // Some proxy agents accept options to disable TLS verify on the proxied connection
              } catch (aErr) {
                console.warn('Failed to create proxy agent for retry, falling back to insecure agent', aErr && aErr.message);
                agentToUse = insecureAgent;
              }
            }
            resp = await fetch(GROK_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROK_KEY}`
              },
              body: JSON.stringify(payload),
              agent: agentToUse
            });
          } catch (retryErr) {
            const retryMsg = `fetch-retry-error: ${retryErr && retryErr.message ? retryErr.message : String(retryErr)}`;
            console.error('groq provider fetch retry error (analysis):', retryMsg);
            throw new Error(retryMsg);
          }
        } else {
          throw new Error(msg);
        }
      }

      let json;
      try {
        json = await resp.json();
      } catch (parseErr) {
        const text = await resp.text().catch(() => '<no body>');
        const msg = `invalid-json-response: ${text}`;
        console.error('provider invalid JSON (analysis):', msg);
        throw new Error(msg);
      }

      if (!resp.ok) {
        let errMsg = json?.error?.message || JSON.stringify(json);
        console.error('provider error (analysis):', errMsg);
        throw new Error(errMsg);
      }

      // Try to extract useful text from common response shapes
      const fullCandidateText = json?.candidates?.[0]?.content?.parts ? json.candidates[0].content.parts.map(p => p.text || '').join('') : null;
      const reply =
        fullCandidateText ||
        json?.choices?.[0]?.message?.content ||
        json?.choices?.[0]?.text ||
        json?.reply ||
        json?.text ||
        (typeof json === 'string' ? json : JSON.stringify(json)) ||
        "No response";
        return reply;
    }

      // Try to parse model reply into JSON if the model returned structured output
      function parseMaybeJSON(reply) {
        if (!reply || typeof reply !== 'string') return reply;
        const txt = reply.trim();
        // Quick path
        if ((txt.startsWith('{') && txt.endsWith('}')) || (txt.startsWith('[') && txt.endsWith(']'))) {
          try { return JSON.parse(txt); } catch (e) { /* fallthrough */ }
        }
        // Try to extract a JSON block from inside the text
        const firstBrace = txt.indexOf('{');
        const lastBrace = txt.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const candidate = txt.substring(firstBrace, lastBrace + 1);
          try { return JSON.parse(candidate); } catch (e) { /* fallthrough */ }
        }
        const firstBracket = txt.indexOf('[');
        const lastBracket = txt.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          const candidate = txt.substring(firstBracket, lastBracket + 1);
          try { return JSON.parse(candidate); } catch (e) { /* fallthrough */ }
        }
        return reply;
      }

    // helper to do fetch for Gemini with optional agent
    async function doFetch(url, key, payload, agent) {
      let resp;
      // Detect Google API key (simple heuristic)
      const isGoogleApiKey = typeof key === 'string' && key.startsWith('AIza');
      let urlToCall = url;
      urlToCall = isGoogleApiKey ? `${urlToCall}${urlToCall.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}` : urlToCall;
      const headers = { 'Content-Type': 'application/json' };
      if (!isGoogleApiKey) headers['Authorization'] = `Bearer ${key}`;

      try {
        // Normalize payload (convert camelCase fields to generationConfig where needed)
        const p = JSON.parse(JSON.stringify(payload));
        if (p.maxOutputTokens !== undefined && p.generationConfig === undefined) {
          p.generationConfig = { maxOutputTokens: p.maxOutputTokens };
          delete p.maxOutputTokens;
        }

        // Determine body shape for generateContent vs generateText
        let bodyToSend;
        if (urlToCall.includes(':generateContent')) {
          // payload should be { contents: [{ parts: [{ text: '...' }] }] }
          const text = (p.prompt && p.prompt.text) || (p.contents && p.contents[0]?.parts?.[0]?.text) || '';
          // Use generationConfig object for output size
          const maxOut = (p.generationConfig && p.generationConfig.maxOutputTokens) || 1024;
          bodyToSend = JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { maxOutputTokens: maxOut } });
        } else if (urlToCall.includes('generativelanguage.googleapis.com')) {
          // Use the normalized payload for Google's API
          bodyToSend = JSON.stringify(p);
        } else {
          // Non-Google endpoints: send the normalized payload as well to avoid sending camelCase fields
          bodyToSend = JSON.stringify(p);
        }

        console.debug('[grokController] POST', urlToCall);
        console.debug('[grokController] BODY', bodyToSend);
        resp = await fetch(urlToCall, {
          method: 'POST',
          headers,
          body: bodyToSend,
          agent
        });
      } catch (fetchErr) {
        const msg = `fetch-error: ${fetchErr && fetchErr.message ? fetchErr.message : String(fetchErr)}`;
        console.error('provider fetch error (analysis):', msg);
        // If configured, retry with an insecure TLS agent
        if (process.env.GROK_ALLOW_INSECURE === '1' || process.env.GROK_ALLOW_INSECURE === 'true') {
          try {
            console.warn('Retrying request with insecure TLS (ALLOW_INSECURE enabled)');
            let insecureAgent = new https.Agent({ rejectUnauthorized: false });
            let agentToUse = insecureAgent;
            const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
            if (proxy && HttpsProxyAgent) {
              try {
                agentToUse = new HttpsProxyAgent(proxy);
              } catch (aErr) {
                console.warn('Failed to create proxy agent for retry, falling back to insecure agent', aErr && aErr.message);
                agentToUse = insecureAgent;
              }
            }
            // Use same normalization logic for retry
            let retryBody;
            const p2 = JSON.parse(JSON.stringify(payload));
            if (p2.maxOutputTokens !== undefined && p2.generationConfig === undefined) {
              p2.generationConfig = { maxOutputTokens: p2.maxOutputTokens };
              delete p2.maxOutputTokens;
            }
            if (urlToCall.includes(':generateContent')) {
              const text = (p2.prompt && p2.prompt.text) || (p2.contents && p2.contents[0]?.parts?.[0]?.text) || '';
              const maxOut2 = (p2.generationConfig && p2.generationConfig.maxOutputTokens) || 1024;
              retryBody = JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { maxOutputTokens: maxOut2 } });
            } else if (urlToCall.includes('generativelanguage.googleapis.com')) {
              retryBody = JSON.stringify(p2);
            } else {
              retryBody = JSON.stringify(p2);
            }
            console.debug('[grokController] RETRY POST', urlToCall);
            console.debug('[grokController] RETRY BODY', retryBody);
            resp = await fetch(urlToCall, {
              method: 'POST',
              headers,
              body: retryBody,
              agent: agentToUse
            });
          } catch (retryErr) {
            const retryMsg = `fetch-retry-error: ${retryErr && retryErr.message ? retryErr.message : String(retryErr)}`;
            console.error('provider fetch retry error (analysis):', retryMsg);
            throw new Error(retryMsg);
          }
        } else {
          throw new Error(msg);
        }
      }

      return resp;
    }

    const petContext = `Pet data: ${JSON.stringify(pet)}`;

      const dietPrompt = `
Pet: ${JSON.stringify(pet)}

Return ONLY valid JSON.

{
  "weekly_plan": {
    "Monday": {
      "breakfast": {
        "food": "",
        "portion": ""
      },
      "lunch": {
        "food": "",
        "portion": ""
      },
      "dinner": {
        "food": "",
        "portion": ""
      }
    }
  },
  "foods_to_avoid": [],
  "hydration_tips": [],
  "water_requirement": "",
  "tips": []
}

Rules:
- Generate all 7 days with different meals 
- Mention food and portion for every meal
- Give portions ONLY in grams (g)
- Add at least 3 foods_to_avoid
- Add at least 2 hydration_tips
- Keep responses short
- No markdown
- No extra text
- Valid JSON only
`;
      const breedPrompt = `${petContext}\n\nReturn ONLY valid JSON (no surrounding commentary). JSON schema:\n{\n  "overview": "short paragraph",\n  "temperament": "short paragraph",\n  "common_behavior": ["list"],\n  "energy_level": "low|moderate|high (and explanation)",\n  "lifespan": "e.g. 10-12 years"\n}`;

      const tipsPrompt = `${petContext}\n\nReturn ONLY valid JSON (no surrounding commentary). JSON schema:\n{\n  "grooming_tips": ["list"],\n  "exercise_needs": ["list"],\n  "vaccination_reminders": ["list"],\n  "health_precautions": ["list"],\n  "safety_tips": ["list"]\n}`;

    

    // Call providers sequentially with short delays to avoid hitting rate limits
    const dietRaw = await callGrok(dietPrompt, { preferGrok: true });
     const diet = parseMaybeJSON(dietRaw);
    // Normalize diet shape to predictable keys expected by frontend
    function normalizeDiet(d) {
      if (!d) return null;
      const out = {};
      out.weekly_plan = d.plan || d.weekly_plan || d.weeklyPlan || d.weekly || {};
      out.portion_sizes = d.portion_sizes || d.portionSizes || d.portion || d.portions || '';
      out.foods_to_avoid = d.avoid || d.avoidance || d.foods_to_avoid || d.foodsToAvoid || d.foods || [];
      out.hydration_tips = d.hydration_tips || d.hydrationTips || d.hydration || [];
      out.calories = d.cal || d.calories || d.daily_calories || d.kcal || '';
      return out;
    }
    const normalizedDiet = normalizeDiet(diet);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const breedRaw = await callGrok(breedPrompt, { preferGrok: true });
     const breedInfo = parseMaybeJSON(breedRaw);
     console.debug('[grokController] breedInfo length:', breedRaw ? String(breedRaw).length : 0);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const tipsRaw = await callGrok(tipsPrompt, { preferGrok: true });
    const tips = parseMaybeJSON(tipsRaw);
     console.debug('[grokController] diet length:', dietRaw ? String(dietRaw).length : 0);
     console.debug('[grokController] tips length:', tipsRaw ? String(tipsRaw).length : 0);

      console.debug('[grokController] normalizedDiet keys:', Object.keys(normalizedDiet || {}));
      res.json({ diet: normalizedDiet, breedInfo, tips });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error('grok analysis error', message);

    // If configured, return a helpful fallback instead of failing hard
    if (process.env.GROK_FALLBACK_TO_LOCAL === '1' || process.env.GROK_FALLBACK_TO_LOCAL === 'true') {
      const pet = req.body?.pet || {};
      const petDesc = `${pet.name || 'your pet'} (${pet.animal || 'unknown'})`;
      return res.json({
        diet: `Fallback diet for ${petDesc}: feed moderate portions based on weight. (This is a fallback response; provider error: ${message})`,
        breedInfo: `Fallback breed info for ${petDesc}: typical traits and behavior. (fallback)`,
        tips: `Fallback tips: regular checkups, vaccinations, and watch for allergens. (fallback)`
      });
    }

    // Surface provider error message to client for debugging (502)
    res.status(502).json({ error: 'Groq analysis failed', details: message });
  }
};
