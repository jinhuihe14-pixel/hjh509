import { gameState } from './state';
import { ui } from './ui';

let currentTab = 'backpack';

function renderGame() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="game-container">
      <div class="game-header" id="gameHeader">
        ${renderHeader()}
      </div>
      <div class="game-content" id="gameContent">
        ${renderTabContent('backpack')}
        ${renderTabContent('synthesize')}
        ${renderTabContent('checkin')}
        ${renderTabContent('levels')}
        ${renderTabContent('activities')}
      </div>
      <div class="game-tabbar" id="tabbar">
        ${renderTabbar()}
      </div>
    </div>
  `;

  bindTabEvents();
  bindEvents();
  updateIdleDisplay();
}

function renderHeader() {
  const player = gameState.state.player;
  const expProgress = gameState.getExpProgress();
  return `
    <div class="player-info">
      <div class="player-avatar">🧙</div>
      <div class="player-detail">
        <div class="player-name">${player?.nickname || '冒险者'}</div>
        <div class="player-level">
          <span class="level-text">Lv.${player?.level || 1}</span>
          <div class="exp-bar">
            <div class="exp-fill" style="width: ${expProgress}%"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="header-btns">
      <div class="header-btn" id="refreshConfigBtn">刷新配置</div>
    </div>
  `;
}

function renderTabbar() {
  const tabs = [
    { id: 'backpack', icon: '🎒', name: '背包' },
    { id: 'synthesize', icon: '⚗️', name: '合成' },
    { id: 'checkin', icon: '📅', name: '签到' },
    { id: 'levels', icon: '🏆', name: '关卡' },
    { id: 'activities', icon: '🎁', name: '活动' }
  ];

  return tabs.map(tab => `
    <div class="tab-item ${currentTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">
      <div class="tab-icon">${tab.icon}</div>
      <div class="tab-name">${tab.name}</div>
    </div>
  `).join('');
}

function renderTabContent(tabId) {
  let content = '';
  const activeClass = currentTab === tabId ? 'active' : '';

  switch (tabId) {
    case 'backpack':
      content = renderBackpackTab();
      break;
    case 'synthesize':
      content = renderSynthesizeTab();
      break;
    case 'checkin':
      content = renderCheckinTab();
      break;
    case 'levels':
      content = renderLevelsTab();
      break;
    case 'activities':
      content = renderActivitiesTab();
      break;
  }

  return `<div class="tab-content ${activeClass}" id="tab-${tabId}">${content}</div>`;
}

function renderBackpackTab() {
  const items = gameState.state.config?.items || [];
  const playerItems = gameState.state.player?.items || {};

  const ownedItems = items.filter(item => (playerItems[item.item_id] || 0) > 0);
  const otherItems = items.filter(item => (playerItems[item.item_id] || 0) === 0);
  const allItems = [...ownedItems, ...otherItems];

  const idlePending = gameState.getIdlePending();
  const woodPending = idlePending.wood || 0;
  const stonePending = idlePending.stone || 0;
  const hasPending = woodPending > 0 || stonePending > 0;

  return `
    <div class="idle-production">
      <div class="idle-title">⚡ 挂机产出</div>
      <div class="idle-items">
        <div class="idle-item">
          <div class="idle-item-icon">🪵</div>
          <div class="idle-item-name">木材</div>
          <div class="idle-item-rate">+${woodPending} 待收取</div>
        </div>
        <div class="idle-item">
          <div class="idle-item-icon">🪨</div>
          <div class="idle-item-name">石头</div>
          <div class="idle-item-rate">+${stonePending} 待收取</div>
        </div>
      </div>
      <button class="collect-btn" id="collectBtn">一键收取</button>
    </div>

    <div class="section-title">背包装备</div>
    <div class="card">
      ${allItems.length > 0 ? `
        <div class="items-grid">
          ${allItems.map(item => `
            <div class="item-cell rarity-${item.rarity}">
              <div class="item-icon">${item.icon || '📦'}</div>
              <div class="item-name">${item.name}</div>
              <div class="item-count">${playerItems[item.item_id] || 0}</div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-icon">🎒</div>
          <div>背包空空如也</div>
        </div>
      `}
    </div>
  `;
}

