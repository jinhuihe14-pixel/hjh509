const express = require('express');
const router = express.Router();
const {
  getAllActivities, getActivityById, createActivity,
  updateActivity, toggleActivity, deleteActivity
} = require('../services/statsService');
const { generateConfigJSON } = require('../services/configService');
const { auth } = require('../middleware/auth');

router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const result = getAllActivities(page, pageSize);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:activityId', (req, res) => {
  try {
    const activity = getActivityById(req.params.activityId);
    if (!activity) return res.status(404).json({ success: false, message: '活动不存在' });
    res.json({ success: true, data: activity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', auth, (req, res) => {
  try {
    const data = req.body;
    if (!data.activity_id || !data.name) {
      return res.status(400).json({ success: false, message: '活动ID和名称必填' });
    }
    createActivity(data);
    generateConfigJSON();
    res.json({ success: true, message: '创建成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:activityId', auth, (req, res) => {
  try {
    updateActivity(req.params.activityId, req.body);
    generateConfigJSON();
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:activityId/toggle', auth, (req, res) => {
  try {
    const { status } = req.body;
    toggleActivity(req.params.activityId, status);
    generateConfigJSON();
    res.json({ success: true, message: status ? '活动已开启' : '活动已关闭' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:activityId', auth, (req, res) => {
  try {
    deleteActivity(req.params.activityId);
    generateConfigJSON();
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
