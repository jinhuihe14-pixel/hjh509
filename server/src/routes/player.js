const express = require('express');
const router = express.Router();
const { sendGiftsToPlayer } = require('../services/gameService');
const { auth } = require('../middleware/auth');

router.post('/send-gift', auth, (req, res) => {
  try {
    const { player_id, rewards, reason } = req.body;
    if (!player_id || !rewards) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    const result = sendGiftsToPlayer(player_id, rewards, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
