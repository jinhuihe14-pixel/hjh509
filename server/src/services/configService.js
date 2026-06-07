const { getDB } = require('../db');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');

function getAllItems() {
  const db = getDB();
  return db.prepare('SELECT * FROM items WHERE status = 1 ORDER BY sort_order ASC, id ASC').all();
}

function getItemById(itemId) {
  const db = getDB();
  return db.prepare('SELECT * FROM items WHERE item_id = ?').get(itemId);
}

function createItem(data, operator = 'system') {
  const db = getDB();
  const result = db.prepare(`INSERT INTO items 
    (item_id, name, description, rarity, icon, type, daily_limit, sort_order, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    data.item_id, data.name, data.description || '', data.rarity || 'common',
    data.icon || '', data.type || 'material', data.daily_limit || 0,
    data.sort_order || 0, data.status !== undefined ? data.status : 1
  );
  logOperation(operator, 'create_item', 'item', data.item_id, JSON.stringify(data));
  return result;
}

function updateItem(itemId, data, operator = 'system') {
  const db = getDB();
  db.prepare(`UPDATE items SET 
    name = ?, description = ?, rarity = ?, icon = ?, type = ?, 
    daily_limit = ?, sort_order = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE item_id = ?`).run(
    data.name, data.description || '', data.rarity || 'common',
    data.icon || '', data.type || 'material', data.daily_limit || 0,
    data.sort_order || 0, data.status !== undefined ? data.status : 1, itemId
  );
  logOperation(operator, 'update_item', 'item', itemId, JSON.stringify(data));
}

function deleteItem(itemId, operator = 'system') {
  const db = getDB();
  db.prepare('UPDATE items SET status = 0, updated_at = CURRENT_TIMESTAMP WHERE item_id = ?').run(itemId);
  logOperation(operator, 'delete_item', 'item', itemId);
}

function getAllRecipes() {
  const db = getDB();
  return db.prepare('SELECT * FROM recipes WHERE status = 1 ORDER BY sort_order ASC, id ASC').all();
}

function createRecipe(data, operator = 'system') {
  const db = getDB();
  const result = db.prepare(`INSERT INTO recipes
    (recipe_id, name, materials, result_item_id, result_count, success_rate, unlock_level, sort_order, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    data.recipe_id, data.name, JSON.stringify(data.materials),
    data.result_item_id, data.result_count || 1,
    data.success_rate || 100, data.unlock_level || 1,
    data.sort_order || 0, data.status !== undefined ? data.status : 1
  );
  logOperation(operator, 'create_recipe', 'recipe', data.recipe_id, JSON.stringify(data));
  return result;
}

function updateRecipe(recipeId, data, operator = 'system') {
  const db = getDB();
  db.prepare(`UPDATE recipes SET
    name = ?, materials = ?, result_item_id = ?, result_count = ?,
    success_rate = ?, unlock_level = ?, sort_order = ?, status = ?,
    updated_at = CURRENT_TIMESTAMP WHERE recipe_id = ?`).run(
    data.name, JSON.stringify(data.materials), data.result_item_id,
    data.result_count || 1, data.success_rate || 100,
    data.unlock_level || 1, data.sort_order || 0,
    data.status !== undefined ? data.status : 1, recipeId
  );
  logOperation(operator, 'update_recipe', 'recipe', recipeId, JSON.stringify(data));
}

function deleteRecipe(recipeId, operator = 'system') {
  const db = getDB();
  db.prepare('UPDATE recipes SET status = 0, updated_at = CURRENT_TIMESTAMP WHERE recipe_id = ?').run(recipeId);
  logOperation(operator, 'delete_recipe', 'recipe', recipeId);
}

function getAllLevels() {
  const db = getDB();
  return db.prepare('SELECT * FROM levels WHERE status = 1 ORDER BY level ASC').all();
}

function saveLevel(data, operator = 'system') {
  const db = getDB();
  const exists = db.prepare('SELECT level FROM levels WHERE level = ?').get(data.level);
  if (exists) {
    db.prepare('UPDATE levels SET name = ?, exp_required = ?, rewards = ?, status = ? WHERE level = ?').run(
      data.name || '', data.exp_required || 0, JSON.stringify(data.rewards || []),
      data.status !== undefined ? data.status : 1, data.level
    );
  } else {
    db.prepare('INSERT INTO levels (level, name, exp_required, rewards, status) VALUES (?, ?, ?, ?, ?)').run(
      data.level, data.name || '', data.exp_required || 0,
      JSON.stringify(data.rewards || []), data.status !== undefined ? data.status : 1
    );
  }
  logOperation(operator, 'save_level', 'level', String(data.level));
}

function deleteLevel(level, operator = 'system') {
  const db = getDB();
  db.prepare('UPDATE levels SET status = 0 WHERE level = ?').run(level);
  logOperation(operator, 'delete_level', 'level', String(level));
}

function getAllCheckinRewards() {
  const db = getDB();
  return db.prepare('SELECT * FROM checkin_rewards WHERE status = 1 ORDER BY day ASC').all();
}

function saveCheckinReward(data, operator = 'system') {
  const db = getDB();
  const exists = db.prepare('SELECT day FROM checkin_rewards WHERE day = ?').get(data.day);
  if (exists) {
    db.prepare('UPDATE checkin_rewards SET rewards = ?, is_special = ?, status = ? WHERE day = ?').run(
      JSON.stringify(data.rewards || []), data.is_special || 0,
      data.status !== undefined ? data.status : 1, data.day
    );
  } else {
    db.prepare('INSERT INTO checkin_rewards (day, rewards, is_special, status) VALUES (?, ?, ?, ?)').run(
      data.day, JSON.stringify(data.rewards || []), data.is_special || 0,
      data.status !== undefined ? data.status : 1
    );
  }
  logOperation(operator, 'save_checkin', 'checkin', String(data.day));
}

function deleteCheckinReward(day, operator = 'system') {
  const db = getDB();
  db.prepare('UPDATE checkin_rewards SET status = 0 WHERE day = ?').run(day);
  logOperation(operator, 'delete_checkin', 'checkin', String(day));
}

function generateConfigJSON() {
  const config = {
    version: dayjs().format('YYYYMMDDHHmmss'),
    generated_at: new Date().toISOString(),
    items: getAllItems(),
    recipes: getAllRecipes().map(r => ({ ...r, materials: JSON.parse(r.materials) })),
    levels: getAllLevels().map(l => ({ ...l, rewards: JSON.parse(l.rewards) })),
    checkin_rewards: getAllCheckinRewards().map(c => ({ ...c, rewards: JSON.parse(c.rewards) })),
    activities: getActiveActivities().map(a => ({ ...a, config: JSON.parse(a.config) })),
  };

  const configDir = path.join(__dirname, '../../public/config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configPath = path.join(configDir, 'game_config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  saveConfigVersion('full', config);

  return config;
}

function getActiveActivities() {
  const db = getDB();
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  return db.prepare(`SELECT * FROM activities 
    WHERE status = 1 
    AND (start_time IS NULL OR start_time <= ?)
    AND (end_time IS NULL OR end_time >= ?)
    ORDER BY created_at DESC`).all(now, now);
}

function saveConfigVersion(configType, configData) {
  const db = getDB();
  const version = 'v' + dayjs().format('YYYYMMDDHHmmss') + '_' + uuidv4().slice(0, 8);
  db.prepare('INSERT INTO config_versions (version, config_type, config_data, operator, remark) VALUES (?, ?, ?, ?, ?)').run(
    version, configType, JSON.stringify(configData), 'system', '自动保存配置版本'
  );
  return version;
}

function getConfigVersions(page = 1, pageSize = 20) {
  const db = getDB();
  const offset = (page - 1) * pageSize;
  const total = db.prepare('SELECT COUNT(*) as count FROM config_versions').get().count;
  const list = db.prepare('SELECT id, version, config_type, operator, remark, created_at FROM config_versions ORDER BY id DESC LIMIT ? OFFSET ?').all(pageSize, offset);
  return { list, total, page, pageSize };
}

function rollbackConfig(versionId) {
  const db = getDB();
  const versionData = db.prepare('SELECT * FROM config_versions WHERE id = ?').get(versionId);
  if (!versionData) throw new Error('版本不存在');

  const config = JSON.parse(versionData.config_data);

  if (config.items) {
    db.prepare('DELETE FROM items').run();
    const stmt = db.prepare(`INSERT INTO items 
      (item_id, name, description, rarity, icon, type, daily_limit, sort_order, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    config.items.forEach(item => stmt.run(
      item.item_id, item.name, item.description, item.rarity,
      item.icon, item.type, item.daily_limit, item.sort_order, item.status
    ));
  }

  if (config.recipes) {
    db.prepare('DELETE FROM recipes').run();
    const stmt = db.prepare(`INSERT INTO recipes
      (recipe_id, name, materials, result_item_id, result_count, success_rate, unlock_level, sort_order, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    config.recipes.forEach(r => stmt.run(
      r.recipe_id, r.name, JSON.stringify(r.materials), r.result_item_id,
      r.result_count, r.success_rate, r.unlock_level, r.sort_order, r.status
    ));
  }

  logOperation('system', 'rollback_config', 'config_version', String(versionId));

  generateConfigJSON();
}

function logOperation(operator, action, targetType, targetId, detail = '') {
  const db = getDB();
  db.prepare('INSERT INTO operation_logs (operator, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    operator, action, targetType, targetId, detail
  );
}

function getOperationLogs(page = 1, pageSize = 20, filter = {}) {
  const db = getDB();
  const offset = (page - 1) * pageSize;
  let where = [];
  let params = [];

  if (filter.action) {
    where.push('action LIKE ?');
    params.push('%' + filter.action + '%');
  }
  if (filter.operator) {
    where.push('operator LIKE ?');
    params.push('%' + filter.operator + '%');
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) as count FROM operation_logs ${whereSql}`).get(...params).count;
  const list = db.prepare(`SELECT * FROM operation_logs ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset);

  return { list, total, page, pageSize };
}

function checkDailyLimit(itemId, count = 1) {
  const db = getDB();
  const item = db.prepare('SELECT daily_limit FROM items WHERE item_id = ?').get(itemId);
  if (!item || item.daily_limit <= 0) return true;

  const today = dayjs().format('YYYY-MM-DD');
  const stat = db.prepare('SELECT produced FROM daily_item_stats WHERE date = ? AND item_id = ?').get(today, itemId);
  const produced = stat ? stat.produced : 0;

  return (produced + count) <= item.daily_limit;
}

function recordItemProduction(itemId, count = 1) {
  const db = getDB();
  const today = dayjs().format('YYYY-MM-DD');
  const exists = db.prepare('SELECT id FROM daily_item_stats WHERE date = ? AND item_id = ?').get(today, itemId);

  if (exists) {
    db.prepare('UPDATE daily_item_stats SET produced = produced + ? WHERE date = ? AND item_id = ?').run(count, today, itemId);
  } else {
    db.prepare('INSERT INTO daily_item_stats (date, item_id, produced) VALUES (?, ?, ?)').run(today, itemId, count);
  }
}

function recordItemConsumption(itemId, count = 1) {
  const db = getDB();
  const today = dayjs().format('YYYY-MM-DD');
  const exists = db.prepare('SELECT id FROM daily_item_stats WHERE date = ? AND item_id = ?').get(today, itemId);

  if (exists) {
    db.prepare('UPDATE daily_item_stats SET consumed = consumed + ? WHERE date = ? AND item_id = ?').run(count, today, itemId);
  } else {
    db.prepare('INSERT INTO daily_item_stats (date, item_id, consumed) VALUES (?, ?, ?)').run(today, itemId, count);
  }
}

module.exports = {
  getAllItems, getItemById, createItem, updateItem, deleteItem,
  getAllRecipes, createRecipe, updateRecipe, deleteRecipe,
  getAllLevels, saveLevel, deleteLevel,
  getAllCheckinRewards, saveCheckinReward, deleteCheckinReward,
  generateConfigJSON, getActiveActivities,
  saveConfigVersion, getConfigVersions, rollbackConfig,
  logOperation, getOperationLogs,
  checkDailyLimit, recordItemProduction, recordItemConsumption
};
