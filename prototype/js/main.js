import {
  MAP_NODES,
  MAP_EDGES,
  mapNodeById,
  reachableNextNodeIds,
} from "./map.js";
import {
  createCardRuntime,
  shuffle,
  battleIconUrl,
} from "./cards.js";
import {
  img,
  LEADER,
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

const MAP_START = { id: "START", layer: -1, x: 6, y: 50 };

let gold = 75;
let view = "map";
/** @type {null | { deck: any[], playerHp: number, playerHpMax: number, lastMapNodeId: string | null, pathNodeIds: string[], runComplete: boolean }} */
let runState = null;
let combat = null;
/** @type {string | null} */
let pendingShopNodeId = null;
/** @type {'win'|'lose'|null} */
let cutinKind = null;
/** @type {null | { resolve: () => void }} */
let cutinResolve = null;
/** 勝利直後の同期用スナップショット（報酬画面で deck に加える） */
let postCombatSnapshot = null;
/** @type {HTMLAudioElement | null} */
let bgmAudio = null;

function stopBgm() {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    bgmAudio = null;
  }
}

function startBgmCombat() {
  stopBgm();
  try {
    bgmAudio = new Audio(AUDIO_URLS.bgmPvp());
    bgmAudio.loop = true;
    bgmAudio.volume = 0.32;
    bgmAudio.play().catch(() => {});
  } catch (_) {}
}

function playSeClear() {
  try {
    const a = new Audio(AUDIO_URLS.seClear());
    a.volume = 0.55;
    a.play().catch(() => {});
  } catch (_) {}
}

function playJingle(kind) {
  const url =
    kind === "win" ? AUDIO_URLS.jingleWin() : AUDIO_URLS.jingleLose();
  try {
    const a = new Audio(url);
    a.volume = 0.52;
    a.play().catch(() => {});
  } catch (_) {}
}

/** @param {'hit'|'heal'|'buff'|'debuff'|'area'} kind */
function playBattleSe(kind) {
  const url =
    kind === "heal"
      ? AUDIO_URLS.seBattleHeal()
      : kind === "buff"
        ? AUDIO_URLS.seBattleBuff()
        : kind === "debuff"
          ? AUDIO_URLS.seBattleDebuff()
          : kind === "area"
            ? AUDIO_URLS.seBattleAreaDamage()
            : AUDIO_URLS.seBattleSingleDamage();
  try {
    const a = new Audio(url);
    a.volume = 0.48;
    a.play().catch(() => {});
  } catch (_) {}
}

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
    kind === "heal"
      ? BATTLE_EFFECT_SPRITE.heal()
      : kind === "buff"
        ? BATTLE_EFFECT_SPRITE.buff()
        : kind === "debuff"
          ? BATTLE_EFFECT_SPRITE.debuff()
          : kind === "area"
            ? BATTLE_EFFECT_SPRITE.areaDamage()
            : BATTLE_EFFECT_SPRITE.singleDamage();
  const el = document.createElement("div");
  el.className = "portrait-fx portrait-fx--" + kind;
  el.setAttribute("role", "presentation");
  el.style.backgroundImage = "url('" + sheet + "')";
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

/** @param {string} anchorId */
function spawnStatFloat(anchorId, delta) {
  if (!delta) return;
  const host = document.getElementById(anchorId);
  if (!host) return;
  const el = document.createElement("span");
  el.className =
    "stat-float " + (delta > 0 ? "stat-float--gain" : "stat-float--loss");
  el.textContent = (delta > 0 ? "+" : "") + String(delta);
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("stat-float--show"));
  setTimeout(() => {
    el.remove();
  }, 900);
}

function flashPortrait(which) {
  const id = which === "enemy" ? "enemyPortraitWrap" : "playerPortraitWrap";
  const wrap = document.getElementById(id);
  if (!wrap) return;
  wrap.classList.add("portrait-hit");
  setTimeout(() => wrap.classList.remove("portrait-hit"), 380);
}

/** PHY/INT 依存ダメージをガードで軽減（残ダメージを返す） */
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

/**
 * @param {number} skillPct skill の PHY% 係数
 */
function dealPhySkillToEnemy(s, skillPct) {
  const cut = cutRateFromPhy(s.enemyPhy);
  let base = phyIntDamageAfterCut(s.playerPhy, skillPct, cut);
  let critBonus = 0;
  if (rollCrit(critRateFromAgi(s.playerAgi))) {
    critBonus = criticalBonusDamage(
      s.playerPhyBase,
      skillPct,
      s.enemyPhyBase,
      "phy"
    );
    clog("クリティカル（PHY）");
  }
  let vuln = s.enemyVulnerable || 0;
  let total = base + critBonus + vuln;
  s.enemyVulnerable = 0;
  total = applyGuardToDamage("enemy", total);
  s.enemyHp = Math.max(0, s.enemyHp - total);
  flashPortrait("enemy");
  playPortraitEffect("enemy", "hit");
  if (total > 0) playBattleSe("hit");
  clog(
    `PHY攻撃 ${skillPct}% → 基礎${base} カット${cut}% 合計${base + critBonus}` +
      (critBonus ? " +CRIT" + critBonus : "") +
      (vuln ? " +脆弱" + vuln : "") +
      ` → HP-${total}`
  );
}

