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

function setActiveMap(nodes, edges) {
  activeMapNodes = nodes;
  activeMapEdges = edges;
  activeEdgeFrom = new Map();
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
const MAP_START = { id: "START", layer: -1, x: 50, y: 92 };

// ─── 状態変数 ────────────────────────────────────────────────────
let gold = 75;
let view = "map";
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
    showView("heroSelect");
    renderHeroSelect();
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

// ─── ログ / エフェクト ────────────────────────────────────────────
function clog(msg) {
  const el = document.getElementById("clog");
  const p = document.createElement("p");
  p.textContent = msg;
  el.insertBefore(p, el.firstChild);
}

/** @param {'player'|'enemy'} who @param {'hit'|'heal'|'buff'|'debuff'|'area'} kind */
function playPortraitEffect(who, kind) {
  const wrapId = who === "enemy" ? "enemyPortraitWrap" : "playerPortraitWrap";
  const wrap = document.getElementById(wrapId);
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

function flashPortrait(which) {
  const id = which === "enemy" ? "enemyPortraitWrap" : "playerPortraitWrap";
  const wrap = document.getElementById(id);
  if (!wrap) return;
  wrap.classList.add("portrait-hit");
  setTimeout(() => wrap.classList.remove("portrait-hit"), 380);
}

/** 攻撃側のポートレートを突進アニメで動かす（player = 右へ, enemy = 左へ） */
function lungePortrait(who) {
  const id = who === "enemy" ? "enemyPortraitWrap" : "playerPortraitWrap";
  const wrap = document.getElementById(id);
  if (!wrap) return;
  const cls = who === "player" ? "portrait-lunge--player" : "portrait-lunge--enemy";
  wrap.classList.remove(cls);   // reset if still running
  void wrap.offsetWidth;        // reflow to restart animation
  wrap.classList.add(cls);
  setTimeout(() => wrap.classList.remove(cls), 350);
}

// ─── ダメージ計算補助 ─────────────────────────────────────────────
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
function dealPhySkillToEnemy(s, skillPct) {
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
  total = applyGuardToDamage("enemy", total);
  s.enemyHp = Math.max(0, s.enemyHp - total);
  lungePortrait("player");
  flashPortrait("enemy");
  playPortraitEffect("enemy", "hit");
  if (total > 0) playBattleSe("hit");
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
  const skillPct = randomSkillRatePct(minPct, maxPct);
  const cut = cutRateFromInt(s.enemyInt);
  let base = phyIntDamageAfterCut(s.playerInt, skillPct, cut);
  let critBonus = 0;
  if (forceCrit || rollCrit(critRateFromAgi(s.playerAgi))) {
    critBonus = criticalBonusDamage(s.playerIntBase, skillPct, s.enemyIntBase, "int");
    clog("クリティカル（INT）");
  }
  let total = base + critBonus;
  total = applyGuardToDamage("enemy", total);
  s.enemyHp = Math.max(0, s.enemyHp - total);
  lungePortrait("player");
  flashPortrait("enemy");
  playPortraitEffect("enemy", "hit");
  if (total > 0) playBattleSe("hit");
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
  if (s.playerHp > before) { playBattleSe("heal"); playPortraitEffect("player", "heal"); }
  clog(`リカバリー: 係数${coef.toFixed(1)}×${pct}% → HP+${s.playerHp - before}`);
}

// ─── 敵攻撃 ───────────────────────────────────────────────────────
function dealPhySkillFromEnemyToPlayer(s, skillPct) {
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
  total = applyGuardToDamage("player", total);
  s.playerHp = Math.max(0, s.playerHp - total);
  lungePortrait("enemy");
  flashPortrait("player");
  playPortraitEffect("player", "hit");
  if (total > 0) playBattleSe("hit");
  clog(
    `敵 PHY ${skillPct}% → 被ダメージ ${total}` +
    (critBonus ? "（CRIT+" + critBonus + "）" : "")
  );
  // 張遼「遼来遼来」: 被ダメージ後に50%の確率で反撃
  if (LEADER.passiveKey === 'zhang' && s.playerHp > 0 && s.enemyHp > 0 && Math.random() < 0.5) {
    const counterDmg = Math.max(1, Math.floor(s.playerPhy * 0.2));
    s.enemyHp = Math.max(0, s.enemyHp - counterDmg);
    playPortraitEffect("enemy", "hit");
    playBattleSe("hit");
    clog(`【遼来遼来】発動！ 反撃 ${counterDmg} ダメージ`);
  }
}

function dealIntSkillFromEnemyToPlayer(s, skillPct) {
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
  total = applyGuardToDamage("player", total);
  s.playerHp = Math.max(0, s.playerHp - total);
  lungePortrait("enemy");
  flashPortrait("player");
  playPortraitEffect("player", "hit");
  if (total > 0) playBattleSe("hit");
  clog(
    `敵 INT ${skillPct}% → 被ダメージ ${total}` +
    (critBonus ? "（CRIT+" + critBonus + "）" : "")
  );
  // 張遼「遼来遼来」: 被ダメージ後に50%の確率で反撃
  if (LEADER.passiveKey === 'zhang' && s.playerHp > 0 && s.enemyHp > 0 && Math.random() < 0.5) {
    const counterDmg = Math.max(1, Math.floor(s.playerPhy * 0.2));
    s.enemyHp = Math.max(0, s.enemyHp - counterDmg);
    playPortraitEffect("enemy", "hit");
    playBattleSe("hit");
    clog(`【遼来遼来】発動！ 反撃 ${counterDmg} ダメージ`);
  }
}

/** 最大 HP 割合の特殊ダメージ（シールドのみ有効） */
function dealSpecialMaxHpPercentToPlayer(s, pct) {
  let raw = Math.max(0, Math.floor((s.playerHpMax * pct) / 100));
  if (s.damageReducedThisTurn) raw = Math.ceil(raw / 2);
  raw = applyDamageThroughShield(s, "player", raw);
  s.playerHp = Math.max(0, s.playerHp - raw);
  lungePortrait("enemy");
  flashPortrait("player");
  playPortraitEffect("player", "area");
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
    playBattleSe("debuff"); playPortraitEffect("enemy", "debuff");
    clog(`毒 ×${stacks} 付与（敵）`);
    renderStatusBadges();
  },
  addBleedToEnemy(s, stacks) {
    s.enemyBleed = (s.enemyBleed || 0) + stacks;
    playBattleSe("debuff"); playPortraitEffect("enemy", "debuff");
    clog(`出血 ×${stacks} 付与（敵）`);
    renderStatusBadges();
  },
  clearPlayerDebuffs(s) {
    const had = (s.playerPoison || 0) + (s.playerBleed || 0);
    s.playerPoison = 0; s.playerBleed = 0;
    if (had > 0) {
      playBattleSe("heal"); playPortraitEffect("player", "heal");
      clog("状態異常解除（自分）");
    }
    renderStatusBadges();
  },
  addPlayerShield(s, amount) {
    s.playerShield = (s.playerShield || 0) + amount;
    playBattleSe("buff"); playPortraitEffect("player", "buff");
    clog(`シールド +${amount}`);
  },
  addGold(amount) {
    gold += amount;
    clog(`GUM +${amount}`);
    syncResources();
  },
  setDamageReducedThisTurn(s) {
    s.damageReducedThisTurn = true;
    playBattleSe("buff"); playPortraitEffect("player", "buff");
    clog("不屈：このターン被ダメ半減");
  },
};

const { CARD_LIBRARY, copyCard, makeStarterDeck } = createCardRuntime(clog, battleApi);

// ─── ランステート管理 ─────────────────────────────────────────────
function ensureRunState() {
  if (!runState) {
    const chapter = CHAPTERS[0];
    const { nodes, edges } = generateChapterMap(chapter, ENEMY_DEFS);
    setActiveMap(nodes, edges);
    runState = {
      chapterIdx: 0,
      deck: makeStarterDeck(),
      playerHp: LEADER.hpMax,
      playerHpMax: LEADER.hpMax,
      lastMapNodeId: null,
      pathNodeIds: [],
      runComplete: false,
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
    return;
  }
  runState.chapterIdx = nextIdx;
  runState.lastMapNodeId = null;
  runState.pathNodeIds = [];
  const chapter = CHAPTERS[nextIdx];
  const { nodes, edges } = generateChapterMap(chapter, ENEMY_DEFS);
  setActiveMap(nodes, edges);
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
  if (id === "START") return { x: MAP_START.x, y: MAP_START.y };
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
      ? "全ランクリア！（3 章突破）"
      : `章 ${chapter.id}「${chapter.name}」（下から上へ進む）`;
  }

  if (runState.runComplete) {
    host.innerHTML =
      "<p style='color:var(--accent);margin:0 0 0.75rem'>3 章すべてをクリアしました！おめでとうございます。</p>" +
      "<button type='button' class='action primary' id='btnRestartClear'>もう一度</button>";
    document.getElementById("btnRestartClear").addEventListener("click", resetRun);
    syncResources();
    return;
  }

  const MAP_NODES = activeMapNodes;
  const MAP_EDGES = activeMapEdges;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
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
  for (const [a, b] of MAP_EDGES) {
    const pa = nodeXY(a); const pb = nodeXY(b);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(pa.x)); line.setAttribute("y1", String(pa.y));
    line.setAttribute("x2", String(pb.x)); line.setAttribute("y2", String(pb.y));
    line.setAttribute("marker-end", "url(#arrowHead)");
    const allowed = new Set(reachableNextNodeIds(runState.lastMapNodeId));
    const onPath =
      runState.pathNodeIds.includes(a) &&
      (runState.pathNodeIds.includes(b) || allowed.has(b));
    line.setAttribute("class",
      onPath || (a === "START" && allowed.has(b)) ? "map-edge map-edge--active" : "map-edge"
    );
    edgeG.appendChild(line);
  }
  svg.appendChild(edgeG);

  const startG = document.createElementNS("http://www.w3.org/2000/svg", "g");
  startG.setAttribute("class", "map-start");
  const sc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  sc.setAttribute("cx", String(MAP_START.x)); sc.setAttribute("cy", String(MAP_START.y));
  sc.setAttribute("r", "3.2"); sc.setAttribute("class", "map-start-dot");
  startG.appendChild(sc);
  const st = document.createElementNS("http://www.w3.org/2000/svg", "text");
  st.setAttribute("x", String(MAP_START.x)); st.setAttribute("y", String(MAP_START.y + 7.5));
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

  const scrollMapToCurrentNode = () => {
    const wrap = host;
    if (!wrap || !svg.isConnected) return;
    const curId = runState.lastMapNodeId || "START";
    const pt = nodeXY(curId);
    const vb = svg.viewBox.baseVal;
    const vbW = vb.width || 100; const vbH = vb.height || 100;
    const wrapRect = wrap.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const nx = svgRect.left + (pt.x / vbW) * svgRect.width;
    const ny = svgRect.top + (pt.y / vbH) * svgRect.height;
    const contentY = wrap.scrollTop + (ny - wrapRect.top);
    const contentX = wrap.scrollLeft + (nx - wrapRect.left);
    wrap.scrollTop = Math.max(0, Math.min(contentY - wrap.clientHeight / 2, Math.max(0, wrap.scrollHeight - wrap.clientHeight)));
    wrap.scrollLeft = Math.max(0, Math.min(contentX - wrap.clientWidth / 2, Math.max(0, wrap.scrollWidth - wrap.clientWidth)));
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollMapToCurrentNode();
      setTimeout(scrollMapToCurrentNode, 60);
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
  // Show/hide map resources bar（ヒーロー選択・戦闘中は非表示）
  const mapRes = document.getElementById("mapResources");
  if (mapRes) mapRes.classList.toggle("hidden", name === "combat" || name === "heroSelect");
  // Mai navigator: マップビュー内にあるので mapView の hidden に連動
  const nav = document.getElementById("maiNavigator");
  if (nav) nav.classList.toggle("hidden", name !== "map");
  // マップ BGM: マップ・ショップ・報酬・node選択・ヒーロー選択ではBGMを再生
  if (name === "map" || name === "nodeSelect" || name === "heroSelect") startBgmMap();
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
    enemyHp: enemyDef.hp,
    enemyHpMax: enemyDef.hp,
    enemyPhy: enemyDef.phy, enemyInt: enemyDef.int, enemyAgi: enemyDef.agi,
    enemyPhyBase: enemyDef.phy, enemyIntBase: enemyDef.int, enemyAgiBase: enemyDef.agi,
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
    _lastUi: null,
  };

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
}

