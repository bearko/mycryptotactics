/**
 * アチーブメント（実績）— localStorage で永続化。
 * 元タイトル 2023 年 Achievement（トロフィー NFT）リリースのリスペクト。
 *
 * 解放はラン横断で記録され、タイトル画面の「実績」モーダルで一覧できる。
 */

const STORAGE_KEY = 'mct_achievements_v1';

/** 実績マスタ */
export const ACHIEVEMENTS = [
  {
    id: 'first-clear',
    name: '初制覇',
    desc: '全章をクリアする（諭吉組デビュー）',
    icon: '🏆',
  },
  {
    id: 'yoshiko-defeated',
    name: 'よしこ討伐',
    desc: '章間レイドのヨシュカを撃破する',
    icon: '🍵',
  },
  {
    id: 'yoshiko-choco-endured',
    name: 'チョコ耐久勝利',
    desc: 'ヨシュカ・チョコの 30 ターン耐久を凌ぎ「チョコ片」を入手する',
    icon: '🍫',
  },
  {
    id: 'jin-active',
    name: '陣（JIN）発動',
    desc: '1 ラン中に陣（JIN）を発動させる',
    icon: '🪄',
  },
  {
    id: 'shingen-clear',
    name: 'ナーフ後でクリア',
    desc: '武田信玄（ナーフ後）を含めたデッキで全章をクリアする',
    icon: '⚖️',
  },
  {
    id: 'scout-all-lands',
    name: '9 ランド + 流星街 制覇',
    desc: 'ラン横断で 10 ランドすべてを選択する',
    icon: '🏳️',
  },
  {
    id: 'mchc-shop-buy',
    name: 'Eco 3.0 デビュー',
    desc: 'MCHC ショップで Legendary 枠を解放する',
    icon: '💠',
  },
  {
    id: 'ema3-burn',
    name: 'EMA3 デビュー',
    desc: 'ext を焼却して輝く原石を入手する',
    icon: '💎',
  },
];

const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

/** localStorage から状態をロード（未解放配列＋ランド訪問履歴） */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: [], visitedLands: [] };
    const parsed = JSON.parse(raw);
    return {
      unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked : [],
      visitedLands: Array.isArray(parsed.visitedLands) ? parsed.visitedLands : [],
    };
  } catch {
    return { unlocked: [], visitedLands: [] };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage が使えない場合は無視
  }
}

/** 実績を解放。新規解放のときだけ true を返す */
export function unlockAchievement(id) {
  if (!ACHIEVEMENT_BY_ID[id]) return false;
  const state = loadState();
  if (state.unlocked.includes(id)) return false;
  state.unlocked.push(id);
  saveState(state);
  return true;
}

/** 解放済みの実績 ID 一覧 */
export function listUnlocked() {
  return loadState().unlocked.slice();
}

/** 訪問済みランドを記録。新たに 10 国揃ったら 'scout-all-lands' を解放 */
export function recordVisitedLand(landId) {
  const state = loadState();
  if (!state.visitedLands.includes(landId)) {
    state.visitedLands.push(landId);
    saveState(state);
    if (state.visitedLands.length >= 10) {
      unlockAchievement('scout-all-lands');
    }
  }
}

/** タイトル画面用：解放済みのトースト通知（DOM）を発火 */
export function notifyUnlock(id) {
  const def = ACHIEVEMENT_BY_ID[id];
  if (!def) return;
  if (typeof document === 'undefined') return;
  const toast = document.createElement('div');
  toast.style.cssText =
    'position:fixed;top:1rem;right:1rem;background:rgba(20,20,30,0.95);border:1px solid var(--accent);' +
    'border-radius:8px;padding:0.75rem 1rem;z-index:99999;color:#fff;font-size:0.9rem;' +
    'box-shadow:0 4px 16px rgba(0,0,0,0.5);max-width:320px;animation:slideIn 0.3s ease-out;';
  toast.innerHTML = `
    <div style="font-weight:700;color:var(--accent);margin-bottom:0.25rem">${def.icon} 実績解放：${def.name}</div>
    <div style="font-size:0.8rem;color:#bbb">${def.desc}</div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.5s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

/** unlockAchievement + notifyUnlock を一括で */
export function tryUnlock(id) {
  if (unlockAchievement(id)) notifyUnlock(id);
}

/** 実績モーダルを開く（タイトル画面/設定からの呼び出し用） */
export function openAchievementsModal() {
  if (typeof document === 'undefined') return;
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;' +
    'justify-content:center;z-index:9999;padding:1rem';
  const card = document.createElement('div');
  card.style.cssText =
    'background:var(--bg);border:1px solid var(--accent);border-radius:8px;padding:1.5rem;' +
    'max-width:520px;width:100%;max-height:90vh;overflow-y:auto';

  const unlocked = new Set(listUnlocked());
  card.innerHTML = `
    <h2 style="margin:0 0 0.5rem;color:var(--accent)">🏆 実績（${unlocked.size}/${ACHIEVEMENTS.length}）</h2>
    <p style="margin:0 0 0.75rem;font-size:0.85rem;color:var(--muted)">ラン横断で達成状況を記録します。</p>
  `;
  const list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:0.4rem;margin:0.5rem 0';
  ACHIEVEMENTS.forEach(a => {
    const isUnlocked = unlocked.has(a.id);
    const row = document.createElement('div');
    row.style.cssText =
      `padding:0.5rem 0.75rem;background:var(--card-bg);border:1px solid var(--border);` +
      `border-radius:6px;${isUnlocked ? '' : 'opacity:0.5'}`;
    row.innerHTML = `
      <div style="font-weight:700">${a.icon} ${a.name}${isUnlocked ? ' ✅' : ' 🔒'}</div>
      <div style="font-size:0.8rem;color:var(--muted)">${a.desc}</div>
    `;
    list.appendChild(row);
  });
  card.appendChild(list);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'action primary';
  close.style.cssText = 'width:100%;margin-top:0.75rem';
  close.textContent = '閉じる';
  close.addEventListener('click', () => overlay.remove());
  card.appendChild(close);

  overlay.appendChild(card);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}
