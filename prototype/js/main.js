import {
  createCardRuntime,
  shuffle,
  battleIconUrl,
  CARD_RARITIES,
  CARD_UPGRADE_SERIES,
} from "./cards.js";
import {
  img,
  LEADER,
  HERO_ROSTER,
  setLeader,
  ENEMY_IMG,
  EXT_IMG,
  BATTLE_BG,
  AUDIO_URLS,
  BATTLE_EFFECT_SPRITE,
} from "./constants.js";
import {
  cutRateFromPhy,
  cutRateFromInt,
  randomSkillRatePct,
  phyIntDamageAfterCut,
  criticalBonusDamage,
  healingCoefficientIntCaster,
  critRateFromAgi,
  rollCrit,
  applyDamageThroughShield,
} from "./battle-mch.js";
import { initHelp } from "./help.js";
import { ENEMY_DEFS } from "./enemies.js";
import { BOSS_DEFS } from "./bosses.js";
import { CHAPTERS } from "./chapters.js";
import { generateChapterMap } from "./maps.js";
import { LL_EXT_POOL } from "./ll-extensions.js";
import {
  resolveTargets,
  makeHeroUnit,
  makeEnemyUnit,
  foremostAlive,
  rearmostAlive,
  aliveAt,
} from "./targeting.js";
import {
  REGULATIONS,
  REGULATION_BY_ID,
  loadUnlockedRegulations,
  loadCurrentRegulationId,
  saveCurrentRegulationId,
  unlockNextAfterClear,
} from "./regulations.js";

// 現在選択中のレギュレーション (#37) — 全戦闘・全画面でこの値を参照
let currentRegulationId = loadCurrentRegulationId();
function getCurrentRegulation() {
  return REGULATION_BY_ID[currentRegulationId] || REGULATIONS[0];
}
function setCurrentRegulation(id) {
  if (!REGULATION_BY_ID[id]) return;
  const changed = currentRegulationId !== id;
  currentRegulationId = id;
  saveCurrentRegulationId(id);
  updateHeaderRegulationIcons();
  // レギュレーション変更時は章クリア進捗もリセット (#42)
  // → 別レギュレーションでは必ずアバカスからやり直し
  if (changed) {
    clearedChapters = new Set();
    runState = null;
    gold = 75;
    pendingShopNodeId = null;
    pendingCraftNodeId = null;
    postCombatSnapshot = null;
  }
}

// ─── ナビゲーター「マイ」 ────────────────────────────────────────
const MAI_SD_URL = "./MAI_SD.png";

/** マイのメッセージをゲーム状態から決定する */
function getMaiMessage() {
  if (!runState) return "ボスの居るステージを目指しましょう！緑のノードへ進めます！";
  if (runState.runComplete) return "全クリアおめでとうございます！あなたは最高ですよ〜！";

  const reachable = reachableNextNodeIds(runState.lastMapNodeId);
  const reachableNodes = reachable.map(id => mapNodeById(id)).filter(Boolean);
  const bossNext  = reachableNodes.some(n => n.type === "boss");
  const shopNext  = reachableNodes.some(n => n.type === "shop");
  const restNext  = reachableNodes.some(n => n.type === "rest");
  const hpPct = runState.playerHp / runState.playerHpMax;

  if (bossNext) return "いよいよボス戦です！ここまで来たら全力でがんばってください！";
  if (hpPct <= 0.80 && restNext) {
    return `体力が減っています（${runState.playerHp}/${runState.playerHpMax}）。休憩（HP回復）を目指して休みましょう！`;
  }
  if (shopNext) return "近くにショップがあります！GUMを使ってエクステンションを強化しましょう！";
  if (!runState.lastMapNodeId) return "ボスの居るステージを目指しましょう！緑のノードへ進めます！";
  return "次のノードを選んで進みましょう！戦略的な選択がカギですよ！";
}

/** マイのセリフを更新して表示する（msg省略時はゲーム状態から自動決定） */
function renderNavigator(msg) {
  const nav = document.getElementById("maiNavigator");
  if (!nav) return;
  const textEl = document.getElementById("maiText");
  if (textEl) textEl.textContent = msg ?? getMaiMessage();
  // バブルのアニメーションを再トリガー
  const bubble = document.getElementById("maiBubble");
  if (bubble) {
    bubble.style.animation = "none";
    void bubble.offsetHeight; // reflow
    bubble.style.animation = "";
  }
}

// ─── アクティブマップ（章ごとに差し替え） ──────────────────────
let activeMapNodes = [];
let activeMapEdges = [];
let activeEdgeFrom = new Map();
let activeMapViewH  = 100;   // SVG viewBox の高さ
let activeMapStartY = 92;    // START ノードの y 座標

function setActiveMap(nodes, edges, viewH = 100, startY = 92) {
  activeMapNodes  = nodes;
  activeMapEdges  = edges;
  activeMapViewH  = viewH;
  activeMapStartY = startY;
  activeEdgeFrom  = new Map();
  for (const [a, b] of edges) {
    if (!activeEdgeFrom.has(a)) activeEdgeFrom.set(a, []);
    activeEdgeFrom.get(a).push(b);
  }
}

function mapNodeById(id) {
  return activeMapNodes.find((n) => n.id === id) || null;
}

function reachableNextNodeIds(lastNodeId) {
  if (!lastNodeId) return activeEdgeFrom.get("START") || [];
  return activeEdgeFrom.get(lastNodeId) || [];
}

// ─── MAP_START（SVG 用の仮想入口ノード） ─────────────────────────
// x は固定・y は activeMapStartY に委譲
const MAP_START_X = 50;

// ─── 状態変数 ────────────────────────────────────────────────────
let gold = 75;
let view = "map";
/** 戦闘中の非同期演出中はカード操作を禁止するフラグ */
let combatInputLocked = false;
/** セッション内でクリアした章インデックスのセット（node選択画面のアンロック管理） */
let clearedChapters = new Set();
/** @type {null | {
 *   chapterIdx: number,
 *   deck: any[],
 *   playerHp: number,
 *   playerHpMax: number,
 *   lastMapNodeId: string | null,
 *   pathNodeIds: string[],
 *   runComplete: boolean,
 * }} */
let runState = null;
let combat = null;
let pendingShopNodeId = null;
let pendingCraftNodeId = null;
/** @type {'win'|'lose'|null} */
let cutinKind = null;
let cutinResolve = null;
let cutinWinIgnoreUntil = 0;
let postCombatSnapshot = null;
let handFocusedIdx = -1;
/** @type {HTMLAudioElement | null} */
let bgmAudio = null;

// ─── BGM / SE ────────────────────────────────────────────────────
function stopBgm() {
  if (bgmAudio) { bgmAudio.pause(); bgmAudio.currentTime = 0; bgmAudio = null; }
}

function startBgmMap() {
  if (bgmAudio) {
    // オートプレイ制限で一時停止中の場合は再生を試みる（ユーザー操作後に有効）
    if (bgmAudio.paused) bgmAudio.play().catch(() => {});
    return;
  }
  try {
    bgmAudio = new Audio(AUDIO_URLS.bgmMap());
    bgmAudio.loop = true; bgmAudio.volume = 0.32;
    bgmAudio.play().catch(() => {});
  } catch (_) {}
}

// ─── タイトル画面 ─────────────────────────────────────────────────
function dismissTitle() {
  const titleEl = document.getElementById("titleView");
  if (!titleEl || titleEl.classList.contains("hidden")) return;
  // ユーザー操作後に BGM 開始（ブラウザのオートプレイ制限を回避）
  startBgmMap();
  titleEl.classList.add("title-out");
  setTimeout(() => {
    titleEl.classList.add("hidden");
    // タイトル → レギュレーション選択 → ヒーロー選択 (#37)
    showView("regulationSelect");
    renderRegulationSelect();
  }, 380);
}

function startBgmCombat() {
  stopBgm();
  try {
    bgmAudio = new Audio(AUDIO_URLS.bgmPvp());
    bgmAudio.loop = true; bgmAudio.volume = 0.32;
    bgmAudio.play().catch(() => {});
  } catch (_) {}
}

function playSeNodeSelect() {
  try {
    const a = new Audio("Audio/SE/node_select.mp3");
    a.volume = 0.65;
    a.play().catch(() => {});
  } catch (_) {}
}

function playSeShopBuy() {
  try {
    const a = new Audio("Audio/SE/coin.mp3");
    a.volume = 0.70;
    a.play().catch(() => {});
  } catch (_) {}
}

function playSeClear() {
  try { const a = new Audio(AUDIO_URLS.seClear()); a.volume = 0.55; a.play().catch(() => {}); } catch (_) {}
}

function playJingle(kind) {
  const url = kind === "win" ? AUDIO_URLS.jingleWin() : AUDIO_URLS.jingleLose();
  try { const a = new Audio(url); a.volume = 0.52; a.play().catch(() => {}); } catch (_) {}
}

/** @param {'hit'|'heal'|'buff'|'debuff'|'area'} kind */
function playBattleSe(kind) {
  const url =
    kind === "heal"   ? AUDIO_URLS.seBattleHeal() :
    kind === "buff"   ? AUDIO_URLS.seBattleBuff() :
    kind === "debuff" ? AUDIO_URLS.seBattleDebuff() :
    kind === "area"   ? AUDIO_URLS.seBattleAreaDamage() :
                        AUDIO_URLS.seBattleSingleDamage();
  try { const a = new Audio(url); a.volume = 0.48; a.play().catch(() => {}); } catch (_) {}
}

// ─── 紙吹雪 ──────────────────────────────────────────────────────
function startConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return null;
  canvas.style.display = "block";
  const W = canvas.width  = window.innerWidth;
  const H = canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  const COLORS = [
    "#FF595E","#FF924C","#FFCA3A","#8AC926",
    "#1982C4","#6A4C93","#F7B7D2","#4BC4CF",
    "#FF7096","#C77DFF","#80B918","#E63946",
  ];

  // 長方形の紙吹雪パーティクル（幅8×高さ5px前後）
  const pts = Array.from({ length: 150 }, (_, i) => ({
    x: (i / 150) * W + (Math.random() - 0.5) * (W / 150),  // 均等スタート
    y: -20 - Math.random() * H * 0.6,                        // 画面上方にスタート
    w: 7 + Math.random() * 7,
    h: 4 + Math.random() * 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    angle:     Math.random() * Math.PI * 2,
    spin:      (Math.random() < 0.5 ? 1 : -1) * (0.05 + Math.random() * 0.12),
    vx:        (Math.random() - 0.5) * 0.6,
    vy:        1.0 + Math.random() * 1.5,    // ゆっくり落下
    phase:     Math.random() * Math.PI * 2,
  }));

  let rafId;
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w * 0.5, -p.h * 0.5, p.w, p.h);
      ctx.restore();

      // 物理更新
      p.angle  += p.spin;
      p.phase  += 0.03;
      p.x      += p.vx + Math.sin(p.phase) * 0.4;
      p.y      += p.vy;

      // 画面外に出たら上に戻す
      if (p.y > H + 20) {
        p.y = -20;
        p.x = Math.random() * W;
      }
    }
    rafId = requestAnimationFrame(draw);
  };
  draw();

  return () => {
    cancelAnimationFrame(rafId);
    ctx.clearRect(0, 0, W, H);
    canvas.style.display = "none";
  };
}

// ─── パッシブスキル カットイン ────────────────────────────────────
/**
 * ヒーローのパッシブスキル発動時にカットインを表示する
 * @param {string} skillName  スキル名（例:「浪切」）
 * @param {string} portraitUrl  ヒーロー画像 URL
 * @returns {Promise<void>}  フェードアウト完了で resolve
 */
function showPassiveCutin(skillName, portraitUrl) {
  const el = document.getElementById("passiveCutin");
  if (!el) return Promise.resolve();
  const skillEl    = document.getElementById("passiveCutinSkill");
  const portraitEl = document.getElementById("passiveCutinPortrait");
  if (skillEl)    skillEl.textContent = skillName;
  if (portraitEl) portraitEl.src      = portraitUrl;

  return new Promise((resolve) => {
    // リセット：非表示 → 画面外右にセット → 表示
    el.style.transition = "none";
    el.style.opacity    = "0";
    el.style.transform  = "translate(100%, -50%) skewY(-10deg)";
    el.style.display    = "";
    el.setAttribute("aria-hidden", "false");

    // 次フレームでトランジション有効 → スライドイン
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "opacity 0.14s ease, transform 0.14s ease";
        el.style.opacity    = "1";
        el.style.transform  = "translateY(-50%) skewY(-10deg)";

        // 700ms 表示後にスライドアウト
        setTimeout(() => {
          el.style.transition = "opacity 0.22s ease, transform 0.22s ease";
          el.style.opacity    = "0";
          el.style.transform  = "translate(-100%, -50%) skewY(-10deg)";
          el.addEventListener("transitionend", function done() {
            el.removeEventListener("transitionend", done);
            el.style.display = "none";
            el.setAttribute("aria-hidden", "true");
            resolve();
          });
        }, 700);
      });
    });
  });
}

// ─── クリティカル バナー ──────────────────────────────────────────
/**
 * クリティカルヒット時に大きなダメージ数字と CRITICAL ラベルを表示する
 * @param {'player'|'enemy'} who  被ダメージ側（バナーの表示位置）
 * @param {number} totalDmg  合計ダメージ値
 */
function spawnCritDisplay(who, totalDmg) {
  const wrapId = who === "enemy" ? "enemyPortraitWrap" : "playerPortraitWrap";
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  const banner = document.createElement("div");
  banner.className = "crit-banner";
  banner.innerHTML =
    `<span class="crit-banner__dmg">${totalDmg}</span>` +
    `<span class="crit-banner__label">CRITICAL</span>`;
  wrap.appendChild(banner);
  // アニメーション終了後に自動除去（0.7s + バッファ）
  setTimeout(() => { banner.remove(); }, 820);
}

// ─── LLエクステ 獲得モーダル（宝箱→開封→エクステ開示） ──────────
function showLlExtModal(ext) {
  const modal    = document.getElementById("llExtModal");
  if (!modal) return Promise.resolve();

  const phaseChest  = document.getElementById("llModalPhaseChest");
  const phaseReveal = document.getElementById("llModalPhaseReveal");
  const artEl   = document.getElementById("llExtModalArt");
  const nameEl  = document.getElementById("llExtModalName");
  const skillEl = document.getElementById("llExtModalSkill");
  const descEl  = document.getElementById("llExtModalDesc");

  // フェーズ2のデータを事前にセット
  if (artEl) {
    artEl.style.opacity = "";  // 前回の onerror で 0.3 が残っている可能性をリセット
    artEl.src = EXT_IMG(ext.extId);
  }
  if (nameEl)  nameEl.textContent  = ext.name;
  if (skillEl) skillEl.textContent = `【${ext.skillName}】`;
  if (descEl)  descEl.textContent  = ext.desc;

  // フェーズ1を表示、フェーズ2を隠す
  phaseChest?.classList.remove("hidden");
  phaseReveal?.classList.add("hidden");

  modal.classList.remove("hidden");
  modal.removeAttribute("aria-hidden");
  const stopConfetti = startConfetti();

  return new Promise((resolve) => {
    // 「開ける！」ボタン → フェーズ2へ切り替え
    const btnOpen = document.getElementById("btnLlExtOpen");
    const onOpen = () => {
      btnOpen.removeEventListener("click", onOpen);
      phaseChest?.classList.add("hidden");
      phaseReveal?.classList.remove("hidden");
    };
    btnOpen?.addEventListener("click", onOpen);

    // 「受け取る！」ボタン → 閉じて resolve
    const btnClaim = document.getElementById("btnLlExtClaim");
    const onClaim = () => {
      btnClaim.removeEventListener("click", onClaim);
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      stopConfetti?.();
      resolve();
    };
    btnClaim?.addEventListener("click", onClaim);
  });
}

// ─── LLエクステ スロット UI 同期 ─────────────────────────────────
function syncLlExtSlots() {
  if (!runState) return;
  const slots = runState.llExtSlots;
  const slotIds = [
    ["mapLlSlot0",     "mapLlSlot1"],
    ["combatLlSlot0", "combatLlSlot1"],
  ];
  for (const pair of slotIds) {
    for (let i = 0; i < 2; i++) {
      const el = document.getElementById(pair[i]);
      if (!el) continue;
      const ext = slots[i];
      if (ext) {
        el.classList.add("ll-slot--filled");
        el.title = `${ext.name}【${ext.skillName}】 ${ext.desc}`;
        el.innerHTML = `<img src="${EXT_IMG(ext.extId)}" alt="${ext.name}" onerror="this.style.opacity='0'" />`;
      } else {
        el.classList.remove("ll-slot--filled");
        el.title = "";
        el.textContent = "—";
      }
    }
  }
  renderLlExtBar();
}

function renderLlExtBar() {
  const bar = document.getElementById("llExtBar");
  if (!bar || !runState) return;
  const slots = runState.llExtSlots;
  const inCombat = combat && view === "combat";
  if (!inCombat) { bar.classList.add("hidden"); return; }
  const hasAny = slots.some(s => s !== null);
  bar.classList.toggle("hidden", !hasAny);
  for (let i = 0; i < 2; i++) {
    const btn = document.getElementById(`btnUseLlExt${i}`);
    if (!btn) continue;
    const ext = slots[i];
    if (ext) {
      btn.classList.remove("ll-slot--empty");
      btn.title = ext.desc;
      btn.innerHTML =
        `<img src="${EXT_IMG(ext.extId)}" alt="" onerror="this.style.opacity='0'" style="width:16px;height:16px;object-fit:contain;flex-shrink:0;image-rendering:pixelated" />` +
        `<span>${ext.skillName}</span>`;
    } else {
      btn.classList.add("ll-slot--empty");
      btn.title = "";
      btn.textContent = "空きスロット";
    }
  }
}

// ─── LLエクステ エフェクト適用 ───────────────────────────────────
function applyLlExtEffect(ext) {
  const s = combat;
  clog(`【LLエクステ】${ext.name}「${ext.skillName}」発動！`);
  switch (ext.effectKey) {
    case "blade":
      dealPhySkillToEnemyRange(s, 300, 400);
      break;
    case "grande":
      dealIntSkillToEnemy(s, 400, 500, false);
      break;
    case "pen":
      healPlayerFromIntSkill(s, 200, 250);
      break;
    case "armor": {
      const boost = Math.floor(s.playerPhy * 0.5);
      s.playerPhy += boost;
      s.playerGuard = (s.playerGuard || 0) + 20;
      playBattleSe("buff"); playPortraitEffect("player", "buff", s.heroes?.[0]);
      clog(`PHY+${boost} GRD+20`);
      break;
    }
    case "blue":
      healPlayerFromIntSkill(s, 200, 250);
      s.playerInt += 4;
      playBattleSe("buff"); playPortraitEffect("player", "buff", s.heroes?.[0]);
      clog("INT+4");
      break;
    case "fish":
      healPlayerFromIntSkill(s, 150, 200);
      s.playerPhy += 3;
      s.hasResurrection = true;
      playBattleSe("buff"); playPortraitEffect("player", "buff", s.heroes?.[0]);
      clog("PHY+3 リザレクション付与");
      break;
    default:
      clog("（不明なエフェクト）");
  }
}

function useLlExt(slotIdx) {
  if (!combat || view !== "combat") return;
  const ext = runState?.llExtSlots?.[slotIdx];
  if (!ext) return;
  runState.llExtSlots[slotIdx] = null;
  applyLlExtEffect(ext);
  if (areAllEnemiesDefeated(combat)) { endCombatWin(); return; }
  if (isPartyWipedOut(combat)) { endCombatLoss(); return; }
  syncLlExtSlots();
  renderCombat();
}

// ─── ログ / エフェクト ────────────────────────────────────────────
function clog(msg) {
  const el = document.getElementById("clog");
  const p = document.createElement("p");
  p.textContent = msg;
  el.insertBefore(p, el.firstChild);
}

/** Phase 3g: 敵ターンの間隔調整に使う sleep。lunge=350ms / flash=380ms / portrait-fx=900ms に合わせる。 */
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
const ENEMY_ACTION_GAP_MS = 850;

/** SPEC-005 Phase 3h: data-pos スロット内の combatant-portrait-wrap を解決
 *  - heroes[0] / enemies[0] (前衛) → 静的 ID (#playerPortraitWrap / #enemyPortraitWrap)
 *  - heroes[1+] / enemies[1+] → .party-slot[data-pos="N"] .combatant-portrait-wrap
 *  unit 未指定の場合は legacy 前衛スロットへフォールバック */
function resolveUnitPortraitWrap(who, unit) {
  if (unit && combat) {
    const arr = who === "enemy" ? combat.enemies : combat.heroes;
    const idx = Array.isArray(arr) ? arr.indexOf(unit) : -1;
    if (idx > 0) {
      const side = who === "enemy" ? "enemy" : "player";
      const sel = `.party-slot[data-side="${side}"][data-pos="${idx}"] .combatant-portrait-wrap`;
      const wrap = document.querySelector(sel);
      if (wrap) return wrap;
    }
  }
  const wrapId = who === "enemy" ? "enemyPortraitWrap" : "playerPortraitWrap";
  return document.getElementById(wrapId);
}

/** @param {'player'|'enemy'} who @param {'hit'|'heal'|'buff'|'debuff'|'area'} kind @param {object} [unit] 被弾/対象ユニット (省略時は中央スロット) */
function playPortraitEffect(who, kind, unit) {
  const wrap = resolveUnitPortraitWrap(who, unit);
  if (!wrap) return;
  const sheet =
    kind === "heal"   ? BATTLE_EFFECT_SPRITE.heal() :
    kind === "buff"   ? BATTLE_EFFECT_SPRITE.buff() :
    kind === "debuff" ? BATTLE_EFFECT_SPRITE.debuff() :
    kind === "area"   ? BATTLE_EFFECT_SPRITE.areaDamage() :
                        BATTLE_EFFECT_SPRITE.singleDamage();
  const el = document.createElement("div");
  el.className = "portrait-fx portrait-fx--" + kind;
  el.setAttribute("role", "presentation");
  el.style.backgroundImage = "url('" + sheet + "')";
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function spawnStatFloat(anchorId, delta) {
  if (!delta) return;
  const host = document.getElementById(anchorId);
  if (!host) return;
  const el = document.createElement("span");
  el.className = "stat-float " + (delta > 0 ? "stat-float--gain" : "stat-float--loss");
  el.textContent = (delta > 0 ? "+" : "") + String(delta);
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("stat-float--show"));
  setTimeout(() => el.remove(), 900);
}

function flashPortrait(which, unit) {
  const wrap = resolveUnitPortraitWrap(which, unit);
  if (!wrap) return;
  wrap.classList.add("portrait-hit");
  setTimeout(() => wrap.classList.remove("portrait-hit"), 380);
}

/** 攻撃側のポートレートを突進アニメで動かす（player = 右へ, enemy = 左へ） */
function lungePortrait(who, unit) {
  const wrap = resolveUnitPortraitWrap(who, unit);
  if (!wrap) return;
  const cls = who === "player" ? "portrait-lunge--player" : "portrait-lunge--enemy";
  wrap.classList.remove(cls);   // reset if still running
  void wrap.offsetWidth;        // reflow to restart animation
  wrap.classList.add(cls);
  setTimeout(() => wrap.classList.remove(cls), 350);
}

// ─── ダメージ計算補助 ─────────────────────────────────────────────
/** リザレクション発動チェック（致死ダメージ後に HP を 1 に戻す）
 *  SPEC-005 Phase 3: heroes[0] (前衛) も連動更新 */
function checkResurrection(s) {
  if (s.playerHp <= 0 && s.hasResurrection) {
    s.playerHp = 1;
    if (s.heroes && s.heroes[0]) {
      s.heroes[0].hp = 1;
      s.heroes[0].alive = true;
    }
    s.hasResurrection = false;
    playBattleSe("buff"); playPortraitEffect("player", "buff", s.heroes?.[0]);
    clog("【リザレクション】致死ダメージを耐えた！HP 1 で生存！");
    return true;
  }
  return false;
}

function applyGuardToDamage(target, raw) {
  const key = target === "player" ? "playerGuard" : "enemyGuard";
  let g = combat[key] || 0;
  if (g <= 0 || raw <= 0) return raw;
  const use = Math.min(g, raw);
  combat[key] = g - use;
  return raw - use;
}

function drawCards(s, n) {
  for (let i = 0; i < n; i++) {
    if (!s.drawPile.length) {
      if (!s.discardPile.length) break;
      s.drawPile = shuffle(s.discardPile);
      s.discardPile = [];
      clog("捨て札をシャッフルして山に");
    }
    if (!s.drawPile.length) break;
    s.hand.push(s.drawPile.pop());
  }
}

// ─── プレイヤー攻撃 ───────────────────────────────────────────────
/** SPEC-005 Phase 3c: プレイヤー攻撃の対象 = foremost living enemy */
function getPlayerAttackTargetEnemy(s) {
  if (!s || !Array.isArray(s.enemies)) return null;
  return foremostAlive(s.enemies) || s.enemies[0] || null;
}

/** 敵 HP を更新し、必要に応じて legacy フィールドを同期 */
function applyHpDeltaToEnemy(s, enemy, delta) {
  if (!enemy) return;
  enemy.hp = Math.max(0, (enemy.hp ?? 0) + delta);
  if (enemy.hp <= 0) enemy.alive = false;
  if (s.enemies && enemy === s.enemies[0]) {
    s.enemyHp = enemy.hp;
  }
}

/** 全エネミー死亡判定 */
function areAllEnemiesDefeated(s) {
  if (!s || !Array.isArray(s.enemies) || s.enemies.length === 0) {
    return (s?.enemyHp ?? 0) <= 0;
  }
  return s.enemies.every(e => !e || e.alive === false || (e.hp ?? 0) <= 0);
}

function dealPhySkillToEnemy(s, skillPct) {
  const target = getPlayerAttackTargetEnemy(s);
  const cut = cutRateFromPhy(s.enemyPhy);
  let base = phyIntDamageAfterCut(s.playerPhy, skillPct, cut);
  let critBonus = 0;
  if (rollCrit(critRateFromAgi(s.playerAgi))) {
    critBonus = criticalBonusDamage(s.playerPhyBase, skillPct, s.enemyPhyBase, "phy");
    clog("クリティカル（PHY）");
  }
  let vuln = s.enemyVulnerable || 0;
  let total = base + critBonus + vuln;
  s.enemyVulnerable = 0;
  // 出血（敵が出血スタックを持つとき、被物理攻撃で追加ダメージ）
  if ((s.enemyBleed || 0) > 0) {
    total += s.enemyBleed;
    clog(`出血 ×${s.enemyBleed} 追加`);
  }
  // ガードは前衛 (enemies[0]) のみ
  if (target === s.enemies?.[0]) {
    total = applyGuardToDamage("enemy", total);
  }
  applyHpDeltaToEnemy(s, target, -total);
  lungePortrait("player", getActiveHero(s));
  flashPortrait("enemy", target);
  playPortraitEffect("enemy", "hit", target);
  if (total > 0) playBattleSe("hit");
  if (critBonus > 0) spawnCritDisplay("enemy", total);
  clog(
    `PHY攻撃 ${skillPct}% → 基礎${base} カット${cut}%` +
    (critBonus ? " +CRIT" + critBonus : "") +
    (vuln ? " +脆弱" + vuln : "") +
    ` → HP-${total}`
  );
}

function dealPhySkillToEnemyRange(s, minPct, maxPct) {
  dealPhySkillToEnemy(s, randomSkillRatePct(minPct, maxPct));
}

function dealIntSkillToEnemy(s, minPct, maxPct, forceCrit = false) {
  const target = getPlayerAttackTargetEnemy(s);
  const skillPct = randomSkillRatePct(minPct, maxPct);
  const cut = cutRateFromInt(s.enemyInt);
  let base = phyIntDamageAfterCut(s.playerInt, skillPct, cut);
  let critBonus = 0;
  if (forceCrit || rollCrit(critRateFromAgi(s.playerAgi))) {
    critBonus = criticalBonusDamage(s.playerIntBase, skillPct, s.enemyIntBase, "int");
    clog("クリティカル（INT）");
  }
  let total = base + critBonus;
  if (target === s.enemies?.[0]) {
    total = applyGuardToDamage("enemy", total);
  }
  applyHpDeltaToEnemy(s, target, -total);
  lungePortrait("player", getActiveHero(s));
  flashPortrait("enemy", target);
  playPortraitEffect("enemy", "hit", target);
  if (total > 0) playBattleSe("hit");
  if (critBonus > 0) spawnCritDisplay("enemy", total);
  clog(
    `INT攻撃 ${skillPct}% → 基礎${base} カット${cut}%` +
    (critBonus ? " +CRIT" + critBonus : "") +
    ` → HP-${total}`
  );
}

function healPlayerFromIntSkill(s, minPct, maxPct) {
  const pct = randomSkillRatePct(minPct, maxPct);
  const coef = healingCoefficientIntCaster(s.playerInt, s.playerPhy);
  const heal = Math.max(0, Math.floor((coef * pct) / 100));
  const before = s.playerHp;
  s.playerHp = Math.min(s.playerHpMax, s.playerHp + heal);
  if (s.playerHp > before) { playBattleSe("heal"); playPortraitEffect("player", "heal", s.heroes?.[0]); }
  clog(`リカバリー: 係数${coef.toFixed(1)}×${pct}% → HP+${s.playerHp - before}`);
}

// ─── 敵攻撃 ───────────────────────────────────────────────────────
/** SPEC-005 Phase 3b: 敵攻撃の対象となる foremost living hero を返す。
 *  全員死亡時は heroes[0] にフォールバック（保険）。 */
function getEnemyAttackTargetHero(s) {
  if (!s || !Array.isArray(s.heroes)) return null;
  const tgt = foremostAlive(s.heroes);
  return tgt || s.heroes[0] || null;
}

