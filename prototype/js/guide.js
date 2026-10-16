// guide.js — はじめての案内 (SPEC-013)
//
// 初回の戦闘だけ、手札 → エナジー → 敵の NEXT ACTION → ターン終了 の順に、
// 光る枠と短い吹き出しで指し示す。遊びは止めない（枠と吹き出しは pointer-events: none、× だけ押せる）。
// 見終えたら localStorage['mct.guideSeen'] = '1'（PROJECT_CHARTER 3.1：UI の状態）。

import { t } from './i18n.js';

const LS_KEY = 'mct.guideSeen';
export const GUIDE_DONE = -1;
export const STEP_TIMEOUT_MS = 6000;

/** 段の定義（target はセレクタ、text は i18n のキー） */
export const GUIDE_STEPS = [
  { target: '#hand',             text: 'guide.hand',    fallback: 'カードをタップすると持ち上がり、もう一度タップで使えます', timeout: false },
  { target: '.energy-pill',      text: 'guide.energy',  fallback: 'カードの左上の ⚡ がコスト。⚡ がなくなるまで使えます',     timeout: true },
  // 吹き出しは戦場の下に出す（予告のすぐ下だと、味方と敵のステータスを隠すため）
  { target: '#enemyIntentWrap',  text: 'guide.intent',  fallback: '敵が次にすること。守るか攻めるかの手がかりに',             timeout: true, bubbleBelow: '.combat-arena' },
  { target: '#btnEndTurn',       text: 'guide.endTurn', fallback: '使い切ったらターン終了。敵が動きます',                       timeout: false },
];

/**
 * 次の段（純関数）。
 * @param {number} step 今の段（GUIDE_DONE なら終わり）
 * @param {'card'|'timeout'|'endTurn'|'close'} event
 * @returns {number}
 */
export function nextGuideStep(step, event) {
  if (step === GUIDE_DONE || event === 'close') return GUIDE_DONE;
  switch (step) {
    case 0: return (event === 'card' || event === 'endTurn') ? 1 : 0;   // カードを使わずにターンを終えたら、次のターンでエナジーの段から
    case 1: return (event === 'card' || event === 'timeout') ? 2 : (event === 'endTurn' ? GUIDE_DONE : 1);
    case 2: return event === 'timeout' ? 3 : (event === 'endTurn' ? GUIDE_DONE : 2);
    case 3: return event === 'endTurn' ? GUIDE_DONE : 3;
    default: return GUIDE_DONE;
  }
}

let step = GUIDE_DONE;
let timer = 0;
let raf = 0;

const seen = () => { try { return localStorage.getItem(LS_KEY) === '1'; } catch (_) { return false; } };
const markSeen = () => { try { localStorage.setItem(LS_KEY, '1'); } catch (_) { /* ignore */ } };

/** ヘルプの「もう一度見る」：次の戦闘でまた出す */
export function resetGuide() {
  try { localStorage.removeItem(LS_KEY); } catch (_) { /* ignore */ }
}

/** 戦闘の画面が出たときに呼ぶ。初回なら段 0 から */
export function startGuideIfFirst() {
  if (seen() || step !== GUIDE_DONE) return;
  setStep(0);
}

/** 戦闘を離れたとき。見終えていなければ、次の戦闘でまた段 0 から */
export function hideGuide() {
  clearTimeout(timer);
  cancelAnimationFrame(raf);
  step = GUIDE_DONE;
  document.getElementById('guideLayer')?.classList.add('hidden');
}

/** 操作を伝える（カードを使った・ターン終了） */
export function guideEvent(event) {
  if (step === GUIDE_DONE) return;
  setStep(nextGuideStep(step, event));
}

function setStep(next) {
  clearTimeout(timer);
  step = next;
  if (step === GUIDE_DONE) {
    markSeen();
    hideGuide();
    return;
  }
  const def = GUIDE_STEPS[step];
  const text = document.getElementById('guideText');
  if (text) text.textContent = t(def.text, def.fallback);
  const n = document.getElementById('guideStepNo');
  if (n) n.textContent = `${step + 1} / ${GUIDE_STEPS.length}`;
  document.getElementById('guideLayer')?.classList.remove('hidden');
  if (def.timeout) timer = setTimeout(() => guideEvent('timeout'), STEP_TIMEOUT_MS);
  cancelAnimationFrame(raf);
  const follow = () => { place(def.target, def.bubbleBelow); raf = requestAnimationFrame(follow); };
  follow();
}

/** 枠を対象に重ね、吹き出しを上か下の入るほうに置く（画面からはみ出さない）。bubbleBelow があればその要素の下に */
function place(selector, bubbleBelow) {
  const target = document.querySelector(selector);
  const ring = document.getElementById('guideRing');
  const bubble = document.getElementById('guideBubble');
  if (!ring || !bubble) return;
  const r = target && !target.closest('.hidden') ? target.getBoundingClientRect() : null;
  if (!r || !r.width) { ring.style.opacity = '0'; return; }
  const pad = 6;
  ring.style.opacity = '1';
  ring.style.left = `${r.left - pad}px`;
  ring.style.top = `${r.top - pad}px`;
  ring.style.width = `${r.width + pad * 2}px`;
  ring.style.height = `${r.height + pad * 2}px`;
  const vw = window.innerWidth, vh = window.innerHeight;
  const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
  const anchorEl = bubbleBelow ? document.querySelector(bubbleBelow) : null;
  const a = anchorEl ? anchorEl.getBoundingClientRect() : r;
  const below = a.bottom + pad + 10;
  const top = (below + bh <= vh - 8) ? below : Math.max(8, r.top - pad - 10 - bh);
  const left = Math.min(Math.max(8, r.left + r.width / 2 - bw / 2), vw - bw - 8);
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
}

export function installGuide() {
  document.getElementById('guideClose')?.addEventListener('click', () => guideEvent('close'));
}
