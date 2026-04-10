const express = require('express');
const router = express.Router();
const { checkGrammar } = require('../controllers/grammarAIController');

router.post('/check', checkGrammar);

module.exports = router;
