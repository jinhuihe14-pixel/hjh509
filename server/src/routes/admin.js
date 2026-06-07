const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDB } = require('../db');
const { auth, generateToken } = require('../middleware/auth');
const { sendGiftsToPlayer, redeemGiftCode } = require('../services/gameService');
const { createGiftCode, getAllGiftCodes, deleteGiftCode, getAllPlayers } = require('../services/statsService');

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码必填' });
    }

    const db = getDB();
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const token = generateToken(admin);
    res.json({
      success: true,
      data: {
        token,
        admin: { id: admin.id, username: admin.username, role: admin.role }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/profile', auth, (req, res) => {
  res.json({ success: true, data: req.admin });
});

router.get('/players', auth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const keyword = req.query.keyword || '';
    const result = getAllPlayers(page, pageSize, keyword);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/players/send-gift', auth, (req, res) => {
  try {
    const { player_id, rewards, reason } = req.body;
    if (!player_id || !rewards || !Array.isArray(rewards)) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    const result = sendGiftsToPlayer(player_id, rewards, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/gift-codes', auth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const result = getAllGiftCodes(page, pageSize);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/gift-codes', auth, (req, res) => {
  try {
    const data = req.body;
    if (!data.code || !data.rewards) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    createGiftCode(data);
    res.json({ success: true, message: '创建成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/gift-codes/:id', auth, (req, res) => {
  try {
    deleteGiftCode(parseInt(req.params.id));
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/gift-code/redeem', (req, res) => {
  try {
    const { player_id, code } = req.body;
    if (!player_id || !code) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    const result = redeemGiftCode(player_id, code);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
