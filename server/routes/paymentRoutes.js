const express = require('express');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const Payment = require('../models/Payment');
const User = require('../models/User');

const router = express.Router();

// ================================
// 🔧 SOLANA CONFIG
// ================================
const SOLANA_RPC =
  process.env.SOLANA_RPC || 'https://api.devnet.solana.com';

const MERCHANT_WALLET = new PublicKey(
  process.env.MERCHANT_WALLET ||
    '9rZttxsDzghUFkuZ7FxYYnSFzi2TcYU46yr5pStfJr2m'
);
const { Transaction, SystemProgram, TransactionInstruction } = require('@solana/web3.js');
const connection = new Connection(SOLANA_RPC, 'confirmed');

// ================================
// 🔍 UTILS
// ================================
const isAmountValid = (lamports, expectedSol) => {
  const expected = expectedSol * LAMPORTS_PER_SOL;
  const tolerance = 0.00001 * LAMPORTS_PER_SOL; // 0.00001 SOL tolerance
  return Math.abs(lamports - expected) <= tolerance;
};

// ================================
// 🔎 TÌM TRANSACTION THEO REFERENCE (CUSTOM)
// ================================
const findTransactionByReference = async (reference, expectedAmount, maxAgeMinutes = 10) => {
  console.log('🔍 Searching for transaction with reference:', reference);
  
  const signatures = await connection.getSignaturesForAddress(
    MERCHANT_WALLET,
    { limit: 100 },
    'confirmed'
  );

  console.log(`📋 Found ${signatures.length} recent transactions`);

  const now = Date.now() / 1000;
  const maxAge = maxAgeMinutes * 60;

  for (const sigInfo of signatures) {
    // ⏰ Skip old transactions
    const txAge = now - (sigInfo.blockTime || 0);
    if (txAge > maxAge) {
      console.log(`⏰ Skipping old tx (${Math.floor(txAge / 60)} min ago)`);
      continue;
    }

    const tx = await connection.getParsedTransaction(
      sigInfo.signature,
      { maxSupportedTransactionVersion: 0 }
    );

    if (!tx || !tx.meta) continue;

    // ✅ 1. KIỂM TRA MEMO (PRIORITY)
    const memoInstruction = tx.transaction.message.instructions.find(
      (ix) =>
        ix.programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
    );

    if (memoInstruction) {
      // Parse memo data
      let memoData = '';
      if (memoInstruction.parsed) {
        memoData = memoInstruction.parsed;
      } else if (memoInstruction.data) {
        // Decode base58 data
        memoData = Buffer.from(memoInstruction.data, 'base64').toString('utf-8');
      }

      console.log(`📝 Memo found: ${memoData.slice(0, 20)}...`);

      if (memoData === reference) {
        console.log('✅ Found via MEMO:', sigInfo.signature);
        return { signature: sigInfo.signature, tx };
      }
    }

    // ✅ 2. FALLBACK - KIỂM TRA AMOUNT
    const accountKeys = tx.transaction.message.accountKeys;
    const merchantIndex = accountKeys.findIndex(
      (key) => key.pubkey.toString() === MERCHANT_WALLET.toString()
    );

    if (merchantIndex !== -1) {
      const received = tx.meta.postBalances[merchantIndex] - tx.meta.preBalances[merchantIndex];
      
      console.log(`💰 TX ${sigInfo.signature.slice(0, 8)}... received: ${received / LAMPORTS_PER_SOL} SOL (${Math.floor(txAge)}s ago)`);
      
      if (isAmountValid(received, expectedAmount)) {
        console.log('⚠️ Found via AMOUNT (no memo):', sigInfo.signature);
        return { signature: sigInfo.signature, tx };
      }
    }
  }

  return null;
};
router.get('/create-transaction', async (req, res) => {
  try {
    const { account, reference, amount } = req.query;

    console.log('🔨 Creating transaction for:', { account, reference, amount });

    if (!account || !reference || !amount) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const sender = new PublicKey(account);
    const referencePubkey = new PublicKey(reference);
    const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

    // ✅ CREATE TRANSACTION
    const transaction = new Transaction();

    // 1. Transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: MERCHANT_WALLET,
        lamports,
      })
    );

    // 2. Memo instruction (chứa reference)
    transaction.add(
      new TransactionInstruction({
        keys: [{ pubkey: sender, isSigner: true, isWritable: true }],
        data: Buffer.from(reference, 'utf-8'),
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      })
    );

    // 3. Set recent blockhash & fee payer
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sender;

    // 4. Serialize
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    console.log('✅ Transaction created');

    // ✅ SOLANA PAY SPEC RESPONSE
    return res.json({
      transaction: serialized.toString('base64'),
      message: `Vpan ${req.query.planName || 'Upgrade'} - ${amount} SOL`,
    });

  } catch (err) {
    console.error('❌ Create transaction error:', err);
    return res.status(500).json({ error: err.message });
  }
});
// ================================
// POST /api/payment/verify
// ================================
router.post('/verify', async (req, res) => {
  const { reference, userId, planId, amount } = req.body; // amount là SOL decimal

  console.log('\n================ VERIFY PAYMENT ================');
  console.log('📥 Body:', req.body);

  try {
    // 1️⃣ ĐÃ CONFIRMED TRƯỚC ĐÓ?
    const confirmed = await Payment.findOne({
      reference,
      status: 'confirmed',
    });

    if (confirmed) {
      console.log('✅ Already confirmed');
      return res.json({
        paid: true,
        signature: confirmed.signature,
        message: 'Gói đã được kích hoạt!',
      });
    }

    // 2️⃣ TÌM TRANSACTION (dùng lại logic cũ – đang chạy tốt)
    // ⚠️ Quan trọng: truyền reference dạng string và amount dạng SOL (không phải lamports)
    const result = await findTransactionByReference(reference, amount);

    if (!result) {
      console.log('⏳ No matching transaction found → pending');
      return res.json({ paid: false, status: 'pending' });
    }

    const { signature, tx } = result;

    // 3️⃣ VERIFY AMOUNT (double check – giữ nguyên)
    const accountKeys = tx.transaction.message.accountKeys;
    const merchantIndex = accountKeys.findIndex(
      (key) => key.pubkey.toString() === MERCHANT_WALLET.toString()
    );

    if (merchantIndex === -1) {
      return res.json({ paid: false, status: 'invalid_recipient' });
    }

    const received = tx.meta.postBalances[merchantIndex] - tx.meta.preBalances[merchantIndex];
    const expectedLamports = Math.round(amount * 1_000_000_000);

    if (Math.abs(received - expectedLamports) > 20000) { // sai số nhỏ
      console.log('❌ Amount mismatch');
      return res.json({ paid: false, status: 'amount_mismatch' });
    }

    // 4️⃣ CHỐNG DÙNG LẠI TX
    const used = await Payment.findOne({ signature });
    if (used) {
      console.log('⚠️ Transaction already used');
      return res.json({ paid: false, status: 'used' });
    }

    // 5️⃣ LƯU PAYMENT
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

    console.log('✅ PAYMENT CONFIRMED');

    // 6️⃣ 🔴 THÊM PHẦN CẬP NHẬT USER PLAN (bạn đang thiếu cái này ở code cũ)
    const updateUserData = {
      plan: planId,
      planPurchasedAt: new Date(),
      updatedAt: new Date(),
    };

    if (planId === 'pro') {
      updateUserData.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else if (planId === 'premium') {
      updateUserData.planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }
    // lifetime & master: không set expires

    await User.findByIdAndUpdate(userId, updateUserData);
    console.log(`✅ Đã cập nhật plan "${planId}" cho user ${userId}`);

    // 7️⃣ Trả về thành công
    return res.json({
      paid: true,
      signature,
      message: 'Thanh toán thành công! Gói đã được kích hoạt!',
    });

  } catch (err) {
    console.error('🔥 VERIFY ERROR:', err);
    return res.status(500).json({ paid: false, error: err.message || 'Server error' });
  }
});

module.exports = router;