/** ヒーローユニットの hp / alive を更新し、必要に応じて legacy フィールドを同期する。 */
function applyHpDeltaToHero(s, hero, delta) {
  if (!hero) return;
  hero.hp = Math.max(0, (hero.hp ?? 0) + delta);
  if (hero.hp <= 0) hero.alive = false;
  // heroes[0] (前衛) なら legacy combat.playerHp と同期
  if (s.heroes && hero === s.heroes[0]) {
    s.playerHp = hero.hp;
  }
  // SPEC-005 Phase 3j: アクティブキャスターが死亡したら次の生存ヒーローへ切替
  if (hero.alive === false && s.heroes && hero === s.heroes[s.activeHeroIdx ?? 0]) {
    ensureActiveHeroAlive(s);
  }
}

/** 全ヒーロー死亡判定 */
function isPartyWipedOut(s) {
  if (!s || !Array.isArray(s.heroes) || s.heroes.length === 0) {
    return (s?.playerHp ?? 0) <= 0;
  }
  return s.heroes.every(h => !h || h.alive === false || (h.hp ?? 0) <= 0);
}

// ─── SPEC-005 Phase 3j: アクティブキャスター切替 ─────────────────────
/** 現在の active hero (生存している前提) */
function getActiveHero(s) {
  if (!s || !Array.isArray(s.heroes)) return null;
  return s.heroes[s.activeHeroIdx ?? 0] || null;
}

/** activeHeroIdx が死亡 / 範囲外なら、生存ヒーロー (前衛優先) へ切り替える */
function ensureActiveHeroAlive(s) {
  if (!s || !Array.isArray(s.heroes) || s.heroes.length === 0) return;
  const cur = s.heroes[s.activeHeroIdx ?? -1];
  if (cur && cur.alive !== false && (cur.hp ?? 0) > 0) return;
  // 前衛 → 中衛 → 後衛 の順で生存している最初のヒーローへ
  for (let i = 0; i < s.heroes.length; i++) {
    const h = s.heroes[i];
    if (h && h.alive !== false && (h.hp ?? 0) > 0) {
      s.activeHeroIdx = i;
      loadActiveHeroStatsToLegacy(s);
      return;
    }
  }
}

/** active hero のステを legacy combat.player* に流し込む（card.play() が読む側） */
function loadActiveHeroStatsToLegacy(s) {
  const h = getActiveHero(s);
  if (!h) return;
  s.playerPhy = h.phy;
  s.playerInt = h.int;
  s.playerAgi = h.agi;
  s.playerPhyBase = h.phyBase ?? h.phy;
  s.playerIntBase = h.intBase ?? h.int;
  s.playerAgiBase = h.agiBase ?? h.agi;
}

/** card.play() が legacy を変更した分を active hero に書き戻す（バフ/デバフ反映） */
function syncLegacyStatsToActiveHero(s) {
  const h = getActiveHero(s);
  if (!h) return;
  h.phy = s.playerPhy;
  h.int = s.playerInt;
  h.agi = s.playerAgi;
}

/** ユーザー操作: ヒーロー portrait をクリックして交代 */
function setActiveHero(idx) {
  if (!combat || !Array.isArray(combat.heroes)) return;
  if (idx === (combat.activeHeroIdx ?? 0)) return;
  const target = combat.heroes[idx];
  if (!target || target.alive === false || (target.hp ?? 0) <= 0) return;
  // 現キャスターのバフ等を書き戻してから切替
  syncLegacyStatsToActiveHero(combat);
  combat.activeHeroIdx = idx;
  loadActiveHeroStatsToLegacy(combat);
  clog(`【交代】${target.name || "ヒーロー"} に切替`);
  renderCombat();
}

function dealPhySkillFromEnemyToPlayer(s, skillPct, caster) {
  // Phase 3b: 敵攻撃は foremost living hero を対象に
  const target = getEnemyAttackTargetHero(s);
  // ダメージ計算は legacy stats (heroes[0] 前衛) を使う - 簡略化のため
  // (Phase 3c 以降で target.phy / guard / shield 個別管理に拡張予定)
  const cut = cutRateFromPhy(s.playerPhy);
  let base = phyIntDamageAfterCut(s.enemyPhy, skillPct, cut);
  let critBonus = 0;
  if (rollCrit(critRateFromAgi(s.enemyAgi))) {
    critBonus = criticalBonusDamage(s.enemyPhyBase, skillPct, s.playerPhyBase, "phy");
    clog("敵クリティカル（PHY）");
  }
  let total = base + critBonus;
  // 出血（プレイヤーが出血スタックを持つとき、被物理攻撃で追加ダメージ）
  if ((s.playerBleed || 0) > 0) {
    total += s.playerBleed;
    clog(`出血 ×${s.playerBleed} 追加`);
  }
  // 不屈（このターン被ダメ半減）
  if (s.damageReducedThisTurn) {
    total = Math.ceil(total / 2);
    clog("不屈: ダメージ半減");
  }
  // ガード/シールドは前衛 (heroes[0]) のみ。foremost が前衛以外ならそのまま透過。
  if (target === s.heroes?.[0]) {
    total = applyGuardToDamage("player", total);
  }
  // 対象ヒーローへ HP 反映
  applyHpDeltaToHero(s, target, -total);
  checkResurrection(s);
  // SPEC-005 Phase 3f: エフェクトを実際の被弾ヒーローに向ける
  // Phase 3g: 攻撃側 (caster) が指定されていればその portrait を lunge させる
  lungePortrait("enemy", caster);
  flashPortrait("player", target);
  playPortraitEffect("player", "hit", target);
  if (total > 0) playBattleSe("hit");
  if (critBonus > 0) spawnCritDisplay("player", total);
  clog(
    `敵 PHY ${skillPct}% → 被ダメージ ${total}` +
    (critBonus ? "（CRIT+" + critBonus + "）" : "")
  );
  // 張遼パッシブ判定フラグを立てる（実際の反撃は enemyTurn で async に処理）
  if (LEADER.passiveKey === 'zhang' && s.playerHp > 0 && s.enemyHp > 0 && Math.random() < 0.5) {
    s._zhangCounterPending = true;
  }
}

function dealIntSkillFromEnemyToPlayer(s, skillPct, caster) {
  const target = getEnemyAttackTargetHero(s);
  const cut = cutRateFromInt(s.playerInt);
  let base = phyIntDamageAfterCut(s.enemyInt, skillPct, cut);
  let critBonus = 0;
  if (rollCrit(critRateFromAgi(s.enemyAgi))) {
    critBonus = criticalBonusDamage(s.enemyIntBase, skillPct, s.playerIntBase, "int");
    clog("敵クリティカル（INT）");
  }
  let total = base + critBonus;
  if (s.damageReducedThisTurn) {
    total = Math.ceil(total / 2);
    clog("不屈: ダメージ半減");
  }
  if (target === s.heroes?.[0]) {
    total = applyGuardToDamage("player", total);
  }
  applyHpDeltaToHero(s, target, -total);
  checkResurrection(s);
  lungePortrait("enemy", caster);
  flashPortrait("player", target);
  playPortraitEffect("player", "hit", target);
  if (total > 0) playBattleSe("hit");
  if (critBonus > 0) spawnCritDisplay("player", total);
  clog(
    `敵 INT ${skillPct}% → 被ダメージ ${total}` +
    (critBonus ? "（CRIT+" + critBonus + "）" : "")
  );
  // 張遼パッシブ判定フラグを立てる（実際の反撃は enemyTurn で async に処理）
  if (LEADER.passiveKey === 'zhang' && s.playerHp > 0 && s.enemyHp > 0 && Math.random() < 0.5) {
    s._zhangCounterPending = true;
  }
}

/** 最大 HP 割合の特殊ダメージ（シールドのみ有効） */
function dealSpecialMaxHpPercentToPlayer(s, pct, caster) {
  const target = getEnemyAttackTargetHero(s);
  // 特殊ダメージは対象 hero の最大 HP 基準
  const refMaxHp = (target?.hpMax ?? s.playerHpMax) || s.playerHpMax;
  let raw = Math.max(0, Math.floor((refMaxHp * pct) / 100));
  if (s.damageReducedThisTurn) raw = Math.ceil(raw / 2);
  // シールドは前衛 (heroes[0]) のみ
  if (target === s.heroes?.[0]) {
    raw = applyDamageThroughShield(s, "player", raw);
  }
  applyHpDeltaToHero(s, target, -raw);
  checkResurrection(s);
  lungePortrait("enemy", caster);
  flashPortrait("player", target);
  playPortraitEffect("player", "area", target);
  if (raw > 0) playBattleSe("area");
  clog(`特殊ダメージ（最大HP ${pct}%）→ HP-${raw}`);
}

// ─── Battle API（cards.js に渡す） ───────────────────────────────
const battleApi = {
  dealPhySkillToEnemy: (s, a, b) => dealPhySkillToEnemyRange(s, a, b),
  dealIntSkillToEnemy: (s, a, b) => dealIntSkillToEnemy(s, a, b, false),
  dealIntSkillToEnemyCrit: (s, a, b) => dealIntSkillToEnemy(s, a, b, true),
  healPlayerFromIntSkill,
  drawCards,
  playBattleSe,
  portraitFx: (who, kind) => playPortraitEffect(who, kind),
  // 章 2-3 カード用
  addPoisonToEnemy(s, stacks) {
    s.enemyPoison = (s.enemyPoison || 0) + stacks;
    const tgt = getPlayerAttackTargetEnemy(s) || s.enemies?.[0];
    playBattleSe("debuff"); playPortraitEffect("enemy", "debuff", tgt);
    clog(`毒 ×${stacks} 付与（敵）`);
    renderStatusBadges();
  },
  addBleedToEnemy(s, stacks) {
    s.enemyBleed = (s.enemyBleed || 0) + stacks;
    const tgt = getPlayerAttackTargetEnemy(s) || s.enemies?.[0];
    playBattleSe("debuff"); playPortraitEffect("enemy", "debuff", tgt);
    clog(`出血 ×${stacks} 付与（敵）`);
    renderStatusBadges();
  },
  clearPlayerDebuffs(s) {
    const had = (s.playerPoison || 0) + (s.playerBleed || 0);
    s.playerPoison = 0; s.playerBleed = 0;
    if (had > 0) {
      playBattleSe("heal"); playPortraitEffect("player", "heal", s.heroes?.[0]);
      clog("状態異常解除（自分）");
    }
    renderStatusBadges();
  },
  addPlayerShield(s, amount) {
    s.playerShield = (s.playerShield || 0) + amount;
    playBattleSe("buff"); playPortraitEffect("player", "buff", s.heroes?.[0]);
    clog(`シールド +${amount}`);
  },
  addGold(amount) {
    gold += amount;
    clog(`GUM +${amount}`);
    syncResources();
  },
  setDamageReducedThisTurn(s) {
    s.damageReducedThisTurn = true;
    playBattleSe("buff"); playPortraitEffect("player", "buff", s.heroes?.[0]);
    clog("不屈：このターン被ダメ半減");
  },
};

const { CARD_LIBRARY, copyCard, makeStarterDeck } = createCardRuntime(clog, battleApi);

// ─── ランステート管理 ─────────────────────────────────────────────
function ensureRunState() {
  if (!runState) {
    const chapter = CHAPTERS[0];
    const { nodes, edges, viewH, startY } = generateChapterMap(chapter, ENEMY_DEFS);
    setActiveMap(nodes, edges, viewH, startY);
    // SPEC-005 Phase 3: party 初期化（最大 3 ヒーロー）
    const partyIds = pendingPartyConfirmed && pendingPartyConfirmed.length > 0
      ? pendingPartyConfirmed
      : [LEADER.heroId];
    const party = buildPartyLoadout(partyIds);
    runState = {
      chapterIdx: 0,
      deck: makeStarterDeck(),
      party,
      // 旧フィールドは前衛 (party[0]) と同期。既存コードの互換用。
      playerHp: party[0].hpCurrent,
      playerHpMax: party[0].hpMax,
      lastMapNodeId: null,
      pathNodeIds: [],
      runComplete: false,
      llExtSlots: [null, null],
    };
  }
}

// ─── 章推移 ───────────────────────────────────────────────────────
function advanceToNextChapter() {
  if (!runState) return;
  // クリア済み章を記録（node選択画面のアンロックに使用）
  clearedChapters.add(runState.chapterIdx);
  const nextIdx = runState.chapterIdx + 1;
  if (nextIdx >= CHAPTERS.length) {
    runState.runComplete = true;
    playSeClear();
    // レギュレーション解放 (#37): 全章クリア → 次のレギュレーションをアンロック
    const newlyUnlocked = unlockNextAfterClear(currentRegulationId);
    if (newlyUnlocked) {
      const r = REGULATION_BY_ID[newlyUnlocked];
      clog(`★ レギュレーション「${r.nameJa}」が解放されました！`);
      runState.unlockedRegulationOnClear = newlyUnlocked;
    }
    return;
  }
  runState.chapterIdx = nextIdx;
  runState.lastMapNodeId = null;
  runState.pathNodeIds = [];
  const chapter = CHAPTERS[nextIdx];
  const { nodes, edges, viewH, startY } = generateChapterMap(chapter, ENEMY_DEFS);
  setActiveMap(nodes, edges, viewH, startY);
  clog(`── 章 ${chapter.id}「${chapter.name}」へ ──`);
}

// ─── 現在の章カードプール（累積） ───────────────────────────────
function getCumulativeCardPool() {
  const pool = [];
  const ci = runState?.chapterIdx ?? 0;
  for (let i = 0; i <= ci; i++) {
    pool.push(...CHAPTERS[i].cardPool);
  }
  return pool;
}

// ─── ノード位置 ───────────────────────────────────────────────────
function nodeXY(id) {
  if (id === "START") return { x: MAP_START_X, y: activeMapStartY };
  const n = mapNodeById(id);
  return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
}

// ─── リソース表示更新 ─────────────────────────────────────────────
function syncResources() {
  const goldValEl = document.getElementById("goldVal");
  if (goldValEl) goldValEl.textContent = String(gold);
  const combatGoldEl = document.getElementById("combatGoldVal");
  if (combatGoldEl) combatGoldEl.textContent = String(gold);
  ensureRunState();
  // マップヘッダーHP
  const mapHpValEl = document.getElementById("mapHpVal");
  const mapHpMaxEl = document.getElementById("mapHpMax");
  if (mapHpValEl) mapHpValEl.textContent = String(runState.playerHp);
  if (mapHpMaxEl) mapHpMaxEl.textContent = String(runState.playerHpMax);
  const hpEl = document.querySelector(".res-hp");
  if (hpEl) {
    const pct = runState.playerHp / runState.playerHpMax;
    hpEl.classList.toggle("res-hp--low", pct <= 0.5);
  }
  const chapterEl = document.getElementById("chapterVal");
  if (chapterEl) chapterEl.textContent = String((runState.chapterIdx ?? 0) + 1);
  syncLlExtSlots();
  const layerEl = document.getElementById("layerVal");
  if (layerEl) {
    if (runState.runComplete) {
      layerEl.textContent = "クリア";
    } else if (!runState.lastMapNodeId) {
      layerEl.textContent = "入口";
    } else {
      const cur = mapNodeById(runState.lastMapNodeId);
      layerEl.textContent = cur ? `第${cur.layer + 1}層 · ${cur.label}` : "—";
    }
  }
}

// ─── マップ描画 ───────────────────────────────────────────────────
function mapNodeClass(node) {
  ensureRunState();
  const allowed = new Set(reachableNextNodeIds(runState.lastMapNodeId));
  const pathSet = new Set(runState.pathNodeIds);
  const last = runState.lastMapNodeId;
  if (allowed.has(node.id)) return "map-node--reachable";
  if (last === node.id) return "map-node--current";
  if (pathSet.has(node.id)) return "map-node--visited";
  const lastNode = last ? mapNodeById(last) : null;
  const lastLayer = lastNode ? lastNode.layer : -1;
  if (node.layer === lastLayer && last && node.id !== last) return "map-node--skipped";
  return "map-node--locked";
}