function renderSynthesizeTab() {
  const recipes = gameState.state.config?.recipes || [];
  const playerItems = gameState.state.player?.items || {};
  const playerLevel = gameState.state.player?.level || 1;

  const availableRecipes = recipes.filter(r => r.status === 1);

  return `
    <div class="section-title">合成配方</div>
    <div>
      ${availableRecipes.length > 0 ? availableRecipes.map(recipe => {
        const canMake = gameState.canSynthesize(recipe);
        const locked = playerLevel < recipe.unlock_level;

        return `
          <div class="recipe-item" data-recipe="${recipe.recipe_id}">
            <div class="recipe-materials">
              ${recipe.materials.map(mat => {
                const have = playerItems[mat.item_id] || 0;
                const enough = have >= mat.count;
                const item = gameState.getItem(mat.item_id);
                return `
                  <span class="recipe-mat ${enough ? '' : 'not-enough'}">
                    <span class="recipe-mat-icon">${item?.icon || '📦'}</span>
                    ${have}/${mat.count}
                  </span>
                `;
              }).join(' + ')}
            </div>
            <div class="recipe-arrow">→</div>
            <div class="recipe-result">
              <span class="recipe-result-icon">${gameState.getItem(recipe.result_item_id)?.icon || '📦'}</span>
              <span class="recipe-result-name">${gameState.getItem(recipe.result_item_id)?.name || recipe.result_item_id}</span>
            </div>
            <button class="synthesize-btn" data-recipe-id="${recipe.recipe_id}" ${!canMake ? 'disabled' : ''}>
              ${locked ? 'Lv.' + recipe.unlock_level + '解锁' : '合成'}
            </button>
          </div>
        `;
      }).join('') : `
        <div class="empty-state">
          <div class="empty-icon">⚗️</div>
          <div>暂无合成配方</div>
        </div>
      `}
    </div>
  `;
}

function renderCheckinTab() {
  const rewards = gameState.state.config?.checkin_rewards || [];
  const checkinDays = gameState.state.player?.checkin_days || 0;
  const hasChecked = gameState.hasCheckedInToday();
  const today = (checkinDays % 7) + (hasChecked ? 0 : 1);

  return `
    <div class="section-title">每日签到</div>
    <div class="card">
      <div style="text-align: center; margin-bottom: 16px;">
        <span style="font-size: 14px; color: #606266;">已连续签到 </span>
        <span style="font-size: 24px; font-weight: bold; color: #667eea;">${checkinDays}</span>
        <span style="font-size: 14px; color: #606266;"> 天</span>
      </div>
      <div class="checkin-grid">
        ${[1, 2, 3, 4, 5, 6, 7].map(day => {
          const reward = rewards.find(r => r.day === day);
          const isChecked = day < today || (hasChecked && day === today);
          const isToday = !hasChecked && day === today;
          const isSpecial = reward?.is_special === 1;
          const firstReward = reward?.rewards?.[0];
          const item = firstReward ? gameState.getItem(firstReward.item_id) : null;

          return `
            <div class="checkin-day ${isChecked ? 'checked' : ''} ${isToday ? 'today' : ''} ${isSpecial ? 'special' : ''}">
              ${isChecked ? '<div class="checked-badge">✓</div>' : ''}
              <div class="checkin-day-num">第${day}天</div>
              <div class="checkin-day-icon">${item?.icon || '🎁'}</div>
              <div class="checkin-day-reward">${firstReward ? 'x' + firstReward.count : ''}</div>
            </div>
          `;
        }).join('')}
      </div>
      <button class="checkin-btn" id="checkinBtn" ${hasChecked ? 'disabled' : ''}>
        ${hasChecked ? '今日已签到' : '立即签到'}
      </button>
    </div>
  `;
}

