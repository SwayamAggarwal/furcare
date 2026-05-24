const express = require('express');
const router = express.Router();
const { findVets } = require('../controllers/findVetsController');

// Expects JSON body: { lat: <number>, lng: <number> }
router.post('/', findVets);

// Simple ping for debugging route mounting
router.get('/ping', (req, res) => {
	console.log('[findVets route] ping received');
	res.json({ ok: true, route: '/api/find-vets' });
});

module.exports = router;