function renderMap() {
  const host = document.getElementById("mapRows");
  const prevLeg = document.getElementById("mapDynLegend");
  if (prevLeg) prevLeg.remove();
  host.innerHTML = "";
  ensureRunState();

  // タイトル更新
  const titleEl = document.getElementById("mapTitle");
  if (titleEl) {
    const chapter = CHAPTERS[runState.chapterIdx];
    titleEl.textContent = runState.runComplete
      ? `全ランクリア！（${CHAPTERS.length} 章突破・トロイ制覇）`
      : `章 ${chapter.id}「${chapter.name}」（下から上へ進む）`;
  }

  if (runState.runComplete) {
    host.innerHTML =
      `<p style='color:var(--accent);margin:0 0 0.75rem'>全 ${CHAPTERS.length} 章（トロイまで）をクリアしました！おめでとうございます。</p>` +
      "<button type='button' class='action primary' id='btnRestartClear'>もう一度</button>";
    document.getElementById("btnRestartClear").addEventListener("click", resetRun);
    syncResources();
    return;
  }

  const MAP_NODES = activeMapNodes;
  const MAP_EDGES = activeMapEdges;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 100 ${activeMapViewH}`);
  svg.setAttribute("class", "map-graph");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "フロア接続マップ");

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const mk = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  mk.setAttribute("id", "arrowHead");
  mk.setAttribute("markerWidth", "4"); mk.setAttribute("markerHeight", "4");
  mk.setAttribute("refX", "3.2"); mk.setAttribute("refY", "2");
  mk.setAttribute("orient", "auto");
  const po = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  po.setAttribute("points", "0 0, 4 2, 0 4");
  po.setAttribute("fill", "#5a5068");
  mk.appendChild(po); defs.appendChild(mk);
  for (const node of MAP_NODES) {
    if (node.type !== "fight" || !node.enemyImgId) continue;
    const clip = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
    clip.setAttribute("id", "mapEnemyClip-" + node.id);
    const cc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    cc.setAttribute("cx", String(node.x)); cc.setAttribute("cy", String(node.y)); cc.setAttribute("r", "3.5");
    clip.appendChild(cc); defs.appendChild(clip);
  }
  svg.appendChild(defs);

  const edgeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
  edgeG.setAttribute("class", "map-edges");
  const allowed = new Set(reachableNextNodeIds(runState.lastMapNodeId));
  for (const [a, b] of MAP_EDGES) {
    const pa = nodeXY(a), pb = nodeXY(b);
    // 3次ベジエ曲線: 制御点を縦中間の同一 y に置き、滑らかな S カーブを作る
    const midY = (pa.y + pb.y) / 2;
    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathEl.setAttribute("d",
      `M ${pa.x} ${pa.y} C ${pa.x} ${midY}, ${pb.x} ${midY}, ${pb.x} ${pb.y}`);
    pathEl.setAttribute("marker-end", "url(#arrowHead)");
    const onPath =
      runState.pathNodeIds.includes(a) &&
      (runState.pathNodeIds.includes(b) || allowed.has(b));
    pathEl.setAttribute("class",
      onPath || (a === "START" && allowed.has(b)) ? "map-edge map-edge--active" : "map-edge"
    );
    edgeG.appendChild(pathEl);
  }
  svg.appendChild(edgeG);

  const startG = document.createElementNS("http://www.w3.org/2000/svg", "g");
  startG.setAttribute("class", "map-start");
  const sc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  sc.setAttribute("cx", String(MAP_START_X)); sc.setAttribute("cy", String(activeMapStartY));
  sc.setAttribute("r", "3.2"); sc.setAttribute("class", "map-start-dot");
  startG.appendChild(sc);
  const st = document.createElementNS("http://www.w3.org/2000/svg", "text");
  st.setAttribute("x", String(MAP_START_X)); st.setAttribute("y", String(activeMapStartY + 7.5));
  st.setAttribute("text-anchor", "middle"); st.setAttribute("class", "map-start-label");
  st.textContent = "入口";
  startG.appendChild(st);
  svg.appendChild(startG);

  for (const node of MAP_NODES) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "map-node " + mapNodeClass(node));
    g.setAttribute("data-node-id", node.id);
    g.style.cursor = "pointer";
    const circ = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circ.setAttribute("cx", String(node.x)); circ.setAttribute("cy", String(node.y));
    circ.setAttribute("r", "4.2"); circ.setAttribute("class", "map-node-shape");
    g.appendChild(circ);
    const lab = document.createElementNS("http://www.w3.org/2000/svg", "text");
    lab.setAttribute("x", String(node.x)); lab.setAttribute("y", String(node.y + 8.5));
    lab.setAttribute("text-anchor", "middle"); lab.setAttribute("class", "map-node-cap");
    lab.textContent = node.label;
    g.appendChild(lab);
    const ty = document.createElementNS("http://www.w3.org/2000/svg", "text");
    ty.setAttribute("x", String(node.x)); ty.setAttribute("y", String(node.y + 11.8));
    ty.setAttribute("text-anchor", "middle"); ty.setAttribute("class", "map-node-type");
    ty.textContent =
      node.type === "fight"  ? (node.elite ? "レアエネミー" : "エネミー") :
      node.type === "rest"   ? "HP回復" :
      node.type === "shop"   ? "ショップ" :
      node.type === "craft"  ? "クラフト" : "ボス";
    g.appendChild(ty);
    const allowed = new Set(reachableNextNodeIds(runState.lastMapNodeId));
    if (!allowed.has(node.id)) g.style.pointerEvents = "none";
    g.addEventListener("click", () => tryEnterMapNode(node.id));
    svg.appendChild(g);
  }

  const fightImgG = document.createElementNS("http://www.w3.org/2000/svg", "g");
  fightImgG.setAttribute("class", "map-fight-icons");
  for (const node of MAP_NODES) {
    if (node.type !== "fight" || !node.enemyImgId) continue;
    const imgEl = document.createElementNS("http://www.w3.org/2000/svg", "image");
    imgEl.setAttribute("href", ENEMY_IMG(node.enemyImgId));
    imgEl.setAttributeNS("http://www.w3.org/1999/xlink", "href", ENEMY_IMG(node.enemyImgId));
    imgEl.setAttribute("x", String(node.x - 3.8)); imgEl.setAttribute("y", String(node.y - 3.8));
    imgEl.setAttribute("width", "7.6"); imgEl.setAttribute("height", "7.6");
    imgEl.setAttribute("clip-path", "url(#mapEnemyClip-" + node.id + ")");
    imgEl.setAttribute("preserveAspectRatio", "xMidYMid slice");
    imgEl.setAttribute("class", "map-node-enemy-img");
    fightImgG.appendChild(imgEl);
  }
  svg.appendChild(fightImgG);

  // ショップ・休憩ノードのアイコン表示
  const nodeIconG = document.createElementNS("http://www.w3.org/2000/svg", "g");
  nodeIconG.setAttribute("class", "map-node-icons");
  for (const node of MAP_NODES) {
    let iconUrl = null;
    if (node.type === "shop")  iconUrl = img("Image/Icons/gum.png");
    else if (node.type === "rest")  iconUrl = img("Image/BattleIcons/Parameters/hp.png");
    else if (node.type === "craft") iconUrl = img("Image/Icons/ce.png");
    if (!iconUrl) continue;
    const sz = 5.2;
    const iconEl = document.createElementNS("http://www.w3.org/2000/svg", "image");
    iconEl.setAttribute("href", iconUrl);
    iconEl.setAttributeNS("http://www.w3.org/1999/xlink", "href", iconUrl);
    iconEl.setAttribute("x", String(node.x - sz / 2));
    iconEl.setAttribute("y", String(node.y - sz / 2));
    iconEl.setAttribute("width", String(sz));
    iconEl.setAttribute("height", String(sz));
    iconEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
    iconEl.setAttribute("class", "map-node-icon-img");
    nodeIconG.appendChild(iconEl);
  }
  svg.appendChild(nodeIconG);
  host.appendChild(svg);

  const legend = document.createElement("p");
  legend.className = "map-legend";
  legend.id = "mapDynLegend";
  legend.innerHTML =
    "金枠＝現在地 · 緑＝次に選べる · 灰＝見送り／未到達。戦闘ノードの丸上に敵アイコン。";
  const mapPanel = host.parentNode;
  if (mapPanel && host.nextSibling) mapPanel.insertBefore(legend, host.nextSibling);
  else if (mapPanel) mapPanel.appendChild(legend);

  // 現在地 + 次の選択肢ノードを画面内に収める
  const scrollMapFocus = (smooth = false) => {
    const wrap = host;
    if (!wrap || !svg.isConnected) return;
    const curId  = runState.lastMapNodeId || "START";
    const nextIds = reachableNextNodeIds(curId);
    // 現在地と次の進め先の重心へスクロール
    const pts = [nodeXY(curId), ...nextIds.map(id => nodeXY(id))];
    if (!pts.length) return;
    const minY  = Math.min(...pts.map(p => p.y));
    const maxY  = Math.max(...pts.map(p => p.y));
    const focusY = (minY + maxY) / 2;
    const focusX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const vb = svg.viewBox.baseVal;
    const vbW = vb.width  || 100;
    const vbH = vb.height || activeMapViewH;
    const wrapRect = wrap.getBoundingClientRect();
    const svgRect  = svg.getBoundingClientRect();
    const svgX = svgRect.left + (focusX / vbW) * svgRect.width;
    const svgY = svgRect.top  + (focusY / vbH) * svgRect.height;
    const tTop  = wrap.scrollTop  + (svgY - wrapRect.top)  - wrap.clientHeight / 2;
    const tLeft = wrap.scrollLeft + (svgX - wrapRect.left) - wrap.clientWidth  / 2;
    wrap.scrollTo({
      top:  Math.max(0, Math.min(tTop,  wrap.scrollHeight - wrap.clientHeight)),
      left: Math.max(0, Math.min(tLeft, wrap.scrollWidth  - wrap.clientWidth)),
      behavior: smooth ? "smooth" : "auto",
    });
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollMapFocus(false);
      setTimeout(() => scrollMapFocus(true), 80);
    });
  });
  syncResources();
  renderNavigator(); // マイのアドバイスをゲーム状態から更新
}

// ─── ノード進入 ───────────────────────────────────────────────────
function tryEnterMapNode(nodeId) {
  ensureRunState();
  const allowed = reachableNextNodeIds(runState.lastMapNodeId);
  if (!allowed.includes(nodeId)) return;
  const node = mapNodeById(nodeId);
  if (!node) return;
  if (node.type === "rest") {
    const heal = Math.floor(runState.playerHpMax * 0.35);
    const actualHeal = Math.min(runState.playerHpMax, runState.playerHp + heal) - runState.playerHp;
    runState.playerHp = Math.min(runState.playerHpMax, runState.playerHp + heal);
    runState.pathNodeIds.push(nodeId);
    runState.lastMapNodeId = nodeId;
    clog(`休憩で HP+${actualHeal}`);
    playBattleSe("heal");
    renderMap();
    // マイのナレーション（renderMap 内の renderNavigator より後に上書き）
    const hpAfter = runState.playerHp;
    const hpMax = runState.playerHpMax;
    renderNavigator(
      actualHeal > 0
        ? `休憩できましたね！HP が ${hpAfter}/${hpMax} に回復しました。さあ、次へ進みましょう！`
        : `すでに満タンです！${hpAfter}/${hpMax}。この調子でボスを倒しましょう！`
    );
    return;
  }
  if (node.type === "shop") {
    pendingShopNodeId = nodeId;
    openShop();
    return;
  }
  if (node.type === "craft") {
    pendingCraftNodeId = nodeId;
    openCraftScreen();
    return;
  }
  startCombatFromMapNode(node);
}

// ─── ビュー切り替え ───────────────────────────────────────────────
function showView(name) {
  if (view === "combat" && name !== "combat") stopBgm();
  view = name;
  document.getElementById("mapView").classList.toggle("hidden", name !== "map");
  document.getElementById("combatView").classList.toggle("hidden", name !== "combat");
  document.getElementById("shopView").classList.toggle("hidden", name !== "shop");
  document.getElementById("gameOver").classList.toggle("hidden", name !== "over");
  const rv = document.getElementById("rewardView");
  if (rv) rv.classList.toggle("hidden", name !== "reward");
  const nsv = document.getElementById("nodeSelectView");
  if (nsv) nsv.classList.toggle("hidden", name !== "nodeSelect");
  const cv = document.getElementById("craftView");
  if (cv) cv.classList.toggle("hidden", name !== "craft");
  const hsv = document.getElementById("heroSelectView");
  if (hsv) hsv.classList.toggle("hidden", name !== "heroSelect");
  const rsv = document.getElementById("regulationSelectView");
  if (rsv) rsv.classList.toggle("hidden", name !== "regulationSelect");
  // Show/hide map resources bar（ヒーロー選択・レギュレーション選択・戦闘中は非表示）
  const mapRes = document.getElementById("mapResources");
  if (mapRes) mapRes.classList.toggle("hidden", name === "combat" || name === "heroSelect" || name === "regulationSelect");
  // Mai navigator: マップビュー内にあるので mapView の hidden に連動
  const nav = document.getElementById("maiNavigator");
  if (nav) nav.classList.toggle("hidden", name !== "map");
  // マップ BGM: マップ・ショップ・報酬・node選択・ヒーロー選択・レギュレーション選択ではBGMを再生
  if (name === "map" || name === "nodeSelect" || name === "heroSelect" || name === "regulationSelect") startBgmMap();
}

// ─── 戦闘開始 ─────────────────────────────────────────────────────
function startCombatFromMapNode(node) {
  ensureRunState();
  const chapter = CHAPTERS[runState.chapterIdx];

  let enemyDef;
  let isBoss = false;
  let bossDef = null;

  if (node.type === "boss") {
    isBoss = true;
    bossDef = BOSS_DEFS[chapter.bossId];
    enemyDef = bossDef;
  } else if (node.enemyDefId && ENEMY_DEFS[node.enemyDefId]) {
    enemyDef = ENEMY_DEFS[node.enemyDefId];
  } else {
    // フォールバック: プールからランダム
    const pool = node.elite ? chapter.elitePool : chapter.enemyPool;
    const id = pool[Math.floor(Math.random() * pool.length)];
    enemyDef = ENEMY_DEFS[id] || { name: "敵", hp: 30, phy: 14, int: 8, agi: 8, imgId: 314, intentRota: [{ kind: "attack", phyPct: 100 }] };
  }

  const deck = runState.deck.map((c) => ({ ...c }));
  const pPhy = LEADER.basePhy;
  const pInt = LEADER.baseInt;
  const pAgi = LEADER.baseAgi;

  // ボスフェーズ
  let intentRota, bossPhase;
  if (isBoss && bossDef.phases) {
    bossPhase = 0;
    intentRota = bossDef.phases[0].intentRota;
  } else {
    bossPhase = -1;
    intentRota = enemyDef.intentRota;
  }

  // レギュレーション効果適用 (#37)
  const reg = getCurrentRegulation();
  const regHp = Math.max(1, Math.round(enemyDef.hp * reg.effects.hpFactor));
  const regPhy = Math.max(1, Math.round(enemyDef.phy * reg.effects.atkFactor));
  const regInt = Math.max(1, Math.round(enemyDef.int * reg.effects.atkFactor));

  combat = {
    deck,
    drawPile: [],
    discardPile: [],
    exhaustPile: [],
    hand: [],
    playerHp: runState.playerHp,
    playerHpMax: runState.playerHpMax,
    playerPhy: pPhy, playerInt: pInt, playerAgi: pAgi,
    playerPhyBase: pPhy, playerIntBase: pInt, playerAgiBase: pAgi,
    playerGuard: 0,
    playerShield: 0,
    playerPoison: 0,
    playerBleed: 0,
    energy: 3,
    energyMax: 3,
    bonusEnergyNext: 0,
    phyPenaltyNext: 0,
    damageReducedThisTurn: false,
    enemyHp: regHp,
    enemyHpMax: regHp,
    enemyPhy: regPhy, enemyInt: regInt, enemyAgi: enemyDef.agi,
    enemyPhyBase: regPhy, enemyIntBase: regInt, enemyAgiBase: enemyDef.agi,
    enemyGuard: 0,
    enemyShield: enemyDef.initialShield || 0,
    enemyPoison: 0,
    enemyBleed: 0,
    enemyVulnerable: 0,
    enemyIntent: null,
    intentRota,
    intentRotaIdx: 0,
    isBoss,
    bossPhase,
    bossDef: isBoss ? bossDef : null,
    enemyName: enemyDef.name,
    enemyImgId: enemyDef.imgId,
    enemyDefId: enemyDef.id,
    mapNodeId: node.id,
    isElite: !!node.elite,
    turn: 1,
    zhangPassiveTriggered: false,
    doylePassiveTriggered: false,
    hasResurrection: false,
    _lastUi: null,
  };

  // SPEC-005 Phase 3: party から combat.heroes (1〜3 体) を構築
  const partyArr = (runState.party && runState.party.length > 0) ? runState.party : [{ heroId: LEADER.heroId, hpCurrent: LEADER.hpMax, hpMax: LEADER.hpMax }];
  combat.heroes = partyArr.map((loadout, idx) => {
    const heroDef = HERO_ROSTER.find(h => h.heroId === loadout.heroId) || LEADER;
    return makeHeroUnit({
      position: idx,
      defId: heroDef.heroId,
      name: heroDef.nameJa,
      imgUrl: typeof heroDef.img === "function" ? heroDef.img() : null,
      hp: loadout.hpCurrent, hpMax: loadout.hpMax,
      phy: heroDef.basePhy, int: heroDef.baseInt, agi: heroDef.baseAgi,
      phyBase: heroDef.basePhy, intBase: heroDef.baseInt, agiBase: heroDef.baseAgi,
      passiveKey: heroDef.passiveKey || null,
    });
  });
  combat.enemies = [makeEnemyUnit({
    position: 0,
    defId: enemyDef.id,
    name: enemyDef.name,
    imgId: enemyDef.imgId,
    hp: regHp, hpMax: regHp,
    phy: regPhy, int: regInt, agi: enemyDef.agi,
    phyBase: regPhy, intBase: regInt, agiBase: enemyDef.agi,
    shield: enemyDef.initialShield || 0,
    intentRota,
    bossPhase, bossDef: isBoss ? bossDef : null,
    isBoss,
  })];
  combat.activeHeroIdx = 0;

  // SPEC-005 Phase 3c: 多エネミースポーン (fight ノードのみ。boss / elite は 1 体維持)
  // 単純化のため fight 時は party.length と同数 (最大 3) のエネミーを章プールから補充
  if (!isBoss && !node.elite && partyArr.length > 1) {
    const desiredCount = Math.min(3, partyArr.length);
    const pool = (chapter.enemyPool || []).filter(id => id && id !== enemyDef.id);
    for (let i = 1; i < desiredCount; i++) {
      if (pool.length === 0) break;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const def = ENEMY_DEFS[pick];
      if (!def) continue;
      const subHp = Math.max(1, Math.round(def.hp * reg.effects.hpFactor));
      const subPhy = Math.max(1, Math.round(def.phy * reg.effects.atkFactor));
      const subInt = Math.max(1, Math.round(def.int * reg.effects.atkFactor));
      combat.enemies.push(makeEnemyUnit({
        position: i,
        defId: def.id,
        name: def.name,
        imgId: def.imgId,
        hp: subHp, hpMax: subHp,
        phy: subPhy, int: subInt, agi: def.agi,
        phyBase: subPhy, intBase: subInt, agiBase: def.agi,
        shield: def.initialShield || 0,
        intentRota: def.intentRota,
        bossPhase: -1,
        isBoss: false,
      }));
    }
  }

  combat.drawPile = shuffle(combat.deck.map((c) => copyCard(c.libraryKey)));
  showView("combat");
  startBgmCombat();

  // Update stage title in combat header
  const stageTitleEl = document.getElementById("combatStageTitle");
  if (stageTitleEl) {
    const chapter = CHAPTERS[runState.chapterIdx];
    stageTitleEl.textContent = chapter.name;
  }

  const bgFile = isBoss ? "1004" : node.elite ? "1002" : "1001";
  document.getElementById("combatBg").style.backgroundImage = "url('" + BATTLE_BG(bgFile) + "')";
  document.getElementById("leaderImg").src = LEADER.img();
  document.getElementById("leaderName").textContent = LEADER.nameJa;
  document.getElementById("enemyImg").src = ENEMY_IMG(enemyDef.imgId);
  document.getElementById("enemyName").textContent = combat.enemyName;
  document.getElementById("clog").innerHTML = "";
  clog(`戦闘開始 vs ${enemyDef.name}${isBoss ? "（ボス）" : node.elite ? "（精鋭）" : ""}`);
  if (isBoss && (enemyDef.initialShield || 0) > 0) {
    clog(`ボスはシールド ${enemyDef.initialShield} を持ちます！`);
  }
  applyHeroPassiveOnCombatStart(combat);
  syncLlExtSlots();
  startPlayerTurn();
}

// ─── 意図テキスト ─────────────────────────────────────────────────
/** 敵の PHY 攻撃が現在の防御力を考慮した上で与える推定ダメージを返す */
function estEnemyPhyDmg(pct) {
  const base = Math.floor(combat.enemyPhy * pct / 100);
  const cut  = cutRateFromPhy(combat.playerPhy);
  return Math.max(0, Math.floor(base * (100 - cut) / 100));
}
function estEnemyIntDmg(pct) {
  const base = Math.floor(combat.enemyInt * pct / 100);
  const cut  = cutRateFromInt(combat.playerInt);
  return Math.max(0, Math.floor(base * (100 - cut) / 100));
}

function intentText() {
  const it = combat?.enemyIntent;
  if (!it) return "—";
  switch (it.kind) {
    case "attack": {
      const d = estEnemyPhyDmg(it.phyPct);
      return `先頭：${d} ダメージ`;
    }
    case "attackPoison": {
      const d = estEnemyPhyDmg(it.phyPct);
      return `先頭：${d} ダメージ ＋毒×${it.poisonStacks}`;
    }
    case "attackBleed": {
      const d = estEnemyPhyDmg(it.phyPct);
      return `先頭：${d} ダメージ ＋出血×${it.bleedStacks}`;
    }
    case "attackDouble": {
      const d = estEnemyPhyDmg(it.phyPct);
      return `先頭：${d} ダメージ ×2`;
    }
    case "attackInt": {
      const d = estEnemyIntDmg(it.intPct);
      return `先頭：${d} ダメージ（INT）`;
    }
    case "attackIntDouble": {
      const d = estEnemyIntDmg(it.intPct);
      return `先頭：${d} ダメージ（INT）×2`;
    }
    case "healSelf": {
      const h = Math.max(1, Math.floor(combat.enemyHpMax * it.pct / 100));
      return `自己回復：${h} HP`;
    }
    case "buffSelf": {
      const parts = [];
      if (it.phyAdd) parts.push(`PHY+${it.phyAdd}`);
      if (it.intAdd) parts.push(`INT+${it.intAdd}`);
      return `強化：${parts.join(' ')}`;
    }
    case "guard":
      return `防御：GRD+${it.value}`;
    case "special": {
      const d = Math.max(1, Math.floor(combat.playerHpMax * it.pct / 100));
      return `先頭：${d} ダメージ（特殊）`;
    }
    default:
      return "—";
  }
}

// ─── 意図ローテーション（ボスフェーズ移行含む） ────────────────────
function advanceEnemyIntent() {
  // ボスフェーズ移行チェック
  if (combat.isBoss && combat.bossDef?.phases?.length > 1) {
    const hp50 = combat.enemyHpMax * 0.5;
    const newPhase = combat.enemyHp <= hp50 ? 1 : 0;
    if (newPhase !== combat.bossPhase) {
      combat.bossPhase = newPhase;
      combat.intentRota = combat.bossDef.phases[newPhase].intentRota;
      combat.intentRotaIdx = 0;
      clog(`──── フェーズ ${newPhase + 1} 移行！ ────`);
    }
  }
  combat.enemyIntent = combat.intentRota[combat.intentRotaIdx % combat.intentRota.length];
  combat.intentRotaIdx++;
  // 旧コード互換: enemies[0] の intent も同期
  if (combat.enemies && combat.enemies[0]) {
    combat.enemies[0].enemyIntent = combat.enemyIntent;
  }
  // SPEC-005 Phase 3d: サブエネミーも次の intent を表示用に設定（インクリメントもここで）
  if (combat.enemies && combat.enemies.length > 1) {
    for (let i = 1; i < combat.enemies.length; i++) {
      const sub = combat.enemies[i];
      if (!sub || sub.alive === false || (sub.hp ?? 0) <= 0) { if (sub) sub.enemyIntent = null; continue; }
      const rota = sub.intentRota || [];
      if (rota.length === 0) { sub.enemyIntent = null; continue; }
      sub.enemyIntent = rota[(sub.intentRotaIdx ?? 0) % rota.length];
      sub.intentRotaIdx = (sub.intentRotaIdx ?? 0) + 1;
    }
  }
}

// ─── プレイヤーターン開始 ─────────────────────────────────────────
function startPlayerTurn() {
  combat.playerGuard = 0;
  combat.damageReducedThisTurn = false;

  // 毒ティック（ターン開始時に自分に毒ダメージ）
  if ((combat.playerPoison || 0) > 0) {
    const dmg = combat.playerPoison;
    combat.playerHp = Math.max(0, combat.playerHp - dmg);
    if (combat.heroes?.[0]) {
      combat.heroes[0].hp = combat.playerHp;
      if (combat.heroes[0].hp <= 0) combat.heroes[0].alive = false;
    }
    flashPortrait("player", combat.heroes?.[0]);
    playPortraitEffect("player", "debuff", combat.heroes?.[0]);
    clog(`毒ダメージ（自分）${dmg}`);
    checkResurrection(combat);
    if (isPartyWipedOut(combat)) { endCombatLoss(); return; }
  }
  // 毒ティック（敵 - 前衛のみ。combat.enemyPoison は従来仕様の単一インスタンス）
  if ((combat.enemyPoison || 0) > 0) {
    const dmg = combat.enemyPoison;
    combat.enemyHp = Math.max(0, combat.enemyHp - dmg);
    if (combat.enemies?.[0]) {
      combat.enemies[0].hp = combat.enemyHp;
      if (combat.enemies[0].hp <= 0) combat.enemies[0].alive = false;
    }
    flashPortrait("enemy", combat.enemies?.[0]);
    playPortraitEffect("enemy", "debuff", combat.enemies?.[0]);
    clog(`毒ダメージ（敵）${dmg}`);
    if (areAllEnemiesDefeated(combat)) { endCombatWin(); return; }
  }

  // 突撃ペナルティ
  if ((combat.phyPenaltyNext || 0) > 0) {
    const pen = combat.phyPenaltyNext;
    combat.playerPhy = Math.max(1, combat.playerPhy - pen);
    clog(`突撃の反動: PHY-${pen}`);
    combat.phyPenaltyNext = 0;
  }

  // ─── パッシブスキル ────────────────────────────────────────────
  const passive = LEADER.passiveKey;
  // コナン・ドイル「シャーロック・ホームズ」: HP が 70% 未満になったとき1回だけ INT +3
  if (passive === 'doyle' && !combat.doylePassiveTriggered) {
    if (combat.playerHp < combat.playerHpMax * 0.7) {
      combat.playerInt += 3;
      combat.doylePassiveTriggered = true;
      playPortraitEffect("player", "buff", combat.heroes?.[0]);
      playBattleSe("buff");
      clog('【シャーロック・ホームズ】発動！ INT +3');
    }
  }

  combat.energy = combat.energyMax + (combat.bonusEnergyNext || 0);
  combat.bonusEnergyNext = 0;
  const drawN = 5;
  drawCards(combat, drawN);
  advanceEnemyIntent();
  renderCombat();
}

// ─── UI float diff ────────────────────────────────────────────────
function diffUiFloats() {
  const cur = {
    playerHp: combat.playerHp,
    playerGuard: combat.playerGuard,
    playerShield: combat.playerShield,
    playerPhy: combat.playerPhy,
    playerInt: combat.playerInt,
    playerAgi: combat.playerAgi,
    enemyHp: combat.enemyHp,
    enemyGuard: combat.enemyGuard,
    enemyShield: combat.enemyShield,
    enemyInt: combat.enemyInt,
  };
  const prev = combat._lastUi;
  if (prev) {
    if (cur.playerHp !== prev.playerHp)     spawnStatFloat("player-hp",     cur.playerHp - prev.playerHp);
    if (cur.playerGuard !== prev.playerGuard) spawnStatFloat("player-guard", cur.playerGuard - prev.playerGuard);
    if (cur.playerShield !== prev.playerShield) spawnStatFloat("player-shield", cur.playerShield - prev.playerShield);
    if (cur.playerPhy !== prev.playerPhy)   spawnStatFloat("player-phy",    cur.playerPhy - prev.playerPhy);
    if (cur.playerInt !== prev.playerInt)   spawnStatFloat("player-int",    cur.playerInt - prev.playerInt);
    if (cur.playerAgi !== prev.playerAgi)   spawnStatFloat("player-agi",    cur.playerAgi - prev.playerAgi);
    if (cur.enemyHp !== prev.enemyHp)       spawnStatFloat("enemy-hp",      cur.enemyHp - prev.enemyHp);
    if (cur.enemyGuard !== prev.enemyGuard) spawnStatFloat("enemy-guard",   cur.enemyGuard - prev.enemyGuard);
    if (cur.enemyShield !== prev.enemyShield) spawnStatFloat("enemy-shield", cur.enemyShield - prev.enemyShield);
    if (cur.enemyInt !== prev.enemyInt)     spawnStatFloat("enemy-int",     cur.enemyInt - prev.enemyInt);
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const PEEK_HELP_SNIPPETS = {
  guard:  "<strong>ガード</strong> — ターン中、PHY/INT ダメージを数値分だけ先に吸収（味方はターン開始で 0）。",
  shield: "<strong>シールド</strong> — 特殊ダメージ（最大 HP 割合など）のみ吸収。PHY/INT 通常攻撃には無効。",
  energy: "<strong>⚡ エナジー</strong> — ターンで使える行動コスト。次ターン開始時に最大まで回復。",
  draw:   "<strong>ドロー</strong> — 山札から手札へカードを引く。山が空なら捨て札をシャッフルして山にする。",
  phy:    "<strong>PHY</strong> — 物理攻撃の基礎値。PHY 依存スキルのダメージに使う。",
  int:    "<strong>INT</strong> — 知略の基礎値。INT 攻撃や回復係数に関わる。",
  agi:    "<strong>AGI</strong> — このプロトでは主にクリティカル率に反映。",
  hp:     "<strong>HP</strong> — 0 で敗北。回復は最大値を超えない。",
};

// ─── ターゲット表示バッジ (#44 SPEC-005 Phase 1) ──────────────────
/**
 * カードのターゲット仕様を表示用ラベル + サイドカラーに変換。
 * Phase 3 で 3v3 ターゲット解決が動くまでは静的ラベル表示。
 */
const TARGET_BADGE_DEFS = {
  "self":              { label: "自身",     side: "self"  },
  "ally.foremost":     { label: "味方先頭", side: "ally"  },
  "ally.rearmost":     { label: "味方後尾", side: "ally"  },
  "ally.front":        { label: "前衛",     side: "ally"  },
  "ally.mid":          { label: "中衛",     side: "ally"  },
  "ally.back":         { label: "後衛",     side: "ally"  },
  "ally.all":          { label: "味方全",   side: "ally"  },
  "ally.random":       { label: "味方?",    side: "ally"  },
  "ally.highest_phy":  { label: "PHY↑",   side: "ally"  },
  "ally.lowest_phy":   { label: "PHY↓",   side: "ally"  },
  "ally.highest_int":  { label: "INT↑",   side: "ally"  },
  "ally.lowest_int":   { label: "INT↓",   side: "ally"  },
  "ally.highest_hp":   { label: "HP↑",    side: "ally"  },
  "ally.lowest_hp":    { label: "HP↓",    side: "ally"  },
  "enemy.foremost":    { label: "敵先頭",  side: "enemy" },
  "enemy.rearmost":    { label: "敵後尾",  side: "enemy" },
  "enemy.front":       { label: "敵前衛",  side: "enemy" },
  "enemy.mid":         { label: "敵中衛",  side: "enemy" },
  "enemy.back":        { label: "敵後衛",  side: "enemy" },
  "enemy.all":         { label: "敵全",    side: "enemy" },
  "enemy.random":      { label: "敵?",     side: "enemy" },
  "enemy.highest_phy": { label: "敵PHY↑", side: "enemy" },
  "enemy.lowest_phy":  { label: "敵PHY↓", side: "enemy" },
  "enemy.highest_int": { label: "敵INT↑", side: "enemy" },
  "enemy.lowest_int":  { label: "敵INT↓", side: "enemy" },
  "enemy.highest_hp":  { label: "敵HP↑",  side: "enemy" },
  "enemy.lowest_hp":   { label: "敵HP↓",  side: "enemy" },
  "all":               { label: "全",      side: "all"   },
  "all.random":        { label: "全?",     side: "all"   },
};
function buildTargetBadgeHtml(card) {
  const spec = (card && card.target) || "enemy.foremost"; // 後方互換
  const def = TARGET_BADGE_DEFS[spec] || { label: spec, side: "all" };
  return '<span class="card-user-br tgt-' + def.side + '" data-target="' + spec +
    '" title="ターゲット: ' + escapeHtml(def.label) + '">' +
    escapeHtml(def.label) + "</span>";
}

function buildPeekHelpHtml(keys) {
  if (!keys || !keys.length) return "";
  const parts = keys.map((k) => PEEK_HELP_SNIPPETS[k]).filter(Boolean);
  if (!parts.length) return "";
  return (
    '<div class="card-peek-help">' +
    parts.map((h) => '<div class="card-help-block">' + h + "</div>").join("") +
    "</div>"
  );
}

function refreshHandPeekLift() {
  // Recalculate lift for focused slot
  const focused = document.querySelector("#hand .card-slot.card-slot--focused");
  if (!focused) return;
  requestAnimationFrame(() => {
    const card = focused.querySelector(".card");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const viewH = window.innerHeight;
    const lift = Math.max(0, rect.bottom - (viewH - 8));
    focused.style.setProperty("--peek-lift", lift + "px");
  });
}

function clearHandFocus() {
  handFocusedIdx = -1;
  document.querySelectorAll("#hand .card-slot").forEach(s => {
    s.classList.remove("card-slot--focused", "card-peek--right");
    s.style.setProperty("--peek-lift", "0px");
  });
}

function setHandFocusByIndex(idx) {
  const slots = Array.from(document.querySelectorAll("#hand .card-slot"));
  slots.forEach(s => {
    s.classList.remove("card-slot--focused", "card-peek--right");
    s.style.setProperty("--peek-lift", "0px");
  });
  if (idx >= 0 && idx < slots.length && slots[idx] && !slots[idx].classList.contains("card-slot--disabled")) {
    handFocusedIdx = idx;
    const slot = slots[idx];
    slot.classList.add("card-slot--focused");
    // Determine which side to show the peek tooltip:
    // Left half of screen → show peek to the RIGHT; center/right → show to the LEFT
    const slotRect = slot.getBoundingClientRect();
    const cardCenterX = slotRect.left + slotRect.width / 2;
    if (cardCenterX < window.innerWidth / 2) {
      slot.classList.add("card-peek--right");
    }
    // Lift card so its bottom aligns near viewport bottom
    requestAnimationFrame(() => {
      const card = slot.querySelector(".card");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const viewH = window.innerHeight;
      const lift = Math.max(0, rect.bottom - (viewH - 8));
      slot.style.setProperty("--peek-lift", lift + "px");
    });
  } else {
    handFocusedIdx = -1;
  }
}

function playCardByRef(cardRef) {
  if (!combat || view !== "combat" || combatInputLocked) return;
  const idx = combat.hand.indexOf(cardRef);
  if (idx < 0) return;
  playCard(idx);
}

function handIndexAtPoint(clientX, clientY) {
  const slots = Array.from(document.querySelectorAll("#hand .card-slot"));
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s.classList.contains("card-slot--disabled")) continue;
    const r = s.getBoundingClientRect();
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return i;
  }
  return -1;
}

let handTouchBound = false;
let handTouchId = null;

function bindHandTouchDelegation() {
  const handEl = document.getElementById("hand");
  if (!handEl || handTouchBound) return;
  handTouchBound = true;

  const removeDocListeners = () => {
    document.removeEventListener("touchend", onHandDocEnd, true);
    document.removeEventListener("touchcancel", onHandDocCancel, true);
  };

  const onHandDocEnd = (ev) => {
    if (handTouchId === null) return;
    if (!Array.from(ev.changedTouches).some((x) => x.identifier === handTouchId)) return;
    const t = Array.from(ev.changedTouches).find((x) => x.identifier === handTouchId) || ev.changedTouches[0];
    removeDocListeners();
    const releaseIdx = handIndexAtPoint(t.clientX, t.clientY);
    if (!combat || view !== "combat") { handTouchId = null; return; }
    if (releaseIdx < 0) { clearHandFocus(); handTouchId = null; return; }
    const c = combat.hand[releaseIdx];
    if (!c || c.cost > combat.energy) { handTouchId = null; return; }
    if (handFocusedIdx === releaseIdx) playCardByRef(c);
    else setHandFocusByIndex(releaseIdx);
    handTouchId = null;
  };

  const onHandDocCancel = () => { removeDocListeners(); handTouchId = null; };

  handEl.addEventListener("touchstart", (ev) => {
    if (!combat || view !== "combat" || ev.touches.length !== 1) return;
    removeDocListeners(); handTouchId = null;
    const t = ev.touches[0];
    handTouchId = t.identifier;
    document.addEventListener("touchend", onHandDocEnd, true);
    document.addEventListener("touchcancel", onHandDocCancel, true);
  }, { passive: true });
}

function bindHandCard(el, idx, card) {
  // el is .card-slot
  el.addEventListener("click", (ev) => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    ev.preventDefault();
    if (combatInputLocked) return;
    if (card.cost > combat.energy || el.classList.contains("card-slot--disabled")) return;
    const slots = Array.from(document.querySelectorAll("#hand .card-slot"));
    const myIdx = slots.indexOf(el);
    if (myIdx < 0) return;
    if (handFocusedIdx === myIdx) playCard(idx);
    else setHandFocusByIndex(myIdx);
  });
}

// ─── 状態異常バッジ更新 ─────────────────────────────────────────
function renderStatusBadges() {
  if (!combat) return;
  const renderTo = (elId, poison, bleed) => {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = "";
    if (poison > 0) {
      const b = document.createElement("span");
      b.className = "sbadge-status";
      b.textContent = "☠" + poison;
      el.appendChild(b);
    }
    if (bleed > 0) {
      const b = document.createElement("span");
      b.className = "sbadge-status";
      b.textContent = "🩸" + bleed;
      el.appendChild(b);
    }
    el.style.display = (poison > 0 || bleed > 0) ? "" : "none";
  };
  renderTo("playerStatusBadge", combat.playerPoison || 0, combat.playerBleed || 0);
  renderTo("enemyStatusBadge", combat.enemyPoison || 0, combat.enemyBleed || 0);
}

// ─── 戦闘 UI 描画 ─────────────────────────────────────────────────
function renderCombat() {
  document.getElementById("pHp").textContent = String(combat.playerHp);
  document.getElementById("pHpMax").textContent = String(combat.playerHpMax);
  document.getElementById("pPhy").textContent = String(combat.playerPhy);
  document.getElementById("pInt").textContent = String(combat.playerInt);
  document.getElementById("pAgi").textContent = String(combat.playerAgi);
  document.getElementById("pGuard").textContent = String(combat.playerGuard);
  document.getElementById("pShield").textContent = String(combat.playerShield);
  document.getElementById("eHp").textContent = String(combat.enemyHp);
  document.getElementById("eHpMax").textContent = String(combat.enemyHpMax);
  document.getElementById("ePhy").textContent = String(combat.enemyPhy);
  document.getElementById("eInt").textContent = String(combat.enemyInt);
  document.getElementById("eAgi").textContent = String(combat.enemyAgi);
  document.getElementById("eGuard").textContent = String(combat.enemyGuard);
  document.getElementById("eShield").textContent = String(combat.enemyShield);
  document.getElementById("energyVal").textContent = String(combat.energy);
  document.getElementById("energyMax").textContent = String(combat.energyMax);
  document.getElementById("enemyIntent").textContent = intentText();
  const deckCountEl = document.getElementById("deckPileCount");
  if (deckCountEl) deckCountEl.textContent = String(combat.drawPile.length);
  // 消耗カード数を表示
  const exhaustNumEl = document.getElementById("exhaustNum");
  const exhaustCountEl = document.getElementById("exhaustCount");
  if (exhaustNumEl) exhaustNumEl.textContent = String(combat.exhaustPile?.length ?? 0);
  if (exhaustCountEl) exhaustCountEl.dataset.nonzero = (combat.exhaustPile?.length > 0) ? "true" : "false";

  // HP gauges
  const playerFill = document.getElementById("playerHpFill");
  if (playerFill) playerFill.style.width = combat.playerHpMax > 0
    ? Math.max(0, Math.min(100, (combat.playerHp / combat.playerHpMax) * 100)) + "%"
    : "0%";
  const enemyFill = document.getElementById("enemyHpFill");
  if (enemyFill) enemyFill.style.width = combat.enemyHpMax > 0
    ? Math.max(0, Math.min(100, (combat.enemyHp / combat.enemyHpMax) * 100)) + "%"
    : "0%";

  renderStatusBadges();
  diffUiFloats();
  // SPEC-005 Phase 3a: party.length > 1 ならサブヒーローを ghost slot に表示
  renderPartySubHeroes();
  // SPEC-005 Phase 3c: enemies.length > 1 ならサブエネミーも ghost slot に表示
  renderEnemySubUnits();
  // SPEC-005 Phase 3h: 前衛 (heroes[0] / enemies[0]) の死亡時グレーアウト
  const heroFrontEl = document.querySelector('.party-slot--front[data-side="player"] .combatant');
  if (heroFrontEl) {
    const h0 = combat.heroes?.[0];
    const dead = !h0 || h0.alive === false || (h0.hp ?? combat.playerHp) <= 0;
    heroFrontEl.classList.toggle("combatant--dead", dead);
  }
  const enemyFrontEl = document.querySelector('.party-slot--front[data-side="enemy"] .combatant');
  if (enemyFrontEl) {
    const e0 = combat.enemies?.[0];
    const dead = !e0 || e0.alive === false || (e0.hp ?? combat.enemyHp) <= 0;
    enemyFrontEl.classList.toggle("combatant--dead", dead);
  }
  // SPEC-005 Phase 3j: アクティブキャスター highlight
  const activeIdx = combat.activeHeroIdx ?? 0;
  document.querySelectorAll('.party-slot[data-side="player"] .combatant').forEach((el) => {
    el.classList.remove("combatant--active");
  });
  const activeSlot = document.querySelector(`.party-slot[data-side="player"][data-pos="${activeIdx}"] .combatant`);
  if (activeSlot && combat.heroes && combat.heroes.length > 1) activeSlot.classList.add("combatant--active");

  const handEl = document.getElementById("hand");
  handEl.innerHTML = "";
  handFocusedIdx = -1;
  const n = combat.hand.length;
  handEl.style.setProperty("--n-cards", String(Math.max(n, 1)));

  // カード重ね量を計算（横幅が足りない場合に重ねる）
  const containerW = (handEl.parentElement?.clientWidth || 340) - 16;
  const cardW = window.innerWidth <= 420 ? 80 : 96;
  const minGapPx = 6; // 通常の gap（0.4rem ≈ 6px）
  let cardMarginPx = minGapPx;
  if (n > 1) {
    const naturalW = cardW * n + minGapPx * (n - 1);
    if (naturalW > containerW) {
      // total = cardW + (n-1)*(cardW + margin) = containerW
      // margin = (containerW - cardW) / (n - 1) - cardW
      cardMarginPx = Math.floor((containerW - cardW) / (n - 1)) - cardW;
      cardMarginPx = Math.max(cardMarginPx, -Math.floor(cardW * 0.58));
    }
  }
  handEl.style.setProperty("--card-margin", cardMarginPx + "px");

  combat.hand.forEach((card, idx) => {
    const slot = document.createElement("div");
    const rarity = CARD_RARITIES[card.libraryKey] || 'common';
    slot.className = "card-slot" + (card.cost > combat.energy ? " card-slot--disabled" : "");
    slot.setAttribute("data-cost", String(card.cost));
    slot.setAttribute("data-rarity", rarity);
    slot.style.setProperty("--i", String(idx + 1));
    slot.style.setProperty("--n", String(Math.max(n - 1, 1)));

    const summaryLines = typeof card.effectSummaryLines === "function" ? card.effectSummaryLines(combat)
      : typeof card.previewLines === "function" ? card.previewLines(combat) : [card.text || ""];
    const detailLines = typeof card.previewLines === "function" ? card.previewLines(combat) : summaryLines;
    const helpKeys = typeof card.peekHelpKeys === "function" ? card.peekHelpKeys() : [];
    const detailBody = detailLines.map(t => "<p>" + escapeHtml(t) + "</p>").join("");
    const summaryBody = summaryLines.map(t => "<p>" + escapeHtml(t) + "</p>").join("");

    slot.innerHTML =
      '<div class="card-cost-above"><span class="cost-zeus" aria-hidden="true">⚡</span>' + card.cost + '</div>' +
      '<div class="card ' + card.type + (card.exhaust ? ' card--exhaust' : '') + '">' +
      '<div class="card-name-hd">' + escapeHtml(card.extNameJa) + (card.exhaust ? '<span class="exhaust-badge" title="消耗：使い切り">🔥</span>' : '') +
      (card.skillNameJa ? '<span class="card-skill-sub">' + escapeHtml(card.skillNameJa) + '</span>' : '') + '</div>' +
      '<div class="card-icon-area">' +
      '<img class="card-ext-img-full" src="' + EXT_IMG(card.extId) + '" alt="" onerror="this.style.opacity=\'0\'" />' +
      '<img class="card-skill-icon-tl" src="' + battleIconUrl(card.skillIcon) + '" alt="" />' +
      buildTargetBadgeHtml(card) +
      '</div>' +
      '<div class="card-effect-area">' + summaryBody + '</div>' +
      '</div>' +
      '<div class="card-peek-layer" aria-hidden="true">' +
      '<div class="card-peek-inner">' +
      '<div class="card-peek-lines">' + detailBody + '</div>' +
      buildPeekHelpHtml(helpKeys) +
      '</div></div>';

    bindHandCard(slot, idx, card);
    handEl.appendChild(slot);
  });
  syncResources();
  combat._lastUi = {
    playerHp: combat.playerHp, playerGuard: combat.playerGuard,
    playerShield: combat.playerShield, playerPhy: combat.playerPhy,
    playerInt: combat.playerInt, playerAgi: combat.playerAgi,
    enemyHp: combat.enemyHp, enemyGuard: combat.enemyGuard,
    enemyShield: combat.enemyShield, enemyInt: combat.enemyInt,
  };
}

// ─── 甲斐姫パッシブ（浪切）非同期ヘルパー ────────────────────────
async function applyKaihimePassive(s) {
  if (LEADER.passiveKey !== 'kaihime') return;
  if (areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.5) return;

  const bonusDmg = Math.max(1, Math.floor(s.playerPhy * 0.5));
  // カットイン表示（待機）
  combatInputLocked = true;
  await showPassiveCutin("浪切", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;

  if (!combat || areAllEnemiesDefeated(s)) return;
  // SPEC-005 Phase 3: foremost living enemy へ
  const target = getPlayerAttackTargetEnemy(s);
  applyHpDeltaToEnemy(s, target, -bonusDmg);
  playPortraitEffect("enemy", "hit", target);
  playBattleSe("hit");
  clog(`【浪切】発動！ 追加ダメージ ${bonusDmg}`);
  renderCombat();
}

// ─── 張遼パッシブ（遼来遼来）非同期ヘルパー ──────────────────────
async function applyZhangPassive(s) {
  if (!s._zhangCounterPending) return;
  s._zhangCounterPending = false;
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;

  const counterDmg = Math.max(1, Math.floor(s.playerPhy * 0.2));
  // カットイン表示（待機）
  combatInputLocked = true;
  await showPassiveCutin("遼来遼来", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;

  if (!combat || areAllEnemiesDefeated(s)) return;
  // SPEC-005 Phase 3: foremost living enemy へ
  const target = getPlayerAttackTargetEnemy(s);
  applyHpDeltaToEnemy(s, target, -counterDmg);
  playPortraitEffect("enemy", "hit", target);
  playBattleSe("hit");
  clog(`【遼来遼来】発動！ 反撃 ${counterDmg} ダメージ`);
  renderCombat();
}

// ─── 新規 Common ヒーロー (1004-1010) パッシブ ─────────────────────
// onCombatStart: 戦闘開始時に 1 回発動（startCombatFromMapNode から呼ばれる）
function applyHeroPassiveOnCombatStart(s) {
  switch (LEADER.passiveKey) {
    case "seton":      applySetonPassive(s);      break;
    case "inoh":       applyInohPassive(s);       break;
    case "pythagoras": applyPythagorasPassive(s); break;
    case "sullivan":   applySullivanPassive(s);   break;
    case "hercules":   applyHerculesPassive(s);   break;
    case "giraffa":    applyGiraffaPassive(s);    break;
    // ─── Uncommon (heroId 2001-2053) onCombatStart cases ───
    case "wright_brothers": applyWrightBrothersPassive(s); break;
    case "spartacus": applySpartacusPassive(s); break;
    case "schubert": applySchubertPassive(s); break;
    case "archimedes": applyArchimedesPassive(s); break;
    case "schrodinger": applySchrodingerPassive(s); break;
    case "kafka": applyKafkaPassive(s); break;
    case "sunzi": applySunziPassive(s); break;
    case "mitsunari": applyMitsunariPassive(s); break;
    case "montesquieu": applyMontesquieuPassive(s); break;
    case "anastasia": applyAnastasiaPassive(s); break;
    case "geronimo": applyGeronimoPassive(s); break;
    case "chacha": applyChachaPassive(s); break;
    case "mitsuhide": applyMitsuhidePassive(s); break;
    case "shinsaku": applyShinsakuPassive(s); break;
    case "andersen": applyAndersenPassive(s); break;
    case "michelangelo": applyMichelangeloPassive(s); break;
    case "salome": applySalomePassive(s); break;
    case "hideyoshi": applyHideyoshiPassive(s); break;
    case "aesop": applyAesopPassive(s); break;
    case "ikkyu": applyIkkyuPassive(s); break;
    case "izumo": applyIzumoPassive(s); break;
    case "goethe": applyGoethePassive(s); break;
    case "plato": applyPlatoPassive(s); break;
    case "ichiyo": applyIchiyoPassive(s); break;
    case "sunce": applySuncePassive(s); break;
    case "kiyomori": applyKiyomoriPassive(s); break;
    case "dostoevsky": applyDostoevskyPassive(s); break;
    case "mulan": applyMulanPassive(s); break;
    case "franklin": applyFranklinPassive(s); break;
    case "saizo": applySaizoPassive(s); break;
    case "socrates": applySocratesPassive(s); break;
    case "daruma": applyDarumaPassive(s); break;
    case "aristotle": applyAristotlePassive(s); break;
    case "chopin": applyChopinPassive(s); break;
    case "ippatsuman": applyIppatsumanPassive(s); break;
    case "ramon": applyRamonPassive(s); break;
    // ─── Epic (heroId 4001-4061) onCombatStart cases ───
case "zhangfei": applyZhangfeiPassive(s); break;
    case "beethoven": applyBeethovenPassive(s); break;
    case "billy_kid": applyBillyKidPassive(s); break;
    case "marco_polo": applyMarcoPoloPassive(s); break;
    case "ouki": applyOukiPassive(s); break;
    case "marx": applyMarxPassive(s); break;
    case "okita": applyOkitaPassive(s); break;
    case "tchaikovsky": applyTchaikovskyPassive(s); break;
    case "yang_guifei": applyYangGuifeiPassive(s); break;
    case "lubu": applyLubuPassive(s); break;
    case "sunquan": applySunquanPassive(s); break;
    case "kamehameha": applyKamehamehaPassive(s); break;
    case "tomoe": applyTomoePassive(s); break;
    case "shingen": applyShingenPassive(s); break;
    case "caesar": applyCaesarPassive(s); break;
    case "mozart": applyMozartPassive(s); break;
    case "masakado": applyMasakadoPassive(s); break;
    case "kenshin": applyKenshinPassive(s); break;
    case "lincoln": applyLincolnPassive(s); break;
    case "brynhildr": applyBrynhildrPassive(s); break;
    case "saigo": applySaigoPassive(s); break;
    case "hanxin": applyHanxinPassive(s); break;
    case "buddha": applyBuddhaPassive(s); break;
    case "fabre": applyFabrePassive(s); break;
    case "lancelot": applyLancelotPassive(s); break;
    case "xiahoudun": applyXiahoudunPassive(s); break;
    case "simayi": applySimayiPassive(s); break;
    case "rama": applyRamaPassive(s); break;
    case "drake": applyDrakePassive(s); break;
    case "tell": applyTellPassive(s); break;
    case "michizane": applyMichizanePassive(s); break;
    case "soseki": applySosekiPassive(s); break;
    case "boudica": applyBoudicaPassive(s); break;
    // ─── Legendary (heroId 5001-5033) onCombatStart cases ───
case "davinci": applyDavinciPassive(s); break;
    case "jeanne": applyJeannePassive(s); break;
    case "himiko": applyHimikoPassive(s); break;
    case "chinggis": applyChinggisPassive(s); break;
    case "kongming": applyKongmingPassive(s); break;
    case "cleopatra": applyCleopatraPassive(s); break;
    case "alexander": applyAlexanderPassive(s); break;
    case "qinshihuang": applyQinshihuangPassive(s); break;
    case "tutankhamun": applyTutankhamunPassive(s); break;
    case "guji": applyGujiPassive(s); break;
    case "hokusai": applyHokusaiPassive(s); break;
    case "liubang": applyLiubangPassive(s); break;
    default: return;
  }
  renderStatusBadges();
  renderCombat();
}

// onCardUse: カード使用後に発動（playCard から呼ばれる）
async function applyHeroPassiveOnCardUse(s) {
  switch (LEADER.passiveKey) {
    case "daejanggeum": await applyDaejanggeumPassive(s); break;
    // ─── Uncommon (heroId 2001-2053) onCardUse cases ───
    case "jack_ripper": await applyJackRipperPassive(s); break;
    case "santa": await applySantaPassive(s); break;
    case "ranmaru": await applyRanmaruPassive(s); break;
    case "xuchu": await applyXuchuPassive(s); break;
    case "yoshinobu": await applyYoshinobuPassive(s); break;
    case "kintaro": await applyKintaroPassive(s); break;
    case "satoshi": await applySatoshiPassive(s); break;
    case "chun_sisters": await applyChunSistersPassive(s); break;
    case "bismarck": await applyBismarckPassive(s); break;
    case "montgomery": await applyMontgomeryPassive(s); break;
    case "sarutahiko": await applySarutahikoPassive(s); break;
    case "gama": await applyGamaPassive(s); break;
    case "masako": await applyMasakoPassive(s); break;
    case "renoir": await applyRenoirPassive(s); break;
    case "armaroid": await applyArmaroidPassive(s); break;
    case "uka": await applyUkaPassive(s); break;
    // ─── Epic (heroId 4001-4061) onCardUse cases ───
case "nightingale": await applyNightingalePassive(s); break;
    case "kojiro": await applyKojiroPassive(s); break;
    case "katsu_kaishu": await applyKatsuKaishuPassive(s); break;
    case "edison": await applyEdisonPassive(s); break;
    case "masamune": await applyMasamunePassive(s); break;
    case "antoinette": await applyAntoinettePassive(s); break;
    case "curie": await applyCuriePassive(s); break;
    case "calamity_jane": await applyCalamityJanePassive(s); break;
    case "vangogh": await applyVangoghPassive(s); break;
    case "zhaoyun": await applyZhaoyunPassive(s); break;
    case "yuefei": await applyYuefeiPassive(s); break;
    case "hijikata": await applyHijikataPassive(s); break;
    case "darwin": await applyDarwinPassive(s); break;
    case "yamato_takeru": await applyYamatoTakeruPassive(s); break;
    case "satoshi_omega": await applySatoshiOmegaPassive(s); break;
    case "kondo": await applyKondoPassive(s); break;
    case "blackbeard": await applyBlackbeardPassive(s); break;
    case "guanyu": await applyGuanyuPassive(s); break;
    case "tesla": await applyTeslaPassive(s); break;
    case "atom": await applyAtomPassive(s); break;
    case "rasputin": await applyRasputinPassive(s); break;
    case "hannibal": await applyHannibalPassive(s); break;
    case "zhouyu": await applyZhouyuPassive(s); break;
    case "tadakatsu": await applyTadakatsuPassive(s); break;
    case "yatterman": await applyYattermanPassive(s); break;
    case "cobra": await applyCobraPassive(s); break;
    case "suzuishi": await applySuzuishiPassive(s); break;
    case "tyrfing": await applyTyrfingPassive(s); break;
    // ─── Legendary (heroId 5001-5033) onCardUse cases ───
case "nobunaga": await applyNobunagaPassive(s); break;
    case "napoleon": await applyNapoleonPassive(s); break;
    case "caocao": await applyCaocaoPassive(s); break;
    case "washington": await applyWashingtonPassive(s); break;
    case "arthur": await applyArthurPassive(s); break;
    case "ryoma": await applyRyomaPassive(s); break;
    case "liubei": await applyLiubeiPassive(s); break;
    case "einstein": await applyEinsteinPassive(s); break;
    case "bach": await applyBachPassive(s); break;
    case "charlemagne": await applyCharlemagnePassive(s); break;
    case "yoshitsune": await applyYoshitsunePassive(s); break;
    case "seimei": await applySeimeiPassive(s); break;
    case "richard": await applyRichardPassive(s); break;
    case "xiangyu": await applyXiangyuPassive(s); break;
    case "galileo": await applyGalileoPassive(s); break;
    case "yoichi": await applyYoichiPassive(s); break;
    case "black_prince": await applyBlackPrincePassive(s); break;
    case "wuzetian": await applyWuzetianPassive(s); break;
    case "scipio": await applyScipioPassive(s); break;
    case "musashi": await applyMusashiPassive(s); break;
    case "yatagarasu": await applyYatagarasuPassive(s); break;
    default: return;
  }
}

// シートン「狼王ロボ」: 戦闘開始時、敵にINTの40%ダメージ＋出血1スタック付与
function applySetonPassive(s) {
  if (areAllEnemiesDefeated(s)) return;
  const target = getPlayerAttackTargetEnemy(s);
  if (!target) return;
  const dmg = Math.max(1, Math.floor(s.playerInt * 0.4));
  applyHpDeltaToEnemy(s, target, -dmg);
  s.enemyBleed = (s.enemyBleed || 0) + 1;
  playPortraitEffect("enemy", "hit", target);
  playBattleSe("hit");
  clog(`【狼王ロボ】発動！ INT ${dmg} ダメージ＋出血 ×1 付与`);
}

// 伊能忠敬「大日本沿海輿地全図」: 戦闘開始時、自身のINTを最大AGIの30%アップ
function applyInohPassive(s) {
  const buff = Math.max(1, Math.floor(s.playerAgi * 0.3));
  s.playerInt += buff;
  playPortraitEffect("player", "buff", s.heroes?.[0]);
  playBattleSe("buff");
  clog(`【大日本沿海輿地全図】発動！ INT +${buff}`);
}

// ピタゴラス「テトラクテュス」: 戦闘開始時、PHYとINTを互いの値の20%アップ
function applyPythagorasPassive(s) {
  const phyOrig = s.playerPhy;
  const intOrig = s.playerInt;
  const phyBuff = Math.max(1, Math.floor(intOrig * 0.2));
  const intBuff = Math.max(1, Math.floor(phyOrig * 0.2));
  s.playerPhy += phyBuff;
  s.playerInt += intBuff;
  playPortraitEffect("player", "buff", s.heroes?.[0]);
  playBattleSe("buff");
  clog(`【テトラクテュス】発動！ PHY +${phyBuff} / INT +${intBuff}`);
}

// 大長今「李氏朝鮮、宮廷医女」: カード使用後30%でHP +最大HPの10%
async function applyDaejanggeumPassive(s) {
  if (isPartyWipedOut(s)) return;
  const heroSelf = s.heroes?.[0];
  if (!heroSelf) return;
  if (s.playerHp >= s.playerHpMax) return;
  if (Math.random() >= 0.3) return;
  const heal = Math.max(1, Math.floor(s.playerHpMax * 0.1));
  combatInputLocked = true;
  await showPassiveCutin("李氏朝鮮、宮廷医女", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s)) return;
  applyHpDeltaToHero(s, heroSelf, +heal);
  playPortraitEffect("player", "heal", heroSelf);
  playBattleSe("heal");
  clog(`【李氏朝鮮、宮廷医女】発動！ HP +${heal}`);
  renderCombat();
}

// ジョン・L・サリバン「ボストン・ストロング・ボーイ」: 戦闘開始時、PHY+5
function applySullivanPassive(s) {
  s.playerPhy += 5;
  playPortraitEffect("player", "buff", s.heroes?.[0]);
  playBattleSe("buff");
  clog(`【ボストン・ストロング・ボーイ】発動！ PHY +5`);
}

// ヘルクレスオオカブト「ローリングドライバー」: 戦闘開始時、敵INT-30%
function applyHerculesPassive(s) {
  if (areAllEnemiesDefeated(s)) return;
  const target = getPlayerAttackTargetEnemy(s);
  const debuff = Math.max(1, Math.floor(s.enemyInt * 0.3));
  s.enemyInt = Math.max(0, s.enemyInt - debuff);
  playPortraitEffect("enemy", "debuff", target);
  playBattleSe("debuff");
  clog(`【ローリングドライバー】発動！ 敵 INT -${debuff}`);
}

// ギラファノコギリクワガタ「ブルロック」: 戦闘開始時、敵にPHYの40%ダメージ
function applyGiraffaPassive(s) {
  if (areAllEnemiesDefeated(s)) return;
  const target = getPlayerAttackTargetEnemy(s);
  if (!target) return;
  const dmg = Math.max(1, Math.floor(s.playerPhy * 0.4));
  applyHpDeltaToEnemy(s, target, -dmg);
  playPortraitEffect("enemy", "hit", target);
  playBattleSe("hit");
  clog(`【ブルロック】発動！ PHY ${dmg} ダメージ`);
}

// ─── Uncommon ヒーロー (heroId 2001-2053) パッシブ ───────────────
// 2001 ライト兄弟「ライトフライヤー号」 hook=onCombatStart
function applyWrightBrothersPassive(s) {
  s.playerAgi += 1; playBattleSe("buff"); clog(`【ライトフライヤー号】AGI +1`);
}

// 2002 スパルタクス「剣闘士の反乱」 hook=onCombatStart
function applySpartacusPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  for (let i = 0; i < 2 && !areAllEnemiesDefeated(s); i++) {
    const dmg = Math.max(1, Math.floor(s.playerPhy * 0.4));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【剣闘士の反乱】PHY ${dmg} ダメージ`);
  }
  s.playerPhy += 5; playBattleSe("buff"); clog(`【剣闘士の反乱】PHY +5`);
}