function dealPhySkillToEnemyRange(s, minPct, maxPct) {
  dealPhySkillToEnemy(s, randomSkillRatePct(minPct, maxPct));
}

function dealIntSkillToEnemy(s, minPct, maxPct) {
  const skillPct = randomSkillRatePct(minPct, maxPct);
  const cut = cutRateFromInt(s.enemyInt);
  let base = phyIntDamageAfterCut(s.playerInt, skillPct, cut);
  let critBonus = 0;
  if (rollCrit(critRateFromAgi(s.playerAgi))) {
    critBonus = criticalBonusDamage(
      s.playerIntBase,
      skillPct,
      s.enemyIntBase,
      "int"
    );
    clog("クリティカル（INT）");
  }
  let total = base + critBonus;
  total = applyGuardToDamage("enemy", total);
  s.enemyHp = Math.max(0, s.enemyHp - total);
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
  if (s.playerHp > before) {
    playBattleSe("heal");
    playPortraitEffect("player", "heal");
  }
  clog(`リカバリー: 係数${coef.toFixed(1)}×${pct}% → HP+${s.playerHp - before}`);
}

/** 敵の PHY 攻撃（意図）。プレイヤー側カット＋クリ＋ガード */
function dealPhySkillFromEnemyToPlayer(s, skillPct) {
  const cut = cutRateFromPhy(s.playerPhy);
  let base = phyIntDamageAfterCut(s.enemyPhy, skillPct, cut);
  let critBonus = 0;
  if (rollCrit(critRateFromAgi(s.enemyAgi))) {
    critBonus = criticalBonusDamage(
      s.enemyPhyBase,
      skillPct,
      s.playerPhyBase,
      "phy"
    );
    clog("敵クリティカル（PHY）");
  }
  let total = base + critBonus;
  total = applyGuardToDamage("player", total);
  s.playerHp = Math.max(0, s.playerHp - total);
  flashPortrait("player");
  playPortraitEffect("player", "hit");
  if (total > 0) playBattleSe("hit");
  clog(
    `敵 PHY ${skillPct}% → 被ダメージ ${total}` +
      (critBonus ? "（含CRIT " + critBonus + "）" : "")
  );
}

/** 最大 HP の一定割合（特殊ダメージ）— カット無効、シールドのみ */
function dealSpecialMaxHpPercentToPlayer(s, pct) {
  let raw = Math.max(0, Math.floor((s.playerHpMax * pct) / 100));
  raw = applyDamageThroughShield(s, "player", raw);
  s.playerHp = Math.max(0, s.playerHp - raw);
  flashPortrait("player");
  playPortraitEffect("player", "area");
  clog(`特殊ダメージ（最大HP ${pct}%）→ HP-${raw}`);
}

const battleApi = {
  dealPhySkillToEnemy: (s, a, b) => dealPhySkillToEnemyRange(s, a, b),
  dealIntSkillToEnemy,
  healPlayerFromIntSkill,
  drawCards,
  playBattleSe,
  portraitFx: (who, kind) => playPortraitEffect(who, kind),
};

const { CARD_LIBRARY, copyCard, makeStarterDeck } = createCardRuntime(
  clog,
  battleApi
);

function ensureRunState() {
  if (!runState) {
    runState = {
      deck: makeStarterDeck(),
      playerHp: LEADER.hpMax,
      playerHpMax: LEADER.hpMax,
      lastMapNodeId: null,
      pathNodeIds: [],
      runComplete: false,
    };
  }
}

function nodeXY(id) {
  if (id === "START") return { x: MAP_START.x, y: MAP_START.y };
  const n = mapNodeById(id);
  return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
}

function syncResources() {
  document.getElementById("goldVal").textContent = String(gold);
  ensureRunState();
  document.getElementById("hpMapVal").textContent =
    `${runState.playerHp}/${runState.playerHpMax}`;
  const layerEl = document.getElementById("layerVal");
  if (runState.runComplete) {
    layerEl.textContent = "クリア";
  } else if (!runState.lastMapNodeId) {
    layerEl.textContent = "入口";
  } else {
    const cur = mapNodeById(runState.lastMapNodeId);
    layerEl.textContent = cur
      ? `第${cur.layer + 1}層 · ${cur.label}`
      : "—";
  }
}

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
  if (node.layer === lastLayer && last && node.id !== last) {
    return "map-node--skipped";
  }
  if (node.layer > lastLayer) return "map-node--locked";
  return "map-node--locked";
}

