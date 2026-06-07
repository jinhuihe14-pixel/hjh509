import { gameState } from './game/state';
import { gameUI } from './game/gameUI';
import { ui } from './game/ui';

async function main() {
  const progressBar = document.getElementById('loadingProgress');
  const loadingScreen = document.getElementById('loadingScreen');

  const updateProgress = (percent) => {
    if (progressBar) {
      progressBar.style.width = percent + '%';
    }
  };

  try {
    updateProgress(10);

    await gameState.initGame(updateProgress);

    updateProgress(100);

    setTimeout(() => {
      if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.5s';
        setTimeout(() => loadingScreen.remove(), 500);
      }

      gameUI.renderGame();

      console.log('🎮 游戏加载完成');
      console.log('玩家ID:', gameState.state.player.player_id);
      console.log('等级:', gameState.state.player.level);
    }, 300);
  } catch (err) {
    console.error('游戏加载失败:', err);
    if (loadingScreen) {
      loadingScreen.innerHTML = `
        <div style="color: #fff; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">😢</div>
          <div style="font-size: 16px; margin-bottom: 8px;">游戏加载失败</div>
          <div style="font-size: 12px; opacity: 0.8;">${err.message || '请刷新页面重试'}</div>
          <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 30px; background: #fff; border: none; border-radius: 20px; color: #667eea; font-weight: bold; cursor: pointer;">重新加载</button>
        </div>
      `;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
