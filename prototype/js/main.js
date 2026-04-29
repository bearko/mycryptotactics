import { MAP_LAYERS } from "./map.js";
import {
  createCardRuntime,
  shuffle,
  battleIconUrl,
} from "./cards.js";
import { img, LEADER, ENEMY_IMG, EXT_IMG, BATTLE_BG } from "./constants.js";

let gold = 75;
let layerIndex = 0;
let view = "map";
/** @type {null | { deck: any[], playerHp: number, playerHpMax: number }} */
let runState = null;
let combat = null;

function clog(msg) {
  const el = document.getElementById("clog");
  const p = document.createElement("p");
  p.textContent = msg;
  el.insertBefore(p, el.firstChild);
}

function dealDamage(s, base) {
  let v = base + (s.enemyVulnerable || 0);
  s.enemyVulnerable = 0;
  const blocked = Math.min(s.enemyBlock, v);
  s.enemyBlock -= blocked;
  v -= blocked;
  s.enemyHp = Math.max(0, s.enemyHp - v);
  clog(blocked ? `敵に ${v} ダメージ（ブロックで ${blocked} 軽減）` : `敵に ${v} ダメージ`);
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

const { CARD_LIBRARY, copyCard, makeStarterDeck } = createCardRuntime(
  clog,
  dealDamage,
  drawCards
);

function ensureRunState() {
  if (!runState) {
    runState = {
      deck: makeStarterDeck(),
      playerHp: LEADER.hpMax,
      playerHpMax: LEADER.hpMax,
    };
  }
}

function syncResources() {
  document.getElementById("goldVal").textContent = String(gold);
  document.getElementById("layerVal").textContent =
    layerIndex < MAP_LAYERS.length ? String(layerIndex + 1) : "クリア";
  ensureRunState();
  document.getElementById("hpMapVal").textContent =
    `${runState.playerHp}/${runState.playerHpMax}`;
}

function renderMap() {
  const host = document.getElementById("mapRows");
  host.innerHTML = "";
  if (layerIndex >= MAP_LAYERS.length) {
    host.innerHTML =
      "<p style='color:var(--accent);margin:0 0 0.75rem'>このランをクリアしました。</p>" +
      "<button type='button' class='action primary' id='btnRestartClear'>もう一度</button>";
    document.getElementById("btnRestartClear").addEventListener("click", resetRun);
    syncResources();
    return;
  }
  const layer = MAP_LAYERS[layerIndex];
  const row = document.createElement("div");
  row.className = "map-row";
  const lab = document.createElement("span");
  lab.className = "map-row-label";
  lab.textContent = layer.label;
  row.appendChild(lab);
  layer.nodes.forEach((node) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className =
      "node-btn " +
      (node.type === "fight"
        ? "fight"
        : node.type === "rest"
          ? "rest"
          : node.type === "shop"
            ? "shop"
            : "boss");
    b.textContent = node.label;
    b.addEventListener("click", () => enterNode(node));
    row.appendChild(b);
  });
  host.appendChild(row);
  syncResources();
}

function showView(name) {
  view = name;
  document.getElementById("mapView").classList.toggle("hidden", name !== "map");
  document.getElementById("combatView").classList.toggle("hidden", name !== "combat");
  document.getElementById("shopView").classList.toggle("hidden", name !== "shop");
  document.getElementById("gameOver").classList.toggle("hidden", name !== "over");
}

function enterNode(node) {
  if (node.type === "rest") {
    ensureRunState();
    const heal = Math.floor(runState.playerHpMax * 0.35);
    runState.playerHp = Math.min(runState.playerHpMax, runState.playerHp + heal);
    layerIndex++;
    renderMap();
    return;
  }
  if (node.type === "shop") {
    openShop();
    return;
  }
  startCombat(node.elite, node.type === "boss");
}

