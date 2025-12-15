const express = require('express');
const { Connection, PublicKey } = require('@solana/web3.js');
const Payment = require('../models/Payment');

const router = express.Router();

// ===== SOLANA CONFIG =====
const SOLANA_RPC =
  process.env.SOLANA_RPC || 'https://api.devnet.solana.com';

const MERCHANT_WALLET = new PublicKey(
  process.env.MERCHANT_WALLET ||
    '9rZttxsDzghUFkuZ7FxYYnSFzi2TcYU46yr5pStfJr2m'
);

const connection = new Connection(SOLANA_RPC, 'confirmed');

// ================================
// POST /api/payment/verify
// ================================
router.post('/verify', async (req, res) => {
  const { reference, userId, planId, amount } = req.body;

  if (!reference || !userId || !planId || !amount) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const referenceKey = new PublicKey(reference);

    // 🔍 tìm transaction chứa reference
    const signatures = await connection.getSignaturesForAddress(
      referenceKey,
      { limit: 1 }
    );

    if (signatures.length === 0) {
      return res.json({ paid: false });
    }

    const signature = signatures[0].signature;

    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return res.json({ paid: false });
    }

    // ✅ kiểm tra ví nhận
    const validRecipient =
      tx.transaction.message.instructions.some(
        (i) =>
          i.parsed?.info?.destination ===
          MERCHANT_WALLET.toBase58()
      );

    if (!validRecipient) {
      return res
        .status(400)
        .json({ error: 'Invalid recipient' });
    }

    // 💾 lưu DB
    await Payment.findOneAndUpdate(
      { reference },
      {
        userId,
        planId,
        amountSol: amount,
        signature,
        status: 'confirmed',
      },
      { upsert: true, new: true }
    );

    return res.json({
      paid: true,
      signature,
    });
  } catch (err) {
    console.error('[PAYMENT VERIFY ERROR]', err);
    return res
      .status(500)
      .json({ error: 'Server error' });
  }
});

// ================================
// GET /api/payment/status/:reference
// ================================
router.get('/status/:reference', async (req, res) => {
  const payment = await Payment.findOne({
    reference: req.params.reference,
  });

  if (!payment) {
    return res.json({ status: 'pending' });
  }

  res.json({
    status: payment.status,
    planId: payment.planId,
  });
});

module.exports = router;