// 2003 ジャックザリッパー「ランゲルライン」 hook=onCardUse
async function applyJackRipperPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("ランゲルライン", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.2));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【ランゲルライン】発動！ PHY ${dmg} ダメージ`); }
  s.playerAgi += 1; playBattleSe("buff"); clog(`【ランゲルライン】AGI +1`);
  renderCombat();
}

// 2004 シューベルト「魔王」 hook=onCombatStart
function applySchubertPassive(s) {
  s.enemyBleed = (s.enemyBleed || 0) + 1; playBattleSe("debuff"); clog(`【魔王】出血 ×1 付与`);
  s.hasResurrection = true;
  const heroForRevive = s.heroes?.[0]; if (heroForRevive) heroForRevive.alive = true; playBattleSe("buff"); clog(`【魔王】リザレクション付与`);
}

// 2005 グリム兄弟「ブレーメンの音楽隊」 hook=onCombatStart
function applyGrimmPassive(s) {
  const hero = s.heroes?.[0];
  { const heal = Math.max(1, Math.floor(s.playerHpMax * 0.1));
    applyHpDeltaToHero(s, hero, +heal);
    playPortraitEffect("player", "heal", hero); playBattleSe("heal");
    clog(`【ブレーメンの音楽隊】HP +${heal}`); }
  s.enemyPoison = (s.enemyPoison || 0) + 1; playBattleSe("debuff"); clog(`【ブレーメンの音楽隊】毒 ×1 付与`);
}

// 2006 アルキメデス「ヘウレーカ！ヘウレーカ！」 hook=onCombatStart
function applyArchimedesPassive(s) {
  s.playerShield = (s.playerShield || 0) + 8; playBattleSe("buff"); clog(`【ヘウレーカ！ヘウレーカ！】シールド +8`);
}

// 2007 サンタクロース「プレゼント・フォー・ユー」 hook=onCardUse
async function applySantaPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("プレゼント・フォー・ユー", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const heal = Math.max(1, Math.floor(s.playerHpMax * 0.18));
    applyHpDeltaToHero(s, hero, +heal);
    playPortraitEffect("player", "heal", hero); playBattleSe("heal");
    clog(`【プレゼント・フォー・ユー】HP +${heal}`); }
  renderCombat();
}

// 2008 シュレディンガー「シュレディンガーの猫」 hook=onCombatStart
function applySchrodingerPassive(s) {
  s.playerInt += 2; playBattleSe("buff"); clog(`【シュレディンガーの猫】INT +2`);
  s.playerAgi += 2; playBattleSe("buff"); clog(`【シュレディンガーの猫】AGI +2`);
  s.hasResurrection = true;
  const heroForRevive = s.heroes?.[0]; if (heroForRevive) heroForRevive.alive = true; playBattleSe("buff"); clog(`【シュレディンガーの猫】リザレクション付与`);
}

// 2009 森蘭丸「天下人の使者」 hook=onCardUse
async function applyRanmaruPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("天下人の使者", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.enemyAgi = Math.max(1, s.enemyAgi + (-4)); playBattleSe("debuff"); clog(`【天下人の使者】敵 AGI -4`);
  s.enemyPoison = (s.enemyPoison || 0) + 1; playBattleSe("debuff"); clog(`【天下人の使者】毒 ×1 付与`);
  renderCombat();
}

// 2010 カフカ「変身」 hook=onCombatStart
function applyKafkaPassive(s) {
  const hero = s.heroes?.[0];
  { const heal = Math.max(1, Math.floor(s.playerHpMax * 0.3));
    applyHpDeltaToHero(s, hero, +heal);
    playPortraitEffect("player", "heal", hero); playBattleSe("heal");
    clog(`【変身】HP +${heal}`); }
  s.playerAgi += 1; playBattleSe("buff"); clog(`【変身】AGI +1`);
}

// 2011 孫子「兵は詭道なり」 hook=onCombatStart
function applySunziPassive(s) {
  s.enemyAgi = Math.max(1, s.enemyAgi + (-2)); playBattleSe("debuff"); clog(`【兵は詭道なり】敵 AGI -2`);
}

// 2012 石田三成「大一大万大吉」 hook=onCombatStart
function applyMitsunariPassive(s) {
  s.playerPhy += 2; playBattleSe("buff"); clog(`【大一大万大吉】PHY +2`);
  s.enemyInt = Math.max(1, s.enemyInt + (-4)); playBattleSe("debuff"); clog(`【大一大万大吉】敵 INT -4`);
}

// 2013 許褚「虎痴」 hook=onCardUse
async function applyXuchuPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("虎痴", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerPhy += 5; playBattleSe("buff"); clog(`【虎痴】PHY +5`);
  s.playerInt += 4; playBattleSe("buff"); clog(`【虎痴】INT +4`);
  s.playerAgi += 5; playBattleSe("buff"); clog(`【虎痴】AGI +5`);
  renderCombat();
}

// 2014 徳川慶喜「大政奉還」 hook=onCardUse
async function applyYoshinobuPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("大政奉還", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerInt += 3; playBattleSe("buff"); clog(`【大政奉還】INT +3`);
  s.enemyPhy = Math.max(1, s.enemyPhy + (-1)); playBattleSe("debuff"); clog(`【大政奉還】敵 PHY -1`);
  s.enemyInt = Math.max(1, s.enemyInt + (-1)); playBattleSe("debuff"); clog(`【大政奉還】敵 INT -1`);
  renderCombat();
}

// 2015 モンテスキュー「法の精神」 hook=onCombatStart
function applyMontesquieuPassive(s) {
  s.playerInt += 1; playBattleSe("buff"); clog(`【法の精神】INT +1`);
  s.playerAgi += 1; playBattleSe("buff"); clog(`【法の精神】AGI +1`);
  s.enemyInt = Math.max(1, s.enemyInt + (-3)); playBattleSe("debuff"); clog(`【法の精神】敵 INT -3`);
}

// 2016 アナスタシア「幻の生存者」 hook=onCombatStart
function applyAnastasiaPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.45));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【幻の生存者】発動！ INT ${dmg} ダメージ`); }
  s.enemyInt = Math.max(1, s.enemyInt + (-4)); playBattleSe("debuff"); clog(`【幻の生存者】敵 INT -4`);
}

// 2017 ジェロニモ「荒野の復讐者」 hook=onCombatStart
function applyGeronimoPassive(s) {
  s.enemyInt = Math.max(1, s.enemyInt + (-1)); playBattleSe("debuff"); clog(`【荒野の復讐者】敵 INT -1`);
}

// 2018 茶々「錦城の女主」 hook=onCombatStart
function applyChachaPassive(s) {
  s.playerPhy += 3; playBattleSe("buff"); clog(`【錦城の女主】PHY +3`);
  s.playerShield = (s.playerShield || 0) + 8; playBattleSe("buff"); clog(`【錦城の女主】シールド +8`);
}

// 2019 金太郎「けだものあつめて すもうのけいこ」 hook=onCardUse
async function applyKintaroPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("けだものあつめて すもうのけいこ", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerPhy += 4; playBattleSe("buff"); clog(`【けだものあつめて すもうのけいこ】PHY +4`);
  renderCombat();
}

// 2020 明智光秀「本能寺の変」 hook=onCombatStart
function applyMitsuhidePassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.8));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【本能寺の変】発動！ INT ${dmg} ダメージ`); }
  s.enemyPoison = (s.enemyPoison || 0) + 1; playBattleSe("debuff"); clog(`【本能寺の変】毒 ×1 付与`);
}

// 2021 高杉晋作「奇兵隊」 hook=onCombatStart
function applyShinsakuPassive(s) {
  s.playerGuard = (s.playerGuard || 0) + 6; playBattleSe("buff"); clog(`【奇兵隊】ガード +6`);
}

// 2022 アンデルセン「マッチ売りの少女」 hook=onCombatStart
function applyAndersenPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.45));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【マッチ売りの少女】発動！ INT ${dmg} ダメージ`); }
}

// 2023 ミケランジェロ「ダビデの覚醒」 hook=onCombatStart
function applyMichelangeloPassive(s) {
  s.playerInt += 5; playBattleSe("buff"); clog(`【ダビデの覚醒】INT +5`);
}

// 2024 サロメ「ヘロディアの娘」 hook=onCombatStart
function applySalomePassive(s) {
  s.playerPhy += 1; playBattleSe("buff"); clog(`【ヘロディアの娘】PHY +1`);
  s.enemyPoison = (s.enemyPoison || 0) + 1; playBattleSe("debuff"); clog(`【ヘロディアの娘】毒 ×1 付与`);
}

// 2025 サトシ・ナカモト ALPHA CC「マイニング ALPHA CC」 hook=onCardUse
async function applySatoshiPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("マイニング ALPHA CC", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerPhy += 1; playBattleSe("buff"); clog(`【マイニング ALPHA CC】PHY +1`);
  s.playerAgi += 1; playBattleSe("buff"); clog(`【マイニング ALPHA CC】AGI +1`);
  renderCombat();
}

// 2026 豊臣秀吉「功名立志伝」 hook=onCombatStart
function applyHideyoshiPassive(s) {
  s.playerAgi += 2; playBattleSe("buff"); clog(`【功名立志伝】AGI +2`);
}

// 2027 イソップ「うさぎとかめ」 hook=onCombatStart
function applyAesopPassive(s) {
  s.enemyAgi = Math.max(1, s.enemyAgi + (-4)); playBattleSe("debuff"); clog(`【うさぎとかめ】敵 AGI -4`);
}

// 2028 チュン姉妹「姉妹の反乱」 hook=onCardUse
async function applyChunSistersPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("姉妹の反乱", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.45));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【姉妹の反乱】発動！ PHY ${dmg} ダメージ`); }
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.45));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【姉妹の反乱】発動！ INT ${dmg} ダメージ`); }
  renderCombat();
}

