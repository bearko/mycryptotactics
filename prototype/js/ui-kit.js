// ui-kit.js — UI の共通部品 (SPEC-010)
//
// - installModalA11y(): role="dialog" の振る舞いをそろえる
//     * data-esc-close="<閉じるボタンの CSS セレクタ>" を持つダイアログが一番上に開いていたら、Esc でそのボタンを押す
//     * キーボードで操作しているときだけ、開いたダイアログの最初のボタンにフォーカスを移す（タッチでは動かさない）
//   開く・閉じる処理そのもの（aria-hidden の切り替えなど）は各画面のコードのまま触らない
// - showToast(): alert() の代わり。画面の下に出て自動で消える（aria-live）

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Esc で押すボタンのセレクタを返す（純関数）。
 * 開いているダイアログのうち DOM で一番後ろ（= 上に重なる）を見る。それが Esc を受けないなら何もしない。
 * @param {{escClose: string|null, open: boolean}[]} dialogs DOM 順
 * @returns {string|null}
 */
export function escTarget(dialogs) {
  for (let i = dialogs.length - 1; i >= 0; i--) {
    const d = dialogs[i];
    if (!d.open) continue;
    return d.escClose || null;
  }
  return null;
}

const isOpen = (el) => !el.classList.contains('hidden');
let lastInput = 'pointer';

export function installModalA11y(root = document) {
  const dialogs = Array.from(root.querySelectorAll('[role="dialog"]'));
  if (!dialogs.length) return;

  root.addEventListener('keydown', () => { lastInput = 'keyboard'; }, true);
  root.addEventListener('pointerdown', () => { lastInput = 'pointer'; }, true);

  const obs = new MutationObserver((records) => {
    for (const r of records) {
      const el = r.target;
      const wasHidden = (r.oldValue || '').split(/\s+/).includes('hidden');
      if (!wasHidden || !isOpen(el) || lastInput !== 'keyboard') continue;
      // 中身を描き終えてから（開いたあとに innerHTML で描く画面がある）
      requestAnimationFrame(() => {
        const t = isOpen(el) && el.querySelector(FOCUSABLE);
        if (t) { try { t.focus({ preventScroll: true }); } catch (_) { t.focus(); } }
      });
    }
  });
  for (const el of dialogs) {
    obs.observe(el, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  }

  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const sel = escTarget(dialogs.map((el) => ({ escClose: el.getAttribute('data-esc-close'), open: isOpen(el) })));
    if (!sel) return;
    const owner = dialogs.filter(isOpen).pop();
    const btn = owner && owner.querySelector(sel);
    if (btn) {
      e.preventDefault();
      btn.click();
    }
  });
}

/**
 * alert() の代わりのトースト。
 * @param {string} message
 * @param {{tone?: 'info'|'good'|'bad', ms?: number}} [opt]
 */
export function showToast(message, opt = {}) {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = 'toast' + (opt.tone && opt.tone !== 'info' ? ` toast--${opt.tone}` : '');
  el.setAttribute('role', 'status');
  el.textContent = message;
  stack.appendChild(el);
  while (stack.children.length > 3) stack.firstElementChild.remove();
  const ms = opt.ms ?? 4000;
  setTimeout(() => {
    el.classList.add('toast--out');
    setTimeout(() => el.remove(), 260);
  }, ms);
  el.addEventListener('click', () => el.remove());
}
