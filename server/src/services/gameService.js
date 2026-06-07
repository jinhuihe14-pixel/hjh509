const { getDB } = require('../db');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const {
  getAllItems, getAllRecipes, getAllLevels, getAllCheckinRewards,
  getActiveActivities, checkDailyLimit, recordItemProduction, recordItemConsumption,
  logOperation
} = require('./configService');

function getOrCreatePlayer(playerId, nickname = '') {
  const db = getDB();
  let player = db.prepare('SELECT * FROM players WHERE player_id = ?').get(playerId);

  if (!player) {
    player = {
      player_id: playerId,
      nickname: nickname || '玩家' + playerId.slice(0, 6),
      level: 1,
      exp: 0,
      items: JSON.stringify({}),
      checkin_days: 0,
      last_checkin_date: null
    };
    db.prepare(`INSERT INTO players 
      (player_id, nickname, level, exp, items, checkin_days, last_checkin_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      player.player_id, player.nickname, player.level, player.exp,
      player.items, player.checkin_days, player.last_checkin_date
    );
    player = db.prepare('SELECT * FROM players WHERE player_id = ?').get(playerId);
  }

  recordPlayerLogin(playerId);

  return player;
}

function recordPlayerLogin(playerId) {
  const db = getDB();
  const today = dayjs().format('YYYY-MM-DD');
  try {
    db.prepare('INSERT OR IGNORE INTO player_login_logs (player_id, login_date) VALUES (?, ?)').run(playerId, today);
  } catch (e) {
    // 忽略重复
  }
}

function getPlayerData(playerId) {
  const db = getDB();
  const player = db.prepare('SELECT * FROM players WHERE player_id = ?').get(playerId);
  if (!player) return null;

  return {
    ...player,
    items: JSON.parse(player.items || '{}')
  };
}

function getGameConfig() {
  return {
    items: getAllItems(),
    recipes: getAllRecipes().map(r => ({ ...r, materials: JSON.parse(r.materials) })),
    levels: getAllLevels().map(l => ({ ...l, rewards: JSON.parse(l.rewards) })),
    checkin_rewards: getAllCheckinRewards().map(c => ({ ...c, rewards: JSON.parse(c.rewards) })),
    activities: getActiveActivities().map(a => ({ ...a, config: JSON.parse(a.config) })),
  };
}

function canSynthesize(playerItems, recipe) {
  const materials = typeof recipe.materials === 'string' ? JSON.parse(recipe.materials) : recipe.materials;
  for (const mat of materials) {
    const have = playerItems[mat.item_id] || 0;
    if (have < mat.count) return false;
  }
  return true;
}

function synthesize(playerId, recipeId) {
  const db = getDB();
  const player = db.prepare('SELECT * FROM players WHERE player_id = ?').get(playerId);
  if (!player) throw new Error('玩家不存在');

  const recipe = db.prepare('SELECT * FROM recipes WHERE recipe_id = ? AND status = 1').get(recipeId);
  if (!recipe) throw new Error('配方不存在');

  const playerItems = JSON.parse(player.items || '{}');
  const materials = JSON.parse(recipe.materials);

  if (!canSynthesize(playerItems, recipe)) {
    return { success: false, message: '材料不足' };
  }

  if (player.level < recipe.unlock_level) {
    return { success: false, message: '等级不足，未解锁该配方' };
  }

  const isSuccess = Math.random() * 100 < recipe.success_rate;

  if (!isSuccess) {
    for (const mat of materials) {
      playerItems[mat.item_id] = (playerItems[mat.item_id] || 0) - mat.count;
      recordItemConsumption(mat.item_id, mat.count);
    }
    db.prepare('UPDATE players SET items = ?, updated_at = CURRENT_TIMESTAMP WHERE player_id = ?').run(
      JSON.stringify(playerItems), playerId
    );
    return { success: false, message: '合成失败，材料已消耗' };
  }

  if (!checkDailyLimit(recipe.result_item_id, recipe.result_count)) {
    return { success: false, message: '今日该道具全服产出已达上限' };
  }

  for (const mat of materials) {
    playerItems[mat.item_id] = (playerItems[mat.item_id] || 0) - mat.count;
    recordItemConsumption(mat.item_id, mat.count);
  }

  playerItems[recipe.result_item_id] = (playerItems[recipe.result_item_id] || 0) + recipe.result_count;
  recordItemProduction(recipe.result_item_id, recipe.result_count);

  const expGained = recipe.result_count * 10;
  let newExp = player.exp + expGained;
  let newLevel = player.level;

  const levels = getAllLevels().sort((a, b) => a.level - b.level);
  for (const lvl of levels) {
    if (newLevel < lvl.level && newExp >= lvl.exp_required) {
      newLevel = lvl.level;
    }
  }

  db.prepare('UPDATE players SET items = ?, exp = ?, level = ?, updated_at = CURRENT_TIMESTAMP WHERE player_id = ?').run(
    JSON.stringify(playerItems), newExp, newLevel, playerId
  );

  return {
    success: true,
    result: { item_id: recipe.result_item_id, count: recipe.result_count },
    leveled_up: newLevel > player.level,
    new_level: newLevel,
    exp_gained: expGained
  };
}

function checkin(playerId) {
  const db = getDB();
  const player = db.prepare('SELECT * FROM players WHERE player_id = ?').get(playerId);
  if (!player) throw new Error('玩家不存在');

  const today = dayjs().format('YYYY-MM-DD');

  if (player.last_checkin_date === today) {
    return { success: false, message: '今日已签到' };
  }

  let checkinDays = player.checkin_days || 0;
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  if (player.last_checkin_date !== yesterday) {
    checkinDays = 0;
  }

  checkinDays += 1;
  const rewardDay = ((checkinDays - 1) % 7) + 1;

  const checkinReward = db.prepare('SELECT * FROM checkin_rewards WHERE day = ? AND status = 1').get(rewardDay);
  if (!checkinReward) {
    return { success: false, message: '签到奖励配置错误' };
  }

  const rewards = JSON.parse(checkinReward.rewards || '[]');
  const playerItems = JSON.parse(player.items || '{}');

  for (const reward of rewards) {
    if (!checkDailyLimit(reward.item_id, reward.count)) {
      continue;
    }
    playerItems[reward.item_id] = (playerItems[reward.item_id] || 0) + reward.count;
    recordItemProduction(reward.item_id, reward.count);
  }

  db.prepare(`UPDATE players SET 
    items = ?, last_checkin_date = ?, checkin_days = ?, updated_at = CURRENT_TIMESTAMP
    WHERE player_id = ?`).run(
    JSON.stringify(playerItems), today, checkinDays, playerId
  );

  return {
    success: true,
    checkin_days: checkinDays,
    rewards,
    is_special: checkinReward.is_special === 1
  };
}

function claimLevelReward(playerId, level) {
  const db = getDB();
  const player = db.prepare('SELECT * FROM players WHERE player_id = ?').get(playerId);
  if (!player) throw new Error('玩家不存在');

  if (player.level < level) {
    return { success: false, message: '等级不足' };
  }

  const levelData = db.prepare('SELECT * FROM levels WHERE level = ? AND status = 1').get(level);
  if (!levelData) {
    return { success: false, message: '关卡不存在' };
  }

  const playerItems = JSON.parse(player.items || '{}');
  const rewards = JSON.parse(levelData.rewards || '[]');

  for (const reward of rewards) {
    if (!checkDailyLimit(reward.item_id, reward.count)) {
      continue;
    }
    playerItems[reward.item_id] = (playerItems[reward.item_id] || 0) + reward.count;
    recordItemProduction(reward.item_id, reward.count);
  }

  db.prepare('UPDATE players SET items = ?, updated_at = CURRENT_TIMESTAMP WHERE player_id = ?').run(
    JSON.stringify(playerItems), playerId
  );

  return { success: true, rewards };
}

function redeemGiftCode(playerId, code) {
  const db = getDB();
  const player = db.prepare('SELECT * FROM players WHERE player_id = ?').get(playerId);
  if (!player) throw new Error('玩家不存在');

  const giftCode = db.prepare('SELECT * FROM gift_codes WHERE code = ? AND status = 1').get(code);
  if (!giftCode) {
    return { success: false, message: '礼包码无效' };
  }

  const now = dayjs();
  if (giftCode.expire_time && dayjs(giftCode.expire_time).isBefore(now)) {
    return { success: false, message: '礼包码已过期' };
  }

  const usedPlayerIds = JSON.parse(giftCode.player_ids || '[]');
  if (usedPlayerIds.includes(playerId)) {
    return { success: false, message: '您已使用过该礼包码' };
  }

  if (giftCode.used_count >= giftCode.max_uses) {
    return { success: false, message: '礼包码已被兑换完毕' };
  }

  const playerItems = JSON.parse(player.items || '{}');
  const rewards = JSON.parse(giftCode.rewards || '[]');

  for (const reward of rewards) {
    playerItems[reward.item_id] = (playerItems[reward.item_id] || 0) + reward.count;
    recordItemProduction(reward.item_id, reward.count);
  }

  usedPlayerIds.push(playerId);
  db.prepare(`UPDATE gift_codes SET used_count = used_count + 1, player_ids = ? WHERE id = ?`).run(
    JSON.stringify(usedPlayerIds), giftCode.id
  );

  db.prepare('UPDATE players SET items = ?, updated_at = CURRENT_TIMESTAMP WHERE player_id = ?').run(
    JSON.stringify(playerItems), playerId
  );

  return { success: true, rewards };
}

function sendGiftsToPlayer(playerId, rewards, reason = '运营补偿') {
  const db = getDB();
  const player = db.prepare('SELECT * FROM players WHERE player_id = ?').get(playerId);
  if (!player) throw new Error('玩家不存在');

  const playerItems = JSON.parse(player.items || '{}');

  for (const reward of rewards) {
    playerItems[reward.item_id] = (playerItems[reward.item_id] || 0) + reward.count;
    recordItemProduction(reward.item_id, reward.count);
  }

  db.prepare('UPDATE players SET items = ?, updated_at = CURRENT_TIMESTAMP WHERE player_id = ?').run(
    JSON.stringify(playerItems), playerId
  );

  logOperation('admin', 'send_gift', 'player', playerId, JSON.stringify({ rewards, reason }));

  return { success: true };
}

function getIdleProduction(playerId) {
  return {
    wood: { rate: 1, interval: 3000 },
    stone: { rate: 1, interval: 5000 }
  };
}

function collectIdleRewards(playerId, rewards) {
  const db = getDB();
  const player = db.prepare('SELECT * FROM players WHERE player_id = ?').get(playerId);
  if (!player) throw new Error('玩家不存在');

  const playerItems = JSON.parse(player.items || '{}');
  const collected = {};

  for (const [itemId, count] of Object.entries(rewards)) {
    if (!checkDailyLimit(itemId, count)) continue;
    playerItems[itemId] = (playerItems[itemId] || 0) + count;
    recordItemProduction(itemId, count);
    collected[itemId] = count;
  }

  db.prepare('UPDATE players SET items = ?, updated_at = CURRENT_TIMESTAMP WHERE player_id = ?').run(
    JSON.stringify(playerItems), playerId
  );

  return { success: true, collected };
}

module.exports = {
  getOrCreatePlayer, getPlayerData, getGameConfig,
  synthesize, checkin, claimLevelReward, redeemGiftCode,
  sendGiftsToPlayer, getIdleProduction, collectIdleRewards
};
