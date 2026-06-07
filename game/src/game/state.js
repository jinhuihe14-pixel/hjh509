import { gameApi } from '../api';

const STORAGE_KEY = 'game_player_data';
const CONFIG_KEY = 'game_config';

const state = {
  player: null,
  config: null,
  idleTimers: {},
  idlePending: {},
  claimedLevels: []
};

function getPlayerId() {
  let pid = localStorage.getItem('game_player_id');
  if (!pid) {
    pid = 'player_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem('game_player_id', pid);
  }
  return pid;
}

async function initGame(updateProgress) {
  const playerId = getPlayerId();

  updateProgress && updateProgress(20);

  try {
    const res = await gameApi.login(playerId, '冒险者');
    if (res.success) {
      state.player = res.data.player;
      state.config = res.data.config;
      saveConfigCache(res.data.config);
    } else {
      throw new Error(res.message || '登录失败');
    }
  } catch (err) {
    const cachedConfig = getConfigCache();
    if (cachedConfig) {
      state.config = cachedConfig;
      state.player = {
        player_id: playerId,
        nickname: '冒险者',
        level: 1,
        exp: 0,
        items: {},
        checkin_days: 0,
        last_checkin_date: null
      };
    } else {
      throw err;
    }
  }

  updateProgress && updateProgress(60);

  loadClaimedLevels();
  initIdleProduction();

  updateProgress && updateProgress(100);

  return state;
}

function saveConfigCache(config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (e) {}
}

function getConfigCache() {
  try {
    const data = localStorage.getItem(CONFIG_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

function savePlayerCache() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.player));
  } catch (e) {}
}

function loadClaimedLevels() {
  try {
    const data = localStorage.getItem('claimed_levels');
    state.claimedLevels = data ? JSON.parse(data) : [];
  } catch (e) {
    state.claimedLevels = [];
  }
}

function saveClaimedLevels() {
  try {
    localStorage.setItem('claimed_levels', JSON.stringify(state.claimedLevels));
  } catch (e) {}
}

function getItem(itemId) {
  if (!state.config?.items) return null;
  return state.config.items.find(i => i.item_id === itemId);
}

function getItemCount(itemId) {
  return state.player?.items?.[itemId] || 0;
}

function addItem(itemId, count) {
  if (!state.player.items) state.player.items = {};
  state.player.items[itemId] = (state.player.items[itemId] || 0) + count;
  savePlayerCache();
}

function removeItem(itemId, count) {
  if (!state.player.items) return false;
  const current = state.player.items[itemId] || 0;
  if (current < count) return false;
  state.player.items[itemId] = current - count;
  savePlayerCache();
  return true;
}

function canSynthesize(recipe) {
  if (!recipe?.materials) return false;
  if (state.player.level < recipe.unlock_level) return false;

  for (const mat of recipe.materials) {
    if (getItemCount(mat.item_id) < mat.count) return false;
  }
  return true;
}

async function synthesize(recipeId) {
  const recipe = state.config.recipes.find(r => r.recipe_id === recipeId);
  if (!recipe) return { success: false, message: '配方不存在' };

  if (!canSynthesize(recipe)) {
    return { success: false, message: '材料不足或等级不够' };
  }

  const playerId = state.player.player_id;

  try {
    const res = await gameApi.synthesize(playerId, recipeId);
    if (res.success && res.data.success) {
      for (const mat of recipe.materials) {
        removeItem(mat.item_id, mat.count);
      }
      if (res.data.result) {
        addItem(res.data.result.item_id, res.data.result.count);
      }
      if (res.data.new_level) {
        state.player.level = res.data.new_level;
      }
      if (res.data.exp_gained) {
        state.player.exp += res.data.exp_gained;
      }
      savePlayerCache();
      return res.data;
    } else {
      if (res.data?.message) {
        return res.data;
      }
      return { success: false, message: '合成失败' };
    }
  } catch (err) {
    return { success: false, message: '网络错误' };
  }
}

function hasCheckedInToday() {
  if (!state.player?.last_checkin_date) return false;
  const today = new Date().toISOString().split('T')[0];
  return state.player.last_checkin_date === today;
}

async function doCheckin() {
  if (hasCheckedInToday()) {
    return { success: false, message: '今日已签到' };
  }

  try {
    const res = await gameApi.checkin(state.player.player_id);
    if (res.success && res.data.success) {
      state.player.checkin_days = res.data.checkin_days;
      state.player.last_checkin_date = new Date().toISOString().split('T')[0];

      if (res.data.rewards) {
        for (const reward of res.data.rewards) {
          addItem(reward.item_id, reward.count);
        }
      }
      savePlayerCache();
      return res.data;
    } else {
      return res.data || { success: false, message: '签到失败' };
    }
  } catch (err) {
    return { success: false, message: '网络错误' };
  }
}