function renderMap() {
  const host = document.getElementById("mapRows");
  host.innerHTML = "";
  ensureRunState();
  if (runState.runComplete) {
    host.innerHTML =
      "<p style='color:var(--accent);margin:0 0 0.75rem'>このランをクリアしました。</p>" +
      "<button type='button' class='action primary' id='btnRestartClear'>もう一度</button>";
    document.getElementById("btnRestartClear").addEventListener("click", resetRun);
    syncResources();
    return;
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("class", "map-graph");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "フロア接続マップ");

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const mk = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  mk.setAttribute("id", "arrowHead");
  mk.setAttribute("markerWidth", "4");
  mk.setAttribute("markerHeight", "4");
  mk.setAttribute("refX", "3.2");
  mk.setAttribute("refY", "2");
  mk.setAttribute("orient", "auto");
  const po = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  po.setAttribute("points", "0 0, 4 2, 0 4");
  po.setAttribute("fill", "#5a5068");
  mk.appendChild(po);
  defs.appendChild(mk);
  svg.appendChild(defs);

  const edgeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
  edgeG.setAttribute("class", "map-edges");
  for (const [a, b] of MAP_EDGES) {
    const pa = nodeXY(a);
    const pb = nodeXY(b);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(pa.x));
    line.setAttribute("y1", String(pa.y));
    line.setAttribute("x2", String(pb.x));
    line.setAttribute("y2", String(pb.y));
    line.setAttribute("marker-end", "url(#arrowHead)");
    const allowed = new Set(reachableNextNodeIds(runState.lastMapNodeId));
    const onPath =
      runState.pathNodeIds.includes(a) &&
      (runState.pathNodeIds.includes(b) || allowed.has(b));
    line.setAttribute(
      "class",
      onPath || (a === "START" && allowed.has(b))
        ? "map-edge map-edge--active"
        : "map-edge"
    );
    edgeG.appendChild(line);
  }
  svg.appendChild(edgeG);

  const startG = document.createElementNS("http://www.w3.org/2000/svg", "g");
  startG.setAttribute("class", "map-start");
  const sc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  sc.setAttribute("cx", String(MAP_START.x));
  sc.setAttribute("cy", String(MAP_START.y));
  sc.setAttribute("r", "3.2");
  sc.setAttribute("class", "map-start-dot");
  startG.appendChild(sc);
  const st = document.createElementNS("http://www.w3.org/2000/svg", "text");
  st.setAttribute("x", String(MAP_START.x));
  st.setAttribute("y", String(MAP_START.y - 5));
  st.setAttribute("text-anchor", "middle");
  st.setAttribute("class", "map-start-label");
  st.textContent = "START";
  startG.appendChild(st);
  svg.appendChild(startG);

  for (const node of MAP_NODES) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "map-node " + mapNodeClass(node));
    g.setAttribute("data-node-id", node.id);
    g.style.cursor = "pointer";
    const circ = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circ.setAttribute("cx", String(node.x));
    circ.setAttribute("cy", String(node.y));
    circ.setAttribute("r", "4.2");
    circ.setAttribute("class", "map-node-shape");
    g.appendChild(circ);
    const lab = document.createElementNS("http://www.w3.org/2000/svg", "text");
    lab.setAttribute("x", String(node.x));
    lab.setAttribute("y", String(node.y + 8.5));
    lab.setAttribute("text-anchor", "middle");
    lab.setAttribute("class", "map-node-cap");
    lab.textContent = node.label;
    g.appendChild(lab);
    const ty = document.createElementNS("http://www.w3.org/2000/svg", "text");
    ty.setAttribute("x", String(node.x));
    ty.setAttribute("y", String(node.y + 11.8));
    ty.setAttribute("text-anchor", "middle");
    ty.setAttribute("class", "map-node-type");
    ty.textContent =
      node.type === "fight"
        ? node.elite
          ? "精鋭"
          : "戦闘"
        : node.type === "rest"
          ? "休憩"
          : node.type === "shop"
            ? "店"
            : "ボス";
    g.appendChild(ty);
    const allowed = new Set(reachableNextNodeIds(runState.lastMapNodeId));
    if (!allowed.has(node.id)) {
      g.style.pointerEvents = "none";
    }
    g.addEventListener("click", () => tryEnterMapNode(node.id));
    svg.appendChild(g);
  }

  host.appendChild(svg);
  const legend = document.createElement("p");
  legend.className = "map-legend";
  legend.innerHTML =
    "金枠＝現在地 · 緑＝次に選べるノード · 灰＝通れない／見送った経路。接続矢印で先の休憩・店・ボスを読む。";
  host.appendChild(legend);
  syncResources();
}

function tryEnterMapNode(nodeId) {
  ensureRunState();
  const allowed = reachableNextNodeIds(runState.lastMapNodeId);
  if (!allowed.includes(nodeId)) return;
  const node = mapNodeById(nodeId);
  if (!node) return;
  if (node.type === "rest") {
    const heal = Math.floor(runState.playerHpMax * 0.35);
    runState.playerHp = Math.min(runState.playerHpMax, runState.playerHp + heal);
    runState.pathNodeIds.push(nodeId);
    runState.lastMapNodeId = nodeId;
    renderMap();
    return;
  }
  if (node.type === "shop") {
    pendingShopNodeId = nodeId;
    openShop();
    return;
  }
  startCombatFromMapNode(node);
}

function showView(name) {
  if (view === "combat" && name !== "combat") {
    stopBgm();
  }
  view = name;
  document.getElementById("mapView").classList.toggle("hidden", name !== "map");
  document.getElementById("combatView").classList.toggle("hidden", name !== "combat");
  document.getElementById("shopView").classList.toggle("hidden", name !== "shop");
  document.getElementById("gameOver").classList.toggle("hidden", name !== "over");
  const rv = document.getElementById("rewardView");
  if (rv) rv.classList.toggle("hidden", name !== "reward");
}