// ─── プレイヤーターン開始 ─────────────────────────────────────────
function startPlayerTurn() {
  combat.playerGuard = 0;
  combat.damageReducedThisTurn = false;

  // 毒ティック（ターン開始時に自分に毒ダメージ）
  if ((combat.playerPoison || 0) > 0) {
    const dmg = combat.playerPoison;
    combat.playerHp = Math.max(0, combat.playerHp - dmg);
    flashPortrait("player"); playPortraitEffect("player", "debuff");
    clog(`毒ダメージ（自分）${dmg}`);
    if (combat.playerHp <= 0) { endCombatLoss(); return; }
  }
  // 毒ティック（敵）
  if ((combat.enemyPoison || 0) > 0) {
    const dmg = combat.enemyPoison;
    combat.enemyHp = Math.max(0, combat.enemyHp - dmg);
    flashPortrait("enemy"); playPortraitEffect("enemy", "debuff");
    clog(`毒ダメージ（敵）${dmg}`);
    if (combat.enemyHp <= 0) { endCombatWin(); return; }
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
      playPortraitEffect("player", "buff");
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
  if (!combat || view !== "combat") return;
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
      '<div class="card-name-hd">' + escapeHtml(card.extNameJa) + (card.exhaust ? '<span class="exhaust-badge" title="消耗：使い切り">🔥</span>' : '') + '</div>' +
      '<div class="card-icon-area">' +
      '<img class="card-ext-img-full" src="' + EXT_IMG(card.extId) + '" alt="" onerror="this.style.opacity=\'0\'" />' +
      '<img class="card-skill-icon-tl" src="' + battleIconUrl(card.skillIcon) + '" alt="" />' +
      '<span class="card-user-br">先頭</span>' +
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

// ─── カードプレイ ─────────────────────────────────────────────────
function playCard(idx) {
  const card = combat.hand[idx];
  if (!card || card.cost > combat.energy) return;
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
  // 甲斐姫「浪切」: スキルカード使用後に50%の確率で追加ダメージ
  if (LEADER.passiveKey === 'kaihime' && combat.enemyHp > 0 && Math.random() < 0.5) {
    const bonusDmg = Math.max(1, Math.floor(combat.playerPhy * 0.5));
    combat.enemyHp = Math.max(0, combat.enemyHp - bonusDmg);
    playPortraitEffect("enemy", "hit");
    playBattleSe("hit");
    clog(`【浪切】発動！ 追加ダメージ ${bonusDmg}`);
  }
  if (combat.enemyHp <= 0) { endCombatWin(); return; }
  renderCombat();
}

// ─── 敵ターン ─────────────────────────────────────────────────────
function enemyTurn() {
  const it = combat.enemyIntent;
  if (!it) { combat.turn++; startPlayerTurn(); return; }

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
      playBattleSe("heal"); playPortraitEffect("enemy", "heal");
      clog(`敵 HP+${heal}（自己回復）`);
      break;
    }
    case "buffSelf":
      if (it.phyAdd) combat.enemyPhy += it.phyAdd;
      if (it.intAdd) combat.enemyInt += it.intAdd;
      playBattleSe("buff"); playPortraitEffect("enemy", "buff");
      clog(`敵強化: ${it.phyAdd ? "PHY+" + it.phyAdd : ""}${it.intAdd ? " INT+" + it.intAdd : ""}`);
      break;
    case "guard":
      combat.enemyGuard += it.value;
      playBattleSe("buff"); playPortraitEffect("enemy", "buff");
      clog(`敵 GUARD +${it.value}`);
      break;
    case "special":
      dealSpecialMaxHpPercentToPlayer(combat, it.pct);
      break;
    default:
      clog(`不明な意図: ${it.kind}`);
  }

  if (combat.playerHp <= 0) { endCombatLoss(); return; }
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
  stopBgm();
  showCutin("win").then(() => openRewardScreen(picks));
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
    '<div class="card-ext-name">' + escapeHtml(def.extNameJa) + "</div>" +
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
        showView("over");
        document.getElementById("gameOverMsg").textContent =
          "全 node クリアおめでとうございます！あなたは最高ですよ〜！";
      } else {
        // 次の node が解放された → node 選択画面へ（解放アニメ付き）
        showView("nodeSelect");
        renderNodeSelect(clearedIdx + 1); // 新たに解放されたインデックス
      }
      return;
    }
  }
  combat = null;
  postCombatSnapshot = null;
  showView("map");
  renderMap();
}

