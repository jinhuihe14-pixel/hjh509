const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let db;

function initDB() {
  const dbDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'game.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();
  seedInitialData();

  return Promise.resolve(db);
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      rarity TEXT DEFAULT 'common',
      icon TEXT,
      type TEXT DEFAULT 'material',
      daily_limit INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      materials TEXT NOT NULL,
      result_item_id TEXT NOT NULL,
      result_count INTEGER DEFAULT 1,
      success_rate REAL DEFAULT 100,
      unlock_level INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level INTEGER UNIQUE NOT NULL,
      name TEXT,
      exp_required INTEGER DEFAULT 0,
      rewards TEXT,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS checkin_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day INTEGER UNIQUE NOT NULL,
      rewards TEXT,
      is_special INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'limited',
      start_time DATETIME,
      end_time DATETIME,
      config TEXT,
      status INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS config_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT UNIQUE NOT NULL,
      config_type TEXT,
      config_data TEXT,
      operator TEXT,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT UNIQUE NOT NULL,
      nickname TEXT,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      items TEXT DEFAULT '{}',
      last_checkin_date TEXT,
      checkin_days INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_item_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      item_id TEXT NOT NULL,
      produced INTEGER DEFAULT 0,
      consumed INTEGER DEFAULT 0,
      UNIQUE(date, item_id)
    );

    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator TEXT,
      action TEXT,
      target_type TEXT,
      target_id TEXT,
      detail TEXT,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gift_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      rewards TEXT,
      max_uses INTEGER DEFAULT 1,
      used_count INTEGER DEFAULT 0,
      player_ids TEXT DEFAULT '[]',
      expire_time DATETIME,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS player_login_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      login_date TEXT NOT NULL,
      login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, login_date)
    );
  `);
}

function seedInitialData() {
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;
  if (adminCount === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admins (username, password, role) VALUES (?, ?, ?)').run('admin', hash, 'super');
    console.log('默认管理员账号: admin / admin123');
  }

  const itemCount = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
  if (itemCount === 0) {
    const items = [
      { item_id: 'wood', name: '木材', rarity: 'common', type: 'material', icon: '🪵', sort_order: 1 },
      { item_id: 'stone', name: '石头', rarity: 'common', type: 'material', icon: '🪨', sort_order: 2 },
      { item_id: 'iron', name: '铁矿', rarity: 'uncommon', type: 'material', icon: '⛏️', sort_order: 3, daily_limit: 1000 },
      { item_id: 'gold', name: '金矿', rarity: 'rare', type: 'material', icon: '🥇', sort_order: 4, daily_limit: 100 },
      { item_id: 'plank', name: '木板', rarity: 'common', type: 'material', icon: '🟫', sort_order: 5 },
      { item_id: 'brick', name: '石砖', rarity: 'common', type: 'material', icon: '🧱', sort_order: 6 },
      { item_id: 'sword', name: '铁剑', rarity: 'uncommon', type: 'equipment', icon: '⚔️', sort_order: 7, daily_limit: 50 },
      { item_id: 'shield', name: '铁盾', rarity: 'uncommon', type: 'equipment', icon: '🛡️', sort_order: 8, daily_limit: 50 },
      { item_id: 'crystal', name: '魔法水晶', rarity: 'epic', type: 'material', icon: '💎', sort_order: 9, daily_limit: 10 },
      { item_id: 'dragon_sword', name: '屠龙剑', rarity: 'legendary', type: 'equipment', icon: '🐉', sort_order: 10, daily_limit: 1 },
    ];
    const stmt = db.prepare('INSERT INTO items (item_id, name, description, rarity, icon, type, daily_limit, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    items.forEach(item => stmt.run(item.item_id, item.name, item.name + '道具', item.rarity, item.icon, item.type, item.daily_limit, item.sort_order));
    console.log('初始化道具数据完成');
  }

  const recipeCount = db.prepare('SELECT COUNT(*) as count FROM recipes').get().count;
  if (recipeCount === 0) {
    const recipes = [
      { recipe_id: 'r_plank', name: '木板合成', materials: JSON.stringify([{ item_id: 'wood', count: 3 }]), result_item_id: 'plank', result_count: 1, success_rate: 100, unlock_level: 1, sort_order: 1 },
      { recipe_id: 'r_brick', name: '石砖合成', materials: JSON.stringify([{ item_id: 'stone', count: 3 }]), result_item_id: 'brick', result_count: 1, success_rate: 100, unlock_level: 1, sort_order: 2 },
      { recipe_id: 'r_sword', name: '铁剑合成', materials: JSON.stringify([{ item_id: 'iron', count: 5 }, { item_id: 'plank', count: 2 }]), result_item_id: 'sword', result_count: 1, success_rate: 90, unlock_level: 3, sort_order: 3 },
      { recipe_id: 'r_shield', name: '铁盾合成', materials: JSON.stringify([{ item_id: 'iron', count: 4 }, { item_id: 'brick', count: 3 }]), result_item_id: 'shield', result_count: 1, success_rate: 85, unlock_level: 3, sort_order: 4 },
      { recipe_id: 'r_crystal', name: '魔法水晶合成', materials: JSON.stringify([{ item_id: 'gold', count: 10 }, { item_id: 'iron', count: 20 }]), result_item_id: 'crystal', result_count: 1, success_rate: 50, unlock_level: 5, sort_order: 5 },
      { recipe_id: 'r_dragon_sword', name: '屠龙剑合成', materials: JSON.stringify([{ item_id: 'crystal', count: 5 }, { item_id: 'sword', count: 3 }, { item_id: 'gold', count: 50 }]), result_item_id: 'dragon_sword', result_count: 1, success_rate: 20, unlock_level: 10, sort_order: 6 },
    ];
    const stmt = db.prepare('INSERT INTO recipes (recipe_id, name, materials, result_item_id, result_count, success_rate, unlock_level, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    recipes.forEach(r => stmt.run(r.recipe_id, r.name, r.materials, r.result_item_id, r.result_count, r.success_rate, r.unlock_level, r.sort_order));
    console.log('初始化合成配方完成');
  }

  const levelCount = db.prepare('SELECT COUNT(*) as count FROM levels').get().count;
  if (levelCount === 0) {
    const levels = [
      { level: 1, name: '新手村', exp_required: 0, rewards: JSON.stringify([{ item_id: 'wood', count: 10 }]) },
      { level: 2, name: '冒险者', exp_required: 100, rewards: JSON.stringify([{ item_id: 'stone', count: 10 }]) },
      { level: 3, name: '工匠学徒', exp_required: 300, rewards: JSON.stringify([{ item_id: 'iron', count: 5 }]) },
      { level: 4, name: '熟练工匠', exp_required: 600, rewards: JSON.stringify([{ item_id: 'gold', count: 3 }]) },
      { level: 5, name: '大师', exp_required: 1000, rewards: JSON.stringify([{ item_id: 'crystal', count: 1 }]) },
    ];
    const stmt = db.prepare('INSERT INTO levels (level, name, exp_required, rewards) VALUES (?, ?, ?, ?)');
    levels.forEach(l => stmt.run(l.level, l.name, l.exp_required, l.rewards));
    console.log('初始化关卡数据完成');
  }

  const checkinCount = db.prepare('SELECT COUNT(*) as count FROM checkin_rewards').get().count;
  if (checkinCount === 0) {
    const checkins = [
      { day: 1, rewards: JSON.stringify([{ item_id: 'wood', count: 20 }]) },
      { day: 2, rewards: JSON.stringify([{ item_id: 'stone', count: 20 }]) },
      { day: 3, rewards: JSON.stringify([{ item_id: 'iron', count: 10 }]), is_special: 1 },
      { day: 4, rewards: JSON.stringify([{ item_id: 'plank', count: 15 }]) },
      { day: 5, rewards: JSON.stringify([{ item_id: 'brick', count: 15 }]) },
      { day: 6, rewards: JSON.stringify([{ item_id: 'gold', count: 5 }]) },
      { day: 7, rewards: JSON.stringify([{ item_id: 'crystal', count: 1 }, { item_id: 'gold', count: 10 }]), is_special: 1 },
    ];
    const stmt = db.prepare('INSERT INTO checkin_rewards (day, rewards, is_special) VALUES (?, ?, ?)');
    checkins.forEach(c => stmt.run(c.day, c.rewards, c.is_special));
    console.log('初始化签到奖励完成');
  }
}

function getDB() {
  if (!db) throw new Error('数据库未初始化');
  return db;
}

module.exports = { initDB, getDB };