function startCombatFromMapNode(node) {
  ensureRunState();
  const deck = runState.deck.map((c) => ({ ...c }));
  const playerHpMax = runState.playerHpMax;
  const playerHp = runState.playerHp;
  const boss = node.type === "boss";
  const elite = !!node.elite;
  const enemyHp = boss ? 72 : elite ? 48 : 32;
  const enemyId = boss ? 505 : elite ? 418 : 314;
  const pPhy = LEADER.basePhy;
  const pInt = LEADER.baseInt;
  const pAgi = LEADER.baseAgi;
  const ePhy = boss ? 26 : elite ? 20 : 14;
  const eInt = boss ? 22 : elite ? 16 : 12;
  const eAgi = boss ? 18 : elite ? 14 : 10;
  combat = {
    deck,
    drawPile: [],
    discardPile: [],
    hand: [],
    playerHp,
    playerHpMax,
    playerPhy: pPhy,
    playerInt: pInt,
    playerAgi: pAgi,
    playerPhyBase: pPhy,
    playerIntBase: pInt,
    playerAgiBase: pAgi,
    playerGuard: 0,
    playerShield: 0,
    energy: 3,
    energyMax: 3,
    enemyHp,
    enemyHpMax: enemyHp,
    enemyPhy: ePhy,
    enemyInt: eInt,
    enemyAgi: eAgi,
    enemyPhyBase: ePhy,
    enemyIntBase: eInt,
    enemyAgiBase: eAgi,
    enemyGuard: 0,
    enemyShield: 0,
    enemyVulnerable: 0,
    bonusEnergyNext: 0,
    enemyIntent: { kind: "attack", phyPct: boss ? 38 : elite ? 32 : 28 },
    turn: 1,
    elite: !!elite,
    boss: !!boss,
    enemyName: boss ? "門番：影の軍勢" : elite ? "精鋭" : "斥候",
    enemyImgId: enemyId,
    mapNodeId: node.id,
    _lastUi: null,
  };
  combat.drawPile = shuffle(combat.deck.map((c) => copyCard(c.libraryKey)));
  showView("combat");
  startBgmCombat();
  const bgFile = boss ? "1004" : elite ? "1002" : "1001";
  document.getElementById("combatBg").style.backgroundImage =
    "url('" + BATTLE_BG(bgFile) + "')";
  document.getElementById("leaderImg").src = LEADER.img();
  document.getElementById("leaderName").textContent = LEADER.nameJa;
  document.getElementById("enemyImg").src = ENEMY_IMG(enemyId);
  document.getElementById("enemyName").textContent = combat.enemyName;
  document.getElementById("clog").innerHTML = "";
  clog("戦闘開始（ダメージ・カット率・回復係数・クリは MCH ヘルプ準拠のプロト）");
  startPlayerTurn();
}

function intentText() {
  const it = combat.enemyIntent;
  if (it.kind === "attack") return "ATK PHY " + it.phyPct + "%";
  if (it.kind === "guard") return "GUARD +" + it.value;
  if (it.kind === "special") return "SPECIAL maxHP " + it.pct + "%";
  return "—";
}

function rollNextIntent() {
  const r = Math.random();
  if (combat.boss) {
    if (r < 0.45) {
      combat.enemyIntent = {
        kind: "attack",
        phyPct: 34 + Math.floor(Math.random() * 14),
      };
    } else if (r < 0.75) {
      combat.enemyIntent = { kind: "guard", value: 8 + Math.floor(Math.random() * 5) };
    } else {
      combat.enemyIntent = { kind: "special", pct: 8 + Math.floor(Math.random() * 5) };
    }
  } else {
    if (r < 0.5) {
      combat.enemyIntent = {
        kind: "attack",
        phyPct: 24 + Math.floor(Math.random() * 14),
      };
    } else if (r < 0.82) {
      combat.enemyIntent = { kind: "guard", value: 5 + Math.floor(Math.random() * 5) };
    } else {
      combat.enemyIntent = { kind: "special", pct: 5 + Math.floor(Math.random() * 4) };
    }
  }
}

