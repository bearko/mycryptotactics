// fx.js — 軽い演出 (SPEC-012)
//
// DESIGN_CHARTER 2.4 の条件：0.8 秒以内・操作を止めない（pointer-events: none）・
// prefersReducedMotion()（OS か設定の「演出を減らす」）で止まる。止めても情報は失われない。

import { prefersReducedMotion } from './settings.js';

export const MAX_PARTICLES = 60;
export const BURST_COUNT = 12;
const BURST_MS = 600;
const COUNT_MS = 500;

export function easeOutCubic(t) {
  const x = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - x, 3);
}

/** from から to まで、t ミリ秒時点の整数（純関数。減るときも同じ形） */
export function countValueAt(from, to, t, dur) {
  if (!(dur > 0) || t >= dur) return Math.round(to);
  if (t <= 0) return Math.round(from);
  return Math.round(from + (to - from) * easeOutCubic(t / dur));
}

let live = 0;

/** 要素の中心から粒を散らす（敵の撃破） */
export function burstAt(el, color = '#ff9a6a') {
  if (!el || prefersReducedMotion()) return;
  const r = el.getBoundingClientRect();
  if (!r.width) return;
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const n = Math.min(BURST_COUNT, MAX_PARTICLES - live);
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span');
    p.className = 'fx-particle';
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
    const d = 36 + Math.random() * 46;
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.setProperty('--dx', `${Math.cos(a) * d}px`);
    p.style.setProperty('--dy', `${Math.sin(a) * d}px`);
    p.style.background = i % 3 === 0 ? '#fff3c4' : color;
    document.body.appendChild(p);
    live++;
    setTimeout(() => { p.remove(); live--; }, BURST_MS);
  }
}

/** 画面の縁を赤く光らせる（味方の被弾）。strength 0〜1 */
export function hurtEdge(strength = 0.6) {
  if (prefersReducedMotion()) return;
  const el = document.getElementById('fxHurtEdge');
  if (!el) return;
  el.style.setProperty('--fx-hurt', String(Math.max(0.25, Math.min(1, strength))));
  el.classList.remove('fx-hurt-edge--on');
  void el.offsetWidth;   // アニメーションをかけ直す
  el.classList.add('fx-hurt-edge--on');
}

/** 数字を前の値から数え上げる（ゴールドなど）。増えたら --up、減ったら --down で一瞬光る */
export function countTo(el, to) {
  if (!el) return;
  const target = Math.round(Number(to) || 0);
  const from = Number(el.dataset.fxValue ?? el.textContent) || 0;
  el.dataset.fxValue = String(target);
  cancelAnimationFrame(Number(el.dataset.fxRaf) || 0);
  if (from === target || prefersReducedMotion() || !el.isConnected || !el.getClientRects().length) {
    el.textContent = String(target);
    return;
  }
  el.classList.remove('fx-count--up', 'fx-count--down');
  void el.offsetWidth;
  el.classList.add(target > from ? 'fx-count--up' : 'fx-count--down');
  const t0 = performance.now();
  const step = (now) => {
    const t = now - t0;
    el.textContent = String(countValueAt(from, target, t, COUNT_MS));
    if (t < COUNT_MS) el.dataset.fxRaf = String(requestAnimationFrame(step));
  };
  el.dataset.fxRaf = String(requestAnimationFrame(step));
}

/** 入ってくる画面に動きをつける */
export function enterView(el) {
  if (!el || prefersReducedMotion()) return;
  el.classList.remove('fx-view-enter');
  void el.offsetWidth;
  el.classList.add('fx-view-enter');
  setTimeout(() => el.classList.remove('fx-view-enter'), 260);
}