function startCombat(elite, boss) {
  ensureRunState();
  const deck = runState.deck.map((c) => ({ ...c }));
  const playerHpMax = runState.playerHpMax;
  const playerHp = runState.playerHp;
  const enemyHp = boss ? 72 : elite ? 48 : 32;
  const enemyId = boss ? 505 : elite ? 418 : 314;
  combat = {
    deck,
    drawPile: [],
    discardPile: [],
    hand: [],
    playerHp,
    playerHpMax,
    playerBlock: 0,
    energy: 3,
    energyMax: 3,
    enemyHp,
    enemyHpMax: enemyHp,
    enemyBlock: 0,
    enemyVulnerable: 0,
    bonusEnergyNext: 0,
    enemyIntent: { kind: "attack", value: boss ? 14 : elite ? 10 : 7 },
    turn: 1,
    elite: !!elite,
    boss: !!boss,
    enemyName: boss ? "門番：影の軍勢" : elite ? "精鋭" : "斥候",
    enemyImgId: enemyId,
  };
  combat.drawPile = shuffle(combat.deck.map((c) => copyCard(c.libraryKey)));
  showView("combat");
  const bgFile = boss ? "1004" : elite ? "1002" : "1001";
  document.getElementById("combatBg").style.backgroundImage =
    "url('" + BATTLE_BG(bgFile) + "')";
  document.getElementById("leaderImg").src = LEADER.img();
  document.getElementById("leaderName").textContent = LEADER.nameJa;
  document.getElementById("enemyImg").src = ENEMY_IMG(enemyId);
  document.getElementById("enemyName").textContent = combat.enemyName;
  document.getElementById("clog").innerHTML = "";
  clog(boss ? "ボス戦開始！" : "戦闘開始");
  startPlayerTurn();
}

function intentText() {
  const it = combat.enemyIntent;
  if (it.kind === "attack") return "次の意図\n攻撃 " + it.value;
  if (it.kind === "block") return "次の意図\nブロック " + it.value;
  return "—";
}

function rollNextIntent() {
  const r = Math.random();
  if (combat.boss) {
    combat.enemyIntent =
      r < 0.5
        ? { kind: "attack", value: 12 + Math.floor(Math.random() * 6) }
        : { kind: "block", value: 10 };
  } else {
    combat.enemyIntent =
      r < 0.55
        ? { kind: "attack", value: 5 + Math.floor(Math.random() * 6) }
        : { kind: "block", value: 6 };
  }
}

function startPlayerTurn() {
  combat.playerBlock = 0;
  combat.energy = combat.energyMax + (combat.bonusEnergyNext || 0);
  combat.bonusEnergyNext = 0;
  drawCards(combat, 5);
  rollNextIntent();
  renderCombat();
}

function renderCombat() {
  document.getElementById("pHp").textContent = String(combat.playerHp);
  document.getElementById("pHpMax").textContent = String(combat.playerHpMax);
  document.getElementById("pBlock").textContent = String(combat.playerBlock);
  document.getElementById("eHp").textContent =
    String(combat.enemyHp) + " / " + String(combat.enemyHpMax);
  document.getElementById("eBlock").textContent = String(combat.enemyBlock);
  document.getElementById("energyVal").textContent = String(combat.energy);
  document.getElementById("energyMax").textContent = String(combat.energyMax);
  document.getElementById("enemyIntent").textContent = intentText();
  const handEl = document.getElementById("hand");
  handEl.innerHTML = "";
  combat.hand.forEach((card, idx) => {
    const el = document.createElement("div");
    el.className = "card " + card.type + (card.cost > combat.energy ? " disabled" : "");
    el.innerHTML =
      '<span class="card-cost">' +
      card.cost +
      "</span>" +
      '<img class="card-ext-img" src="' +
      EXT_IMG(card.extId) +
      '" alt="" />' +
      '<div class="card-ext-name">' +
      card.extNameJa +
      "</div>" +
      '<div class="card-skill-row">' +
      '<img src="' +
      battleIconUrl(card.skillIcon) +
      '" alt="" />' +
      '<span class="card-skill-name">' +
      card.skillNameJa +
      "</span></div>" +
      '<div class="card-desc">' +
      card.text +
      "</div>";
    el.addEventListener("click", () => playCard(idx));
    handEl.appendChild(el);
  });
  syncResources();
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
    let dmg = it.value;
    const blk = Math.min(combat.playerBlock, dmg);
    combat.playerBlock -= blk;
    dmg -= blk;
    combat.playerHp -= dmg;
    clog(`敵の攻撃 → ${dmg} ダメージ` + (blk ? `（ブロック ${blk}）` : ""));
  } else {
    combat.enemyBlock += it.value;
    clog("敵はブロックを構えた");
  }
  if (combat.playerHp <= 0) {
    endCombatLoss();
    return;
  }
  combat.turn++;
  startPlayerTurn();
}

