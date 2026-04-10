const axios = require('axios');

const GRAMMAR_AI_PORT = 8001;

/**
 * Helper: wait Grammar AI ready
 */
async function waitGrammarAIReady(timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await axios.get(`http://127.0.0.1:${GRAMMAR_AI_PORT}/health`);
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error('Grammar AI not ready');
}

/**
 * Helper: simple diff by character
 * output format for frontend highlight
 */
function diffChars(original, corrected) {
  const maxLen = Math.max(original.length, corrected.length);
  const userDiff = [];
  const aiDiff = [];

  for (let i = 0; i < maxLen; i++) {
    const o = original[i] || '';
    const c = corrected[i] || '';

    userDiff.push({
      char: o,
      highlight: o !== c
    });

    aiDiff.push({
      char: c,
      highlight: o !== c
    });
  }

  return { userDiff, aiDiff };
}

/**
 * MAIN CONTROLLER
 * POST /api/grammar/check
 */
exports.checkGrammar = async (req, res) => {
  const { sentence, sourceLang = 'ja' } = req.body;

  if (!sentence || !String(sentence).trim()) {
    return res.status(400).json({ error: 'Thiếu sentence' });
  }

  try {
    await waitGrammarAIReady();

    // 1️⃣ Call Python Grammar AI
    const aiRes = await axios.post(
      `http://127.0.0.1:${GRAMMAR_AI_PORT}/correct`,
      { sentence, sourceLang },
      { timeout: 60000 }
    );

    const corrected = aiRes.data.corrected || sentence;
    const isDifferent = corrected.trim() !== sentence.trim();

    // 2️⃣ Diff highlight
    const diff = diffChars(sentence, corrected);

    // 3️⃣ Response for frontend
    res.json({
      input: sentence,
      corrected,
      isDifferent,
      diff,
      meta: {
        sourceLang,
        length: sentence.length
      }
    });

  } catch (err) {
    console.error('[GrammarAIController]', err.message);
    res.status(500).json({
      error: 'Grammar AI controller error',
      detail: err.message
    });
  }
};