function startPlayerTurn() {
  combat.playerGuard = 0;
  combat.energy = combat.energyMax + (combat.bonusEnergyNext || 0);
  combat.bonusEnergyNext = 0;
  drawCards(combat, 5);
  rollNextIntent();
  renderCombat();
}

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
    const dHp = cur.playerHp - prev.playerHp;
    if (dHp !== 0) spawnStatFloat("player-hp", dHp);
    const dG = cur.playerGuard - prev.playerGuard;
    if (dG !== 0) spawnStatFloat("player-guard", dG);
    const dSh = cur.playerShield - prev.playerShield;
    if (dSh !== 0) spawnStatFloat("player-shield", dSh);
    const dPhy = cur.playerPhy - prev.playerPhy;
    if (dPhy !== 0) spawnStatFloat("player-phy", dPhy);
    const dInt = cur.playerInt - prev.playerInt;
    if (dInt !== 0) spawnStatFloat("player-int", dInt);
    const dAgi = cur.playerAgi - prev.playerAgi;
    if (dAgi !== 0) spawnStatFloat("player-agi", dAgi);
    const dEhp = cur.enemyHp - prev.enemyHp;
    if (dEhp !== 0) spawnStatFloat("enemy-hp", dEhp);
    const dEg = cur.enemyGuard - prev.enemyGuard;
    if (dEg !== 0) spawnStatFloat("enemy-guard", dEg);
    const dEs = cur.enemyShield - prev.enemyShield;
    if (dEs !== 0) spawnStatFloat("enemy-shield", dEs);
    const dEi = cur.enemyInt - prev.enemyInt;
    if (dEi !== 0) spawnStatFloat("enemy-int", dEi);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PEEK_HELP_SNIPPETS = {
  guard:
    "<strong>ガード</strong> — ターン中、PHY/INT ダメージを数値分だけ先に吸収（味方はターン開始で 0）。",
  shield:
    "<strong>シールド</strong> — 特殊ダメージ（最大 HP 割合など）のみ吸収。PHY/INT 通常攻撃には無効。",
  energy:
    "<strong>⚡ エナジー</strong> — ターンで使える行動コスト。次ターン開始時に最大まで回復。",
  draw:
    "<strong>ドロー</strong> — 山札から手札へカードを引く。山が空なら捨て札をシャッフルして山にする。",
  phy: "<strong>PHY</strong> — 物理攻撃の基礎値。PHY 依存スキルのダメージに使う。",
  int: "<strong>INT</strong> — 知略の基礎値。INT 攻撃や回復係数に関わる。",
  agi: "<strong>AGI</strong> — このプロトでは主にクリティカル率に反映。",
  hp: "<strong>HP</strong> — 0 で敗北。回復は最大値を超えない。",
};

/** @param {string[]} keys */
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
  requestAnimationFrame(() => {
    document.querySelectorAll("#hand .card.card--peek").forEach((el) => {
      const sum = el.querySelector(".card-effect-summary");
      if (!sum) {
        el.style.setProperty("--peek-lift", "0px");
        return;
      }
      const full = sum.scrollHeight;
      const vis = sum.clientHeight;
      const need = Math.max(0, full - vis);
      const lift = need > 2 ? Math.min(48, need + 8) : 0;
      el.style.setProperty("--peek-lift", lift + "px");
    });
  });
}

function playCardByRef(cardRef) {
  if (!combat || view !== "combat") return;
  const idx = combat.hand.indexOf(cardRef);
  if (idx < 0) return;
  playCard(idx);
}

/** @param {number} clientX @param {number} clientY @returns {number} hand index or -1 */
function handIndexAtPoint(clientX, clientY) {
  const cards = Array.from(document.querySelectorAll("#hand .card"));
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (c.classList.contains("disabled")) continue;
    const r = c.getBoundingClientRect();
    if (
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.bottom
    ) {
      return i;
    }
  }
  return -1;
}

function setHandPeekAt(clientX, clientY) {
  const idx = handIndexAtPoint(clientX, clientY);
  const cards = Array.from(document.querySelectorAll("#hand .card"));
  cards.forEach((c) => {
    c.classList.remove("card--peek");
    c.style.setProperty("--peek-lift", "0px");
  });
  if (idx >= 0 && cards[idx]) {
    cards[idx].classList.add("card--peek");
    refreshHandPeekLift();
  }
}

let handTouchBound = false;
let handTouchId = null;
let handLongPress = false;
let handHoldTimer = null;
let handStartX = 0;
let handStartY = 0;
let handLastX = 0;
let handLastY = 0;

