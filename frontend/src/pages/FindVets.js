import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { findVets } from '../api';
import './FindVets.css';

// (removed distance helper; dropdown features removed)

export default function FindVets() {
  const navigate = useNavigate();
  const [mapEmbedUrl, setMapEmbedUrl] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [coords, setCoords] = useState(null);
  const [vets, setVets] = useState([]);
  const lastFetchRef = useRef(0);

  const handleFind = () => {
    const now = Date.now();
    if (mapLoading) return;
    // throttle to once every 30 seconds to avoid repeated location prompts
    if (now - lastFetchRef.current < 30000) return;
    lastFetchRef.current = now;

    setMapError(null);
    setMapLoading(true);
    if (!navigator.geolocation) {
      setMapError('Geolocation not supported by your browser');
      setMapLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCoords({ lat, lng });
      findVets(lat, lng)
        .then(res => {
          setMapEmbedUrl(res.data.embedUrl);
          setVets(res.data.vets || []);
        })
        .catch(err => {
          // If backend fails, fall back to constructing a usable Google Maps embed URL client-side.
          console.warn('findVets API failed, falling back to client-side embed', err);
          const fallbackQuery = encodeURIComponent(`veterinarian near ${lat},${lng}`);
          const fallbackEmbed = `https://www.google.com/maps?q=${fallbackQuery}&center=${lat},${lng}&output=embed`;
          setMapEmbedUrl(fallbackEmbed);
          const serverMsg = err?.response?.data?.error;
          const status = err?.response?.status;
          const msg = serverMsg ? `${serverMsg}` : `${err.message || 'Request failed'}`;
          setMapError(status ? `(server) Error ${status}: ${msg} — showing fallback map` : `(server) ${msg} — showing fallback map`);
          console.error('findVets error', err);
        })
        .finally(() => setMapLoading(false));
    }, (err) => {
      setMapError('Unable to access location: ' + err.message);
      setMapLoading(false);
    });
  };

  // nearest vet / dropdown removed

  // Run search automatically when the page mounts (so clicking sidebar loads results)
  useEffect(() => {
    handleFind();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh when the user returns to the tab or window (visibility/focus)
  useEffect(() => {
    const onFocus = () => handleFind();
    const onVisibility = () => { if (document.visibilityState === 'visible') handleFind(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fc-dashboard-root">
      <aside className="fc-sidebar">
        <div className="fc-sidebar-logo">
          <div className="fc-paw-icon">🐾</div>
          <span className="fc-logo-text">FurCare</span>
        </div>
        <nav>
          <button className="fc-side-btn fc-active" onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
        </nav>
      </aside>

      <main className="fc-main">
        <div className="fc-main-scroll">
          <div className="fc-main-header">
            <h1>Find Nearby Vets</h1>
            <p>Locate veterinarians near you using Google Maps (no API key).</p>
          </div>

              <section className="fc-vets-section">
                <div className="fv-controls">
                <button
                  className="fc-btn"
                  onClick={() => {
                    if (!coords) return setMapError('Location not determined yet — please allow location access.');
                    const lat = coords.lat; const lng = coords.lng; const zoom = 14;
                    const base = `https://www.google.com/maps/search/veterinarian/@${lat},${lng},${zoom}z`;
                    window.open(base, '_blank', 'noopener,noreferrer');
                  }}
                >Open in Google Maps — show results{vets?.length ? ` (${vets.length})` : ''}</button>
              </div>

            {mapError && <div className="fc-error-box fv-mb">{mapError}</div>}

            {mapLoading && (
              <div className="fv-loading-row">
                <div className="fc-spinner" aria-hidden="true" />
                <div>Locating — please allow location access in your browser</div>
              </div>
            )}

            {coords && (
              <div className="fv-coords">
                <strong>Your coordinates:</strong> {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </div>
            )}

            {mapEmbedUrl ? (
              <div className="fv-map-wrapper">
                <iframe
                  title="Nearby Veterinarians"
                  src={mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="fc-empty-state fv-empty">
                <div style={{ fontSize: 40 }}>🏥</div>
                <p>Sharing location… allow the browser to show nearby veterinarians.</p>
              </div>
            )}

            {/* removed explicit Open in Google Maps button as requested */}
          </section>
        </div>
      </main>
    </div>
  );
}
