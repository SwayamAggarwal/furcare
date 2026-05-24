import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { findCreches } from '../api';
import './FindVets.css';

export default function FindCreche() {
  const navigate = useNavigate();
  const [mapEmbedUrl, setMapEmbedUrl] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [coords, setCoords] = useState(null);
  const [places, setPlaces] = useState([]);
  const lastFetchRef = useRef(0);

  const handleFind = () => {
    const now = Date.now();
    if (mapLoading) return;
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
      findCreches(lat, lng)
        .then(res => {
          setMapEmbedUrl(res.data.embedUrl);
          setPlaces(res.data.places || []);
        })
        .catch(err => {
          console.warn('findCreches API failed, falling back to client-side embed', err);
          const fallbackQuery = encodeURIComponent(`pet daycare near ${lat},${lng}`);
          const fallbackEmbed = `https://www.google.com/maps?q=${fallbackQuery}&center=${lat},${lng}&output=embed`;
          setMapEmbedUrl(fallbackEmbed);
          const serverMsg = err?.response?.data?.error;
          const status = err?.response?.status;
          const msg = serverMsg ? `${serverMsg}` : `${err.message || 'Request failed'}`;
          setMapError(status ? `(server) Error ${status}: ${msg} — showing fallback map` : `(server) ${msg} — showing fallback map`);
          console.error('findCreches error', err);
        })
        .finally(() => setMapLoading(false));
    }, (err) => {
      setMapError('Unable to access location: ' + err.message);
      setMapLoading(false);
    });
  };

  useEffect(() => {
    handleFind();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <h1>Find Nearby Creche</h1>
            <p>Locate pet creches/daycares near you using Google Maps (no API key).</p>
          </div>

          <section className="fc-vets-section">
            <div className="fv-controls">
              <button
                className="fc-btn"
                onClick={() => {
                  if (!coords) return setMapError('Location not determined yet — please allow location access.');
                  const lat = coords.lat; const lng = coords.lng; const zoom = 14;
                  const base = `https://www.google.com/maps/search/pet+daycare/@${lat},${lng},${zoom}z`;
                  window.open(base, '_blank', 'noopener,noreferrer');
                }}
              >Open in Google Maps — show results{places?.length ? ` (${places.length})` : ''}</button>
            </div>

            {mapError && <div className="fc-error-box fv-mb">{mapError}</div>}

            {mapLoading && (
              <div className="fv-loading-row">
                <div className="fc-spinner" aria-hidden="true" />
                <div>Locating — please allow location access in your browser</div>
              </div>
            )}

            {mapEmbedUrl ? (
              <div className="fv-map-wrapper">
                <iframe title="Nearby Creche Map" src={mapEmbedUrl} loading="lazy" />
              </div>
            ) : (
              <div style={{ opacity: 0.7, padding: 16 }}>Map not loaded yet — allow location access or try again.</div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
