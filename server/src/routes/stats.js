const express = require('express');
const router = express.Router();
const { getStatsOverview, getRetentionStats, getItemProductionStats } = require('../services/statsService');
const { auth } = require('../middleware/auth');

router.get('/overview', auth, (req, res) => {
  try {
    const stats = getStatsOverview();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/retention', auth, (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const stats = getRetentionStats(days);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/items', auth, (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const stats = getItemProductionStats(days);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