// 2029 一休「めでたくもあり・めでたくもなし」 hook=onCombatStart
function applyIkkyuPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.4));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【めでたくもあり・めでたくもなし】発動！ INT ${dmg} ダメージ`); }
  s.hasResurrection = true;
  const heroForRevive = s.heroes?.[0]; if (heroForRevive) heroForRevive.alive = true; playBattleSe("buff"); clog(`【めでたくもあり・めでたくもなし】リザレクション付与`);
}

// 2030 出雲阿国「ややこ踊り」 hook=onCombatStart
function applyIzumoPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.45));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【ややこ踊り】発動！ PHY ${dmg} ダメージ`); }
}

// 2031 ビスマルク「鉄血演説」 hook=onCardUse
async function applyBismarckPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("鉄血演説", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.enemyPoison = (s.enemyPoison || 0) + 1; playBattleSe("debuff"); clog(`【鉄血演説】毒 ×1 付与`);
  renderCombat();
}

// 2032 モンゴメリ「グリーンゲイブルズ」 hook=onCardUse
async function applyMontgomeryPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("グリーンゲイブルズ", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.3));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【グリーンゲイブルズ】発動！ INT ${dmg} ダメージ`); }
  renderCombat();
}

// 2033 ゲーテ「若きウェルテルの悩み」 hook=onCombatStart
function applyGoethePassive(s) {
  s.enemyPhy = Math.max(1, s.enemyPhy + (-4)); playBattleSe("debuff"); clog(`【若きウェルテルの悩み】敵 PHY -4`);
  s.enemyPoison = (s.enemyPoison || 0) + 1; playBattleSe("debuff"); clog(`【若きウェルテルの悩み】毒 ×1 付与`);
}

// 2034 プラトン「イデア論」 hook=onCombatStart
function applyPlatoPassive(s) {
  s.playerPhy += 1; playBattleSe("buff"); clog(`【イデア論】PHY +1`);
  s.playerAgi += 1; playBattleSe("buff"); clog(`【イデア論】AGI +1`);
  s.enemyPhy = Math.max(1, s.enemyPhy + (-3)); playBattleSe("debuff"); clog(`【イデア論】敵 PHY -3`);
}

// 2035 猿田彦「西暦3344年」 hook=onCardUse
async function applySarutahikoPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("西暦3344年", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerInt += 3; playBattleSe("buff"); clog(`【西暦3344年】INT +3`);
  renderCombat();
}

// 2036 樋口一葉「たけくらべ」 hook=onCombatStart
function applyIchiyoPassive(s) {
  s.playerInt += 5; playBattleSe("buff"); clog(`【たけくらべ】INT +5`);
  s.enemyAgi = Math.max(1, s.enemyAgi + (-3)); playBattleSe("debuff"); clog(`【たけくらべ】敵 AGI -3`);
}

// 2037 孫策「長沙桓王」 hook=onCombatStart
function applySuncePassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  for (let i = 0; i < 5 && !areAllEnemiesDefeated(s); i++) {
    const dmg = Math.max(1, Math.floor(s.playerPhy * 0.15));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【長沙桓王】PHY ${dmg} ダメージ`);
  }
  s.playerPhy += 2; playBattleSe("buff"); clog(`【長沙桓王】PHY +2`);
}

// 2038 平清盛「治承三年の政変」 hook=onCombatStart
function applyKiyomoriPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.45));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【治承三年の政変】発動！ PHY ${dmg} ダメージ`); }
  s.enemyPhy = Math.max(1, s.enemyPhy + (-4)); playBattleSe("debuff"); clog(`【治承三年の政変】敵 PHY -4`);
}

// 2039 ドストエフスキー「カラマーゾフの兄弟」 hook=onCombatStart
function applyDostoevskyPassive(s) {
  s.playerInt += 5; playBattleSe("buff"); clog(`【カラマーゾフの兄弟】INT +5`);
  s.playerAgi += 3; playBattleSe("buff"); clog(`【カラマーゾフの兄弟】AGI +3`);
}

// 2040 花木蘭「三綱五常」 hook=onCombatStart
function applyMulanPassive(s) {
  s.playerGuard = (s.playerGuard || 0) + 6; playBattleSe("buff"); clog(`【三綱五常】ガード +6`);
}

// 2041 ベンジャミン・フランクリン「凧とライデン瓶の雷実験」 hook=onCombatStart
function applyFranklinPassive(s) {
  s.playerPhy += 5; playBattleSe("buff"); clog(`【凧とライデン瓶の雷実験】PHY +5`);
  s.playerInt += 5; playBattleSe("buff"); clog(`【凧とライデン瓶の雷実験】INT +5`);
}

// 2042 ヴァスコ・ダ・ガマ「サン・ガブリエル」 hook=onCardUse
async function applyGamaPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("サン・ガブリエル", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerAgi += 1; playBattleSe("buff"); clog(`【サン・ガブリエル】AGI +1`);
  s.playerGuard = (s.playerGuard || 0) + 6; playBattleSe("buff"); clog(`【サン・ガブリエル】ガード +6`);
  renderCombat();
}

// 2043 霧隠才蔵「忍術・毒霧」 hook=onCombatStart
function applySaizoPassive(s) {
  s.playerInt += 5; playBattleSe("buff"); clog(`【忍術・毒霧】INT +5`);
  s.enemyPhy = Math.max(1, s.enemyPhy + (-1)); playBattleSe("debuff"); clog(`【忍術・毒霧】敵 PHY -1`);
  s.enemyPoison = (s.enemyPoison || 0) + 1; playBattleSe("debuff"); clog(`【忍術・毒霧】毒 ×1 付与`);
}

// 2044 ソクラテス「アレテー」 hook=onCombatStart
function applySocratesPassive(s) {
  s.playerInt += 3; playBattleSe("buff"); clog(`【アレテー】INT +3`);
  s.enemyInt = Math.max(1, s.enemyInt + (-4)); playBattleSe("debuff"); clog(`【アレテー】敵 INT -4`);
}

// 2045 達磨「二入四行論」 hook=onCombatStart
function applyDarumaPassive(s) {
  s.enemyAgi = Math.max(1, s.enemyAgi + (-2)); playBattleSe("debuff"); clog(`【二入四行論】敵 AGI -2`);
}

// 2046 北条政子「尼将軍」 hook=onCardUse
async function applyMasakoPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("尼将軍", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  // Fallback: 元 DB の効果が解析不能 → 控えめな PHY+1 を付与
  s.playerPhy += 1; playBattleSe("buff"); clog(`【尼将軍】PHY +1`);
  renderCombat();
}

// 2047 アリストテレス「アイテール」 hook=onCombatStart
function applyAristotlePassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.45));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【アイテール】発動！ INT ${dmg} ダメージ`); }
}

// 2048 ルノワール「ムーラン・ド・ラ・ギャレットの舞踏会」 hook=onCardUse
async function applyRenoirPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("ムーラン・ド・ラ・ギャレットの舞踏会", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.2));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【ムーラン・ド・ラ・ギャレットの舞踏会】発動！ INT ${dmg} ダメージ`); }
  renderCombat();
}

// 2049 ショパン「ワルツ9番 告別」 hook=onCombatStart
function applyChopinPassive(s) {
  s.enemyAgi = Math.max(1, s.enemyAgi + (-1)); playBattleSe("debuff"); clog(`【ワルツ9番 告別】敵 AGI -1`);
  s.enemyBleed = (s.enemyBleed || 0) + 1; playBattleSe("debuff"); clog(`【ワルツ9番 告別】出血 ×1 付与`);
}

// 2050 イッパツマン & 逆転王「逆転王、見参!!」 hook=onCombatStart
function applyIppatsumanPassive(s) {
  s.playerPhy += 5; playBattleSe("buff"); clog(`【逆転王、見参!!】PHY +5`);
  s.playerGuard = (s.playerGuard || 0) + 6; playBattleSe("buff"); clog(`【逆転王、見参!!】ガード +6`);
}

// 2051 アーマロイド・レディ「ライブ・メタル」 hook=onCardUse
async function applyArmaroidPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("ライブ・メタル", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerInt += 2; playBattleSe("buff"); clog(`【ライブ・メタル】INT +2`);
  s.enemyBleed = (s.enemyBleed || 0) + 1; playBattleSe("debuff"); clog(`【ライブ・メタル】出血 ×1 付与`);
  renderCombat();
}

// 2052 UKA「遮二無二」 hook=onCardUse
async function applyUkaPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("遮二無二", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.33));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【遮二無二】発動！ INT ${dmg} ダメージ`); }
  renderCombat();
}

// 2053 RAMON「タイマン」 hook=onCombatStart
function applyRamonPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.55));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【タイマン】発動！ PHY ${dmg} ダメージ`); }
  s.playerPhy += 5; playBattleSe("buff"); clog(`【タイマン】PHY +5`);
}

// ─── Epic ヒーロー (heroId 4001-4061) パッシブ ───────────────
// 4001 張飛「一騎当千」 hook=onCombatStart
function applyZhangfeiPassive(s) {
  const hero = s.heroes?.[0];
  s.hasResurrection = true; if (hero) hero.alive = true; playBattleSe("buff"); clog(`【一騎当千】リザレクション付与`);
}

// 4002 ナイチンゲール「白衣の天使」 hook=onCardUse
async function applyNightingalePassive(s) {
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("白衣の天使", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const heal = Math.max(1, Math.floor(s.playerHpMax * 1));
    applyHpDeltaToHero(s, hero, +heal);
    playPortraitEffect("player", "heal", hero); playBattleSe("heal");
    clog(`【白衣の天使】HP +${heal}`); }
  renderCombat();
}

// 4003 ベートーヴェン「歓喜の歌」 hook=onCombatStart
function applyBeethovenPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  s.enemyPhy = Math.max(1, s.enemyPhy + (-2)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【歓喜の歌】敵 PHY -2`);
  s.enemyInt = Math.max(1, s.enemyInt + (-2)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【歓喜の歌】敵 INT -2`);
  s.enemyAgi = Math.max(1, s.enemyAgi + (-2)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【歓喜の歌】敵 AGI -2`);
}

// 4004 佐々木小次郎「燕返し」 hook=onCardUse
async function applyKojiroPassive(s) {
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("燕返し", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerAgi += 1; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【燕返し】AGI +1`);
  renderCombat();
}

// 4005 勝海舟「無血開城」 hook=onCardUse
async function applyKatsuKaishuPassive(s) {
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("無血開城", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerPhy += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【無血開城】PHY +3`);
  s.playerInt += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【無血開城】INT +3`);
  renderCombat();
}

// 4006 ビリー・ザ・キッド「ワンホールショット」 hook=onCombatStart
function applyBillyKidPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.4));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【ワンホールショット】発動！ INT ${dmg} ダメージ`); }
}

// 4007 トーマス・エジソン「エジソン・エフェクト」 hook=onCardUse
async function applyEdisonPassive(s) {
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("エジソン・エフェクト", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerInt += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【エジソン・エフェクト】INT +3`);
  renderCombat();
}

// 4008 マルコ・ポーロ「東方見聞録」 hook=onCombatStart
function applyMarcoPoloPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  { const heal = Math.max(1, Math.floor(s.playerHpMax * 0.7));
    applyHpDeltaToHero(s, hero, +heal);
    playPortraitEffect("player", "heal", hero); playBattleSe("heal");
    clog(`【東方見聞録】HP +${heal}`); }
  s.enemyPhy = Math.max(1, s.enemyPhy + (-4)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【東方見聞録】敵 PHY -4`);
  s.hasResurrection = true; if (hero) hero.alive = true; playBattleSe("buff"); clog(`【東方見聞録】リザレクション付与`);
}

// 4009 伊達政宗「独眼竜」 hook=onCardUse
async function applyMasamunePassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("独眼竜", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerInt * 1.4));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【独眼竜】発動！ INT ${dmg} ダメージ`); }
  renderCombat();
}

// 4010 王キ「大将軍」 hook=onCombatStart
function applyOukiPassive(s) {
  const hero = s.heroes?.[0];
  s.playerPhy += 7; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【大将軍】PHY +7`);
}

// 4011 マルクス「資本論」 hook=onCombatStart
function applyMarxPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  s.playerInt += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【資本論】INT +3`);
  s.enemyBleed = (s.enemyBleed || 0) + 3; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【資本論】出血 ×3 付与`);
  s.hasResurrection = true; if (hero) hero.alive = true; playBattleSe("buff"); clog(`【資本論】リザレクション付与`);
}

// 4012 沖田総司「三段突き」 hook=onCombatStart
function applyOkitaPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  for (let i = 0; i < 3 && !areAllEnemiesDefeated(s); i++) {
    const dmg = Math.max(1, Math.floor(s.playerPhy * 0.5));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【三段突き】PHY ${dmg} ダメージ`);
  }
}

// 4013 チャイコフスキー「白鳥の湖」 hook=onCombatStart
function applyTchaikovskyPassive(s) {
  const hero = s.heroes?.[0];
  s.playerAgi += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【白鳥の湖】AGI +3`);
  s.hasResurrection = true; if (hero) hero.alive = true; playBattleSe("buff"); clog(`【白鳥の湖】リザレクション付与`);
}

// 4014 マリー・アントワネット「ブリオッシュート」 hook=onCardUse
async function applyAntoinettePassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("ブリオッシュート", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.25));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【ブリオッシュート】発動！ INT ${dmg} ダメージ`); }
  s.enemyPoison = (s.enemyPoison || 0) + 3; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【ブリオッシュート】毒 ×3 付与`);
  renderCombat();
}

// 4015 楊貴妃「傾国の美女」 hook=onCombatStart
function applyYangGuifeiPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  s.enemyAgi = Math.max(1, s.enemyAgi + (-6)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【傾国の美女】敵 AGI -6`);
}

// 4016 呂布「人中に呂布あり」 hook=onCombatStart
function applyLubuPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.6));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【人中に呂布あり】発動！ PHY ${dmg} ダメージ`); }
  s.playerPhy += 1; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【人中に呂布あり】PHY +1`);
  s.enemyPoison = (s.enemyPoison || 0) + 3; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【人中に呂布あり】毒 ×3 付与`);
}

// 4017 キュリー夫人「プチ・キュリー」 hook=onCardUse
async function applyCuriePassive(s) {
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("プチ・キュリー", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const heal = Math.max(1, Math.floor(s.playerHpMax * 0.25));
    applyHpDeltaToHero(s, hero, +heal);
    playPortraitEffect("player", "heal", hero); playBattleSe("heal");
    clog(`【プチ・キュリー】HP +${heal}`); }
  s.playerPhy += 1; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【プチ・キュリー】PHY +1`);
  s.playerShield = (s.playerShield || 0) + 8; playBattleSe("buff"); clog(`【プチ・キュリー】シールド +8`);
  renderCombat();
}

// 4018 孫権「若き後継者」 hook=onCombatStart
function applySunquanPassive(s) {
  const hero = s.heroes?.[0];
  s.playerPhy += 2; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【若き後継者】PHY +2`);
  s.playerInt += 2; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【若き後継者】INT +2`);
  s.playerAgi += 2; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【若き後継者】AGI +2`);
  s.playerGuard = (s.playerGuard || 0) + 6; playBattleSe("buff"); clog(`【若き後継者】ガード +6`);
}

// 4019 カメハメハ大王「ママラホエ・カナヴィ」 hook=onCombatStart
function applyKamehamehaPassive(s) {
  const hero = s.heroes?.[0];
  s.playerShield = (s.playerShield || 0) + 8; playBattleSe("buff"); clog(`【ママラホエ・カナヴィ】シールド +8`);
}

// 4020 カラミティ・ジェーン「法廷の疫病神」 hook=onCardUse
async function applyCalamityJanePassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("法廷の疫病神", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.enemyPhy = Math.max(1, s.enemyPhy + (-1)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【法廷の疫病神】敵 PHY -1`);
  s.enemyInt = Math.max(1, s.enemyInt + (-1)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【法廷の疫病神】敵 INT -1`);
  s.enemyAgi = Math.max(1, s.enemyAgi + (-1)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【法廷の疫病神】敵 AGI -1`);
  renderCombat();
}

// 4021 ゴッホ「ひまわり」 hook=onCardUse
async function applyVangoghPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("ひまわり", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerInt += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【ひまわり】INT +3`);
  s.enemyPoison = (s.enemyPoison || 0) + 3; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【ひまわり】毒 ×3 付与`);
  renderCombat();
}

// 4022 巴御前「最後のいくさしてみせ奉らん」 hook=onCombatStart
function applyTomoePassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.3));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【最後のいくさしてみせ奉らん】発動！ PHY ${dmg} ダメージ`); }
}

// 4023 趙雲「虎威将軍」 hook=onCardUse
async function applyZhaoyunPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("虎威将軍", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.enemyInt = Math.max(1, s.enemyInt + (-5)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【虎威将軍】敵 INT -5`);
  s.enemyAgi = Math.max(1, s.enemyAgi + (-5)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【虎威将軍】敵 AGI -5`);
  renderCombat();
}

// 4024 岳飛「尽忠報国」 hook=onCardUse
async function applyYuefeiPassive(s) {
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("尽忠報国", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  // Fallback: 元 DB の効果が解析不能 → 控えめな PHY+1 を付与
  s.playerPhy += 1; playBattleSe("buff"); clog(`【尽忠報国】PHY +1`);
  renderCombat();
}

// 4025 武田信玄「風林火山」 hook=onCombatStart
function applyShingenPassive(s) {
  const hero = s.heroes?.[0];
  s.playerPhy += 2; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【風林火山】PHY +2`);
  s.playerAgi += 2; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【風林火山】AGI +2`);
}

// 4026 カエサル「来た、見た、勝った」 hook=onCombatStart
function applyCaesarPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  s.playerPhy += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【来た、見た、勝った】PHY +3`);
  s.enemyInt = Math.max(1, s.enemyInt + (-3)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【来た、見た、勝った】敵 INT -3`);
}

// 4027 土方歳三「鬼の副長」 hook=onCardUse
async function applyHijikataPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("鬼の副長", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerPhy += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【鬼の副長】PHY +3`);
  s.enemyAgi = Math.max(1, s.enemyAgi + (-1)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【鬼の副長】敵 AGI -1`);
  renderCombat();
}

// 4028 ダーウィン「種の起源」 hook=onCardUse
async function applyDarwinPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("種の起源", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.enemyPhy = Math.max(1, s.enemyPhy + (-6)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【種の起源】敵 PHY -6`);
  s.enemyAgi = Math.max(1, s.enemyAgi + (-6)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【種の起源】敵 AGI -6`);
  renderCombat();
}

// 4029 ヤマトタケル「三種の神器」 hook=onCardUse
async function applyYamatoTakeruPassive(s) {
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("三種の神器", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  // Fallback: 元 DB の効果が解析不能 → 控えめな PHY+1 を付与
  s.playerPhy += 1; playBattleSe("buff"); clog(`【三種の神器】PHY +1`);
  renderCombat();
}

// 4030 モーツァルト「アイネ・クライネ・ナハトムジーク」 hook=onCombatStart
function applyMozartPassive(s) {
  // Fallback: 元 DB の効果が解析不能 → 控えめな PHY+1 を付与
  s.playerPhy += 1; playBattleSe("buff"); clog(`【アイネ・クライネ・ナハトムジーク】PHY +1`);
}

// 4031 平将門「首塚伝説」 hook=onCombatStart
function applyMasakadoPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.7));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【首塚伝説】発動！ PHY ${dmg} ダメージ`); }
  s.enemyPoison = (s.enemyPoison || 0) + 3; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【首塚伝説】毒 ×3 付与`);
}

// 4032 上杉謙信「毘沙門天の化身」 hook=onCombatStart
function applyKenshinPassive(s) {
  const hero = s.heroes?.[0];
  s.playerInt += 2; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【毘沙門天の化身】INT +2`);
  s.playerAgi += 2; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【毘沙門天の化身】AGI +2`);
}

// 4033 エイブラハム・リンカーン「奴隷解放宣言」 hook=onCombatStart
function applyLincolnPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.45));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【奴隷解放宣言】発動！ INT ${dmg} ダメージ`); }
  { const heal = Math.max(1, Math.floor(s.playerHpMax * 0.5));
    applyHpDeltaToHero(s, hero, +heal);
    playPortraitEffect("player", "heal", hero); playBattleSe("heal");
    clog(`【奴隷解放宣言】HP +${heal}`); }
}

// 4034 サトシ・ナカモト OMEGA CC「マイニング OMEGA CC」 hook=onCardUse
async function applySatoshiOmegaPassive(s) {
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("マイニング OMEGA CC", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerPhy += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【マイニング OMEGA CC】PHY +3`);
  s.playerAgi += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【マイニング OMEGA CC】AGI +3`);
  renderCombat();
}

// 4035 近藤勇「長曽祢虎徹」 hook=onCardUse
async function applyKondoPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("長曽祢虎徹", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerPhy += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【長曽祢虎徹】PHY +3`);
  s.enemyPoison = (s.enemyPoison || 0) + 3; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【長曽祢虎徹】毒 ×3 付与`);
  renderCombat();
}

// 4036 黒髭「クイーン・アンズ・リベンジ」 hook=onCardUse
async function applyBlackbeardPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("クイーン・アンズ・リベンジ", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerAgi += 2; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【クイーン・アンズ・リベンジ】AGI +2`);
  s.enemyAgi = Math.max(1, s.enemyAgi + (-2)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【クイーン・アンズ・リベンジ】敵 AGI -2`);
  renderCombat();
}

// 4037 関羽「過五関斬六将」 hook=onCardUse
async function applyGuanyuPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("過五関斬六将", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.45));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【過五関斬六将】発動！ PHY ${dmg} ダメージ`); }
  s.playerPhy += 2; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【過五関斬六将】PHY +2`);
  renderCombat();
}

// 4038 ブリュンヒルド「冥府への旅」 hook=onCombatStart
function applyBrynhildrPassive(s) {
  const hero = s.heroes?.[0];
  s.playerPhy += 7; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【冥府への旅】PHY +7`);
  s.playerAgi += 7; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【冥府への旅】AGI +7`);
}

// 4039 西郷隆盛「田原坂」 hook=onCombatStart
function applySaigoPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  s.enemyInt = Math.max(1, s.enemyInt + (-4)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【田原坂】敵 INT -4`);
  s.enemyBleed = (s.enemyBleed || 0) + 3; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【田原坂】出血 ×3 付与`);
}

// 4040 韓信「国士無双」 hook=onCombatStart
function applyHanxinPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 1.2));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【国士無双】発動！ PHY ${dmg} ダメージ`); }
}

// 4041 ニコラ・テスラ「テスラコイル」 hook=onCardUse
async function applyTeslaPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("テスラコイル", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerPhy += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【テスラコイル】PHY +3`);
  s.enemyPoison = (s.enemyPoison || 0) + 3; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【テスラコイル】毒 ×3 付与`);
  renderCombat();
}

// 4042 ブッダ「悟り」 hook=onCombatStart
function applyBuddhaPassive(s) {
  const hero = s.heroes?.[0];
  s.playerInt += 1; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【悟り】INT +1`);
  s.playerAgi += 2; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【悟り】AGI +2`);
}

// 4043 鉄腕アトム「10万馬力」 hook=onCardUse
async function applyAtomPassive(s) {
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("10万馬力", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerPhy += 1; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【10万馬力】PHY +1`);
  renderCombat();
}

// 4044 ファーブル「動物行動学」 hook=onCombatStart
function applyFabrePassive(s) {
  const hero = s.heroes?.[0];
  s.playerPhy += 7; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【動物行動学】PHY +7`);
}

// 4045 ランスロット「湖の騎士」 hook=onCombatStart
function applyLancelotPassive(s) {
  const hero = s.heroes?.[0];
  s.playerPhy += 1; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【湖の騎士】PHY +1`);
  s.playerAgi += 2; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【湖の騎士】AGI +2`);
}

// 4046 ラスプーチン「ロシアの怪僧」 hook=onCardUse
async function applyRasputinPassive(s) {
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("ロシアの怪僧", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  // Fallback: 元 DB の効果が解析不能 → 控えめな PHY+1 を付与
  s.playerPhy += 1; playBattleSe("buff"); clog(`【ロシアの怪僧】PHY +1`);
  renderCombat();
}

// 4047 ハンニバル「豊穣神バアルの雷光」 hook=onCardUse
async function applyHannibalPassive(s) {
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("豊穣神バアルの雷光", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  // Fallback: 元 DB の効果が解析不能 → 控えめな PHY+1 を付与
  s.playerPhy += 1; playBattleSe("buff"); clog(`【豊穣神バアルの雷光】PHY +1`);
  renderCombat();
}

// 4048 周瑜「赤壁の戦い」 hook=onCardUse
async function applyZhouyuPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("赤壁の戦い", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.enemyPoison = (s.enemyPoison || 0) + 3; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【赤壁の戦い】毒 ×3 付与`);
  renderCombat();
}

// 4049 夏侯惇「隻眼の豪傑」 hook=onCombatStart
function applyXiahoudunPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  for (let i = 0; i < 4 && !areAllEnemiesDefeated(s); i++) {
    const dmg = Math.max(1, Math.floor(s.playerInt * 0.35));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【隻眼の豪傑】INT ${dmg} ダメージ`);
  }
}

// 4050 司馬懿仲達「戦術五事」 hook=onCombatStart
function applySimayiPassive(s) {
  const hero = s.heroes?.[0];
  s.playerAgi += 7; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【戦術五事】AGI +7`);
}

// 4051 ラーマ「マハー・アヴァターラ」 hook=onCombatStart
function applyRamaPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  s.enemyPhy = Math.max(1, s.enemyPhy + (-2)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【マハー・アヴァターラ】敵 PHY -2`);
  s.enemyInt = Math.max(1, s.enemyInt + (-2)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【マハー・アヴァターラ】敵 INT -2`);
  s.enemyAgi = Math.max(1, s.enemyAgi + (-2)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【マハー・アヴァターラ】敵 AGI -2`);
}

// 4052 フランシス・ドレーク「女王直属海賊」 hook=onCombatStart
function applyDrakePassive(s) {
  const hero = s.heroes?.[0];
  s.playerAgi += 4; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【女王直属海賊】AGI +4`);
}

// 4053 ウィリアム・テル「解放の一矢」 hook=onCombatStart
function applyTellPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  { const dmg = Math.max(1, Math.floor(s.playerInt * 1));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【解放の一矢】発動！ INT ${dmg} ダメージ`); }
  s.playerInt += 6; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【解放の一矢】INT +6`);
}

// 4054 菅原道真「天満大自在天神」 hook=onCombatStart
function applyMichizanePassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  { const dmg = Math.max(1, Math.floor(s.playerInt * 1.1));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【天満大自在天神】発動！ INT ${dmg} ダメージ`); }
  s.enemyPoison = (s.enemyPoison || 0) + 3; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【天満大自在天神】毒 ×3 付与`);
}

// 4055 本多忠勝「花実兼備」 hook=onCardUse
async function applyTadakatsuPassive(s) {
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("花実兼備", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerPhy += 7; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【花実兼備】PHY +7`);
  s.playerAgi += 7; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【花実兼備】AGI +7`);
  s.playerGuard = (s.playerGuard || 0) + 6; playBattleSe("buff"); clog(`【花実兼備】ガード +6`);
  renderCombat();
}

// 4056 夏目漱石「日月切落、天地粉韲」 hook=onCombatStart
function applySosekiPassive(s) {
  const hero = s.heroes?.[0];
  s.playerPhy += 7; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【日月切落、天地粉韲】PHY +7`);
  s.playerInt += 7; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【日月切落、天地粉韲】INT +7`);
  s.playerAgi += 7; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【日月切落、天地粉韲】AGI +7`);
}

// 4057 ブーディカ「イケニ族の女王」 hook=onCombatStart
function applyBoudicaPassive(s) {
  // Fallback: 元 DB の効果が解析不能 → 控えめな PHY+1 を付与
  s.playerPhy += 1; playBattleSe("buff"); clog(`【イケニ族の女王】PHY +1`);
}

// 4058 ヤッターマン1号 & 2号「ケンダマジック & シビレステッキ」 hook=onCardUse
async function applyYattermanPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("ケンダマジック & シビレステッキ", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.25));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【ケンダマジック & シビレステッキ】発動！ INT ${dmg} ダメージ`); }
  s.enemyBleed = (s.enemyBleed || 0) + 3; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【ケンダマジック & シビレステッキ】出血 ×3 付与`);
  renderCombat();
}

// 4059 コブラ「サイコガン」 hook=onCardUse
async function applyCobraPassive(s) {
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("サイコガン", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerInt += 6; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【サイコガン】INT +6`);
  renderCombat();
}

// 4060 SUZUISHI「鳴響止水」 hook=onCardUse
async function applySuzuishiPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("鳴響止水", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.3));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【鳴響止水】発動！ PHY ${dmg} ダメージ`); }
  s.playerPhy += 7; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【鳴響止水】PHY +7`);
  renderCombat();
}

// 4061 ティルフィング[PK Alterna]「ショックトゥキル」 hook=onCardUse
async function applyTyrfingPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("ショックトゥキル", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.22));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【ショックトゥキル】発動！ PHY ${dmg} ダメージ`); }
  s.playerShield = (s.playerShield || 0) + 8; playBattleSe("buff"); clog(`【ショックトゥキル】シールド +8`);
  renderCombat();
}

// ─── Legendary ヒーロー (heroId 5001-5033) パッシブ ───────────────
// 5001 織田信長「天下布武」 hook=onCardUse
async function applyNobunagaPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("天下布武", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 1.75));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【天下布武】発動！ PHY ${dmg} ダメージ`); }
  renderCombat();
}

// 5002 ナポレオン・ボナパルト「コルシカの悪魔」 hook=onCardUse
async function applyNapoleonPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("コルシカの悪魔", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerInt * 1.75));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【コルシカの悪魔】発動！ INT ${dmg} ダメージ`); }
  renderCombat();
}