// ─── 戦闘敗北 ────────────────────────────────────────────────────
function endCombatLoss() {
  stopBgm();
  postCombatSnapshot = null;
  showCutin("lose").then(() => {
    showView("over");
    document.getElementById("gameOverMsg").textContent =
      "HP が 0 になりました。デッキと立ち回りを調整して再挑戦しよう。";
    combat = null;
    runState = null;
  });
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
  const removeSection = document.createElement("div");
  removeSection.className = "shop-remove-section";
  const removeTitle = document.createElement("div");
  removeTitle.className = "shop-remove-title";
  removeTitle.textContent = "カード破棄（50 GUM）";
  removeSection.appendChild(removeTitle);
  const removeDesc = document.createElement("div");
  removeDesc.className = "shop-remove-desc";
  removeDesc.textContent = "デッキ内のカードを1枚選んで除外できます（スターター以外）。";
  removeSection.appendChild(removeDesc);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "shop-remove-btn action";
  removeBtn.textContent = "カードを破棄する";
  removeBtn.addEventListener("click", () => openShopRemoveCard(goldDisp));
  removeSection.appendChild(removeBtn);
  list.parentElement.appendChild(removeSection);

  // マイのメッセージ（ショップ入店時）
  renderNavigator("エクステンションを購入してデッキを強化しましょう！GUMに余裕があるなら積極的に買いましょう！");
}

