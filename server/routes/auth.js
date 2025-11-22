// routes/auth.js – ĐÃ THÊM IN TOKEN RA CONSOLE ĐẸP + DỄ COPY

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ĐĂNG KÝ – log đẹp
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log('\n╔════════════════════════════════════╗');
    console.log('║       NEW REGISTER ATTEMPT         ║');
    console.log('╠════════════════════════════════════╣');
    console.log(`║ Name  : ${name || 'N/A'}`.padEnd(44) + '║');
    console.log(`║ Email : ${email || 'N/A'}`.padEnd(44) + '║');
    console.log(`║ IP    : ${req.ip || req.connection.remoteAddress || 'N/A'}`.padEnd(44) + '║');
    console.log('╚════════════════════════════════════╝');

    if (!name || !email || !password) {
      console.log('❌ Thiếu field → Register failed');
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ" });
    }

    const existed = await User.findOne({ email });
    if (existed) {
      console.log('❌ Email đã tồn tại → Register failed');
      return res.status(400).json({ message: "Email đã được sử dụng" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const newUser = new User({ name, email, password: hashed });
    await newUser.save();

    console.log('✅ Đăng ký thành công:', email);
    console.log('──────────────────────────────────────────\n');

    res.status(201).json({ message: "Đăng ký thành công!" });
  } catch (err) {
    console.error('🔥 LỖI SERVER khi đăng ký:', err.message);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// ĐĂNG NHẬP – IN TOKEN RA CONSOLE RÕ RÀNG + DỄ COPY
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('\n╔════════════════════════════════════╗');
    console.log('║        NEW LOGIN ATTEMPT           ║');
    console.log('╠════════════════════════════════════╣');
    console.log(`║ Email : ${email || 'N/A'}`.padEnd(44) + '║');
    console.log(`║ IP    : ${req.ip || req.connection.remoteAddress || 'N/A'}`.padEnd(44) + '║');
    console.log('╚════════════════════════════════════╝');

    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ Không tìm thấy email → Login failed');
      return res.status(400).json({ message: "Email hoặc mật khẩu sai" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Mật khẩu sai → Login failed');
      return res.status(400).json({ message: "Email hoặc mật khẩu sai" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "vpan_secret_2025",
      { expiresIn: "7d" }
    );

    // IN TOKEN RA CONSOLE – ĐẸP + DỄ COPY
    console.log('✅ ĐĂNG NHẬP THÀNH CÔNG!');
    console.log('👤 User :', user.name, `<${user.email}>`);
    console.log('📅 Thời gian:', new Date().toLocaleString('vi-VN'));
    console.log('\n🔑 JWT TOKEN (copy ngay để test):');
    console.log('────────────────────────────────────────────────────────────');
    console.log(token);
    console.log('────────────────────────────────────────────────────────────\n');

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('🔥 LỖI SERVER khi đăng nhập:', err.message);
    res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;