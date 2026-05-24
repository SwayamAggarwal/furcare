// Controller to construct Google Maps embed/search URLs for pet creches/daycares
exports.findCreches = (req, res) => {
  const fromBody = req.body || {};
  const fromQuery = req.query || {};
  const rawLat = fromBody.lat ?? fromQuery.lat;
  const rawLng = fromBody.lng ?? fromQuery.lng;

  console.log('[findCreches] request body:', req.body, 'query:', req.query);

  const lat = parseFloat(rawLat);
  const lng = parseFloat(rawLng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Invalid or missing lat/lng. Expected numbers.' });
  }

  // Prefer search terms that will show pet daycares / creches
  const query = encodeURIComponent(`pet daycare near ${lat},${lng}`);
  const embedUrl = `https://www.google.com/maps?q=${query}&center=${lat},${lng}&output=embed`;

  const directionsTemplate = `https://www.google.com/maps/dir/${lat},${lng}/{DEST_LAT},{DEST_LNG}/?travelmode=driving`;

  return res.json({ embedUrl, directionsTemplate });
};
