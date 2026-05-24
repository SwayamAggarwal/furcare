import React, { useEffect, useState, useRef } from 'react';
import './mycare.css';
import { grokAnalysis, grokChat } from '../api';

function CareChat({ pet }) {
  const [messages, setMessages] = useState([{
    from: 'bot', text: `Hello! I'm your advanced care assistant. How can I assist you with ${pet?.name || 'your pet'} today?`
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const onSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setMessages(prev => [...prev, { from: 'user', text: msg }]);
    setInput('');
    setLoading(true);
    try {
      const res = await grokChat(msg, pet);
      const replyRaw = res?.data?.reply;
      const reply = (typeof replyRaw === 'object') ? JSON.stringify(replyRaw) : (replyRaw || "I'm processing that. One moment please.");
      setMessages(prev => [...prev, { from: 'bot', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { from: 'bot', text: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mc-chat-root" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="mc-chat-messages">
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            <div style={{ 
              padding: '14px 20px', 
              borderRadius: '24px',
              fontSize: '15px',
              lineHeight: '1.5',
              background: m.from === 'user' ? 'var(--terracotta)' : 'rgba(255, 255, 255, 0.8)',
              color: m.from === 'user' ? 'white' : 'var(--earth-dark)',
              borderBottomRightRadius: m.from === 'user' ? '6px' : '24px',
              borderBottomLeftRadius: m.from === 'user' ? '24px' : '6px',
              boxShadow: '0 4px 12px rgba(74, 55, 40, 0.05)',
              border: m.from === 'user' ? 'none' : '1px solid var(--glass-border)'
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.8)', padding: '14px 20px', borderRadius: '24px', borderBottomLeftRadius: '6px' }}>
            <span style={{ opacity: 0.5 }}>Thinking...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="mc-chat-input-area">
        <input 
          placeholder="Type your message..." 
          value={input} 
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSend()}
        />
        <button 
          className="mc-action" 
          onClick={onSend} 
          style={{ padding: '0', width: '52px', height: '52px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {loading ? '...' : '↑'}
        </button>
      </div>
    </div>
  );
}

const TABS = [
  { key: 'info',  label: 'Breed Information', icon: '🧬', cta: 'Get Information' },
  { key: 'diet',  label: 'Dietary Plan',            icon: '🥩', cta: 'Genetrate Diet'       },
  { key: 'tips',  label: 'Care Guidelines',         icon: '✨', cta: 'Get Guidelines'       },
];

function TabContent({ tabKey, data, loading, onFetch }) {
  const tab = TABS.find(t => t.key === tabKey);
  const hasData = !!data;
  const isLoading = loading;

  return (
    <div style={{ position: 'relative', minHeight: '320px' }}>

      {/* Overlay CTA — shown until data is fetched */}
      <div className={`mc-action-overlay ${hasData || isLoading ? 'hidden' : ''}`}>
        <button className="mc-action" onClick={onFetch}>
          {tab.cta}
        </button>
      </div>

      {/* Card header */}
      <div className="mc-card-head">
        <div className="mc-card-icon">{tab.icon}</div>
        <h3>{tab.label}</h3>
      </div>

      {/* Skeleton */}
      {isLoading && (
        <div>
          <div className="mc-skeleton title"></div>
          <div className="mc-skeleton"></div>
          <div className="mc-skeleton"></div>
          <div className="mc-skeleton short"></div>
          <div className="mc-skeleton"></div>
          <div className="mc-skeleton short"></div>
        </div>
      )}

      {/* Actual content */}
      {hasData && !isLoading && (
        <div className="mc-card-body">
          {renderStructured(tabKey, data)}
        </div>
      )}
    </div>
  );
}

function renderStructured(tabKey, data) {
  if (!data) return null;

  function renderValue(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return (<ul className="mc-list">{v.map((it, idx) => <li key={idx}>{renderValue(it)}</li>)}</ul>);
    if (typeof v === 'object') {
      // render object as list of key: value
      return (
        <ul className="mc-list">
          {Object.entries(v).map(([k, val]) => (
            <li key={k}><strong>{k}:</strong> {renderValue(val)}</li>
          ))}
        </ul>
      );
    }
    return String(v);
  }

  // Diet rendering
  if (tabKey === 'diet') {
    const wp = data.weekly_plan || data.weeklyPlan || {};
    const portions = data.portion_sizes || data.portionSizes || data.portion || '';
    const avoid = data.foods_to_avoid || data.foodsToAvoid || data.foods || [];
    const hyd = data.hydration_tips || data.hydrationTips || [];
    const weekOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

    function mealToText(meal) {
      if (meal === null || meal === undefined) return '';
      if (typeof meal === 'string' || typeof meal === 'number') return String(meal);
      if (Array.isArray(meal)) return meal.map(m => mealToText(m)).join(' / ');
      if (typeof meal === 'object') {
        const name = meal.meal || meal.food || meal.m || meal.name || '';
        const portion = meal.portion || meal.p || meal.size || meal.portion_size || '';
        return `${name}${portion ? ` — ${portion}` : ''}`.trim();
      }
      return String(meal);
    }

    return (
      <div>
        <h4>Weekly Plan</h4>
        {Object.keys(wp).length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="mc-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--glass-border)' }}>Day</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--glass-border)' }}>Breakfast</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--glass-border)' }}>Lunch</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--glass-border)' }}>Dinner</th>
                </tr>
              </thead>
              <tbody>
                {weekOrder.map(day => {
                  const entry = wp[day] || wp[day.toLowerCase()] || {};
                  // entry might be an object with keys breakfast/lunch/dinner or a string/array
                  let breakfast = entry.breakfast || entry.Breakfast || entry.bfast || '';
                  let lunch = entry.lunch || entry.Lunch || '';
                  let dinner = entry.dinner || entry.Dinner || '';
                  // If entry is a flat string or array, attempt to split by commas
                  if (!breakfast && !lunch && !dinner && (typeof entry === 'string' || Array.isArray(entry))) {
                    const parts = (Array.isArray(entry) ? entry : String(entry).split(',')).map(p => p.trim());
                    breakfast = parts[0] || '';
                    lunch = parts[1] || '';
                    dinner = parts[2] || '';
                  }
                  // If entry is an object with meal keys in nested form (e.g., { breakfast: { meal:, portion: } }) handle in mealToText
                  return (
                    <tr key={day}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--glass-border)', verticalAlign: 'top' }}><strong>{day}</strong></td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--glass-border)', verticalAlign: 'top' }}>{mealToText(breakfast)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--glass-border)', verticalAlign: 'top' }}>{mealToText(lunch)}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--glass-border)', verticalAlign: 'top' }}>{mealToText(dinner)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (<div>No weekly plan available</div>)}

        {portions ? (<>
          <h4 style={{ marginTop: 12 }}>Portion Sizes</h4>
          <div>{renderValue(portions)}</div>
        </>) : null}

        <h4 style={{ marginTop: 12 }}>Foods to Avoid</h4>
        <div>{(Array.isArray(avoid) && avoid.length) ? avoid.map((f,i) => <div key={i}>{renderValue(f)}</div>) : <div>None specified</div>}</div>

        <h4 style={{ marginTop: 12 }}>Hydration Tips</h4>
        <div>{(Array.isArray(hyd) && hyd.length) ? hyd.map((t,i) => <div key={i}>{renderValue(t)}</div>) : <div>None specified</div>}</div>
      </div>
    );
  }

  // Breed info rendering
  if (tabKey === 'info') {
    const overview = data.overview || data.description || '';
    const temperament = data.temperament || '';
    const behavior = data.common_behavior || data.commonBehavior || data.behavior || [];
    const energy = data.energy_level || data.energyLevel || '';
    const lifespan = data.lifespan || '';
    return (
      <div>
        {overview ? <p style={{ marginBottom: 12 }}>{overview}</p> : null}
        {temperament ? (<><h4>Temperament</h4><p>{temperament}</p></>) : null}
        {behavior && behavior.length ? (<><h4>Common Behavior</h4><ul className="mc-list">{behavior.map((b,i) => <li key={i}>{renderValue(b)}</li>)}</ul></>) : null}
        {energy ? (<><h4>Energy Level</h4><p>{energy}</p></>) : null}
        {lifespan ? (<><h4>Lifespan</h4><p>{lifespan}</p></>) : null}
      </div>
    );
  }

  // Tips rendering
  if (tabKey === 'tips') {
    const grooming = data.grooming_tips || data.groomingTips || [];
    const exercise = data.exercise_needs || data.exerciseNeeds || [];
    const vacc = data.vaccination_reminders || data.vaccinationReminders || [];
    const health = data.health_precautions || data.healthPrecautions || [];
    const safety = data.safety_tips || data.safetyTips || [];
    return (
      <div>
        <h4>Grooming</h4>
        <ul className="mc-list">{(grooming.length ? grooming : ['No grooming tips provided']).map((t,i)=><li key={i}>{renderValue(t)}</li>)}</ul>

        <h4 style={{ marginTop: 12 }}>Exercise</h4>
        <ul className="mc-list">{(exercise.length ? exercise : ['No exercise tips provided']).map((t,i)=><li key={i}>{renderValue(t)}</li>)}</ul>

        <h4 style={{ marginTop: 12 }}>Vaccination Reminders</h4>
        <ul className="mc-list">{(vacc.length ? vacc : ['No reminders provided']).map((t,i)=><li key={i}>{renderValue(t)}</li>)}</ul>

        <h4 style={{ marginTop: 12 }}>Health Precautions</h4>
        <ul className="mc-list">{(health.length ? health : ['No precautions provided']).map((t,i)=><li key={i}>{renderValue(t)}</li>)}</ul>

        <h4 style={{ marginTop: 12 }}>Safety</h4>
        <ul className="mc-list">{(safety.length ? safety : ['No safety tips provided']).map((t,i)=><li key={i}>{renderValue(t)}</li>)}</ul>
      </div>
    );
  }

  // Fallback: pretty-print arrays or objects
  if (Array.isArray(data)) {
    return (<ul className="mc-list">{data.map((d,i)=><li key={i}>{String(d)}</li>)}</ul>);
  }
  if (typeof data === 'object') {
    return (<pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.7', opacity: 0.9 }}>{JSON.stringify(data, null, 2)}</pre>);
  }
  return <p>{String(data)}</p>;
}

export default function MyCare({ pet, pets }) {
  const [selectedPet] = useState(pet || (pets && pets[0]));
  const [activeTab, setActiveTab] = useState('info');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [data, setData] = useState({ diet: null, info: null, tips: null });
  const [loading, setLoading] = useState({ diet: false, info: false, tips: false });

  const fetchSection = async (key) => {
    if (loading[key] || data[key]) return;
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await grokAnalysis(selectedPet);
      const val = res?.data?.[key] || (key === 'info' ? res?.data?.breedInfo : null);
      setData(prev => ({ ...prev, [key]: val }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="mc-root">

      <header className="mc-hero">
        <h1>FurCare Intelligence</h1>
        <p className="mc-hero-sub">Personalized breed, diet and care guidance for your pet</p>
      </header>

      {/* Tabbed Layout */}
      <div className="mc-tab-container stagger-1">

        {/* Tab Navigation */}
        <nav className="mc-tab-nav" role="tablist" aria-label="Pet care sections">
          {TABS.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`mc-panel-${tab.key}`}
              id={`mc-tab-${tab.key}`}
              className={`mc-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="mc-tab-icon" aria-hidden="true">{tab.icon}</span>
              <span className="mc-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Tab Panels */}
        <div className="mc-tab-panel">
          {TABS.map(tab => (
            <div
              key={tab.key}
              role="tabpanel"
              id={`mc-panel-${tab.key}`}
              aria-labelledby={`mc-tab-${tab.key}`}
              className={`mc-tab-content ${activeTab === tab.key ? 'active' : ''}`}
            >
              <TabContent
                tabKey={tab.key}
                data={data[tab.key]}
                loading={loading[tab.key]}
                onFetch={() => fetchSection(tab.key)}
              />
            </div>
          ))}
        </div>

      </div>

      {/* Floating Assistant Trigger */}
      <div
        className="mc-assistant-trigger"
        onClick={() => setIsChatOpen(!isChatOpen)}
        role="button"
        aria-label="Toggle care assistant"
      >
        ✦
      </div>

      {/* Clean Glass Chat Popover */}
      {isChatOpen && (
        <div className="mc-chat-window">
          <div className="mc-chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--terracotta)' }}></div>
              <span style={{ fontWeight: 700, fontSize: '18px' }}>Assistant</span>
            </div>
            <button 
              onClick={() => setIsChatOpen(false)} 
              style={{ background: 'var(--accent-soft)', color: 'var(--earth-dark)', border: 'none', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}
            >✕</button>
          </div>
          <CareChat pet={selectedPet} />
        </div>
      )}
    </div>
  );
}