import { gameState } from './state';

let toastTimer = null;

function showToast(message, duration = 2000) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

function showModal({ title, content, rewards, onConfirm, onCancel, showCancel = true, confirmText = '确定', cancelText = '取消' }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  let rewardsHtml = '';
  if (rewards && rewards.length > 0) {
    rewardsHtml = '<div class="modal-rewards">';
    for (const reward of rewards) {
      const item = gameState.getItem(reward.item_id);
      const icon = item?.icon || '📦';
      const name = item?.name || reward.item_id;
      rewardsHtml += `
        <div class="modal-reward-item">
          <div class="modal-reward-icon">${icon}</div>
          <div class="modal-reward-name">${name}</div>
          <div class="modal-reward-count">x${reward.count}</div>
        </div>
      `;
    }
    rewardsHtml += '</div>';
  }

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">${title || '提示'}</div>
      <div class="modal-body">${content || ''}</div>
      ${rewardsHtml}
      <div class="modal-footer">
        ${showCancel ? `<button class="modal-btn cancel">${cancelText}</button>` : ''}
        <button class="modal-btn primary">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.classList.add('show');
  });

  const close = () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  };

  overlay.querySelector('.modal-btn.cancel')?.addEventListener('click', () => {
    onCancel && onCancel();
    close();
  });

  overlay.querySelector('.modal-btn.primary').addEventListener('click', () => {
    const result = onConfirm && onConfirm();
    if (result !== false) close();
  });

  return { close };
}

function playSynthesizeAnimation() {
  const anim = document.createElement('div');
  anim.className = 'synthesize-animation';
  anim.innerHTML = '<div class="synthesize-circle"></div>';
  document.body.appendChild(anim);

  setTimeout(() => anim.remove(), 600);
}

export const ui = {
  showToast,
  showModal,
  playSynthesizeAnimation
};

export default ui;