function bindHandTouchDelegation() {
  const handEl = document.getElementById("hand");
  if (!handEl || handTouchBound) return;
  handTouchBound = true;

  const removeDocListeners = () => {
    document.removeEventListener("touchmove", onHandDocMove, true);
    document.removeEventListener("touchend", onHandDocEnd, true);
    document.removeEventListener("touchcancel", onHandDocCancel, true);
  };

  const resetGestureState = () => {
    removeDocListeners();
    handTouchId = null;
    handLongPress = false;
    if (handHoldTimer) {
      clearTimeout(handHoldTimer);
      handHoldTimer = null;
    }
  };

  const onHandDocMove = (ev) => {
    if (handTouchId === null || view !== "combat" || !combat) return;
    const t =
      Array.from(ev.touches).find((x) => x.identifier === handTouchId) ||
      Array.from(ev.changedTouches).find((x) => x.identifier === handTouchId);
    if (!t) return;
    handLastX = t.clientX;
    handLastY = t.clientY;
    if (handHoldTimer) {
      const dx = t.clientX - handStartX;
      const dy = t.clientY - handStartY;
      if (dx * dx + dy * dy > 12 * 12) {
        clearTimeout(handHoldTimer);
        handHoldTimer = null;
      }
    }
    setHandPeekAt(handLastX, handLastY);
  };

  const onHandDocEnd = (ev) => {
    if (handTouchId === null) return;
    if (
      !Array.from(ev.changedTouches).some((x) => x.identifier === handTouchId)
    ) {
      return;
    }
    const t =
      Array.from(ev.changedTouches).find((x) => x.identifier === handTouchId) ||
      ev.changedTouches[0];
    removeDocListeners();
    if (handHoldTimer) {
      clearTimeout(handHoldTimer);
      handHoldTimer = null;
    }
    const releaseIdx = handIndexAtPoint(t.clientX, t.clientY);
    document.querySelectorAll("#hand .card").forEach((c) => {
      c.classList.remove("card--peek");
      c.style.setProperty("--peek-lift", "0px");
    });
    if (
      combat &&
      view === "combat" &&
      releaseIdx >= 0 &&
      combat.hand[releaseIdx] &&
      combat.hand[releaseIdx].cost <= combat.energy
    ) {
      playCardByRef(combat.hand[releaseIdx]);
    }
    handTouchId = null;
    handLongPress = false;
  };

  const onHandDocCancel = () => {
    document.querySelectorAll("#hand .card").forEach((c) => {
      c.classList.remove("card--peek");
      c.style.setProperty("--peek-lift", "0px");
    });
    resetGestureState();
  };

  handEl.addEventListener(
    "touchstart",
    (ev) => {
      if (!combat || view !== "combat" || ev.touches.length !== 1) return;
      resetGestureState();
      const t = ev.touches[0];
      handTouchId = t.identifier;
      handStartX = t.clientX;
      handStartY = t.clientY;
      handLastX = t.clientX;
      handLastY = t.clientY;
      handLongPress = false;
      setHandPeekAt(handLastX, handLastY);
      document.addEventListener("touchmove", onHandDocMove, true);
      document.addEventListener("touchend", onHandDocEnd, true);
      document.addEventListener("touchcancel", onHandDocCancel, true);
      handHoldTimer = setTimeout(() => {
        handHoldTimer = null;
        handLongPress = true;
        setHandPeekAt(handLastX, handLastY);
      }, 380);
    },
    { passive: true }
  );
}

function bindHandCard(el, idx, card) {
  const onPeek = () => {
    document.querySelectorAll("#hand .card--peek").forEach((c) => {
      if (c !== el) {
        c.classList.remove("card--peek");
        c.style.setProperty("--peek-lift", "0px");
      }
    });
    el.classList.add("card--peek");
    refreshHandPeekLift();
  };

  el.addEventListener("mouseenter", () => {
    if (window.matchMedia("(pointer: fine)").matches) onPeek();
  });
  el.addEventListener("mouseleave", () => {
    if (window.matchMedia("(pointer: fine)").matches) {
      el.classList.remove("card--peek");
      el.style.setProperty("--peek-lift", "0px");
    }
  });
  el.addEventListener("click", (ev) => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    ev.preventDefault();
    if (card.cost > combat.energy || el.classList.contains("disabled")) return;
    playCard(idx);
  });
}

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
  const deckCount = combat.drawPile.length;
  const deckCountEl = document.getElementById("deckPileCount");
  if (deckCountEl) deckCountEl.textContent = String(deckCount);

  diffUiFloats();
  const handEl = document.getElementById("hand");
  handEl.innerHTML = "";
  const n = combat.hand.length;
  handEl.style.setProperty("--n-cards", String(Math.max(n, 1)));
  combat.hand.forEach((card, idx) => {
    const el = document.createElement("div");
    el.className =
      "card " +
      card.type +
      (card.cost > combat.energy ? " disabled" : "");
    el.style.setProperty("--i", String(idx));
    el.style.setProperty("--n", String(Math.max(n - 1, 1)));
    const centerIdx = Math.floor((n - 1) / 2);
    const rel = idx - centerIdx;
    const rot = rel === 0 ? 0 : rel < 0 ? -5 * Math.abs(rel) : 5 * rel;
    el.style.setProperty("--rot", rot + "deg");
    const summaryLines =
      typeof card.effectSummaryLines === "function"
        ? card.effectSummaryLines(combat)
        : typeof card.previewLines === "function"
          ? card.previewLines(combat)
          : [card.text || ""];
    const detailLines =
      typeof card.previewLines === "function"
        ? card.previewLines(combat)
        : summaryLines;
    const helpKeys =
      typeof card.peekHelpKeys === "function" ? card.peekHelpKeys() : [];
    const detailBody = detailLines.map((t) => "<p>" + escapeHtml(t) + "</p>").join("");
    const summaryBody = summaryLines
      .map((t) => "<p>" + escapeHtml(t) + "</p>")
      .join("");
    el.innerHTML =
      '<div class="card-bg-ext">' +
      '<img class="card-ext-img" src="' +
      EXT_IMG(card.extId) +
      '" alt="" />' +
      "</div>" +
      '<div class="card-fg">' +
      '<div class="card-top-row">' +
      '<span class="card-cost-badge"><span class="cost-zeus" aria-hidden="true">⚡</span>' +
      card.cost +
      "</span>" +
      '<div class="card-ext-name">' +
      escapeHtml(card.extNameJa) +
      "</div>" +
      "</div>" +
      '<img class="card-skill-corner" src="' +
      battleIconUrl(card.skillIcon) +
      '" alt="" />' +
      '<div class="card-effect-summary">' +
      summaryBody +
      "</div>" +
      '<div class="card-peek-layer" aria-hidden="true">' +
      '<div class="card-peek-inner">' +
      '<div class="card-peek-lines">' +
      detailBody +
      "</div>" +
      buildPeekHelpHtml(helpKeys) +
      "</div></div>" +
      "</div>";
    bindHandCard(el, idx, card);
    handEl.appendChild(el);
  });
  syncResources();
  combat._lastUi = {
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
}