// 5003 曹操「乱世の奸雄」 hook=onCardUse
async function applyCaocaoPassive(s) {
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("乱世の奸雄", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerPhy += 1; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【乱世の奸雄】PHY +1`);
  renderCombat();
}

// 5004 ジョージ・ワシントン「1stプレジデント」 hook=onCardUse
async function applyWashingtonPassive(s) {
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("1stプレジデント", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerInt += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【1stプレジデント】INT +3`);
  s.playerAgi += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【1stプレジデント】AGI +3`);
  renderCombat();
}

// 5005 レオナルド・ダ・ビンチ「モナリザ」 hook=onCombatStart
function applyDavinciPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.8));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【モナリザ】発動！ INT ${dmg} ダメージ`); }
}

// 5006 アーサー王「エクスカリバー」 hook=onCardUse
async function applyArthurPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("エクスカリバー", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.5));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【エクスカリバー】発動！ PHY ${dmg} ダメージ`); }
  { const heal = Math.max(1, Math.floor(s.playerHpMax * 0.3));
    applyHpDeltaToHero(s, hero, +heal);
    playPortraitEffect("player", "heal", hero); playBattleSe("heal");
    clog(`【エクスカリバー】HP +${heal}`); }
  renderCombat();
}

// 5007 ジャンヌ・ダルク「オルレアンの乙女」 hook=onCombatStart
function applyJeannePassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  s.playerPhy += 2; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【オルレアンの乙女】PHY +2`);
  s.enemyAgi = Math.max(1, s.enemyAgi + (-1)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【オルレアンの乙女】敵 AGI -1`);
  s.playerGuard = (s.playerGuard || 0) + 6; playBattleSe("buff"); clog(`【オルレアンの乙女】ガード +6`);
}

// 5008 坂本龍馬「海援隊」 hook=onCardUse
async function applyRyomaPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("海援隊", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.2));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【海援隊】発動！ INT ${dmg} ダメージ`); }
  { const heal = Math.max(1, Math.floor(s.playerHpMax * 0.4));
    applyHpDeltaToHero(s, hero, +heal);
    playPortraitEffect("player", "heal", hero); playBattleSe("heal");
    clog(`【海援隊】HP +${heal}`); }
  s.playerInt += 1; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【海援隊】INT +1`);
  renderCombat();
}

// 5009 劉備「三顧の礼」 hook=onCardUse
async function applyLiubeiPassive(s) {
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("三顧の礼", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerPhy += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【三顧の礼】PHY +3`);
  s.playerInt += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【三顧の礼】INT +3`);
  s.playerAgi += 2; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【三顧の礼】AGI +2`);
  renderCombat();
}

// 5010 アインシュタイン「相対性理論」 hook=onCardUse
async function applyEinsteinPassive(s) {
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("相対性理論", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerPhy += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【相対性理論】PHY +3`);
  s.playerAgi += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【相対性理論】AGI +3`);
  renderCombat();
}

// 5011 卑弥呼「鬼道」 hook=onCombatStart
function applyHimikoPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  s.enemyInt = Math.max(1, s.enemyInt + (-5)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【鬼道】敵 INT -5`);
}

// 5012 バッハ「バロック」 hook=onCardUse
async function applyBachPassive(s) {
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("バロック", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerPhy += 1; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【バロック】PHY +1`);
  s.playerInt += 1; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【バロック】INT +1`);
  s.playerAgi += 1; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【バロック】AGI +1`);
  renderCombat();
}

// 5013 チンギス・ハン「蒼狼」 hook=onCombatStart
function applyChinggisPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.4));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【蒼狼】発動！ PHY ${dmg} ダメージ`); }
}

// 5014 カール大帝「キングオブハート」 hook=onCardUse
async function applyCharlemagnePassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("キングオブハート", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerInt += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【キングオブハート】INT +3`);
  s.enemyInt = Math.max(1, s.enemyInt + (-3)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【キングオブハート】敵 INT -3`);
  renderCombat();
}

// 5015 諸葛亮「死せる孔明生ける仲達を走らす」 hook=onCombatStart
function applyKongmingPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  s.enemyPhy = Math.max(1, s.enemyPhy + (-7)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【死せる孔明生ける仲達を走らす】敵 PHY -7`);
  s.enemyInt = Math.max(1, s.enemyInt + (-7)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【死せる孔明生ける仲達を走らす】敵 INT -7`);
  s.enemyAgi = Math.max(1, s.enemyAgi + (-7)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【死せる孔明生ける仲達を走らす】敵 AGI -7`);
  s.enemyPoison = (s.enemyPoison || 0) + 4; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【死せる孔明生ける仲達を走らす】毒 ×4 付与`);
}

// 5016 クレオパトラ「戦乱を呼ぶ美貌」 hook=onCombatStart
function applyCleopatraPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  s.enemyAgi = Math.max(1, s.enemyAgi + (-2)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【戦乱を呼ぶ美貌】敵 AGI -2`);
}

// 5017 アレキサンダー「征服王の偉業」 hook=onCombatStart
function applyAlexanderPassive(s) {
  const hero = s.heroes?.[0];
  s.playerPhy += 9; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【征服王の偉業】PHY +9`);
  s.playerInt += 9; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【征服王の偉業】INT +9`);
  s.playerAgi += 9; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【征服王の偉業】AGI +9`);
}

// 5018 始皇帝「中国統一」 hook=onCombatStart
function applyQinshihuangPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  s.playerAgi += 9; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【中国統一】AGI +9`);
  s.enemyAgi = Math.max(1, s.enemyAgi + (-7)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【中国統一】敵 AGI -7`);
}

// 5019 源義経「鵯越の逆落とし」 hook=onCardUse
async function applyYoshitsunePassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("鵯越の逆落とし", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerAgi += 2; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【鵯越の逆落とし】AGI +2`);
  s.enemyPhy = Math.max(1, s.enemyPhy + (-2)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【鵯越の逆落とし】敵 PHY -2`);
  s.enemyPoison = (s.enemyPoison || 0) + 4; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【鵯越の逆落とし】毒 ×4 付与`);
  renderCombat();
}

// 5020 ツタンカーメン「ファラオの呪い」 hook=onCombatStart
function applyTutankhamunPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.8));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【ファラオの呪い】発動！ PHY ${dmg} ダメージ`); }
}

// 5021 安倍晴明「急急如律令」 hook=onCardUse
async function applySeimeiPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("急急如律令", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.enemyInt = Math.max(1, s.enemyInt + (-2)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【急急如律令】敵 INT -2`);
  s.enemyBleed = (s.enemyBleed || 0) + 4; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【急急如律令】出血 ×4 付与`);
  renderCombat();
}

// 5022 虞美人「破滅哀歌」 hook=onCombatStart
function applyGujiPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  s.enemyPhy = Math.max(1, s.enemyPhy + (-5)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【破滅哀歌】敵 PHY -5`);
}

// 5023 リチャード1世「騎士道の華」 hook=onCardUse
async function applyRichardPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("騎士道の華", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerPhy += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【騎士道の華】PHY +3`);
  s.enemyPhy = Math.max(1, s.enemyPhy + (-3)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【騎士道の華】敵 PHY -3`);
  s.enemyBleed = (s.enemyBleed || 0) + 4; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【騎士道の華】出血 ×4 付与`);
  renderCombat();
}

// 5024 葛飾北斎「富嶽三十六景」 hook=onCombatStart
function applyHokusaiPassive(s) {
  const hero = s.heroes?.[0];
  { const heal = Math.max(1, Math.floor(s.playerHpMax * 0.05));
    applyHpDeltaToHero(s, hero, +heal);
    playPortraitEffect("player", "heal", hero); playBattleSe("heal");
    clog(`【富嶽三十六景】HP +${heal}`); }
  s.playerPhy += 1; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【富嶽三十六景】PHY +1`);
  s.playerInt += 9; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【富嶽三十六景】INT +9`);
}

// 5025 項羽「西楚の覇王」 hook=onCardUse
async function applyXiangyuPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("西楚の覇王", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.45));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【西楚の覇王】発動！ PHY ${dmg} ダメージ`); }
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.45));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【西楚の覇王】発動！ INT ${dmg} ダメージ`); }
  s.playerPhy += 8; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【西楚の覇王】PHY +8`);
  s.playerInt += 8; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【西楚の覇王】INT +8`);
  s.enemyPhy = Math.max(1, s.enemyPhy + (-3)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【西楚の覇王】敵 PHY -3`);
  renderCombat();
}

// 5026 劉邦「龍顔の高祖」 hook=onCombatStart
function applyLiubangPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  s.enemyAgi = Math.max(1, s.enemyAgi + (-7)); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【龍顔の高祖】敵 AGI -7`);
}

// 5027 ガリレオ・ガリレイ「天文対話」 hook=onCardUse
async function applyGalileoPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("天文対話", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.2));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【天文対話】発動！ PHY ${dmg} ダメージ`); }
  { const dmg = Math.max(1, Math.floor(s.playerInt * 1));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【天文対話】発動！ INT ${dmg} ダメージ`); }
  s.playerInt += 8; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【天文対話】INT +8`);
  renderCombat();
}

// 5028 那須与一「南無八幡大菩薩」 hook=onCardUse
async function applyYoichiPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("南無八幡大菩薩", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerPhy += 7; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【南無八幡大菩薩】PHY +7`);
  s.enemyBleed = (s.enemyBleed || 0) + 4; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【南無八幡大菩薩】出血 ×4 付与`);
  renderCombat();
}

// 5029 エドワード黒太子「ポワティエの戦い」 hook=onCardUse
async function applyBlackPrincePassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("ポワティエの戦い", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.2));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【ポワティエの戦い】発動！ PHY ${dmg} ダメージ`); }
  s.playerAgi += 3; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【ポワティエの戦い】AGI +3`);
  renderCombat();
}

// 5030 武則天「聖神皇帝」 hook=onCardUse
async function applyWuzetianPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("聖神皇帝", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerInt += 4; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(`【聖神皇帝】INT +4`);
  s.enemyBleed = (s.enemyBleed || 0) + 4; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(`【聖神皇帝】出血 ×4 付与`);
  s.playerGuard = (s.playerGuard || 0) + 6; playBattleSe("buff"); clog(`【聖神皇帝】ガード +6`);
  renderCombat();
}

// 5031 スキピオ・アフリカヌス「クイントカントゥス」 hook=onCardUse
async function applyScipioPassive(s) {
  const hero = s.heroes?.[0];
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("クイントカントゥス", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  s.playerGuard = (s.playerGuard || 0) + 6; playBattleSe("buff"); clog(`【クイントカントゥス】ガード +6`);
  renderCombat();
}

// 5032 宮本武蔵「二天一流」 hook=onCardUse
async function applyMusashiPassive(s) {
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("二天一流", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  // Fallback: 元 DB の効果が解析不能 → 控えめな PHY+1 を付与
  s.playerPhy += 1; playBattleSe("buff"); clog(`【二天一流】PHY +1`);
  renderCombat();
}

// 5033 YATAGARASU「心眼一閃」 hook=onCardUse
async function applyYatagarasuPassive(s) {
  const target = getPlayerAttackTargetEnemy(s);
  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  if (Math.random() >= 0.4) return;
  combatInputLocked = true;
  await showPassiveCutin("心眼一閃", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));
  combatInputLocked = false;
  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;
  { const dmg = Math.max(1, Math.floor(s.playerPhy * 0.35));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【心眼一閃】発動！ PHY ${dmg} ダメージ`); }
  { const dmg = Math.max(1, Math.floor(s.playerInt * 0.35));
    applyHpDeltaToEnemy(s, target, -dmg);
    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");
    clog(`【心眼一閃】発動！ INT ${dmg} ダメージ`); }
  renderCombat();
}

// ─── カードプレイ ─────────────────────────────────────────────────
async function playCard(idx) {
  if (combatInputLocked) return;
  const card = combat.hand[idx];
  if (!card || card.cost > combat.energy) return;
  // SPEC-005 Phase 3j: アクティブキャスターを生存させ、stats を legacy にロードしてから play
  ensureActiveHeroAlive(combat);
  loadActiveHeroStatsToLegacy(combat);
  combat.energy -= card.cost;
  combat.hand.splice(idx, 1);
  // 消耗カードは exhaustPile へ、通常カードは捨て札へ
  if (card.exhaust) {
    combat.exhaustPile.push(card);
    clog(`【消耗】${card.extNameJa} を除外`);
  } else {
    combat.discardPile.push(card);
  }
  card.play(combat);
  // Phase 3j: card 効果で変化した legacy stats を active hero へ書き戻し
  syncLegacyStatsToActiveHero(combat);
  // カード効果を UI に反映してからパッシブへ
  renderCombat();
  if (areAllEnemiesDefeated(combat)) { endCombatWin(); return; }
  // 甲斐姫「浪切」: スキルカード使用後に50%の確率で追加ダメージ（カットイン付き）
  await applyKaihimePassive(combat);
  if (!combat) return;
  if (areAllEnemiesDefeated(combat)) { endCombatWin(); return; }
  await applyHeroPassiveOnCardUse(combat);
  if (!combat) return;
  if (areAllEnemiesDefeated(combat)) { endCombatWin(); return; }
  renderCombat();
}

// ─── 敵ターン ─────────────────────────────────────────────────────
async function enemyTurn() {
  const it = combat.enemyIntent;
  if (!it) { combat.turn++; startPlayerTurn(); return; }

  // レギュレーション効果: 毎ターン初期ガード付与（Blue+） (#37)
  const reg = getCurrentRegulation();
  if (reg.effects.guardPerTurn > 0) {
    combat.enemyGuard += reg.effects.guardPerTurn;
    clog(`敵 GUARD +${reg.effects.guardPerTurn}（${reg.nameJa} 効果）`);
  }

  // レギュレーション効果: 攻撃に出血付与（Red+） (#37)
  const isAttackKind = it.kind && it.kind.startsWith && it.kind.startsWith("attack");
  const regBleedStacks = reg.effects.bleedOnAttack || 0;

  // Phase 3g: 行動した直後だけ次のアクションとの間に sleep を挟む
  let actorActed = false;

  // 前衛 (enemies[0]) — 死亡している場合はスキップ
  const front = combat.enemies?.[0];
  const frontAlive = front && front.alive !== false && (front.hp ?? combat.enemyHp ?? 0) > 0;
  if (frontAlive) {
    switch (it.kind) {
      case "attack":
        dealPhySkillFromEnemyToPlayer(combat, it.phyPct);
        break;
      case "attackPoison":
        dealPhySkillFromEnemyToPlayer(combat, it.phyPct);
        if (combat.playerHp > 0 && (it.poisonStacks || 0) > 0) {
          combat.playerPoison = (combat.playerPoison || 0) + it.poisonStacks;
          playBattleSe("debuff"); clog(`毒 ×${it.poisonStacks} 付与（自分）`);
          renderStatusBadges();
        }
        break;
      case "attackBleed":
        dealPhySkillFromEnemyToPlayer(combat, it.phyPct);
        if (combat.playerHp > 0 && (it.bleedStacks || 0) > 0) {
          combat.playerBleed = (combat.playerBleed || 0) + it.bleedStacks;
          playBattleSe("debuff"); clog(`出血 ×${it.bleedStacks} 付与（自分）`);
          renderStatusBadges();
        }
        break;
      case "attackDouble":
        dealPhySkillFromEnemyToPlayer(combat, it.phyPct);
        if (combat.playerHp > 0) dealPhySkillFromEnemyToPlayer(combat, it.phyPct);
        break;
      case "attackInt":
        dealIntSkillFromEnemyToPlayer(combat, it.intPct);
        break;
      case "attackIntDouble":
        dealIntSkillFromEnemyToPlayer(combat, it.intPct);
        if (combat.playerHp > 0) dealIntSkillFromEnemyToPlayer(combat, it.intPct);
        break;
      case "healSelf": {
        const heal = Math.max(1, Math.floor((combat.enemyHpMax * it.pct) / 100));
        combat.enemyHp = Math.min(combat.enemyHpMax, combat.enemyHp + heal);
        if (combat.enemies?.[0]) combat.enemies[0].hp = combat.enemyHp;
        playBattleSe("heal"); playPortraitEffect("enemy", "heal", combat.enemies?.[0]);
        clog(`敵 HP+${heal}（自己回復）`);
        break;
      }
      case "buffSelf":
        if (it.phyAdd) combat.enemyPhy += it.phyAdd;
        if (it.intAdd) combat.enemyInt += it.intAdd;
        playBattleSe("buff"); playPortraitEffect("enemy", "buff", combat.enemies?.[0]);
        clog(`敵強化: ${it.phyAdd ? "PHY+" + it.phyAdd : ""}${it.intAdd ? " INT+" + it.intAdd : ""}`);
        break;
      case "guard":
        combat.enemyGuard += it.value;
        playBattleSe("buff"); playPortraitEffect("enemy", "buff", combat.enemies?.[0]);
        clog(`敵 GUARD +${it.value}`);
        break;
      case "special":
        dealSpecialMaxHpPercentToPlayer(combat, it.pct);
        break;
      default:
        clog(`不明な意図: ${it.kind}`);
    }

    // レギュレーション効果: 攻撃に出血付与（Red+） (#37)
    if (isAttackKind && regBleedStacks > 0 && combat.playerHp > 0) {
      combat.playerBleed = (combat.playerBleed || 0) + regBleedStacks;
      playBattleSe("debuff");
      clog(`出血 ×${regBleedStacks} 付与（自分・${reg.nameJa} 効果）`);
      renderStatusBadges();
    }

    actorActed = true;
  }

  if (isPartyWipedOut(combat)) { endCombatLoss(); return; }

  // SPEC-005 Phase 3d: サブエネミー (enemies[1..]) も独立に行動。
  // Phase 3g: 前衛 → 中衛 → 後衛 の順で 1 体ずつ演出を完走させる
  // Phase 3i: 死亡しているユニットは丸ごとスキップ (sleep も走らせない)
  if (Array.isArray(combat.enemies) && combat.enemies.length > 1) {
    for (let i = 1; i < combat.enemies.length; i++) {
      const sub = combat.enemies[i];
      if (!sub || sub.alive === false || (sub.hp ?? 0) <= 0) continue;
      // SPEC-005 Phase 3d: advanceEnemyIntent で割り当て済みの sub.enemyIntent を使う
      // (idx 進行も advanceEnemyIntent でしているため二重インクリメントしない)
      const subIt = sub.enemyIntent;
      if (!subIt) continue;
      // 直前の生存ユニットが行動済みなら、その演出が終わるまで待つ
      if (actorActed) await sleep(ENEMY_ACTION_GAP_MS);
      // 攻撃系以外 (guard/buffSelf/healSelf 等): 攻撃ヘルパは流用できないので
      // 自身の HP/portrait に最低限の演出だけ反映し、データには触らない。
      const isAttack = subIt.kind && (subIt.kind.startsWith("attack") || subIt.kind === "special");
      if (!isAttack) {
        if (subIt.kind === "healSelf" && (subIt.pct || 0) > 0) {
          const heal = Math.max(1, Math.floor(((sub.hpMax || 0) * subIt.pct) / 100));
          sub.hp = Math.min(sub.hpMax || sub.hp, (sub.hp || 0) + heal);
          playBattleSe("heal"); playPortraitEffect("enemy", "heal", sub);
          clog(`${sub.name || "敵"} HP+${heal}（自己回復）`);
        } else if (subIt.kind === "buffSelf" || subIt.kind === "guard") {
          playBattleSe("buff"); playPortraitEffect("enemy", "buff", sub);
          clog(`${sub.name || "敵"} 行動: ${subIt.kind}`);
        }
        actorActed = true;
        continue;
      }
      // 一時的に combat.enemyXxx を sub のステに差し替えて既存ヘルパを再利用
      const saved = {
        enemyPhy: combat.enemyPhy, enemyInt: combat.enemyInt, enemyAgi: combat.enemyAgi,
        enemyPhyBase: combat.enemyPhyBase, enemyIntBase: combat.enemyIntBase, enemyAgiBase: combat.enemyAgiBase,
        enemyHp: combat.enemyHp, enemyHpMax: combat.enemyHpMax,
      };
      combat.enemyPhy = sub.phy; combat.enemyInt = sub.int; combat.enemyAgi = sub.agi;
      combat.enemyPhyBase = sub.phyBase; combat.enemyIntBase = sub.intBase; combat.enemyAgiBase = sub.agiBase;
      combat.enemyHp = sub.hp; combat.enemyHpMax = sub.hpMax;
      try {
        // Phase 3g: caster=sub を渡し、sub の portrait が lunge するように
        switch (subIt.kind) {
          case "attack":         dealPhySkillFromEnemyToPlayer(combat, subIt.phyPct, sub); break;
          case "attackPoison":
            dealPhySkillFromEnemyToPlayer(combat, subIt.phyPct, sub);
            if (!isPartyWipedOut(combat) && (subIt.poisonStacks || 0) > 0) {
              combat.playerPoison = (combat.playerPoison || 0) + subIt.poisonStacks;
              playBattleSe("debuff");
              clog(`毒 ×${subIt.poisonStacks} 付与（自分）`);
              renderStatusBadges();
            }
            break;
          case "attackBleed":
            dealPhySkillFromEnemyToPlayer(combat, subIt.phyPct, sub);
            if (!isPartyWipedOut(combat) && (subIt.bleedStacks || 0) > 0) {
              combat.playerBleed = (combat.playerBleed || 0) + subIt.bleedStacks;
              playBattleSe("debuff");
              clog(`出血 ×${subIt.bleedStacks} 付与（自分）`);
              renderStatusBadges();
            }
            break;
          case "attackDouble":
            dealPhySkillFromEnemyToPlayer(combat, subIt.phyPct, sub);
            if (!isPartyWipedOut(combat)) dealPhySkillFromEnemyToPlayer(combat, subIt.phyPct, sub);
            break;
          case "attackInt":      dealIntSkillFromEnemyToPlayer(combat, subIt.intPct, sub); break;
          case "attackIntDouble":
            dealIntSkillFromEnemyToPlayer(combat, subIt.intPct, sub);
            if (!isPartyWipedOut(combat)) dealIntSkillFromEnemyToPlayer(combat, subIt.intPct, sub);
            break;
          case "special":        dealSpecialMaxHpPercentToPlayer(combat, subIt.pct, sub); break;
        }
      } finally {
        // 戻す (heal/buff があった場合の HP 等変更は sub 反映済みなのでこれで問題なし)
        Object.assign(combat, saved);
      }
      if (isPartyWipedOut(combat)) { endCombatLoss(); return; }
      // Phase 3i: このサブが行動した。次の生存サブが来た時に sleep が入る
      actorActed = true;
    }
  }

  // 張遼「遼来遼来」: 被ダメージ後に反撃（カットイン付き、非同期）
  renderCombat();
  await applyZhangPassive(combat);
  if (!combat) return;
  if (areAllEnemiesDefeated(combat)) { endCombatWin(); return; }

  combat.turn++;
  startPlayerTurn();
}

// ─── カットイン ───────────────────────────────────────────────────
function showCutin(kind) {
  cutinKind = kind;
  const overlay = document.getElementById("cutinOverlay");
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
  const inner = document.getElementById("cutinInner");
  inner.className = "cutin-inner cutin--" + kind;
  const title = document.getElementById("cutinTitle");
  const sub = document.getElementById("cutinSub");
  if (kind === "win") {
    title.textContent = "VICTORY"; sub.textContent = "タップして次へ";
    cutinWinIgnoreUntil = performance.now() + 480;
  } else {
    title.textContent = "DEFEAT"; sub.textContent = "タップで続行";
  }
  playJingle(kind);
  return new Promise((resolve) => { cutinResolve = { resolve }; });
}

function dismissCutin() {
  if (!cutinKind) return;
  if (cutinKind === "win" && performance.now() < cutinWinIgnoreUntil) return;
  const overlay = document.getElementById("cutinOverlay");
  overlay.classList.add("hidden"); overlay.setAttribute("aria-hidden", "true");
  cutinKind = null;
  if (cutinResolve) { cutinResolve.resolve(); cutinResolve = null; }
}

// ─── 戦闘勝利 ────────────────────────────────────────────────────
function endCombatWin() {
  ensureRunState();
  const chapter = CHAPTERS[runState.chapterIdx];
  const isBoss = combat.isBoss;
  const isElite = combat.isElite;

  // ゴールド
  const earnedGold = isBoss ? chapter.bossRewardGold : isElite ? 45 : 28;
  gold += earnedGold;
  clog(`勝利！ GUM +${earnedGold}`);

  // 報酬カードプール（累積）
  const pool = shuffle(getCumulativeCardPool());
  const picks = pool.slice(0, 3).map((k) => CARD_LIBRARY[k]).filter(Boolean);
  // picks が 3 未満なら既存カードで補完
  const fallback = ["ext1002", "ext1005", "ext1003", "ext1006", "ext2001", "ext2004"];
  while (picks.length < 3) {
    const fb = fallback[Math.floor(Math.random() * fallback.length)];
    if (CARD_LIBRARY[fb] && !picks.includes(CARD_LIBRARY[fb])) picks.push(CARD_LIBRARY[fb]);
  }

  postCombatSnapshot = {
    playerHp: combat.playerHp,
    playerHpMax: combat.playerHpMax,
    deck: combat.deck.map((c) => ({ ...c })),
    mapNodeId: combat.mapNodeId,
    playerPhy: combat.playerPhy,
    playerInt: combat.playerInt,
    playerAgi: combat.playerAgi,
    enemyPhy: combat.enemyPhy,
    enemyInt: combat.enemyInt,
    isBoss,
  };
  combat = null;

  // ─── LLエクステ ドロップ判定（ホレリス以降、章インデックス >= 1） ───
  let droppedLlExt = null;
  if (runState.chapterIdx >= 1) {
    const hasEmpty = runState.llExtSlots.some(s => s === null);
    const dropChance = isElite ? 1.0 : 0.10;
    if (hasEmpty && Math.random() < dropChance) {
      droppedLlExt = LL_EXT_POOL[Math.floor(Math.random() * LL_EXT_POOL.length)];
      const emptyIdx = runState.llExtSlots.indexOf(null);
      runState.llExtSlots[emptyIdx] = droppedLlExt;
      clog(`✨ LLエクステ「${droppedLlExt.name}」ドロップ！`);
    }
  }

  stopBgm();
  showCutin("win").then(() => {
    if (droppedLlExt) {
      showLlExtModal(droppedLlExt).then(() => openRewardScreen(picks));
    } else {
      openRewardScreen(picks);
    }
  });
}

// ─── 報酬画面 ─────────────────────────────────────────────────────
function buildRewardPickButton(def, mockS) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "reward-card-btn";
  const rarity = CARD_RARITIES[def.libraryKey] || 'common';
  b.setAttribute("data-rarity", rarity);
  const summaryLines =
    typeof def.effectSummaryLines === "function" ? def.effectSummaryLines(mockS) :
    typeof def.previewLines === "function" ? def.previewLines(mockS) : [];
  b.innerHTML =
    '<div class="reward-card-inner ' + def.type + '">' +
    '<div class="card-art-full">' +
    '<img class="card-ext-img" src="' + EXT_IMG(def.extId) + '" alt="" onerror="this.style.opacity=\'0\'" />' +
    "</div>" +
    '<div class="card-tint"></div>' +
    '<div class="card-fg">' +
    '<div class="card-header"><div class="card-header-icons">' +
    '<span class="card-cost-badge"><span class="cost-zeus" aria-hidden="true">⚡</span>' + def.cost + "</span>" +
    '<img class="card-skill-corner" src="' + battleIconUrl(def.skillIcon) + '" alt="" />' +
    "</div></div>" +
    buildTargetBadgeHtml(def) +
    '<div class="card-ext-name">' + escapeHtml(def.extNameJa) +
    (def.skillNameJa ? '<span class="card-ext-skill-sub">' + escapeHtml(def.skillNameJa) + '</span>' : '') +
    "</div>" +
    '<div class="card-effect-summary">' +
    summaryLines.map((t) => "<p>" + escapeHtml(t) + "</p>").join("") +
    "</div></div></div>";
  return b;
}

function openRewardScreen(picks) {
  const box = document.getElementById("rewardPicks");
  if (!box || !postCombatSnapshot) return;
  box.innerHTML = "";
  const mockS = {
    playerPhy: postCombatSnapshot.playerPhy,
    playerInt: postCombatSnapshot.playerInt,
    playerAgi: postCombatSnapshot.playerAgi,
    enemyPhy: postCombatSnapshot.enemyPhy,
    enemyInt: postCombatSnapshot.enemyInt,
    playerHp: postCombatSnapshot.playerHp,
    playerHpMax: postCombatSnapshot.playerHpMax,
    playerGuard: 0, playerShield: 0, energyMax: 3, energy: 3,
  };
  picks.forEach((def) => {
    const b = buildRewardPickButton(def, mockS);
    b.addEventListener("click", () => advanceAfterRewardPick(def.libraryKey));
    box.appendChild(b);
  });
  showView("reward");
  syncResources();
}

/** @param {string | null} libraryKey null = skip */
function advanceAfterRewardPick(libraryKey) {
  if (!postCombatSnapshot) { showView("map"); renderMap(); return; }
  ensureRunState();
  runState.playerHp = postCombatSnapshot.playerHp;
  runState.playerHpMax = postCombatSnapshot.playerHpMax;
  runState.deck = postCombatSnapshot.deck.map((c) => ({ ...c }));
  if (libraryKey) runState.deck.push(copyCard(libraryKey));

  const mid = postCombatSnapshot.mapNodeId;
  const wasBoss = postCombatSnapshot.isBoss;
  if (mid) {
    runState.pathNodeIds.push(mid);
    runState.lastMapNodeId = mid;
    if (wasBoss) {
      // 章クリア → clearedChapters に追加し次章データを用意
      const clearedIdx = runState.chapterIdx;
      advanceToNextChapter(); // 内部で clearedChapters.add(clearedIdx) する
      combat = null;
      postCombatSnapshot = null;
      if (runState.runComplete) {
        // 全章クリア → ゲームオーバー画面（クリア）
        lastReportSnapshot = captureRunSnapshot({ isCleared: true, defeatedBy: null });
        showView("over");
        document.getElementById("gameOverMsg").textContent =
          "全 node クリアおめでとうございます！あなたは最高ですよ〜！";
      } else {
        // 次章のマップへそのまま遷移（runState.deck / playerHp / llExtSlots を引き継ぎ） #31
        // advanceToNextChapter() で chapterIdx++ と新章マップのセットアップは既に完了
        showView("map");
        renderMap();
      }
      return;
    }
  }
  combat = null;
  postCombatSnapshot = null;
  showView("map");
  renderMap();
}

// ─── 保有デッキ表示（#30） ───────────────────────────────────────
/**
 * libraryKey からシリーズキーを抽出。
 * ext1001/ext2001 (ブレード系) → "001"
 * cd101 (章1) → "cd1", cd201 (章2) → "cd2"
 * その他は libraryKey そのまま（個別シリーズ）
 */
function deckSeriesKey(libraryKey) {
  if (typeof libraryKey !== "string") return "zzz";
  if (libraryKey.startsWith("ext")) {
    // 末尾 3 桁をシリーズキーに
    const m = libraryKey.match(/(\d+)$/);
    if (m) {
      const digits = m[1];
      return digits.length >= 3 ? digits.slice(-3) : digits.padStart(3, "0");
    }
  }
  if (libraryKey.startsWith("cd")) {
    return "cd" + libraryKey.charAt(2);
  }
  return libraryKey;
}

const RARITY_ORDER = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, ll: 6 };
const RARITY_LABEL = { common: "コモン", uncommon: "アンコモン", rare: "レア", epic: "エピック", legendary: "レジェンド", ll: "LL" };

function showOwnedDeckPeek(def) {
  const peek = document.getElementById("ownedDeckPeek");
  if (!peek) return;
  const mockS = {
    playerPhy: LEADER.basePhy,
    playerInt: LEADER.baseInt,
    playerAgi: LEADER.baseAgi,
    enemyPhy: 14, enemyInt: 8,
    playerHp: runState?.playerHp ?? LEADER.hpMax,
    playerHpMax: runState?.playerHpMax ?? LEADER.hpMax,
    playerGuard: 0, playerShield: 0, energyMax: 3, energy: 3,
  };
  const lines =
    typeof def.previewLines === "function" ? def.previewLines(mockS) :
    typeof def.effectSummaryLines === "function" ? def.effectSummaryLines(mockS) : [];
  const rarity = CARD_RARITIES[def.libraryKey] || "common";
  peek.innerHTML = `
    <div class="owned-deck-peek-card" data-rarity="${rarity}">
      <h3>${escapeHtml(def.extNameJa || "")}</h3>
      ${def.skillNameJa ? `<p class="opc-skill">${escapeHtml(def.skillNameJa)}</p>` : ""}
      <div class="opc-meta">
        <span>⚡ ${def.cost}</span>
        <span>${def.type === "atk" ? "攻撃" : def.type === "skl" ? "スキル" : def.type}</span>
        <span>${RARITY_LABEL[rarity] || rarity}</span>
      </div>
      <div class="opc-lines">${lines.map(l => `<p>${escapeHtml(l)}</p>`).join("")}</div>
      <button type="button" class="opc-close">閉じる</button>
    </div>
  `;
  peek.classList.remove("hidden");
  peek.removeAttribute("aria-hidden");
  const close = () => {
    peek.classList.add("hidden");
    peek.setAttribute("aria-hidden", "true");
  };
  peek.querySelector(".opc-close").addEventListener("click", close);
  peek.addEventListener("click", (e) => { if (e.target === peek) close(); }, { once: true });
}

function openOwnedDeckOverlay() {
  const overlay = document.getElementById("ownedDeckOverlay");
  if (!overlay) return;

  // ソース: 戦闘中なら combat の deck（drawPile + hand + discardPile）、
  // それ以外は runState.deck
  let cards = [];
  if (combat) {
    cards = [...(combat.drawPile || []), ...(combat.hand || []), ...(combat.discardPile || []), ...(combat.exhaustPile || [])];
  } else if (runState && runState.deck) {
    cards = [...runState.deck];
  }

  // ソート: シリーズキー → レアリティ → libraryKey（カード単位）
  const sorted = cards
    .filter(c => c && c.libraryKey)
    .map(c => CARD_LIBRARY[c.libraryKey] || c)
    .sort((a, b) => {
      const sa = deckSeriesKey(a.libraryKey);
      const sb = deckSeriesKey(b.libraryKey);
      if (sa !== sb) return sa < sb ? -1 : 1;
      const ra = RARITY_ORDER[CARD_RARITIES[a.libraryKey] || "common"] || 0;
      const rb = RARITY_ORDER[CARD_RARITIES[b.libraryKey] || "common"] || 0;
      if (ra !== rb) return ra - rb;
      return a.libraryKey < b.libraryKey ? -1 : 1;
    });

  // 上部サマリー: レアリティアイコン（L/E/R/U/C）と総数
  const total = cards.length;
  const rarityCounts = {};
  for (const c of cards) {
    if (!c || !c.libraryKey) continue;
    const r = CARD_RARITIES[c.libraryKey] || "common";
    rarityCounts[r] = (rarityCounts[r] || 0) + 1;
  }
  const summaryEl = document.getElementById("ownedDeckSummary");
  const RARITY_DISPLAY = [
    { key: "legendary", letter: "L" },
    { key: "epic",      letter: "E" },
    { key: "rare",      letter: "R" },
    { key: "uncommon",  letter: "U" },
    { key: "common",    letter: "C" },
  ];
  const pills = RARITY_DISPLAY.map(({ key, letter }) => {
    const n = rarityCounts[key] || 0;
    return `<span class="od-rarity-pill" data-rarity="${key}" data-zero="${n === 0}" title="${RARITY_LABEL[key]} ${n} 枚">
      <span class="od-pill-letter">${letter}</span>
      <span class="od-pill-count">${n}</span>
    </span>`;
  }).join("");
  summaryEl.innerHTML = pills + `<span class="od-total">${total}</span>`;

  // グリッド: カードを 1 枚ずつ並べる（×N スタックではなく N 個並べる）
  const gridEl = document.getElementById("ownedDeckGrid");
  gridEl.innerHTML = "";
  if (sorted.length === 0) {
    gridEl.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--muted);font-size:0.8rem;padding:1rem">デッキは空です</p>`;
  } else {
    const mockS = {
      playerPhy: LEADER.basePhy,
      playerInt: LEADER.baseInt,
      playerAgi: LEADER.baseAgi,
      enemyPhy: 14, enemyInt: 8,
      playerHp: runState?.playerHp ?? LEADER.hpMax,
      playerHpMax: runState?.playerHpMax ?? LEADER.hpMax,
      playerGuard: 0, playerShield: 0, energyMax: 3, energy: 3,
    };
    for (const def of sorted) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "owned-deck-cell";
      cell.setAttribute("aria-label", def.extNameJa || def.libraryKey);
      const cardBtn = buildRewardPickButton(def, mockS);
      cell.appendChild(cardBtn);
      cell.addEventListener("click", () => showOwnedDeckPeek(def));
      gridEl.appendChild(cell);
    }
  }

  overlay.classList.remove("hidden");
  overlay.removeAttribute("aria-hidden");
}

