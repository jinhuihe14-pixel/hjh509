const API_BASE = '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, config);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('请求失败:', err);
    throw err;
  }
}

export const gameApi = {
  login(playerId, nickname) {
    return request('/game/login', {
      method: 'POST',
      body: { player_id: playerId, nickname }
    });
  },

  getConfig() {
    return request('/game/config');
  },

  getPlayer(playerId) {
    return request(`/game/player?player_id=${playerId}`);
  },

  synthesize(playerId, recipeId) {
    return request('/game/synthesize', {
      method: 'POST',
      body: { player_id: playerId, recipe_id: recipeId }
    });
  },

  checkin(playerId) {
    return request('/game/checkin', {
      method: 'POST',
      body: { player_id: playerId }
    });
  },

  claimLevelReward(playerId, level) {
    return request('/game/level/reward', {
      method: 'POST',
      body: { player_id: playerId, level }
    });
  },

  collectIdleRewards(playerId, rewards) {
    return request('/game/idle/collect', {
      method: 'POST',
      body: { player_id: playerId, rewards }
    });
  },

  redeemGiftCode(playerId, code) {
    return request('/admin/gift-code/redeem', {
      method: 'POST',
      body: { player_id: playerId, code }
    });
  },

  getIdleProduction(playerId) {
    return request(`/game/idle/production?player_id=${playerId}`);
  }
};

export default gameApi;
