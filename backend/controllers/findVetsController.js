// Controller to construct Google Maps embed/search URLs without using paid APIs
exports.findVets = (req, res) => {
  // Accept lat/lng either in JSON body (POST) or query params (GET) for easier testing
  const fromBody = req.body || {};
  const fromQuery = req.query || {};
  const rawLat = fromBody.lat ?? fromQuery.lat;
  const rawLng = fromBody.lng ?? fromQuery.lng;

  // Log for quick server-side debugging
  console.log('[findVets] request body:', req.body, 'query:', req.query);

  const lat = parseFloat(rawLat);
  const lng = parseFloat(rawLng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Invalid or missing lat/lng. Expected numbers.' });
  }

  // Build a free Google Maps search/embed URL that does not require an API key.
  // This will show veterinarian results near the provided coordinates.
  const query = encodeURIComponent(`veterinarian near ${lat},${lng}`);
  const embedUrl = `https://www.google.com/maps?q=${query}&center=${lat},${lng}&output=embed`;

  // A non-embed directions template the frontend can use when the user picks a destination.
  // Replace {DEST_LAT} and {DEST_LNG} with the destination coordinates.
  const directionsTemplate = `https://www.google.com/maps/dir/${lat},${lng}/{DEST_LAT},{DEST_LNG}/?travelmode=driving`;

  return res.json({ embedUrl, directionsTemplate });
};
