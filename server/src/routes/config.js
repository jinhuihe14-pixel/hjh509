const express = require('express');
const router = express.Router();
const {
  getAllItems, getItemById, createItem, updateItem, deleteItem,
  getAllRecipes, createRecipe, updateRecipe, deleteRecipe,
  getAllLevels, saveLevel, deleteLevel,
  getAllCheckinRewards, saveCheckinReward, deleteCheckinReward,
  generateConfigJSON, getConfigVersions, rollbackConfig,
  getOperationLogs, getActiveActivities
} = require('../services/configService');

const { auth } = require('../middleware/auth');

router.get('/items', (req, res) => {
  try {
    const items = getAllItems();
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/items/:itemId', (req, res) => {
  try {
    const item = getItemById(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: '道具不存在' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/items', auth, (req, res) => {
  try {
    const data = req.body;
    if (!data.item_id || !data.name) {
      return res.status(400).json({ success: false, message: 'item_id 和 name 必填' });
    }
    if (data.daily_limit < 0) {
      return res.status(400).json({ success: false, message: '每日产出上限不能为负数' });
    }
    if (['legendary', 'epic'].includes(data.rarity) && (data.daily_limit === 0 || data.daily_limit > 100)) {
      return res.status(400).json({ success: false, message: '稀有/史诗道具单日产出上限必须设置且不超过100' });
    }
    createItem(data, req.admin.username);
    generateConfigJSON();
    res.json({ success: true, message: '创建成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/items/:itemId', auth, (req, res) => {
  try {
    const data = req.body;
    if (data.daily_limit < 0) {
      return res.status(400).json({ success: false, message: '每日产出上限不能为负数' });
    }
    if (['legendary', 'epic'].includes(data.rarity) && (data.daily_limit === 0 || data.daily_limit > 100)) {
      return res.status(400).json({ success: false, message: '稀有/史诗道具单日产出上限必须设置且不超过100' });
    }
    updateItem(req.params.itemId, data, req.admin.username);
    generateConfigJSON();
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/items/:itemId', auth, (req, res) => {
  try {
    deleteItem(req.params.itemId, req.admin.username);
    generateConfigJSON();
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/recipes', (req, res) => {
  try {
    const recipes = getAllRecipes().map(r => ({ ...r, materials: JSON.parse(r.materials) }));
    res.json({ success: true, data: recipes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/recipes', auth, (req, res) => {
  try {
    const data = req.body;
    if (!data.recipe_id || !data.name || !data.materials || !data.result_item_id) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    if (data.success_rate < 0 || data.success_rate > 100) {
      return res.status(400).json({ success: false, message: '成功率必须在 0-100 之间' });
    }
    createRecipe(data, req.admin.username);
    generateConfigJSON();
    res.json({ success: true, message: '创建成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/recipes/:recipeId', auth, (req, res) => {
  try {
    const data = req.body;
    if (data.success_rate < 0 || data.success_rate > 100) {
      return res.status(400).json({ success: false, message: '成功率必须在 0-100 之间' });
    }
    updateRecipe(req.params.recipeId, data, req.admin.username);
    generateConfigJSON();
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/recipes/:recipeId', auth, (req, res) => {
  try {
    deleteRecipe(req.params.recipeId, req.admin.username);
    generateConfigJSON();
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/levels', (req, res) => {
  try {
    const levels = getAllLevels().map(l => ({ ...l, rewards: JSON.parse(l.rewards) }));
    res.json({ success: true, data: levels });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/levels', auth, (req, res) => {
  try {
    const data = req.body;
    if (!data.level || data.level < 1) {
      return res.status(400).json({ success: false, message: '等级参数无效' });
    }
    saveLevel(data, req.admin.username);
    generateConfigJSON();
    res.json({ success: true, message: '保存成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/levels/:level', auth, (req, res) => {
  try {
    deleteLevel(parseInt(req.params.level), req.admin.username);
    generateConfigJSON();
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/checkin', (req, res) => {
  try {
    const rewards = getAllCheckinRewards().map(c => ({ ...c, rewards: JSON.parse(c.rewards) }));
    res.json({ success: true, data: rewards });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/checkin', auth, (req, res) => {
  try {
    const data = req.body;
    if (!data.day || data.day < 1) {
      return res.status(400).json({ success: false, message: '天数参数无效' });
    }
    saveCheckinReward(data, req.admin.username);
    generateConfigJSON();
    res.json({ success: true, message: '保存成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/checkin/:day', auth, (req, res) => {
  try {
    deleteCheckinReward(parseInt(req.params.day), req.admin.username);
    generateConfigJSON();
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/activities', (req, res) => {
  try {
    const activities = getActiveActivities().map(a => ({ ...a, config: JSON.parse(a.config) }));
    res.json({ success: true, data: activities });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/versions', auth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const result = getConfigVersions(page, pageSize);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/rollback/:versionId', auth, (req, res) => {
  try {
    rollbackConfig(parseInt(req.params.versionId));
    res.json({ success: true, message: '回滚成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/logs', auth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const result = getOperationLogs(page, pageSize, req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/generate', auth, (req, res) => {
  try {
    const config = generateConfigJSON();
    res.json({ success: true, data: { version: config.version } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