function closeOwnedDeckOverlay() {
  const overlay = document.getElementById("ownedDeckOverlay");
  if (!overlay) return;
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  const peek = document.getElementById("ownedDeckPeek");
  if (peek) {
    peek.classList.add("hidden");
    peek.setAttribute("aria-hidden", "true");
  }
}

// ─── 活動レポート（#23） ────────────────────────────────────────
let lastReportSnapshot = null;
const SHARE_URL = "https://mycryptotactics.vercel.app/";
const SHARE_TITLE = "MyCryptoTactics";

function captureRunSnapshot({ isCleared, defeatedBy }) {
  if (!runState || !LEADER) return null;
  const chapter = CHAPTERS[runState.chapterIdx] || null;
  const stageName = chapter ? chapter.name : "";
  const reg = getCurrentRegulation();
  const newlyUnlocked = isCleared && runState.unlockedRegulationOnClear
    ? REGULATION_BY_ID[runState.unlockedRegulationOnClear]
    : null;
  return {
    isCleared,
    when: new Date(),
    hero: { name: LEADER.nameJa, imgUrl: LEADER.img() },
    regulation: { id: reg.id, name: reg.nameJa, iconUrl: reg.iconUrl, color: reg.color },
    newlyUnlockedRegulation: newlyUnlocked
      ? { id: newlyUnlocked.id, name: newlyUnlocked.nameJa, iconUrl: newlyUnlocked.iconUrl }
      : null,
    stageName,
    // #36 名前順ソート（同シリーズが隣同士に並ぶよう）
    deck: (runState.deck || [])
      .map((c) => ({
        libraryKey: c.libraryKey,
        extId: c.extId,
        extNameJa: c.extNameJa,
      }))
      .sort((a, b) => (a.extNameJa || "").localeCompare(b.extNameJa || "", "ja")),
    llExtSlots: (runState.llExtSlots || []).filter(Boolean).map((e) => ({
      extId: e.extId,
      name: e.name,
    })),
    opponent: defeatedBy
      ? { name: defeatedBy.name, imgUrl: ENEMY_IMG(defeatedBy.imgId) }
      // クリア時はディープ・ヨシュカ (boss-troy, imgId 171)
      : { name: "ディープ・ヨシュカ", imgUrl: ENEMY_IMG(171) },
  };
}

function fmtReportDateTime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildExtChip(item) {
  const chip = document.createElement("div");
  chip.className = "report-ext-chip";
  if (item.libraryKey) {
    const rarity = CARD_RARITIES[item.libraryKey] || "common";
    chip.setAttribute("data-rarity", rarity);
  }
  if (item.extId) {
    const im = document.createElement("img");
    im.src = EXT_IMG(item.extId);
    im.alt = item.extNameJa || item.name || "";
    im.onerror = () => {
      im.remove();
      const fb = document.createElement("span");
      fb.className = "chip-fallback";
      fb.textContent = item.extNameJa || item.name || "";
      chip.appendChild(fb);
    };
    chip.appendChild(im);
  } else {
    const fb = document.createElement("span");
    fb.className = "chip-fallback";
    fb.textContent = item.extNameJa || item.name || "";
    chip.appendChild(fb);
  }
  chip.title = item.extNameJa || item.name || "";
  return chip;
}

function showActivityReport(snap) {
  if (!snap) return;
  const overlay = document.getElementById("activityReportOverlay");
  if (!overlay) return;

  document.getElementById("reportLogo")?.remove();
  const logoEl = overlay.querySelector(".report-logo");
  if (logoEl) logoEl.src = "MCT_logo.png";

  document.getElementById("reportDatetime").textContent = fmtReportDateTime(snap.when);
  document.getElementById("reportHeroImg").src = snap.hero.imgUrl;
  document.getElementById("reportHeroName").textContent = snap.hero.name;
  document.getElementById("reportOpponentLabel").textContent = snap.isCleared ? "撃破した相手" : "倒された相手";
  document.getElementById("reportOpponentImg").src = snap.opponent.imgUrl;
  document.getElementById("reportOpponentName").textContent = snap.opponent.name;
  document.getElementById("reportStage").textContent =
    (snap.isCleared ? "全ステージ制覇 / 最終: " : "到達ステージ: ") + (snap.stageName || "—");

  // レギュレーション表示 (#37)
  if (snap.regulation) {
    const regIcon = document.getElementById("reportRegIcon");
    const regName = document.getElementById("reportRegName");
    if (regIcon) regIcon.src = snap.regulation.iconUrl;
    if (regName) {
      regName.textContent = `Regulation: ${snap.regulation.name}`;
      if (snap.regulation.color) regName.style.color = snap.regulation.color;
    }
  }
  // 新規アンロック演出
  const unlockEl = document.getElementById("reportUnlock");
  if (unlockEl) {
    if (snap.newlyUnlockedRegulation) {
      document.getElementById("reportUnlockIcon").src = snap.newlyUnlockedRegulation.iconUrl;
      document.getElementById("reportUnlockName").textContent = `${snap.newlyUnlockedRegulation.name} 解放！`;
      unlockEl.classList.remove("hidden");
    } else {
      unlockEl.classList.add("hidden");
    }
  }

  const deckList = document.getElementById("reportDeckList");
  deckList.innerHTML = "";
  snap.deck.forEach((c) => deckList.appendChild(buildExtChip(c)));
  document.getElementById("reportDeckCount").textContent = `(${snap.deck.length})`;

  const llList = document.getElementById("reportLlList");
  llList.innerHTML = "";
  snap.llExtSlots.forEach((e) => llList.appendChild(buildExtChip(e)));
  document.getElementById("reportLlCount").textContent = `(${snap.llExtSlots.length}/2)`;

  overlay.classList.remove("hidden");
  overlay.removeAttribute("aria-hidden");

  const closeBtn = document.getElementById("reportCloseBtn");
  const shareBtn = document.getElementById("reportShareBtn");
  // クローン置換でリスナー重複を避ける
  const newClose = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newClose, closeBtn);
  const newShare = shareBtn.cloneNode(true);
  shareBtn.parentNode.replaceChild(newShare, shareBtn);

  return new Promise((resolve) => {
    newClose.addEventListener("click", () => {
      overlay.classList.add("hidden");
      overlay.setAttribute("aria-hidden", "true");
      resolve();
    });
    newShare.addEventListener("click", async () => {
      const intro = snap.isCleared
        ? `${snap.hero.name} で全ステージ制覇しました！`
        : `${snap.hero.name} で「${snap.stageName}」まで到達。${snap.opponent.name} に倒された…`;
      const intentUrl =
        `https://twitter.com/intent/tweet` +
        `?text=${encodeURIComponent(intro)}` +
        `&url=${encodeURIComponent(SHARE_URL)}` +
        `&hashtags=${encodeURIComponent(SHARE_TITLE)}`;

      // 旧フォールバック (html2canvas が無い / 失敗時)
      const openIntentOnly = () => window.open(intentUrl, "_blank", "noopener,noreferrer");

      // html2canvas で活動レポートをスクショ → 共有 or ダウンロード
      const targetEl = overlay.querySelector(".report-card");
      if (!targetEl || typeof window.html2canvas !== "function") {
        openIntentOnly();
        return;
      }

      newShare.disabled = true;
      const originalLabel = newShare.textContent;
      newShare.textContent = "画像生成中…";

      try {
        const canvas = await window.html2canvas(targetEl, {
          backgroundColor: "#0f0c18",
          useCORS: true,
          allowTaint: true,
          scale: window.devicePixelRatio > 1 ? 2 : 1.5,
          logging: false,
        });
        const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
        const filename = `mct-report-${Date.now()}.png`;
        const file = blob ? new File([blob], filename, { type: "image/png" }) : null;

        // モバイル等で Web Share API + ファイル共有が使える場合: 画像を直接添付して共有
        if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
          try {
            await navigator.share({
              files: [file],
              text: `${intro} #${SHARE_TITLE}`,
              url: SHARE_URL,
            });
            return; // 完了
          } catch (e) {
            // 共有キャンセルや拒否 → フォールバックへ
            if (e && e.name === "AbortError") return;
          }
        }

        // フォールバック: 画像をダウンロード + Twitter Intent を開く + 案内
        if (blob) {
          const dlUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = dlUrl; a.download = filename;
          document.body.appendChild(a); a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(dlUrl), 4000);
        }
        openIntentOnly();
        // ユーザーへの案内（一度だけ）
        try {
          window.alert("活動レポート画像をダウンロードしました。X 投稿画面で「画像を添付」から手動で添付してください。");
        } catch (_) {}
      } catch (err) {
        // html2canvas が CORS や renderer 制限で失敗した場合 → テキストのみ共有
        openIntentOnly();
      } finally {
        newShare.disabled = false;
        newShare.textContent = originalLabel;
      }
    });
  });
}

// ─── 戦闘敗北 ────────────────────────────────────────────────────
function endCombatLoss() {
  stopBgm();
  postCombatSnapshot = null;
  // 敗北情報をリセット前にスナップショット
  const defeatedBy = combat ? { name: combat.enemyName, imgId: combat.enemyImgId } : null;
  lastReportSnapshot = captureRunSnapshot({ isCleared: false, defeatedBy });

  showCutin("lose").then(async () => {
    if (lastReportSnapshot) {
      await showActivityReport(lastReportSnapshot);
    }
    // 全ランステートをリセットしてタイトル画面へ戻る (#37: タイトル → レギュレーション選択 → ヒーロー)
    combat = null;
    runState = null;
    clearedChapters = new Set();
    gold = 75;
    backToTitle();
  });
}

/** タイトル画面へ戻る（クリア / 敗北 / 「もう一度」共通） (#37) */
function backToTitle() {
  // 各 view を hidden にしてタイトル表示
  ["mapView","combatView","shopView","gameOver","rewardView","nodeSelectView","craftView","heroSelectView","regulationSelectView"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });
  const titleEl = document.getElementById("titleView");
  if (titleEl) {
    titleEl.classList.remove("hidden", "title-out");
  }
  view = "title";
  stopBgm();
}

// ─── ショップ ─────────────────────────────────────────────────────
function openShop() {
  showView("shop");

  // ゴールド表示を更新
  const goldDisp = document.getElementById("shopGoldDisp");
  if (goldDisp) goldDisp.textContent = String(gold);

  const list = document.getElementById("shopList");
  list.innerHTML = "";

  // カードプレビュー用モックステート（現在のランステートを参照）
  ensureRunState();
  const mockS = {
    playerPhy: LEADER.basePhy,
    playerInt: LEADER.baseInt,
    playerAgi: LEADER.baseAgi,
    enemyPhy: 14, enemyInt: 8,
    playerHp: runState.playerHp,
    playerHpMax: runState.playerHpMax,
    playerGuard: 0, playerShield: 0, energyMax: 3, energy: 3,
  };

  // 章の累積カードプールからショップ商品を選ぶ
  const poolKeys = shuffle(getCumulativeCardPool());
  const shopKeys = poolKeys.slice(0, 4);
  // 少なければ既存カードで補完
  const staticOffers = ["ext2001", "ext2004", "ext1022", "ext1002"];
  while (shopKeys.length < 4) shopKeys.push(staticOffers[shopKeys.length]);

  const prices = { 0: 20, 1: 55, 2: 85, 3: 120 };

  shopKeys.forEach((key) => {
    const def = CARD_LIBRARY[key];
    if (!def) return;
    const price = prices[def.cost] ?? 65;

    // カードアイテム全体ラッパー
    const item = document.createElement("div");
    item.className = "shop-card-item";

    // 報酬画面と同じカード表示（クリック不可）
    const cardBtn = buildRewardPickButton(def, mockS);
    cardBtn.style.pointerEvents = "none";
    cardBtn.tabIndex = -1;
    item.appendChild(cardBtn);

    // 価格行
    const priceRow = document.createElement("div");
    priceRow.className = "shop-price-row";
    const gumImg = document.createElement("img");
    gumImg.alt = "G"; gumImg.src = img("Image/Icons/gum.png");
    gumImg.style.cssText = "width:1em;height:1em;vertical-align:middle;margin-right:0.25em";
    priceRow.appendChild(gumImg);
    const priceSpan = document.createElement("span");
    priceSpan.className = "shop-price-val";
    priceSpan.textContent = price + " GUM";
    priceRow.appendChild(priceSpan);
    item.appendChild(priceRow);

    // 購入ボタン
    const buyBtn = document.createElement("button");
    buyBtn.type = "button";
    buyBtn.className = "shop-buy-btn action";
    buyBtn.textContent = "購入する";
    buyBtn.addEventListener("click", () => {
      if (gold < price) { clog("GUM が足りません"); return; }
      gold -= price;
      ensureRunState();
      runState.deck.push(copyCard(key));
      buyBtn.disabled = true;
      buyBtn.textContent = "購入済み";
      if (goldDisp) goldDisp.textContent = String(gold);
      playSeShopBuy();
      syncResources();
      clog(`購入: ${def.extNameJa}`);
      renderNavigator(`「${def.extNameJa}」を購入しました！デッキが強化されましたよ！`);
    });
    item.appendChild(buyBtn);

    list.appendChild(item);
  });

  // ─── カード破棄セクション ──────────────────────────────────────
  // ショップ訪問のたびに 1 回までに制限 (#33) — 入店時にフラグ初期化
  runState.shopRemoveUsed = false;

  const removeSection = document.createElement("div");
  removeSection.className = "shop-remove-section";
  const removeTitle = document.createElement("div");
  removeTitle.className = "shop-remove-title";
  removeTitle.textContent = "カード破棄（50 GUM）";
  removeSection.appendChild(removeTitle);
  const removeDesc = document.createElement("div");
  removeDesc.className = "shop-remove-desc";
  removeDesc.textContent = "デッキ内のカードを1枚選んで除外できます（スターターも含む）。1 ショップ訪問につき 1 枚まで。";
  removeSection.appendChild(removeDesc);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "shop-remove-btn action";
  removeBtn.textContent = "カードを破棄する";
  removeBtn.addEventListener("click", () => openShopRemoveCard(goldDisp, removeBtn));
  removeSection.appendChild(removeBtn);
  list.parentElement.appendChild(removeSection);

  // マイのメッセージ（ショップ入店時）
  renderNavigator("エクステンションを購入してデッキを強化しましょう！GUMに余裕があるなら積極的に買いましょう！");
}

// ─── ショップ カード破棄 ──────────────────────────────────────────
const SHOP_REMOVE_COST = 50;
function setShopRemoveBtnSoldOut(btn) {
  if (!btn) return;
  btn.disabled = true;
  btn.classList.add("sold-out");
  btn.textContent = "売り切れ（このショップでは使用済み）";
}
function openShopRemoveCard(goldDisp, removeBtn) {
  ensureRunState();
  if (runState.shopRemoveUsed) {
    renderNavigator("このショップではすでにカード破棄を 1 回使用しています");
    setShopRemoveBtnSoldOut(removeBtn);
    return;
  }
  if (gold < SHOP_REMOVE_COST) {
    renderNavigator(`GUM が足りません（必要: ${SHOP_REMOVE_COST} GUM）`);
    return;
  }
  // デッキ内の全カードが破棄対象（スターターも含む）
  const removable = runState.deck
    .map((c, idx) => ({ card: c, idx }));

  if (removable.length === 0) {
    renderNavigator("破棄できるカードがありません");
    return;
  }

  // モーダル的に shopView 内にオーバーレイを出す
  const overlay = document.createElement("div");
  overlay.className = "shop-remove-overlay";
  overlay.innerHTML = `<div class="shop-remove-modal">
    <div class="shop-remove-modal-title">破棄するカードを選んでください</div>
    <div class="shop-remove-card-list" id="shopRemoveCardList"></div>
    <button class="shop-remove-cancel" id="shopRemoveCancel">キャンセル</button>
  </div>`;
  document.getElementById("shopView").appendChild(overlay);
  document.getElementById("shopRemoveCancel").addEventListener("click", () => overlay.remove());

  const mockS = {
    playerPhy: LEADER.basePhy, playerInt: LEADER.baseInt, playerAgi: LEADER.baseAgi,
    enemyPhy: 14, enemyInt: 8,
    playerHp: runState.playerHp, playerHpMax: runState.playerHpMax,
    playerGuard: 0, playerShield: 0, energyMax: 3, energy: 3,
  };

  const cardListEl = document.getElementById("shopRemoveCardList");
  const seen = new Set();
  removable.forEach(({ card, idx }) => {
    if (seen.has(card.libraryKey)) return; // 重複は代表1枚のみ
    seen.add(card.libraryKey);

    const wrapper = document.createElement("div");
    wrapper.className = "shop-remove-card-wrapper";
    const cardBtn = buildRewardPickButton(card, mockS);
    cardBtn.style.pointerEvents = "none";
    wrapper.appendChild(cardBtn);

    const delBtn = document.createElement("button");
    delBtn.className = "action shop-remove-confirm-btn";
    delBtn.textContent = `破棄 (-${SHOP_REMOVE_COST} GUM)`;
    delBtn.addEventListener("click", () => {
      gold -= SHOP_REMOVE_COST;
      // 同じキーの最初の1枚を削除
      const removeIdx = runState.deck.findIndex(c => c.libraryKey === card.libraryKey);
      if (removeIdx >= 0) runState.deck.splice(removeIdx, 1);
      if (goldDisp) goldDisp.textContent = String(gold);
      syncResources();
      clog(`破棄: ${card.extNameJa}（-${SHOP_REMOVE_COST} GUM）`);
      renderNavigator(`「${card.extNameJa}」を破棄しました！デッキが軽くなりましたよ！`);
      // 1 ショップ訪問につき 1 回まで (#33)
      runState.shopRemoveUsed = true;
      setShopRemoveBtnSoldOut(removeBtn);
      overlay.remove();
    });
    wrapper.appendChild(delBtn);
    cardListEl.appendChild(wrapper);
  });
}

// ─── ランリセット ─────────────────────────────────────────────────
function resetRun() {
  gold = 75;
  combat = null;
  runState = null;
  // 全クリア後の「もう一度」でも章クリア進捗を確実にリセット (#42)
  clearedChapters = new Set();
  pendingShopNodeId = null;
  pendingCraftNodeId = null;
  postCombatSnapshot = null;
  stopBgm();
  dismissCutin();
  // タイトル → レギュレーション選択 → ヒーロー選択へ (#37)
  backToTitle();
}

// ─── Node 選択画面 ────────────────────────────────────────────────
/**
 * 指定した章インデックスからランを開始する。
 * clearedChapters に前の章が含まれている（またはインデックス 0）場合のみ呼び出し可。
 */
function startRunFromChapter(chapterIdx) {
  gold = 75;
  combat = null;
  pendingShopNodeId = null;
  pendingCraftNodeId = null;
  postCombatSnapshot = null;
  const chapter = CHAPTERS[chapterIdx];
  const { nodes, edges, viewH, startY } = generateChapterMap(chapter, ENEMY_DEFS);
  setActiveMap(nodes, edges, viewH, startY);
  // SPEC-005 Phase 3: party
  const partyIds = pendingPartyConfirmed && pendingPartyConfirmed.length > 0
    ? pendingPartyConfirmed
    : [LEADER.heroId];
  const party = buildPartyLoadout(partyIds);
  runState = {
    chapterIdx,
    deck: makeStarterDeck(),
    party,
    playerHp: party[0].hpCurrent,
    playerHpMax: party[0].hpMax,
    lastMapNodeId: null,
    pathNodeIds: [],
    runComplete: false,
    llExtSlots: [null, null],
  };
  showView("map");
  renderMap();
}

/**
 * node 選択画面を描画する。
 * @param {number|null} justUnlockedIdx  直前に解放された章インデックス（アニメ用、省略可）
 */
function renderNodeSelect(justUnlockedIdx = null) {
  const el = document.getElementById("nodeSelectView");
  if (!el) return;

  // CHAPTERS のみ（トロイ実装済みのため最終目標 TROY エントリは廃止）
  const goals = CHAPTERS.map((ch, idx) => ({ idx, name: ch.name.replace('node : ', ''), chapter: ch }));

  let html = '<div class="ns-header"><h2>node を選択してください</h2><p class="ns-sub">ボスを倒すと次の node が解放されます</p></div>';
  html += '<div class="ns-cards">';

  goals.forEach((goal) => {
    const isUnlocked = goal.idx === 0 || clearedChapters.has(goal.idx - 1);
    const isCleared  = clearedChapters.has(goal.idx);
    const isJustUnlocked = goal.idx === justUnlockedIdx;
    const isFinal    = goal.idx === CHAPTERS.length - 1;

    const ch = goal.chapter;
    const bgId = ch?.bgId ?? '1001';
    const bgUrl = img('Image/Backgrounds/' + bgId + '.png');

    // 状態クラス
    const stateClass = isCleared   ? 'ns-card--cleared' :
                       isUnlocked  ? 'ns-card--unlocked' :
                                     'ns-card--locked';
    const finalClass = isFinal && isUnlocked && !isCleared ? ' ns-card--final' : '';
    const animClass  = isJustUnlocked ? ' ns-card--just-unlocked' : '';

    html += `<div class="ns-card ${stateClass}${finalClass}${animClass}" data-idx="${goal.idx}" role="${isUnlocked ? 'button' : 'presentation'}" tabindex="${isUnlocked ? 0 : -1}" style="--ns-bg: url('${bgUrl}')">`;

    // 背景レイヤー
    html += '<div class="ns-card-bg"></div>';

    // ─── コンテンツ ───
    html += '<div class="ns-card-body">';

    // node 名（最終ステージは ★ マーカー付き）
    html += `<div class="ns-card-title">${isFinal ? '★ ' : ''}${goal.name}${isFinal ? ' ★' : ''}</div>`;

    if (!isUnlocked) {
      // ロック中
      html += '<div class="ns-card-lock-overlay"><span class="ns-lock-icon">🔒</span><span class="ns-lock-label">ロック中</span></div>';
    } else {
      // 出現エネミー（通常 + フラペチーノ）
      const enemyIds = [...(ch.enemyPool || []), ...(ch.elitePool || [])].slice(0, 4);
      if (enemyIds.length > 0) {
        html += '<div class="ns-enemy-row">';
        enemyIds.forEach(id => {
          const def = ENEMY_DEFS[id];
          if (def) {
            html += `<img class="ns-enemy-img" src="${ENEMY_IMG(def.imgId)}" alt="${def.name}" title="${def.name}" />`;
          }
        });
        html += '</div>';
      }

      // ボス
      const bossDef = ch.bossId ? BOSS_DEFS[ch.bossId] : null;
      if (bossDef) {
        html += '<div class="ns-boss-row">';
        html += '<span class="ns-boss-label">boss</span>';
        html += `<img class="ns-boss-img" src="${ENEMY_IMG(bossDef.imgId)}" alt="${bossDef.name}" />`;
        html += `<span class="ns-boss-name">${bossDef.name}</span>`;
        html += '</div>';
      }

      // クリア済みバッジ
      if (isCleared) {
        html += '<div class="ns-cleared-badge">✓ クリア済み</div>';
      }
    }

    html += '</div>'; // .ns-card-body
    html += '</div>'; // .ns-card
  });

  html += '</div>'; // .ns-cards
  el.innerHTML = html;

  // クリックイベント（解放済み章のみ）
  el.querySelectorAll('.ns-card--unlocked, .ns-card--cleared').forEach(cardEl => {
    const idx = parseInt(cardEl.dataset.idx, 10);
    const activate = () => {
      playSeNodeSelect();
      startRunFromChapter(idx);
    };
    cardEl.addEventListener('click', activate);
    cardEl.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') activate();
    });
  });

  // 解放アニメ後にクラスを削除
  if (justUnlockedIdx !== null) {
    setTimeout(() => {
      el.querySelector('.ns-card--just-unlocked')?.classList.remove('ns-card--just-unlocked');
    }, 2000);
  }
}

