const express = require('express');
const router = express.Router();
const { findCreches } = require('../controllers/findCrechesController');

// Expects JSON body: { lat: <number>, lng: <number> }
router.post('/', findCreches);

router.get('/ping', (req, res) => {
  console.log('[findCreches route] ping received');
  res.json({ ok: true, route: '/api/find-creches' });
});

module.exports = router;
