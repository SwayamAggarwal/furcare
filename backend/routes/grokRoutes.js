const express = require('express');
const { chat } = require('../controllers/grokController');

const router = express.Router();

router.post('/chat', chat);
router.post('/analysis', require('../controllers/grokController').analysis);

module.exports = router;