function renderLevelsTab() {
  const levels = gameState.state.config?.levels || [];
  const playerLevel = gameState.state.player?.level || 1;
  const claimedLevels = gameState.state.claimedLevels || [];

  return `
    <div class="section-title">关卡挑战</div>
    <div>
      ${levels.sort((a, b) => a.level - b.level).map(level => {
        const unlocked = playerLevel >= level.level;
        const claimed = claimedLevels.includes(level.level);

        return `
          <div class="level-item">
            <div class="level-num">
              <span class="level-num-text">${level.level}</span>
              <span class="level-num-label">关</span>
            </div>
            <div class="level-info">
              <div class="level-name">${level.name || '第' + level.level + '关'}</div>
              <div class="level-exp">需要经验: ${level.exp_required}</div>
              <div class="level-rewards">
                ${level.rewards.map(r => {
                  const item = gameState.getItem(r.item_id);
                  return `
                    <span class="level-reward">
                      ${item?.icon || '📦'} ${item?.name || r.item_id} x${r.count}
                    </span>
                  `;
                }).join('')}
              </div>
            </div>
            <button class="level-claim-btn ${claimed ? 'claimed' : ''}" data-level="${level.level}" ${!unlocked || claimed ? 'disabled' : ''}>
              ${claimed ? '已领取' : unlocked ? '领取' : '未解锁'}
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderActivitiesTab() {
  const activities = gameState.state.config?.activities || [];

  return `
    <div class="section-title">限时活动</div>
    <div>
      ${activities.length > 0 ? activities.map(act => `
        <div class="activity-item">
          <div class="activity-header">
            <span class="activity-name">${act.name}</span>
            <span class="activity-type">${act.type === 'festival' ? '节日' : '限时'}</span>
          </div>
          <div class="activity-time">
            ${act.start_time || ''} ~ ${act.end_time || '长期有效'}
          </div>
          <div class="activity-desc">
            ${act.config?.description || '活动进行中，参与获得丰厚奖励！'}
          </div>
        </div>
      `).join('') : `
        <div class="card" style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
          <div style="color: #909399;">暂无进行中的活动</div>
          <div style="font-size: 12px; color: #c0c4cc; margin-top: 4px;">敬请期待精彩活动</div>
        </div>
      `}
    </div>

    <div class="gift-code-section">
      <div class="section-title">礼包兑换</div>
      <div class="card">
        <p style="font-size: 13px; color: #606266; margin-bottom: 10px;">输入礼包码兑换奖励</p>
        <div class="gift-code-input-wrap">
          <input type="text" class="gift-code-input" id="giftCodeInput" placeholder="请输入礼包码" />
          <button class="gift-code-btn" id="redeemBtn">兑换</button>
        </div>
      </div>
    </div>
  `;
}

function bindTabEvents() {
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });
}

function switchTab(tabId) {
  if (currentTab === tabId) return;

  currentTab = tabId;

  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  const targetContent = document.getElementById(`tab-${tabId}`);
  if (targetContent) {
    targetContent.classList.add('active');
  }

  const contentEl = document.getElementById('gameContent');
  if (contentEl) {
    contentEl.innerHTML = `
      ${renderTabContent('backpack')}
      ${renderTabContent('synthesize')}
      ${renderTabContent('checkin')}
      ${renderTabContent('levels')}
      ${renderTabContent('activities')}
    `;
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.add('active');
    bindEvents();
  }
}

function bindEvents() {
  const collectBtn = document.getElementById('collectBtn');
  if (collectBtn) {
    collectBtn.addEventListener('click', handleCollect);
  }

  const checkinBtn = document.getElementById('checkinBtn');
  if (checkinBtn) {
    checkinBtn.addEventListener('click', handleCheckin);
  }

  document.querySelectorAll('.synthesize-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const recipeId = btn.dataset.recipeId;
      handleSynthesize(recipeId);
    });
  });

  document.querySelectorAll('.level-claim-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const level = parseInt(btn.dataset.level);
      handleClaimLevel(level);
    });
  });

  const redeemBtn = document.getElementById('redeemBtn');
  if (redeemBtn) {
    redeemBtn.addEventListener('click', handleRedeem);
  }

  const refreshBtn = document.getElementById('refreshConfigBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', handleRefreshConfig);
  }
}

async function handleCollect() {
  const result = await gameState.collectIdleRewards();
  if (result.success && result.collected) {
    const rewardsList = Object.entries(result.collected).map(([item_id, count]) => ({ item_id, count }));
    if (rewardsList.length > 0) {
      ui.showModal({
        title: '收取成功',
        content: '获得以下资源：',
        rewards: rewardsList,
        showCancel: false,
        confirmText: '太棒了'
      });
    }
    refreshUI();
  } else {
    ui.showToast(result.message || '收取失败');
  }
}

