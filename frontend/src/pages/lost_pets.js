import React from 'react';
import './lost_pets.css';

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

export default function LostPets({ visiblePets = [], toggleLost }) {
  const openMaps = async (loc) => {
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return;

    // Try to obtain user's current location and open Google Maps directions
    const getPosition = (timeout = 7000) => new Promise((resolve, reject) => {
      if (!navigator || !navigator.geolocation) return reject(new Error('geolocation unavailable'));
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
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: timeout - 500 });
    });

    try {
      const pos = await getPosition(7000);
      if (pos && pos.coords) {
        const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
        const dest = `${loc.lat},${loc.lng}`;
        const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&travelmode=driving`;
        window.open(url, '_blank');
        return;
      }
    } catch (err) {
      // Permission denied or timeout - fall back to opening pin-only map
      console.warn('Could not get current position, opening map without origin:', err && err.message ? err.message : err);
    }

    // Fallback: open map centered on destination (no directions/origin)
    const url = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
    window.open(url, '_blank');
  };

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleString();
  };

  return (
    <div className="fc-lost-list">
      <div className="fc-lost-list-inner">
        {visiblePets.length === 0 ? (
          <div className="fc-empty-state"><h3>No lost pets</h3></div>
        ) : (
          <div className="fc-lost-grid">
            {visiblePets.map((p) => (
              <div key={p._id} className="fc-lost-card">
                <div className="fc-lost-photo">
                  <img src={p.petPhoto || (p.petPhotos && p.petPhotos[0]) || 'https://placedog.net/500/500'} alt={p.name} />
                </div>
                <div className="fc-lost-meta">
                  <h3 className="fc-lost-name">{p.name || 'Unnamed'}</h3>
                  <div className="fc-lost-breed">{formatBreed(p.breed) || p.animal || ''}</div>
                  <div className="fc-lost-owner"><strong>Owner:</strong> {p.ownerName || 'N/A'}</div>
                  <div className="fc-lost-phone"><strong>Phone:</strong> {p.ownerPhone || 'N/A'}</div>
                  {p.lostLocation ? (
                    <div className="fc-lost-location">
                      <div><strong>Last seen:</strong> {formatDate(p.lostLocation.at)}</div>
                      <div className="fc-lost-coords">Lat: {p.lostLocation.lat.toFixed(5)}, Lng: {p.lostLocation.lng.toFixed(5)}</div>
                    </div>
                  ) : (
                    <div className="fc-lost-location"><em>Location not available</em></div>
                  )}
                </div>
                <div className="fc-lost-actions">
                  {p.lostLocation && (
                    <button className="fc-btn fc-inline-btn" onClick={() => openMaps(p.lostLocation)}>View Location</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
