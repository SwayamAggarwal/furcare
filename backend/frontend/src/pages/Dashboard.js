import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { getPetsByPhone, setPetLostStatus } from '../api';
import './dashboard.css';
import MyCare from './mycare';
import './mycare.css';
import LostPets from './lost_pets';
import './lost_pets.css';

const NAV_ITEMS = [
  { key: 'pets', label: 'My Pets', icon: '🐾' },
  { key: 'lost', label: 'Lost Mode', icon: '📍' },
  { key: 'notifications', label: 'Notifications', icon: '🔔' },
  { key: 'health', label: 'Nearby Creche', icon: '💉' },
  { key: 'vets', label: 'Find Vets', icon: '🏥' },
  { key: 'care', label: 'My Care', icon: '❤️' },
];

function generateIntro(p) {
  if (!p) return '';

  const breedDisplay = formatBreed(p.breed || p.animal || 'pet');

  return `
  Hi, I'm ${p.name || 'your pet'}.
  I love walks, cuddles, treats and spending time with my family.
  I'm a ${breedDisplay} and always ready to make everyone smile.
  `;
}

function getStats(p) {
  if (!p) return [];

  return [
    { label: 'Weight', value: p.weight ? `${p.weight} kg` : 'N/A' },
    { label: 'Gender', value: p.gender || 'N/A' },
    { label: 'Age', value: p.age ? `${p.age} yrs` : 'N/A' },
    { label: 'Color', value: p.color || 'N/A' },
  ];
}

function getStackClass(idx, active, total) {
  const rel = (idx - active + total) % total;

  if (rel === 0) return 'fc-stack-front';
  if (rel === 1) return 'fc-stack-second';
  if (rel === 2) return 'fc-stack-third';

  return 'fc-stack-hidden';
}

