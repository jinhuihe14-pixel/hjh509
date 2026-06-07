const express = require('express');
const router = express.Router();
const {
  getGameConfig, getPlayerData, getOrCreatePlayer,
  synthesize, checkin, claimLevelReward,
  getIdleProduction, collectIdleRewards
} = require('../services/gameService');

function getPlayerId(req) {
  return req.headers['x-player-id'] || req.query.player_id || req.body.player_id;
}

router.get('/config', (req, res) => {
  try {
    const config = getGameConfig();
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/login', (req, res) => {
  try {
    const { player_id, nickname } = req.body;
    if (!player_id) {
      return res.status(400).json({ success: false, message: 'player_id 必填' });
    }
    const player = getOrCreatePlayer(player_id, nickname);
    const playerData = {
      ...player,
      items: JSON.parse(player.items || '{}')
    };
    const config = getGameConfig();
    res.json({ success: true, data: { player: playerData, config } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/player', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    if (!playerId) {
      return res.status(400).json({ success: false, message: 'player_id 必填' });
    }
    const player = getPlayerData(playerId);
    if (!player) return res.status(404).json({ success: false, message: '玩家不存在' });
    res.json({ success: true, data: player });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/synthesize', (req, res) => {
  try {
    const { player_id, recipe_id } = req.body;
    if (!player_id || !recipe_id) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    const result = synthesize(player_id, recipe_id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/checkin', (req, res) => {
  try {
    const { player_id } = req.body;
    if (!player_id) {
      return res.status(400).json({ success: false, message: 'player_id 必填' });
    }
    const result = checkin(player_id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/level/reward', (req, res) => {
  try {
    const { player_id, level } = req.body;
    if (!player_id || !level) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    const result = claimLevelReward(player_id, parseInt(level));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/idle/production', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const production = getIdleProduction(playerId);
    res.json({ success: true, data: production });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/idle/collect', (req, res) => {
  try {
    const { player_id, rewards } = req.body;
    if (!player_id || !rewards) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    const result = collectIdleRewards(player_id, rewards);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