function playCard(idx) {
  const card = combat.hand[idx];
  if (!card || card.cost > combat.energy) return;
  combat.energy -= card.cost;
  combat.hand.splice(idx, 1);
  combat.discardPile.push(card);
  card.play(combat);
  if (combat.enemyHp <= 0) {
    endCombatWin();
    return;
  }
  renderCombat();
}

function enemyTurn() {
  const it = combat.enemyIntent;
  if (it.kind === "attack") {
    dealPhySkillFromEnemyToPlayer(combat, it.phyPct);
  } else if (it.kind === "guard") {
    combat.enemyGuard += it.value;
    playBattleSe("buff");
    playPortraitEffect("enemy", "buff");
    clog("敵はガード +" + it.value);
  } else if (it.kind === "special") {
    playBattleSe("area");
    dealSpecialMaxHpPercentToPlayer(combat, it.pct);
  }
  if (combat.playerHp <= 0) {
    endCombatLoss();
    return;
  }
  combat.turn++;
  startPlayerTurn();
}

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
    title.textContent = "VICTORY";
    sub.textContent = "タップで報酬へ";
  } else {
    title.textContent = "DEFEAT";
    sub.textContent = "タップで続行";
  }
  playJingle(kind);
  return new Promise((resolve) => {
    cutinResolve = { resolve };
  });
}

function dismissCutin() {
  if (!cutinKind) return;
  const overlay = document.getElementById("cutinOverlay");
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  cutinKind = null;
  if (cutinResolve) {
    cutinResolve.resolve();
    cutinResolve = null;
  }
}

function endCombatWin() {
  gold += combat.boss ? 100 : combat.elite ? 45 : 28;
  clog("勝利！");
  const pool = shuffle([
    "ext1002",
    "ext1005",
    "ext1003",
    "ext1006",
    "ext1001",
    "ext1011",
    "ext2001",
    "ext2004",
  ]);
  const picks = pool.slice(0, 3).map((k) => CARD_LIBRARY[k]);
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
  };
  stopBgm();
  showCutin("win").then(() => {
    openRewardScreen(picks);
  });
}

function buildRewardPickButton(def, mockS) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "reward-card-btn";
  const summaryLines =
    typeof def.effectSummaryLines === "function"
      ? def.effectSummaryLines(mockS)
      : typeof def.previewLines === "function"
        ? def.previewLines(mockS)
        : [];
  const detailLines =
    typeof def.previewLines === "function"
      ? def.previewLines(mockS)
      : summaryLines;
  const helpKeys =
    typeof def.peekHelpKeys === "function" ? def.peekHelpKeys() : [];
  b.innerHTML =
    '<div class="reward-card-inner ' +
    def.type +
    '">' +
    '<div class="card-bg-ext">' +
    '<img class="card-ext-img" src="' +
    EXT_IMG(def.extId) +
    '" alt="" />' +
    "</div>" +
    '<div class="card-fg">' +
    '<div class="card-top-row">' +
    '<span class="card-cost-badge"><span class="cost-zeus" aria-hidden="true">⚡</span>' +
    def.cost +
    "</span>" +
    '<div class="card-ext-name">' +
    escapeHtml(def.extNameJa) +
    "</div>" +
    "</div>" +
    '<img class="card-skill-corner" src="' +
    battleIconUrl(def.skillIcon) +
    '" alt="" />' +
    '<div class="card-effect-summary">' +
    summaryLines.map((t) => "<p>" + escapeHtml(t) + "</p>").join("") +
    "</div>" +
    '<div class="reward-card-detail">' +
    detailLines.map((t) => "<p>" + escapeHtml(t) + "</p>").join("") +
    (helpKeys.length
      ? '<div class="card-peek-help">' + buildPeekHelpHtml(helpKeys) + "</div>"
      : "") +
    "</div>" +
    "</div>" +
    "</div>";
  return b;
}

function openRewardScreen(picks) {
  combat = null;
  const box = document.getElementById("rewardPicks");
  if (!box || !postCombatSnapshot) return;
  box.innerHTML = "";
  const mockS = {
    playerPhy: postCombatSnapshot.playerPhy,
    playerInt: postCombatSnapshot.playerInt,
    playerAgi: postCombatSnapshot.playerAgi,
    enemyPhy: postCombatSnapshot.enemyPhy,
    enemyInt: postCombatSnapshot.enemyInt,
  };
  picks.forEach((def) => {
    const b = buildRewardPickButton(def, mockS);
    b.addEventListener("click", () => {
      advanceAfterRewardPick(def.libraryKey);
    });
    box.appendChild(b);
  });
  showView("reward");
  syncResources();
}