// Helper to strip numeric prefix like `n02085782-` and replace underscores with spaces
function formatBreed(b) {
  if (!b && b !== 0) return b;
  const s = String(b);
  const dashIndex = s.indexOf('-');
  if (dashIndex > 0 && /^n\d+$/.test(s.substring(0, dashIndex))) {
    const clean = s.substring(dashIndex + 1).replace(/_/g, ' ');
    return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return s.replace(/_/g, ' ');
}

export default function Dashboard() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [active, setActive] = useState(0);
  const [lostSet, setLostSet] = useState(new Set());
  const [navKey, setNavKey] = useState('pets');
  const location = useLocation();

  const navigate = useNavigate();

  const isDragging = useRef(false);
  const dragStart = useRef(null);

  const cardStageStyle = {
    width: '1000px',
    height: '520px',
    position: 'relative',
    margin: '18px auto',
  };

  const petPhotoStyle = {
    width: '320px',
    minWidth: '260px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(255,245,220,0.85) 0%, #ffe8c2 45%, #c79a5b 90%)'
  };

  const cardBodyStyle = {
    flex: 1,
    padding: '28px 28px 24px 28px'
  };

  const stackFrontStyle = {
    transform: 'translateY(-4px) scale(1.01)',
    zIndex: 5,
    boxShadow: '0 18px 40px rgba(199,145,74,0.06), inset 0 1px 0 rgba(255,255,255,0.6)'
  };

  const stackSecondStyle = {
    transform: 'translateX(24px) scale(0.96) rotate(-0.5deg)',
    opacity: 0.7,
    zIndex: 2
  };

  const stackThirdStyle = {
    transform: 'translateX(48px) scale(0.92) rotate(-1deg)',
    opacity: 0.5,
    zIndex: 1
  };

  useEffect(() => {
    const raw = localStorage.getItem('furcare_user');
    let storedUser = null;
    if (raw) {
      try {
        storedUser = JSON.parse(raw);
      } catch (e) {
        storedUser = null;
      }
    }

    if (storedUser) setUser(storedUser);

    if (!storedUser?.phone) {
      setError('Please login first');
      setLoading(false);
      return;
    }

    getPetsByPhone(storedUser.phone)
      .then((res) => {
        const arr = res.data?.pets ?? [];
        setPets(arr);
        setActive(arr.length ? 0 : -1);
        // initialize lostSet from server data
        try { setLostSet(new Set(arr.filter(p => p.isLost).map(p => p._id))); } catch (e) {}
      })
      .catch((err) => {
        setError(err?.response?.data?.error || 'Failed to fetch pets');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // If navigated with ?nav=lost or location.state.nav === 'lost', open lost view
    try {
      const params = new URLSearchParams(location.search);
      const q = params.get('nav');
      if (q === 'lost') setNavKey('lost');
      else if (location.state && location.state.nav) setNavKey(location.state.nav);
    } catch (e) {}
  }, [location.search, location.state]);

  // derive visible pets depending on navKey
  const visiblePets = navKey === 'lost' ? pets.filter(p => p.isLost) : pets;

  // keep active index in range when visiblePets changes
  useEffect(() => {
    if (!visiblePets || visiblePets.length === 0) {
      setActive(-1);
    } else {
      setActive((prev) => {
        if (prev < 0 || prev >= visiblePets.length) return 0;
        return prev;
      });
    }
  }, [visiblePets]);

  const next = useCallback(() => {
    const visible = navKey === 'lost' ? pets.filter(p => p.isLost) : pets;
    if (visible.length < 2) return;
    setActive((prev) => (prev + 1) % visible.length);
  }, [pets, navKey]);

  const prev = useCallback(() => {
    const visible = navKey === 'lost' ? pets.filter(p => p.isLost) : pets;
    if (visible.length < 2) return;
    setActive((prev) => (prev - 1 + visible.length) % visible.length);
  }, [pets, navKey]);

  const onMouseDown = useCallback((e) => {
    isDragging.current = true;
    dragStart.current = e.clientX;
  }, []);

  const onMouseUp = useCallback((e) => {
    if (!isDragging.current) return;
    const diff = e.clientX - dragStart.current;
    if (diff > 80) prev();
    if (diff < -80) next();
    isDragging.current = false;
  }, [next, prev]);

  const toggleLost = useCallback(async (e, petId) => {
    e.stopPropagation();
    try {
      // find pet
      const pet = pets.find(p => p._id === petId) || {};
      const newIsLost = !pet.isLost;
      // If marking lost, try to capture user's geolocation
      let location = undefined;
      if (newIsLost && navigator && navigator.geolocation) {
        // wrap in a promise with timeout
        const getPosition = (timeout = 8000) => new Promise((resolve, reject) => {
          let done = false;
          const timer = setTimeout(() => { if (!done) { done = true; reject(new Error('geolocation timeout')); } }, timeout);
          navigator.geolocation.getCurrentPosition((pos) => {
            if (done) return;
            done = true; clearTimeout(timer);
            resolve(pos);
          }, (err) => {
            if (done) return;
            done = true; clearTimeout(timer);
            reject(err);
          }, { enableHighAccuracy: true, maximumAge: 0, timeout: 7000 });
        });

        try {
          const pos = await getPosition(8000);
          if (pos && pos.coords) {
            location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          }
        } catch (err) {
          // ignore geolocation failure, proceed without location
          console.warn('Geolocation failed or denied', err && err.message ? err.message : err);
        }
      }

      // call backend with optional location
      const res = await setPetLostStatus(petId, newIsLost, location);
      const updatedPet = res.data && res.data.pet ? res.data.pet : { ...pet, isLost: newIsLost };
      // update local state
      setPets(prev => prev.map(p => p._id === petId ? { ...p, ...updatedPet } : p));
      setLostSet(prev => {
        const copy = new Set(prev);
        if (newIsLost) copy.add(petId); else copy.delete(petId);
        return copy;
      });
    } catch (err) {
      const serverMsg = ((err && err.response && err.response.data && (err.response.data.error || err.response.data.message)) || err.message || JSON.stringify(err));
      console.error('Failed to update lost status', err, serverMsg);
      alert('Failed to update lost status: ' + serverMsg);
    }
  }, [pets]);

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem('furcare_user');
      // optionally clear other session data
    } catch (err) {
      // ignore
    }
    navigate('/');
  }, [navigate]);

  const downloadQr = (e, pet) => {
    e.stopPropagation();
    try {
      const qr = pet && (pet.qrCode || pet.qr);
      if (!qr) {
        alert('No QR available for this pet');
        return;
      }
      const a = document.createElement('a');
      a.href = qr;
      const name = (pet && pet.name) ? pet.name.replace(/[^a-z0-9_-]/gi, '_') : 'pet_qr';
      a.download = `${name}_qr.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('QR download failed', err);
      alert('Failed to download QR');
    }
  };

  if (loading) {
    return (
      <div className="fc-loading-screen">
        <div className="fc-paw-spin">🐾</div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fc-error-screen">
        <div className="fc-error-box">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Standalone lost-pets view (no sidebar, no welcome header)
  if (navKey === 'lost') {
    return (
      <div className="fc-lost-root">
        <LostPets visiblePets={visiblePets} toggleLost={toggleLost} />
      </div>
    );
  }

  return (
    <div className="fc-dashboard-root">
        <aside className="fc-sidebar">
          <div className="fc-sidebar-logo">
            <div className="fc-paw-icon">🐾</div>
            <span className="fc-logo-text">FurCare</span>
          </div>

          <nav>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`fc-side-btn ${navKey === item.key ? 'fc-active' : ''}`}
                onClick={() => {
                  if (item.key === 'vets') {
                    navigate('/find-vets');
                    return;
                  }
                  if (item.key === 'health') {
                    navigate('/find-creche');
                    return;
                  }
                  setNavKey(item.key);
                }}
              >
                <span className="fc-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="fc-sidebar-footer">
            <div className="fc-user-card">
              <div className="fc-user-avatar">👨</div>
              <div>
                <h4>{(user && user.name) || (pets[0] && pets[0].ownerName) || 'Guest'}</h4>
                <p>{(user && user.phone) || (pets[0] && pets[0].ownerPhone) || ''}</p>
              </div>
            </div>
            <button className="fc-logout-btn" onClick={handleLogout}>Log out</button>
          </div>
        </aside>

        <main className="fc-main" onMouseUp={onMouseUp}>
          <div className="fc-main-scroll">
            {/* Welcome message removed on Care page */}
            {navKey !== 'care' && (
              <div className="fc-main-header">
                <div>
                  <h1>Welcome, {(user && user.name) || (pets[0] && pets[0].ownerName) || 'there'} </h1>
                  <p>Here's what's happening with your furry friends today.</p>
                </div>
              </div>
            )}

            <section className="fc-carousel-section">
              {/* Conditional rendering: Show MyCare, Lost list, or the Pet Carousel */}
              {navKey === 'care' ? (
                <MyCare pet={pets[active]} />
              ) : pets.length === 0 ? (
                <div className="fc-empty-state">
                  <h3>No pets available</h3>
                </div>
              ) : (
                <div
                  className="fc-card-stage"
                  onMouseDown={onMouseDown}
                  style={cardStageStyle}
                >
                  {visiblePets.length > 1 && (
                    <>
                      <button
                        className="fc-stage-nav left"
                        onClick={(e) => { e.stopPropagation(); prev(); }}
                        aria-label="Previous pet"
                      >
                        ‹
                      </button>
                      <button
                        className="fc-stage-nav right"
                        onClick={(e) => { e.stopPropagation(); next(); }}
                        aria-label="Next pet"
                      >
                        ›
                      </button>
                    </>
                  )}
                  {visiblePets.map((p, idx) => {
                    const isLost = lostSet.has(p._id);
                    const photoSrc = p.petPhoto || (p.petPhotos && p.petPhotos[0]) || 'https://placedog.net/500/500';
                    const rel = (idx - active + visiblePets.length) % visiblePets.length;
                    let stackStyle = undefined;
                    if (rel === 0) stackStyle = stackFrontStyle;
                    else if (rel === 1) stackStyle = stackSecondStyle;
                    else if (rel === 2) stackStyle = stackThirdStyle;

                    return (
                      <div
                        key={p._id}
                        className={`fc-stack-card ${getStackClass(idx, active, visiblePets.length)}`}
                        style={stackStyle}
                      >
                        <div className="fc-pet-photo" style={petPhotoStyle}>
                          <img src={photoSrc} alt={p.name} />
                        </div>

                        <div className="fc-card-body" style={cardBodyStyle}>
                          <div className="fc-card-top">
                            <h3>{p.name || 'Unnamed'}</h3>
                            <div className="fc-inline-actions">
                              <button
                                className={`fc-btn fc-inline-btn ${isLost ? 'fc-btn-found' : 'fc-btn-lost'}`}
                                onClick={(e) => toggleLost(e, p._id)}
                              >
                                {isLost ? '✓ Found' : '📍 Lost'}
                              </button>
                              {(p.qrCode || p.qr) && (
                                <button
                                  className="fc-btn-qr fc-inline-btn"
                                  onClick={(e) => downloadQr(e, p)}
                                >
                                  Download QR
                                </button>
                              )}
                            </div>
                          </div>

                          <span className="fc-breed-tag">
                            {formatBreed(p.breed) || p.animal || 'Pet'}
                          </span>

                          <p className="fc-card-desc">
                            {generateIntro(p)}
                          </p>

                          <div className="fc-stat-grid">
                            {getStats(p).map((s) => (
                              <div key={s.label} className="fc-stat-chip">
                                <div className="fc-stat-label">{s.label}</div>
                                <div className="fc-stat-value">{s.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    );
}