async function handleCheckin() {
  const result = await gameState.doCheckin();
  if (result.success) {
    ui.showModal({
      title: '签到成功',
      content: result.is_special ? '今日是特殊签到日！' : '今日签到奖励：',
      rewards: result.rewards,
      showCancel: false,
      confirmText: '收下了'
    });
    refreshUI();
  } else {
    ui.showToast(result.message || '签到失败');
  }
}

async function handleSynthesize(recipeId) {
  ui.playSynthesizeAnimation();

  const result = await gameState.synthesize(recipeId);
  if (result.success) {
    ui.showModal({
      title: result.leveled_up ? '🎉 升级啦！' : '✨ 合成成功',
      content: result.leveled_up ? `恭喜升至 Lv.${result.new_level}！` : '合成成功，获得：',
      rewards: result.result ? [result.result] : [],
      showCancel: false,
      confirmText: '太棒了'
    });
    refreshUI();
  } else {
    ui.showToast(result.message || '合成失败');
    refreshUI();
  }
}

async function handleClaimLevel(level) {
  const result = await gameState.claimLevelReward(level);
  if (result.success) {
    ui.showModal({
      title: '领取成功',
      content: '获得关卡奖励：',
      rewards: result.rewards,
      showCancel: false,
      confirmText: '收下了'
    });
    refreshUI();
  } else {
    ui.showToast(result.message || '领取失败');
  }
}

async function handleRedeem() {
  const input = document.getElementById('giftCodeInput');
  const code = input?.value?.trim();

  if (!code) {
    ui.showToast('请输入礼包码');
    return;
  }

  const result = await gameState.redeemGiftCode(code);
  if (result.success) {
    ui.showModal({
      title: '兑换成功',
      content: '恭喜获得：',
      rewards: result.rewards,
      showCancel: false,
      confirmText: '太棒了'
    });
    if (input) input.value = '';
    refreshUI();
  } else {
    ui.showToast(result.message || '兑换失败');
  }
}

async function handleRefreshConfig() {
  ui.showToast('正在刷新配置...');
  try {
    const { gameApi } = await import('../api');
    const res = await gameApi.getConfig();
    if (res.success) {
      gameState.state.config = res.data;
      localStorage.setItem('game_config', JSON.stringify(res.data));
      refreshUI();
      ui.showToast('配置已更新');
    }
  } catch (e) {
    ui.showToast('刷新失败');
  }
}

function refreshUI() {
  const header = document.getElementById('gameHeader');
  if (header) header.innerHTML = renderHeader();

  const content = document.getElementById('gameContent');
  if (content) {
    content.innerHTML = `
      ${renderTabContent('backpack')}
      ${renderTabContent('synthesize')}
      ${renderTabContent('checkin')}
      ${renderTabContent('levels')}
      ${renderTabContent('activities')}
    `;
    const target = document.getElementById(`tab-${currentTab}`);
    if (target) target.classList.add('active');
  }

  const tabbar = document.getElementById('tabbar');
  if (tabbar) tabbar.innerHTML = renderTabbar();

  bindTabEvents();
  bindEvents();
}

function updateIdleDisplay() {
  const pending = gameState.getIdlePending();
  const wood = pending.wood || 0;
  const stone = pending.stone || 0;

  const collectBtn = document.getElementById('collectBtn');
  if (collectBtn) {
    const total = wood + stone;
    collectBtn.textContent = total > 0 ? `一键收取 (+${total})` : '一键收取';
  }

  if (currentTab === 'backpack') {
    const idleItems = document.querySelectorAll('.idle-item');
    if (idleItems.length >= 2) {
      const woodRate = idleItems[0].querySelector('.idle-item-rate');
      const stoneRate = idleItems[1].querySelector('.idle-item-rate');
      if (woodRate) woodRate.textContent = `+${wood} 待收取`;
      if (stoneRate) stoneRate.textContent = `+${stone} 待收取`;
    }
  }
}

window.onIdleUpdate = function() {
  updateIdleDisplay();
};

export const gameUI = {
  renderGame,
  refreshUI,
  switchTab,
  updateIdleDisplay
};

export default gameUI;