async function claimLevelReward(level) {
  if (state.player.level < level) {
    return { success: false, message: '等级不足' };
  }
  if (state.claimedLevels.includes(level)) {
    return { success: false, message: '已领取' };
  }

  try {
    const res = await gameApi.claimLevelReward(state.player.player_id, level);
    if (res.success && res.data.success) {
      state.claimedLevels.push(level);
      saveClaimedLevels();
      if (res.data.rewards) {
        for (const reward of res.data.rewards) {
          addItem(reward.item_id, reward.count);
        }
      }
      return res.data;
    } else {
      return res.data || { success: false, message: '领取失败' };
    }
  } catch (err) {
    return { success: false, message: '网络错误' };
  }
}

function initIdleProduction() {
  if (!state.config?.items) return;

  const productionItems = ['wood', 'stone'];
  const intervals = {
    wood: 3000,
    stone: 5000
  };

  for (const itemId of productionItems) {
    if (!state.idleTimers[itemId]) {
      state.idlePending[itemId] = state.idlePending[itemId] || 0;
      state.idleTimers[itemId] = setInterval(() => {
        state.idlePending[itemId] = (state.idlePending[itemId] || 0) + 1;
        if (window.onIdleUpdate) {
          window.onIdleUpdate(itemId, state.idlePending[itemId]);
        }
      }, intervals[itemId]);
    }
  }
}

function getIdlePending() {
  return { ...state.idlePending };
}

async function collectIdleRewards() {
  const rewards = { ...state.idlePending };
  const total = Object.values(rewards).reduce((s, n) => s + n, 0);

  if (total <= 0) {
    return { success: false, message: '没有可收取的资源' };
  }

  try {
    const res = await gameApi.collectIdleRewards(state.player.player_id, rewards);
    if (res.success && res.data.collected) {
      for (const [itemId, count] of Object.entries(res.data.collected)) {
        addItem(itemId, count);
        state.idlePending[itemId] = (state.idlePending[itemId] || 0) - count;
        if (state.idlePending[itemId] < 0) state.idlePending[itemId] = 0;
      }
      return { success: true, collected: res.data.collected };
    }
    return res.data || { success: false };
  } catch (err) {
    for (const [itemId, count] of Object.entries(rewards)) {
      addItem(itemId, count);
      state.idlePending[itemId] = 0;
    }
    return { success: true, collected: rewards };
  }
}

async function redeemGiftCode(code) {
  if (!code || !code.trim()) {
    return { success: false, message: '请输入礼包码' };
  }

  try {
    const res = await gameApi.redeemGiftCode(state.player.player_id, code.trim());
    if (res.success && res.data?.success) {
      if (res.data.rewards) {
        for (const reward of res.data.rewards) {
          addItem(reward.item_id, reward.count);
        }
      }
      return res.data;
    } else {
      return res.data || { success: false, message: '兑换失败' };
    }
  } catch (err) {
    return { success: false, message: '网络错误' };
  }
}

async function refreshActivities() {
  try {
    const res = await gameApi.getActivities();
    if (res.success && res.data) {
      state.config.activities = res.data;
      saveConfigCache(state.config);
      return res.data;
    }
  } catch (e) {}
  return state.config?.activities || [];
}

function getActivityRemainingTime(activity) {
  if (!activity?.end_time) {
    return { ended: false, forever: true, text: '长期有效' };
  }

  const now = Date.now();
  const endTime = new Date(activity.end_time.replace(' ', 'T')).getTime();
  const remaining = endTime - now;

  if (remaining <= 0) {
    return { ended: true, text: '已结束' };
  }

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  let text = '';
  if (days > 0) {
    text = `${days}天${hours}时${minutes}分`;
  } else if (hours > 0) {
    text = `${hours}时${minutes}分${seconds}秒`;
  } else if (minutes > 0) {
    text = `${minutes}分${seconds}秒`;
  } else {
    text = `${seconds}秒`;
  }

  return { ended: false, forever: false, days, hours, minutes, seconds, text, remaining };
}

function getExpProgress() {
  if (!state.config?.levels || !state.player) return 0;
  const levels = state.config.levels.sort((a, b) => a.level - b.level);
  const currentLevel = state.player.level;

  const currentLevelData = levels.find(l => l.level === currentLevel);
  const nextLevelData = levels.find(l => l.level === currentLevel + 1);

  if (!nextLevelData) return 100;

  const currentExp = state.player.exp - (currentLevelData?.exp_required || 0);
  const neededExp = nextLevelData.exp_required - (currentLevelData?.exp_required || 0);

  if (neededExp <= 0) return 100;
  return Math.min(100, Math.floor((currentExp / neededExp) * 100));
}

export const gameState = {
  state,
  getPlayerId,
  initGame,
  getItem,
  getItemCount,
  addItem,
  removeItem,
  canSynthesize,
  synthesize,
  hasCheckedInToday,
  doCheckin,
  claimLevelReward,
  getIdlePending,
  collectIdleRewards,
  redeemGiftCode,
  getExpProgress,
  refreshActivities,
  getActivityRemainingTime
};

export default gameState;