// ─── ショップ カード破棄 ──────────────────────────────────────────
const SHOP_REMOVE_COST = 50;
// スターターカードのキー（破棄不可）
const STARTER_KEYS = new Set(['ext1001', 'ext1004', 'ext1008']);

function openShopRemoveCard(goldDisp) {
  ensureRunState();
  if (gold < SHOP_REMOVE_COST) {
    renderNavigator(`GUM が足りません（必要: ${SHOP_REMOVE_COST} GUM）`);
    return;
  }
  // 破棄可能なカード（スターター以外）
  const removable = runState.deck
    .map((c, idx) => ({ card: c, idx }))
    .filter(({ card }) => !STARTER_KEYS.has(card.libraryKey));

  if (removable.length === 0) {
    renderNavigator("破棄できるカードがありません（スターターカードは破棄不可）");
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
  pendingShopNodeId = null;
  pendingCraftNodeId = null;
  postCombatSnapshot = null;
  stopBgm();
  dismissCutin();
  showView("nodeSelect");
  renderNodeSelect();
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
  const { nodes, edges } = generateChapterMap(chapter, ENEMY_DEFS);
  setActiveMap(nodes, edges);
  runState = {
    chapterIdx,
    deck: makeStarterDeck(),
    playerHp: LEADER.hpMax,
    playerHpMax: LEADER.hpMax,
    lastMapNodeId: null,
    pathNodeIds: [],
    runComplete: false,
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

  // CHAPTERS + ゴール「TROY」の構成
  const TROY_BG_ID = '1052';
  const goals = [
    ...CHAPTERS.map((ch, idx) => ({ idx, name: ch.name.replace('node : ', ''), chapter: ch })),
    { idx: CHAPTERS.length, name: 'TROY', chapter: null, bgId: TROY_BG_ID },
  ];

  let html = '<div class="ns-header"><h2>node を選択してください</h2><p class="ns-sub">ボスを倒すと次の node が解放されます</p></div>';
  html += '<div class="ns-cards">';

  goals.forEach((goal) => {
    const isTroy     = goal.chapter === null;
    const isUnlocked = !isTroy && (goal.idx === 0 || clearedChapters.has(goal.idx - 1));
    const isCleared  = !isTroy && clearedChapters.has(goal.idx);
    const isJustUnlocked = goal.idx === justUnlockedIdx;

    const ch = goal.chapter;
    const bgId = ch?.bgId ?? goal.bgId ?? '1001';
    const bgUrl = img('Image/Backgrounds/' + bgId + '.png');

    // 状態クラス
    const stateClass = isTroy      ? 'ns-card--troy' :
                       isCleared   ? 'ns-card--cleared' :
                       isUnlocked  ? 'ns-card--unlocked' :
                                     'ns-card--locked';
    const animClass  = isJustUnlocked ? ' ns-card--just-unlocked' : '';

    html += `<div class="ns-card ${stateClass}${animClass}" data-idx="${goal.idx}" role="${isUnlocked ? 'button' : 'presentation'}" tabindex="${isUnlocked ? 0 : -1}" style="--ns-bg: url('${bgUrl}')">`;

    // 背景レイヤー
    html += '<div class="ns-card-bg"></div>';

    // ─── コンテンツ ───
    html += '<div class="ns-card-body">';

    // node 名
    html += `<div class="ns-card-title">${goal.name}</div>`;

    if (isTroy) {
      // TROY：最終目標ロック表示
      html += '<div class="ns-card-troy-lock"><span>★</span><span class="ns-card-troy-label">最終目標</span></div>';
    } else if (!isUnlocked) {
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

// ─── ヒーロー選択画面 ────────────────────────────────────────────────
function renderHeroSelect() {
  const el = document.getElementById("heroSelectView");
  if (!el) return;

  let html = '<div class="hs-header"><h2>ヒーローを選んでください</h2><p class="hs-sub">パッシブスキルを持つ英雄があなたの旅を導きます</p></div>';
  html += '<div class="hs-roster">';

  HERO_ROSTER.forEach((hero, idx) => {
    html += `<div class="hs-card" data-idx="${idx}" role="button" tabindex="0">`;
    html += `<img class="hs-hero-img" src="${hero.img()}" alt="${hero.nameJa}" />`;
    html += `<div class="hs-hero-body">`;
    html += `<div class="hs-hero-name">${hero.nameJa}</div>`;
    html += `<div class="hs-hero-stats">`;
    html += `<span>HP ${hero.hpMax}</span>`;
    html += `<span>PHY ${hero.basePhy}</span>`;
    html += `<span>INT ${hero.baseInt}</span>`;
    html += `<span>AGI ${hero.baseAgi}</span>`;
    html += `</div>`;
    html += `<div class="hs-passive"><span class="hs-passive-name">【${hero.passiveName || '—'}】</span>${hero.passiveDesc}</div>`;
    html += `<button class="hs-select-btn action">このヒーローで始める</button>`;
    html += `</div>`;
    html += `</div>`;
  });

  html += '</div>';
  el.innerHTML = html;

  el.querySelectorAll('.hs-select-btn').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      setLeader(HERO_ROSTER[idx]);
      showView("nodeSelect");
      renderNodeSelect();
    });
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
  document.getElementById("btnEndTurn").addEventListener("click", () => {
    if (!combat || view !== "combat") return;
    combat.hand.forEach((c) => combat.discardPile.push(c));
    combat.hand = [];
    renderCombat();
    enemyTurn();
  });
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
  // heroSelect を事前にレンダリングしておく（タイトルが覆うので見えない）
  showView("heroSelect");
  renderHeroSelect();
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
}

init();
