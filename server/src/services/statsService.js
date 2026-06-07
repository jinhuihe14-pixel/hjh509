const { getDB } = require('../db');
const dayjs = require('dayjs');
const { logOperation } = require('./configService');

function createActivity(data, operator = 'admin') {
  const db = getDB();
  const result = db.prepare(`INSERT INTO activities
    (activity_id, name, type, start_time, end_time, config, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    data.activity_id, data.name, data.type || 'limited',
    data.start_time || null, data.end_time || null,
    JSON.stringify(data.config || {}),
    data.status !== undefined ? data.status : 0
  );
  logOperation(operator, 'create_activity', 'activity', data.activity_id, JSON.stringify(data));
  return result;
}

function updateActivity(activityId, data, operator = 'admin') {
  const db = getDB();
  db.prepare(`UPDATE activities SET
    name = ?, type = ?, start_time = ?, end_time = ?, config = ?,
    status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE activity_id = ?`).run(
    data.name, data.type || 'limited',
    data.start_time || null, data.end_time || null,
    JSON.stringify(data.config || {}),
    data.status !== undefined ? data.status : 0,
    activityId
  );
  logOperation(operator, 'update_activity', 'activity', activityId, JSON.stringify(data));
}

function toggleActivity(activityId, status, operator = 'admin') {
  const db = getDB();
  db.prepare('UPDATE activities SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE activity_id = ?').run(
    status ? 1 : 0, activityId
  );
  logOperation(operator, 'toggle_activity', 'activity', activityId, JSON.stringify({ status: status ? 1 : 0 }));
}

function deleteActivity(activityId, operator = 'admin') {
  const db = getDB();
  db.prepare('DELETE FROM activities WHERE activity_id = ?').run(activityId);
  logOperation(operator, 'delete_activity', 'activity', activityId);
}

function getAllActivities(page = 1, pageSize = 20) {
  const db = getDB();
  const offset = (page - 1) * pageSize;
  const total = db.prepare('SELECT COUNT(*) as count FROM activities').get().count;
  const list = db.prepare('SELECT * FROM activities ORDER BY id DESC LIMIT ? OFFSET ?').all(pageSize, offset).map(a => ({
    ...a,
    config: JSON.parse(a.config || '{}')
  }));
  return { list, total, page, pageSize };
}

function getActivityById(activityId) {
  const db = getDB();
  const activity = db.prepare('SELECT * FROM activities WHERE activity_id = ?').get(activityId);
  if (activity) {
    activity.config = JSON.parse(activity.config || '{}');
  }
  return activity;
}

function getStatsOverview() {
  const db = getDB();
  const today = dayjs().format('YYYY-MM-DD');

  const totalPlayers = db.prepare('SELECT COUNT(*) as count FROM players').get().count;
  const todayActive = db.prepare('SELECT COUNT(DISTINCT player_id) as count FROM player_login_logs WHERE login_date = ?').get(today).count;

  const todayStats = db.prepare('SELECT item_id, produced, consumed FROM daily_item_stats WHERE date = ?').all(today);

  const itemStats = {};
  for (const stat of todayStats) {
    itemStats[stat.item_id] = { produced: stat.produced, consumed: stat.consumed };
  }

  return {
    total_players: totalPlayers,
    today_active: todayActive,
    today_item_stats: itemStats
  };
}

function getRetentionStats(days = 7) {
  const db = getDB();
  const result = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    const newUsers = db.prepare('SELECT COUNT(DISTINCT player_id) as count FROM player_login_logs WHERE login_date = ? AND player_id IN (SELECT player_id FROM players WHERE DATE(created_at) = ?)').get(date, date).count;
    const activeUsers = db.prepare('SELECT COUNT(DISTINCT player_id) as count FROM player_login_logs WHERE login_date = ?').get(date).count;

    let d1Retention = 0;
    if (i >= 1) {
      const prevDate = dayjs().subtract(i + 1, 'day').format('YYYY-MM-DD');
      const prevNew = db.prepare('SELECT COUNT(DISTINCT player_id) as count FROM player_login_logs WHERE login_date = ? AND player_id IN (SELECT player_id FROM players WHERE DATE(created_at) = ?)').get(prevDate, prevDate).count;
      const retained = db.prepare(`SELECT COUNT(DISTINCT l.player_id) as count 
        FROM player_login_logs l
        INNER JOIN players p ON l.player_id = p.player_id
        WHERE l.login_date = ? AND DATE(p.created_at) = ?`).get(date, prevDate).count;
      d1Retention = prevNew > 0 ? Math.round((retained / prevNew) * 100) : 0;
    }

    result.push({
      date,
      new_users: newUsers,
      active_users: activeUsers,
      d1_retention: d1Retention
    });
  }

  return result;
}

function getItemProductionStats(days = 7) {
  const db = getDB();
  const result = [];
  const items = db.prepare('SELECT item_id, name FROM items WHERE status = 1 ORDER BY sort_order ASC').all();

  for (let i = days - 1; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    const dayStats = { date };

    for (const item of items) {
      const stat = db.prepare('SELECT produced, consumed FROM daily_item_stats WHERE date = ? AND item_id = ?').get(date, item.item_id);
      dayStats[item.item_id] = {
        produced: stat ? stat.produced : 0,
        consumed: stat ? stat.consumed : 0
      };
    }

    result.push(dayStats);
  }

  return { items, stats: result };
}

function createGiftCode(data, operator = 'admin') {
  const db = getDB();
  const result = db.prepare(`INSERT INTO gift_codes
    (code, rewards, max_uses, expire_time, status)
    VALUES (?, ?, ?, ?, ?)`).run(
    data.code, JSON.stringify(data.rewards || []),
    data.max_uses || 1, data.expire_time || null,
    data.status !== undefined ? data.status : 1
  );
  logOperation(operator, 'create_gift_code', 'gift_code', data.code, JSON.stringify(data));
  return result;
}

function getAllGiftCodes(page = 1, pageSize = 20) {
  const db = getDB();
  const offset = (page - 1) * pageSize;
  const total = db.prepare('SELECT COUNT(*) as count FROM gift_codes').get().count;
  const list = db.prepare('SELECT * FROM gift_codes ORDER BY id DESC LIMIT ? OFFSET ?').all(pageSize, offset).map(g => ({
    ...g,
    rewards: JSON.parse(g.rewards || '[]'),
    player_ids: JSON.parse(g.player_ids || '[]')
  }));
  return { list, total, page, pageSize };
}

function deleteGiftCode(id, operator = 'admin') {
  const db = getDB();
  const codeInfo = db.prepare('SELECT code FROM gift_codes WHERE id = ?').get(id);
  db.prepare('DELETE FROM gift_codes WHERE id = ?').run(id);
  if (codeInfo) {
    logOperation(operator, 'delete_gift_code', 'gift_code', codeInfo.code);
  }
}

function getAllPlayers(page = 1, pageSize = 20, keyword = '') {
  const db = getDB();
  const offset = (page - 1) * pageSize;
  let where = '';
  let params = [pageSize, offset];

  if (keyword) {
    where = 'WHERE player_id LIKE ? OR nickname LIKE ?';
    params = [`%${keyword}%`, `%${keyword}%`, pageSize, offset];
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM players ${where}`).get(...params.slice(0, params.length - 2)).count;
  const list = db.prepare(`SELECT * FROM players ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params).map(p => ({
    ...p,
    items: JSON.parse(p.items || '{}')
  }));

  return { list, total, page, pageSize };
}

module.exports = {
  createActivity, updateActivity, toggleActivity, deleteActivity,
  getAllActivities, getActivityById,
  getStatsOverview, getRetentionStats, getItemProductionStats,
  createGiftCode, getAllGiftCodes, deleteGiftCode,
  getAllPlayers
};
