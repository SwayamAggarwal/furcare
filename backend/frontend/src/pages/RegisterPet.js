import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { predictPet, registerPet } from "../api";

export default function RegisterPet() {
  function formatBreed(b) {
    if (!b && b !== 0) return b;
    const s = String(b);
    const dashIndex = s.indexOf('-');
    if (dashIndex > 0 && /^n\d+$/.test(s.substring(0, dashIndex))) {
      return s.substring(dashIndex + 1).replace(/_/g, ' ');
    }
    return s.replace(/_/g, ' ');
  }
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState({ name: "", animal: "", breed: "", age: "", weight: "", gender: "", allergies: "" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleUpload = async (incomingFiles) => {
    try {
      setError(null);
      const formData = new FormData();
      for (let file of incomingFiles) {
        formData.append("files", file);
      }
      setLoading(true);
      const res = await predictPet(formData);
      setPrediction(res.data);
      // prefill form animal/breed/confidence
      setForm((f) => ({ ...f, animal: res.data.animal, breed: res.data.breed }));
    } catch (err) {
      console.error(err);
      setError("AI prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (e) => {
    const arr = Array.from(e.target.files).slice(0, 8);
    setFiles(arr);
    handleUpload(arr);
  };

  const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRegister = async (breedSource = "manual") => {
    setError(null);
    try {
      // Require weight and validate numeric
      if (!form.weight && form.weight !== 0) {
        setError('Please provide pet weight.');
        return;
      }
      if (!/^\d+(\.\d+)?$/.test(String(form.weight).trim())) {
        setError('Pet weight must be a number (e.g. 4.5).');
        return;
      }
      // prepare allergies as optional array (split by comma if provided)
      let allergiesArr = undefined;
      if (form.allergies && String(form.allergies).trim() !== "") {
        allergiesArr = String(form.allergies)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      }

      const payload = {
        name: form.name,
        animal: form.animal,
        breed: form.breed,
        breedSource,
        confidence: prediction && prediction.confidence ? prediction.confidence : 0,
        age: form.age ? Number(form.age) : undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        gender: form.gender || undefined,
        allergies: allergiesArr
      };

      const res = await registerPet(payload);
      setResult(res.data);
    } catch (err) {
      console.error(err?.response?.data || err.message);
      setError("Registration failed. Check server logs.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black p-8">
      <div className="max-w-6xl mx-auto bg-white/5 backdrop-blur p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* LEFT: AI Prediction / Upload */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-white/6 rounded-lg">
          <h2 className="text-white text-2xl font-bold mb-3">AI Prediction</h2>

          <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center cursor-pointer" onClick={() => fileRef.current && fileRef.current.click()}>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={onFileChange} />
            <div className="text-gray-300">Click or drop images to analyze (3–5 recommended)</div>
            <div className="text-sm text-gray-500 mt-2">Supported: JPG, PNG, HEIC — up to 8 files</div>
          </div>

          {loading && <div className="mt-4 text-gray-300">Analyzing images...</div>}

          {prediction && (
            <div className="mt-4 bg-white/6 p-4 rounded">
              <div className="text-sm text-gray-400">Detected</div>
              <div className="text-lg text-white font-semibold">{prediction.animal}</div>
              <div className="text-sm text-gray-300">Breed: <span className="font-bold">{formatBreed(prediction.breed)}</span></div>
              <div className="text-sm text-gray-300">Confidence: {(prediction.confidence * 100).toFixed(2)}%</div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {prediction.top3 && prediction.top3.map((t, i) => (
                  <div key={i} className="bg-white/5 p-2 rounded">
                    <div className="text-xs text-gray-300 font-semibold">{formatBreed(t.breed)}</div>
                    <div className="text-xs text-gray-400">{(t.confidence * 100).toFixed(2)}%</div>
                  </div>
                ))}
              </div>

              <button className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded" onClick={() => handleRegister("ai")}>Register Using AI Result</button>
            </div>
          )}

          {error && <div className="mt-3 text-red-300">{error}</div>}
        </motion.div>

        {/* RIGHT: Manual Registration Form */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-white/6 rounded-lg">
          <h2 className="text-white text-2xl font-bold mb-3">Manual Registration</h2>

          <div className="grid grid-cols-1 gap-3">
            <input name="name" value={form.name} onChange={handleFormChange} placeholder="Pet name" className="p-2 rounded bg-white/5 text-white" />
            <input name="animal" value={form.animal} onChange={handleFormChange} placeholder="Animal (Dog / Cat)" className="p-2 rounded bg-white/5 text-white" />
            <input name="breed" value={form.breed} onChange={handleFormChange} placeholder="Breed" className="p-2 rounded bg-white/5 text-white" />
            <div className="flex gap-2">
              <input name="age" value={form.age} onChange={handleFormChange} placeholder="Age" className="p-2 rounded bg-white/5 text-white flex-1" />
              <input name="weight" value={form.weight} onChange={handleFormChange} placeholder="Weight (kg)" className="p-2 rounded bg-white/5 text-white flex-1" />
            </div>
            <input name="allergies" value={form.allergies} onChange={handleFormChange} placeholder="Allergies (comma-separated, optional)" className="p-2 rounded bg-white/5 text-white" />
            <select name="gender" value={form.gender} onChange={handleFormChange} className="p-2 rounded bg-white/5 text-white">
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <div className="flex gap-2">
              <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded" onClick={() => handleRegister("manual")}>Register Manually</button>
              <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded" onClick={() => { setForm({ name: "", animal: "", breed: "", age: "", weight: "", gender: "", allergies: "" }); setResult(null); }}>Reset</button>
            </div>

            {result && (
              <div className="mt-3 bg-white/6 p-3 rounded">
                <div className="text-sm text-gray-400">Registered UID</div>
                <div className="text-white font-semibold">{result._id}</div>
                <div className="mt-2 text-sm text-gray-300">Name: <span className="font-semibold text-white">{result.name}</span></div>
                <div className="text-sm text-gray-300">Animal: <span className="font-semibold text-white">{result.animal}</span></div>
                <div className="text-sm text-gray-300">Breed: <span className="font-semibold text-white">{formatBreed(result.breed)}</span></div>
                <div className="text-sm text-gray-300">Age: <span className="font-semibold text-white">{result.age}</span></div>
                <div className="text-sm text-gray-300">Weight: <span className="font-semibold text-white">{typeof result.weight !== 'undefined' && result.weight !== null ? result.weight + ' kg' : '—'}</span></div>
                <div className="text-sm text-gray-300">Gender: <span className="font-semibold text-white">{result.gender}</span></div>
                <div className="text-sm text-gray-300">Allergies: <span className="font-semibold text-white">{result.allergies && result.allergies.length ? result.allergies.join(', ') : '—'}</span></div>
                {result.qrCode && <img src={result.qrCode} alt="QR" className="mt-2 w-36 h-36" />}
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