// ─── パッシブスキルポップアップ ──────────────────────────────────────
function togglePassivePopup() {
  const popup = document.getElementById("passivePopup");
  if (!popup) return;
  if (!popup.classList.contains("hidden")) {
    popup.classList.add("hidden");
    return;
  }
  const heroName   = LEADER.nameJa        || "—";
  const skillName  = LEADER.passiveName   || "—";
  const skillDesc  = LEADER.passiveDesc   || "—";
  popup.innerHTML =
    `<div class="pp-hero-name">${heroName}</div>` +
    `<div class="pp-skill-name">【${skillName}】</div>` +
    `<div class="pp-skill-desc">${skillDesc}</div>`;
  popup.classList.remove("hidden");
}

// ─── レギュレーション選択画面 (#37) ──────────────────────────────────
function renderRegulationSelect() {
  const el = document.getElementById("regulationSelectView");
  if (!el) return;

  const unlocked = new Set(loadUnlockedRegulations());

  let html = '<div class="rs-header"><h2>レギュレーションを選択</h2><p class="rs-sub">難易度を選んでください。クリアすると次の難易度が解放されます。</p></div>';
  html += '<div class="rs-list">';

  REGULATIONS.forEach((r) => {
    const isUnlocked = unlocked.has(r.id);
    const isCurrent = r.id === currentRegulationId;
    const cls = ["rs-card"];
    if (isUnlocked) cls.push("rs-card--unlocked");
    else cls.push("rs-card--locked");
    if (isCurrent && isUnlocked) cls.push("rs-card--current");

    html += `<div class="${cls.join(' ')}" data-reg-id="${r.id}" role="button" tabindex="${isUnlocked ? 0 : -1}" aria-disabled="${!isUnlocked}">`;
    html += `<div class="rs-card-cup">`;
    html += `<img src="${r.iconUrl}" alt="${r.nameJa}" onerror="this.style.opacity='0.2'" />`;
    if (!isUnlocked) html += `<span class="rs-lock">🔒</span>`;
    html += `</div>`;
    html += `<div class="rs-card-body">`;
    html += `<div class="rs-card-name" style="color:${r.color}">${r.nameJa}</div>`;
    html += `<div class="rs-card-desc">${r.descShort}</div>`;
    if (isUnlocked) {
      html += `<button class="rs-select-btn action${isCurrent ? ' rs-select-btn--current' : ''}">${isCurrent ? '選択中' : 'このレギュレーションで始める'}</button>`;
    } else {
      html += `<div class="rs-locked-hint">前の難易度をクリアで解放</div>`;
    }
    html += `</div>`;
    html += `</div>`;
  });

  html += '</div>';
  el.innerHTML = html;

  el.querySelectorAll('.rs-card--unlocked .rs-select-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.rs-card');
      const id = card?.dataset?.regId;
      if (!id) return;
      setCurrentRegulation(id);
      showView("heroSelect");
      renderHeroSelect();
    });
  });
}

/** ヘッダーの右上（map / combat 両方）に現在のレギュレーションアイコンを表示 (#37) */
function updateHeaderRegulationIcons() {
  const r = getCurrentRegulation();
  ["headerRegIconMap", "headerRegIconCombat"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.src = r.iconUrl;
    el.alt = r.nameJa;
    el.title = `レギュレーション: ${r.nameJa}`;
  });
}

// ─── 戦闘中: サブヒーロー（heroes[1]/heroes[2]）を data-pos スロットに表示 ────
// SPEC-005 Phase 3h: 前衛と同じ combatant markup (portrait + HP bar + stats) を流し込む
function renderPartySubHeroes() {
  const playerSide = document.querySelector(".party-side--player");
  if (!playerSide || !combat || !Array.isArray(combat.heroes)) return;
  for (let pos = 1; pos < 3; pos++) {
    const slot = playerSide.querySelector(`.party-slot[data-pos="${pos}"]`);
    if (!slot) continue;
    const hero = combat.heroes[pos];
    if (!hero) { slot.innerHTML = ""; continue; }
    const isDead = hero.alive === false || (hero.hp != null && hero.hp <= 0);
    const portraitImg = hero.imgUrl || "";
    const hpPct = hero.hpMax ? Math.max(0, Math.min(100, Math.round((hero.hp / hero.hpMax) * 100))) : 0;
    slot.innerHTML =
      `<div class="combatant hero-combatant${isDead ? " combatant--dead" : ""}">` +
        `<div class="combatant-portrait-wrap">` +
          `<img class="combatant-portrait" src="${portraitImg}" alt="${escapeHtml(hero.name || "")}" onerror="this.style.opacity='0.2'" />` +
        `</div>` +
        `<div class="combatant-info">` +
          `<div class="combatant-name">${escapeHtml(hero.name || "")}</div>` +
          `<div class="hp-bar-row">` +
            `<div class="hp-bar-track"><div class="hp-bar-fill" style="width:${hpPct}%"></div></div>` +
            `<span class="hp-bar-nums">${hero.hp ?? "?"}/${hero.hpMax ?? "?"}</span>` +
          `</div>` +
          `<div class="stat-row-badges">` +
            `<span class="sbadge sbadge-phy" data-label="PHY">${hero.phy ?? "-"}</span>` +
            `<span class="sbadge sbadge-int" data-label="INT">${hero.int ?? "-"}</span>` +
            `<span class="sbadge sbadge-agi" data-label="AGI">${hero.agi ?? "-"}</span>` +
            `<span class="sbadge sbadge-grd" data-label="GRD">🛡${hero.guard ?? 0}</span>` +
            `<span class="sbadge sbadge-shd" data-label="SHD">✦${hero.shield ?? 0}</span>` +
          `</div>` +
        `</div>` +
      `</div>`;
  }
}

/** SPEC-005 Phase 3d: 個別ユニットの intent からプレイヤー向け表示テキスト */
function intentTextForUnit(unit) {
  if (!unit || !unit.enemyIntent) return "";
  const it = unit.enemyIntent;
  // ダメージ概算は legacy のヘルパが combat.playerXxx を読むため、unit のステを一時参照
  const phy = unit.phy ?? 0;
  const int = unit.int ?? 0;
  const playerPhy = combat?.playerPhy ?? 0;
  const playerInt = combat?.playerInt ?? 0;
  const playerHpMax = combat?.playerHpMax ?? 0;
  const cutPhy = Math.min(40, Math.floor(playerPhy / 2));
  const cutInt = Math.min(40, Math.floor(playerInt / 2));
  const phyDmg = (pct) => Math.max(0, Math.floor(phy * pct / 100 * (100 - cutPhy) / 100));
  const intDmg = (pct) => Math.max(0, Math.floor(int * pct / 100 * (100 - cutInt) / 100));
  switch (it.kind) {
    case "attack":         return `先頭：${phyDmg(it.phyPct)}`;
    case "attackPoison":   return `先頭：${phyDmg(it.phyPct)}＋毒×${it.poisonStacks}`;
    case "attackBleed":    return `先頭：${phyDmg(it.phyPct)}＋出血×${it.bleedStacks}`;
    case "attackDouble":   return `先頭：${phyDmg(it.phyPct)}×2`;
    case "attackInt":      return `先頭：${intDmg(it.intPct)}（INT）`;
    case "attackIntDouble":return `先頭：${intDmg(it.intPct)}（INT）×2`;
    case "healSelf":       return `回復`;
    case "buffSelf":       return `強化`;
    case "guard":          return `防御 +${it.value}`;
    case "special":        return `特殊：${Math.max(1, Math.floor(playerHpMax * it.pct / 100))}`;
    default: return "";
  }
}

// ─── 戦闘中: サブエネミー（enemies[1]/enemies[2]）を data-pos スロットに表示 ────
// SPEC-005 Phase 3h: 前衛と同じ combatant markup + intent-bubble
function renderEnemySubUnits() {
  const enemySide = document.querySelector(".party-side--enemy");
  if (!enemySide || !combat || !Array.isArray(combat.enemies)) return;
  for (let pos = 1; pos < 3; pos++) {
    const slot = enemySide.querySelector(`.party-slot[data-pos="${pos}"]`);
    if (!slot) continue;
    const en = combat.enemies[pos];
    if (!en) { slot.innerHTML = ""; continue; }
    const isDead = en.alive === false || (en.hp != null && en.hp <= 0);
    const portraitImg = en.imgId ? ENEMY_IMG(en.imgId) : "";
    const intentTxt = isDead ? "" : intentTextForUnit(en);
    const hpPct = en.hpMax ? Math.max(0, Math.min(100, Math.round((en.hp / en.hpMax) * 100))) : 0;
    slot.innerHTML =
      `<div class="combatant enemy-combatant${isDead ? " combatant--dead" : ""}">` +
        (intentTxt ? `<div class="intent-bubble"><span class="intent-label">NEXT ACTION</span><span>${escapeHtml(intentTxt)}</span></div>` : "") +
        `<div class="combatant-portrait-wrap">` +
          `<img class="combatant-portrait combatant-portrait--enemy" src="${portraitImg}" alt="${escapeHtml(en.name || "")}" onerror="this.style.opacity='0.2'" />` +
        `</div>` +
        `<div class="combatant-info">` +
          `<div class="combatant-name">${escapeHtml(en.name || "")}</div>` +
          `<div class="hp-bar-row">` +
            `<div class="hp-bar-track"><div class="hp-bar-fill hp-bar-fill--enemy" style="width:${hpPct}%"></div></div>` +
            `<span class="hp-bar-nums">${en.hp ?? "?"}/${en.hpMax ?? "?"}</span>` +
          `</div>` +
          `<div class="stat-row-badges">` +
            `<span class="sbadge sbadge-phy" data-label="PHY">${en.phy ?? "-"}</span>` +
            `<span class="sbadge sbadge-int" data-label="INT">${en.int ?? "-"}</span>` +
            `<span class="sbadge sbadge-agi" data-label="AGI">${en.agi ?? "-"}</span>` +
            `<span class="sbadge sbadge-grd" data-label="GRD">🛡${en.guard ?? 0}</span>` +
            `<span class="sbadge sbadge-shd" data-label="SHD">✦${en.shield ?? 0}</span>` +
          `</div>` +
        `</div>` +
      `</div>`;
  }
}

// ─── パーティ編成画面（旧ヒーロー選択を拡張） SPEC-005 Phase 3 ──────
let pendingPartyHeroIds = []; // ユーザーが選択中のヒーロー id 配列（最大 3）
const PARTY_MAX = 3;

function renderHeroSelect() {
  // SPEC-005 Phase 3: ヒーロー選択 → パーティ選択 (1〜3 体)
  // 関数名は既存呼び出しとの互換のため維持。中身はパーティ編成。
  const el = document.getElementById("heroSelectView");
  if (!el) return;

  // 初期化: 前回の選択を保持しつつ、空なら先頭ヒーロー 1 体を入れておく
  if (pendingPartyHeroIds.length === 0) {
    pendingPartyHeroIds = [HERO_ROSTER[0].heroId];
  }

  const renderInner = () => {
    let html = '<div class="hs-header">';
    html += '<h2>パーティを編成</h2>';
    html += '<p class="hs-sub">最大 3 体まで選べます。先に選んだヒーローほど前衛 (画面中央寄り) に配置されます</p>';
    html += '</div>';

    // 現在のパーティ表示 (3 スロット)
    html += '<div class="ps-current">';
    for (let pos = 0; pos < PARTY_MAX; pos++) {
      const hid = pendingPartyHeroIds[pos];
      const h = hid ? HERO_ROSTER.find(x => x.heroId === hid) : null;
      const posLabel = ["前衛", "中衛", "後衛"][pos];
      html += `<div class="ps-slot ps-slot--${pos}" data-pos="${pos}">`;
      html += `<div class="ps-slot-pos">${posLabel}</div>`;
      if (h) {
        html += `<img class="ps-slot-img" src="${h.img()}" alt="${h.nameJa}" />`;
        html += `<div class="ps-slot-name">${h.nameJa}</div>`;
        html += `<button class="ps-slot-remove" data-remove-pos="${pos}" type="button" aria-label="外す">✕</button>`;
      } else {
        html += '<div class="ps-slot-empty">（空き）</div>';
      }
      html += '</div>';
    }
    html += '</div>';

    // 選択可能なヒーロー一覧
    html += '<div class="hs-header" style="margin-top:1.2rem;"><h3 style="font-size:1rem;color:var(--accent);margin:0;">編成可能なヒーロー</h3></div>';
    html += '<div class="hs-roster">';
    HERO_ROSTER.forEach((hero) => {
      const inParty = pendingPartyHeroIds.includes(hero.heroId);
      const partyFull = pendingPartyHeroIds.length >= PARTY_MAX;
      const cls = ['hs-card'];
      if (inParty) cls.push('hs-card--in-party');
      html += `<div class="${cls.join(' ')}" data-hid="${hero.heroId}" role="button" tabindex="0">`;
      html += `<img class="hs-hero-img" src="${hero.img()}" alt="${hero.nameJa}" />`;
      html += `<div class="hs-hero-body">`;
      html += `<div class="hs-hero-name">${hero.nameJa}${inParty ? ' <span class="hs-in-party-mark">(編成中)</span>' : ''}</div>`;
      html += `<div class="hs-hero-stats">`;
      html += `<span>HP ${hero.hpMax}</span>`;
      html += `<span>PHY ${hero.basePhy}</span>`;
      html += `<span>INT ${hero.baseInt}</span>`;
      html += `<span>AGI ${hero.baseAgi}</span>`;
      html += `</div>`;
      html += `<div class="hs-passive"><span class="hs-passive-name">【${hero.passiveName || '—'}】</span>${hero.passiveDesc}</div>`;
      if (inParty) {
        html += `<button class="hs-select-btn action" data-action="remove" data-hid="${hero.heroId}">パーティから外す</button>`;
      } else if (partyFull) {
        html += `<button class="hs-select-btn action" disabled>パーティ満員</button>`;
      } else {
        html += `<button class="hs-select-btn action" data-action="add" data-hid="${hero.heroId}">パーティに加える</button>`;
      }
      html += `</div></div>`;
    });
    html += '</div>';

    // 確定ボタン
    html += '<div class="ps-confirm-row">';
    const partyCount = pendingPartyHeroIds.length;
    const canStart = partyCount >= 1;
    html += `<button class="action primary ps-confirm-btn" ${canStart ? '' : 'disabled'}>`;
    html += `編成を確定（${partyCount}/${PARTY_MAX} 体）→ 出撃</button>`;
    html += '</div>';

    el.innerHTML = html;

    // イベント
    el.querySelectorAll('[data-action="add"]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const hid = parseInt(btn.dataset.hid, 10);
        if (pendingPartyHeroIds.length < PARTY_MAX && !pendingPartyHeroIds.includes(hid)) {
          pendingPartyHeroIds.push(hid);
          renderInner();
        }
      });
    });
    el.querySelectorAll('[data-action="remove"]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const hid = parseInt(btn.dataset.hid, 10);
        pendingPartyHeroIds = pendingPartyHeroIds.filter(id => id !== hid);
        renderInner();
      });
    });
    el.querySelectorAll('[data-remove-pos]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const pos = parseInt(btn.dataset.removePos, 10);
        pendingPartyHeroIds.splice(pos, 1);
        renderInner();
      });
    });
    el.querySelector('.ps-confirm-btn')?.addEventListener('click', () => {
      if (pendingPartyHeroIds.length < 1) return;
      // パーティ確定 → setLeader は前衛 (party[0]) を従来通り反映
      const leader = HERO_ROSTER.find(h => h.heroId === pendingPartyHeroIds[0]);
      if (leader) setLeader(leader);
      pendingPartyConfirmed = pendingPartyHeroIds.slice(); // 後で startRunFromChapter / ensureRunState で読む
      showView("nodeSelect");
      renderNodeSelect();
    });
  };

  renderInner();
}

// 確定したパーティ (HeroLoadout 構築用の id 配列)
let pendingPartyConfirmed = null;

/** ヒーロー id 配列から HeroLoadout 配列を作る */
function buildPartyLoadout(heroIds) {
  const ids = (heroIds && heroIds.length > 0) ? heroIds : [HERO_ROSTER[0].heroId];
  return ids.map((hid) => {
    const h = HERO_ROSTER.find(x => x.heroId === hid) || HERO_ROSTER[0];
    return {
      heroId: h.heroId,
      hpCurrent: h.hpMax,
      hpMax: h.hpMax,
    };
  });
}

// ─── クラフト画面 ────────────────────────────────────────────────────
function openCraftScreen() {
  showView("craft");
  const el = document.getElementById("craftView");
  if (!el) return;

  el.innerHTML = `
    <div class="craft-header">
      <h2>クラフト</h2>
      <p class="craft-sub">エクステンションを獲得するか、デッキを強化しましょう</p>
    </div>
    <div class="craft-choices">
      <div class="craft-option" id="craftOptGet">
        <div class="craft-opt-title">エクステ獲得</div>
        <div class="craft-opt-desc">累積カードプールからカードを3枚提示します。1枚をデッキに追加できます。</div>
        <button class="action craft-opt-btn" id="btnCraftGet">獲得する</button>
      </div>
      <div class="craft-option" id="craftOptUpgrade">
        <div class="craft-opt-title">打ち直し</div>
        <div class="craft-opt-desc">デッキ内のノービスカードを1枚選んでエリートにランクアップします。</div>
        <button class="action craft-opt-btn" id="btnCraftUpgrade">打ち直す</button>
      </div>
    </div>
    <button class="craft-leave-btn" id="btnLeaveCraft">← マップに戻る</button>
  `;

  document.getElementById("btnCraftGet").addEventListener("click", () => {
    openCraftGetCard();
  });
  document.getElementById("btnCraftUpgrade").addEventListener("click", () => {
    openCraftUpgrade();
  });
  document.getElementById("btnLeaveCraft").addEventListener("click", () => {
    leaveCraft();
  });
}

function leaveCraft() {
  ensureRunState();
  if (pendingCraftNodeId) {
    runState.pathNodeIds.push(pendingCraftNodeId);
    runState.lastMapNodeId = pendingCraftNodeId;
    pendingCraftNodeId = null;
  }
  showView("map");
  renderMap();
}

function openCraftGetCard() {
  const el = document.getElementById("craftView");
  if (!el) return;
  ensureRunState();

  const poolKeys = shuffle(getCumulativeCardPool());
  const offerKeys = poolKeys.slice(0, 3);
  const mockS = {
    playerPhy: LEADER.basePhy, playerInt: LEADER.baseInt, playerAgi: LEADER.baseAgi,
    enemyPhy: 14, enemyInt: 8,
    playerHp: runState.playerHp, playerHpMax: runState.playerHpMax,
    playerGuard: 0, playerShield: 0, energyMax: 3, energy: 3,
  };

  el.innerHTML = `<div class="craft-header"><h2>エクステ獲得</h2><p class="craft-sub">1枚を選んでデッキに追加します</p></div>`;
  const list = document.createElement("div");
  list.className = "craft-reward-list";
  offerKeys.forEach(key => {
    const def = CARD_LIBRARY[key];
    if (!def) return;
    const btn = buildRewardPickButton(def, mockS);
    btn.addEventListener("click", () => {
      runState.deck.push(copyCard(key));
      clog(`クラフト獲得: ${def.extNameJa}`);
      leaveCraft();
    });
    list.appendChild(btn);
  });
  el.appendChild(list);

  const skipBtn = document.createElement("button");
  skipBtn.className = "craft-leave-btn";
  skipBtn.textContent = "スキップ";
  skipBtn.addEventListener("click", leaveCraft);
  el.appendChild(skipBtn);
}

function openCraftUpgrade() {
  const el = document.getElementById("craftView");
  if (!el) return;
  ensureRunState();

  // アップグレード可能なカードを探す
  const upgradeable = runState.deck
    .map((c, idx) => ({ card: c, idx }))
    .filter(({ card }) => CARD_UPGRADE_SERIES[card.libraryKey]);

  if (upgradeable.length === 0) {
    el.innerHTML = `
      <div class="craft-header"><h2>打ち直し</h2></div>
      <p style="text-align:center;color:var(--muted);margin:2rem 0;">アップグレード可能なノービスカードがありません</p>
      <button class="craft-leave-btn" id="btnLeaveCraft2">← 戻る</button>
    `;
    document.getElementById("btnLeaveCraft2").addEventListener("click", () => openCraftScreen());
    return;
  }

  el.innerHTML = `<div class="craft-header"><h2>打ち直し</h2><p class="craft-sub">ランクアップするカードを選んでください（ノービス → エリート）</p></div>`;
  const list = document.createElement("div");
  list.className = "craft-upgrade-list";

  const mockS = {
    playerPhy: LEADER.basePhy, playerInt: LEADER.baseInt, playerAgi: LEADER.baseAgi,
    enemyPhy: 14, enemyInt: 8,
    playerHp: runState.playerHp, playerHpMax: runState.playerHpMax,
    playerGuard: 0, playerShield: 0, energyMax: 3, energy: 3,
  };

  upgradeable.forEach(({ card, idx }) => {
    const upgradeKey = CARD_UPGRADE_SERIES[card.libraryKey];
    const upgradeDef = CARD_LIBRARY[upgradeKey];
    if (!upgradeDef) return;

    const row = document.createElement("div");
    row.className = "craft-upgrade-row";

    const before = buildRewardPickButton(card, mockS);
    before.style.pointerEvents = "none";
    const arrow = document.createElement("span");
    arrow.className = "craft-arrow";
    arrow.textContent = "→";
    const after = buildRewardPickButton(upgradeDef, mockS);
    after.style.pointerEvents = "none";

    const selBtn = document.createElement("button");
    selBtn.className = "action craft-opt-btn";
    selBtn.textContent = "このカードを強化";
    selBtn.addEventListener("click", () => {
      runState.deck[idx] = copyCard(upgradeKey);
      clog(`打ち直し: ${card.extNameJa} → ${upgradeDef.extNameJa}`);
      leaveCraft();
    });

    row.appendChild(before);
    row.appendChild(arrow);
    row.appendChild(after);
    row.appendChild(selBtn);
    list.appendChild(row);
  });

  el.appendChild(list);

  const backBtn = document.createElement("button");
  backBtn.className = "craft-leave-btn";
  backBtn.textContent = "← 戻る";
  backBtn.addEventListener("click", () => openCraftScreen());
  el.appendChild(backBtn);
}

// ─── アセット配線 ─────────────────────────────────────────────────
function wireAssets() {
  document.querySelectorAll("[data-icon]").forEach((el) => {
    const key = el.getAttribute("data-icon");
    const paths = { gum: "Image/Icons/gum.png", cp: "Image/Icons/cp.png", ce: "Image/Icons/ce.png", deck: "Image/Icons/ce.png" };
    el.src = img(paths[key]);
  });
  document.querySelectorAll("[data-stat]").forEach((el) => {
    el.src = img("Image/BattleIcons/Parameters/" + el.getAttribute("data-stat") + ".png");
  });
}

// ─── デッキモーダル ───────────────────────────────────────────────
function openDeckModal() {
  if (!combat) return;
  const modal = document.getElementById("deckModal");
  const list = document.getElementById("deckModalList");
  const count = document.getElementById("deckModalCount");
  const cards = combat.drawPile.slice().sort((a, b) => a.extNameJa.localeCompare(b.extNameJa, "ja"));
  count.textContent = "残り " + cards.length + " 枚（引く順序は非表示）";
  list.innerHTML = "";
  const tally = new Map();
  for (const c of cards) {
    const k = c.extNameJa + "|" + c.cost;
    tally.set(k, (tally.get(k) || 0) + 1);
  }
  for (const [k, num] of tally) {
    const name = k.split("|")[0]; const cost = k.split("|")[1];
    const row = document.createElement("div");
    row.className = "deck-modal-row";
    row.textContent = "×" + num + "  " + name + "（⚡" + cost + "）";
    list.appendChild(row);
  }
  modal.classList.remove("hidden"); modal.setAttribute("aria-hidden", "false");
}

function closeDeckModal() {
  const modal = document.getElementById("deckModal");
  modal.classList.add("hidden"); modal.setAttribute("aria-hidden", "true");
}

// ─── 初期化 ───────────────────────────────────────────────────────
function init() {
  document.getElementById("btnEndTurn").addEventListener("click", async () => {
    if (!combat || view !== "combat" || combatInputLocked) return;
    combat.hand.forEach((c) => combat.discardPile.push(c));
    combat.hand = [];
    renderCombat();
    await enemyTurn();
  });
  // SPEC-005 Phase 3j: 味方 portrait をクリックでアクティブキャスター切替
  const playerSide = document.querySelector(".party-side--player");
  if (playerSide) {
    playerSide.addEventListener("click", (ev) => {
      if (!combat || view !== "combat" || combatInputLocked) return;
      const slot = ev.target.closest('.party-slot[data-side="player"]');
      if (!slot) return;
      const pos = parseInt(slot.dataset.pos, 10);
      if (Number.isFinite(pos)) setActiveHero(pos);
    });
  }
  document.getElementById("btnDeckOpen").addEventListener("click", openDeckModal);
  document.getElementById("deckModalClose").addEventListener("click", closeDeckModal);
  document.getElementById("deckModal").addEventListener("click", (ev) => {
    if (ev.target.id === "deckModal") closeDeckModal();
  });
  document.getElementById("cutinOverlay").addEventListener("click", dismissCutin);
  document.getElementById("btnSkipReward").addEventListener("click", () => advanceAfterRewardPick(null));
  document.getElementById("btnLeaveShop").addEventListener("click", () => {
    ensureRunState();
    if (pendingShopNodeId) {
      runState.pathNodeIds.push(pendingShopNodeId);
      runState.lastMapNodeId = pendingShopNodeId;
      pendingShopNodeId = null;
    }
    showView("map");
    renderMap();
  });
  document.getElementById("btnRestart").addEventListener("click", resetRun);
  // 保有デッキ表示（#30）
  document.getElementById("btnDeckViewMap")?.addEventListener("click", openOwnedDeckOverlay);
  document.getElementById("btnDeckViewCombat")?.addEventListener("click", openOwnedDeckOverlay);
  document.getElementById("ownedDeckCloseBtn")?.addEventListener("click", closeOwnedDeckOverlay);
  document.getElementById("ownedDeckOverlay")?.addEventListener("click", (e) => {
    if (e.target.id === "ownedDeckOverlay") closeOwnedDeckOverlay();
  });
  // 活動レポート（クリア時）
  document.getElementById("btnViewReportClear")?.addEventListener("click", () => {
    if (!lastReportSnapshot && runState && runState.runComplete) {
      lastReportSnapshot = captureRunSnapshot({ isCleared: true, defeatedBy: null });
    }
    if (lastReportSnapshot) showActivityReport(lastReportSnapshot);
  });
  wireAssets();
  initHelp();
  bindHandTouchDelegation();

  // Combat header buttons
  document.getElementById("btnHelpOpenCombat")?.addEventListener("click", () => {
    document.getElementById("btnHelpOpen")?.click();
  });
  document.getElementById("btnSettingsOpen")?.addEventListener("click", () => {
    // future: open settings panel
  });

  // ── タイトル画面 ──────────────────────────────────────────────────
  const titleEl = document.getElementById("titleView");
  if (titleEl) {
    // クリック / タップで遷移
    titleEl.addEventListener("click", dismissTitle);
    titleEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") dismissTitle();
    });
  }
  // ヘッダーアイコン (#37) を初期化
  updateHeaderRegulationIcons();
  // 事前に各画面をレンダリング（タイトルが覆うので見えない）
  renderRegulationSelect();
  renderHeroSelect();
  // 初期 view は regulationSelect: タイトル消失時に一瞬 heroSelect が見える問題を回避
  showView("regulationSelect");
  // BGM はタイトルクリック時に開始（ブラウザのオートプレイ制限のため init では呼ばない）

  // ── ヒーローポートレートタップ → パッシブスキル表示 ──────────────
  document.getElementById("playerPortraitWrap")?.addEventListener("click", () => {
    togglePassivePopup();
  });
  // パッシブポップアップ外クリックで閉じる
  document.getElementById("combatView")?.addEventListener("click", (ev) => {
    const popup = document.getElementById("passivePopup");
    if (!popup || popup.classList.contains("hidden")) return;
    if (!popup.contains(ev.target) && !document.getElementById("playerPortraitWrap")?.contains(ev.target)) {
      popup.classList.add("hidden");
    }
  });

  // ── LLエクステ 使用ボタン ─────────────────────────────────────
  document.getElementById("btnUseLlExt0")?.addEventListener("click", () => useLlExt(0));
  document.getElementById("btnUseLlExt1")?.addEventListener("click", () => useLlExt(1));
}

init();