/** @param {string | null} libraryKey null = skip */
function advanceAfterRewardPick(libraryKey) {
  if (!postCombatSnapshot) {
    showView("map");
    renderMap();
    return;
  }
  ensureRunState();
  runState.playerHp = postCombatSnapshot.playerHp;
  runState.playerHpMax = postCombatSnapshot.playerHpMax;
  runState.deck = postCombatSnapshot.deck.map((c) => ({ ...c }));
  if (libraryKey) {
    runState.deck.push(copyCard(libraryKey));
  }
  const mid = postCombatSnapshot.mapNodeId;
  if (mid) {
    runState.pathNodeIds.push(mid);
    runState.lastMapNodeId = mid;
    if (mapNodeById(mid)?.type === "boss") {
      runState.runComplete = true;
      playSeClear();
    }
  }
  combat = null;
  postCombatSnapshot = null;
  showView("map");
  renderMap();
}

function endCombatLoss() {
  stopBgm();
  postCombatSnapshot = null;
  showCutin("lose").then(() => {
    showView("over");
    document.getElementById("gameOverMsg").textContent =
      "HP が 0 になりました。デッキとマップの立ち回りを調整して再挑戦しよう。";
    combat = null;
    runState = null;
  });
}

function openShop() {
  showView("shop");
  const list = document.getElementById("shopList");
  list.innerHTML = "";
  const offers = [
    { label: "エリートブレード", price: 95, key: "ext2001" },
    { label: "エリートアーマー", price: 85, key: "ext2004" },
    { label: "ドラゴン", price: 70, key: "ext1022" },
    { label: "ノービスマスケット", price: 55, key: "ext1002" },
  ];
  offers.forEach((o) => {
    const def = CARD_LIBRARY[o.key];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "node-btn shop";
    b.style.width = "100%";
    b.textContent = o.label + " — " + o.price + " GUM（「" + def.skillNameJa + "」）";
    b.addEventListener("click", () => {
      if (gold < o.price) return;
      gold -= o.price;
      ensureRunState();
      runState.deck.push(copyCard(o.key));
      b.disabled = true;
      syncResources();
    });
    list.appendChild(b);
  });
}

function resetRun() {
  gold = 75;
  combat = null;
  runState = null;
  pendingShopNodeId = null;
  postCombatSnapshot = null;
  stopBgm();
  dismissCutin();
  showView("map");
  renderMap();
}

function wireAssets() {
  document.querySelectorAll("[data-icon]").forEach((el) => {
    const key = el.getAttribute("data-icon");
    const paths = {
      gum: "Image/Icons/gum.png",
      cp: "Image/Icons/cp.png",
      ce: "Image/Icons/ce.png",
      deck: "Image/Icons/ce.png",
    };
    el.src = img(paths[key]);
  });
  document.querySelectorAll("[data-stat]").forEach((el) => {
    el.src = img(
      "Image/BattleIcons/Parameters/" + el.getAttribute("data-stat") + ".png"
    );
  });
  const agiIcon = img("Image/BattleIcons/Buffs/buf_agi.png");
  const pi = document.getElementById("pAgiStatIcon");
  const ei = document.getElementById("eAgiStatIcon");
  if (pi) pi.src = agiIcon;
  if (ei) ei.src = agiIcon;
}

function openDeckModal() {
  if (!combat) return;
  const modal = document.getElementById("deckModal");
  const list = document.getElementById("deckModalList");
  const count = document.getElementById("deckModalCount");
  const cards = combat.drawPile
    .slice()
    .sort((a, b) => a.extNameJa.localeCompare(b.extNameJa, "ja"));
  count.textContent = "残り " + cards.length + " 枚（引く順序は非表示）";
  list.innerHTML = "";
  const tally = new Map();
  for (const c of cards) {
    const k = c.extNameJa + "|" + c.cost;
    tally.set(k, (tally.get(k) || 0) + 1);
  }
  for (const [k, num] of tally) {
    const name = k.split("|")[0];
    const cost = k.split("|")[1];
    const row = document.createElement("div");
    row.className = "deck-modal-row";
    row.textContent = "×" + num + "  " + name + "（⚡" + cost + "）";
    list.appendChild(row);
  }
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeDeckModal() {
  const modal = document.getElementById("deckModal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function init() {
  document.getElementById("btnEndTurn").addEventListener("click", () => {
    if (!combat || view !== "combat") return;
    combat.hand.forEach((c) => combat.discardPile.push(c));
    combat.hand = [];
    renderCombat();
    enemyTurn();
  });
  document.getElementById("btnDeckOpen").addEventListener("click", () => {
    openDeckModal();
  });
  document.getElementById("deckModalClose").addEventListener("click", () => {
    closeDeckModal();
  });
  document.getElementById("deckModal").addEventListener("click", (ev) => {
    if (ev.target.id === "deckModal") closeDeckModal();
  });
  document.getElementById("cutinOverlay").addEventListener("click", () => {
    dismissCutin();
  });
  document.getElementById("btnSkipReward").addEventListener("click", () => {
    advanceAfterRewardPick(null);
  });
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
  showView("map");
  renderMap();
}

init();