function endCombatWin() {
  gold += combat.boss ? 100 : combat.elite ? 45 : 28;
  clog("勝利！");
  const pool = shuffle(["ext1002", "ext1005", "ext1003", "ext1006", "ext1001"]);
  const picks = pool.slice(0, 3).map((k) => CARD_LIBRARY[k]);
  const overlay = document.getElementById("rewardOverlay");
  const box = document.getElementById("rewardPicks");
  box.innerHTML = "";
  picks.forEach((def) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "node-btn";
    b.style.borderLeftColor = "var(--accent)";
    b.textContent =
      def.extNameJa +
      "（⚡" +
      def.cost +
      "）「" +
      def.skillNameJa +
      "」— " +
      def.text;
    b.addEventListener("click", () => {
      if (combat) combat.deck.push(copyCard(def.libraryKey));
      closeReward();
      advanceAfterNode();
    });
    box.appendChild(b);
  });
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
}

function closeReward() {
  const overlay = document.getElementById("rewardOverlay");
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
}

function advanceAfterNode() {
  if (combat) {
    runState.playerHp = combat.playerHp;
    runState.playerHpMax = combat.playerHpMax;
    runState.deck = combat.deck.map((c) => ({ ...c }));
    combat = null;
  }
  layerIndex++;
  showView("map");
  renderMap();
}

function endCombatLoss() {
  showView("over");
  document.getElementById("gameOverMsg").textContent =
    "HP が 0 になりました。デッキとマップの立ち回りを調整して再挑戦しよう。";
  combat = null;
  runState = null;
}

function openShop() {
  showView("shop");
  const list = document.getElementById("shopList");
  list.innerHTML = "";
  const offers = [
    { label: "ノービスカタナ", price: 95, key: "ext1006" },
    { label: "ノービスホース", price: 85, key: "ext1005" },
    { label: "ノービスマスケット", price: 70, key: "ext1002" },
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
  layerIndex = 0;
  combat = null;
  runState = null;
  closeReward();
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
    };
    el.src = img(paths[key]);
  });
  document.querySelectorAll("[data-stat]").forEach((el) => {
    el.src = img(
      "Image/BattleIcons/Parameters/" + el.getAttribute("data-stat") + ".png"
    );
  });
  document.getElementById("brandIcon").src = img("Image/Icons/mch_icon.png");
}

function init() {
  document.getElementById("btnEndTurn").addEventListener("click", () => {
    if (!combat || view !== "combat") return;
    combat.hand.forEach((c) => combat.discardPile.push(c));
    combat.hand = [];
    renderCombat();
    enemyTurn();
  });
  document.getElementById("btnSkipReward").addEventListener("click", () => {
    closeReward();
    advanceAfterNode();
  });
  document.getElementById("btnLeaveShop").addEventListener("click", () => {
    layerIndex++;
    showView("map");
    renderMap();
  });
  document.getElementById("btnRestart").addEventListener("click", resetRun);
  wireAssets();
  showView("map");
  renderMap();
}

init();
