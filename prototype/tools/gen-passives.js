/**
 * gen-passives.js — SPEC-006 §18 Phase 4j codemod
 *
 * MCH ヒーロー CSV (Common+Uncommon+Rare+Epic+Legendary 全 210 体)
 * から PassiveDef 宣言形式に変換、`passives-generated.js` を出力。
 *
 * 使い方:
 *   node prototype/tools/gen-passives.js <csv> > prototype/js/passives-generated.js
 *
 * 既存の gen-{uncommon,rare,epic,legendary}-heroes.js のパース層を流用しつつ、
 * 出力先を「ハードコード関数」ではなく「PassiveDef オブジェクト」に変更。
 *
 * 対応する trigger 種別 (SPEC-006 §18.1):
 *   combat.started / self.cardPlayed / self.tookDamage / self.died /
 *   self.hpBelow / party.hpBelow / enemy.hpBelow / self.statRatioAbove /
 *   enemy.cardPlayed
 *
 * action 語彙 (Phase 4j HANDOFF 提案):
 *   damage / heal / applyStatus / buffStat /
 *   addGuard / addShield / revive
 *
 * 設計上の簡略化:
 * - 元 DB の {triggerRate} placeholder は実値が無いためレアリティ別の既定値で埋める
 * - ステータス上昇/減少の N% は flat +N にスケール (レアリティ別 cap)
 * - 状態異常 stack 数もレアリティ別 (Common/Uncommon 1, Rare 2, Epic 3, Legendary 4)
 * - 元 DB の派閥 / 位置指定 (前衛/中衛/最後尾 等) は target を foremost か self に統一
 */
const fs = require("fs");

// ─── heroId → passiveKey マスタ ────────────────────────────────
// gen-{uncommon,rare,epic,legendary}-heroes.js の PASSIVE_KEYS を統合 + 1001-1010 の手動キー
const PASSIVE_KEYS = {
  // Common 1001-1003 (legacy, 既存実装あり)
  1001: "doyle", 1002: "kaihime", 1003: "zhang",
  // Common 1004-1010 (PR #50)
  1004: "seton", 1005: "inoh", 1006: "pythagoras", 1007: "daejanggeum",
  1008: "sullivan", 1009: "hercules", 1010: "giraffa",
  // Uncommon 2001-2053 (PR #52)
  2001: "wright_brothers", 2002: "spartacus", 2003: "jack_ripper", 2004: "schubert",
  2005: "grimm", 2006: "archimedes", 2007: "santa", 2008: "schrodinger",
  2009: "ranmaru", 2010: "kafka", 2011: "sunzi", 2012: "mitsunari",
  2013: "xuchu", 2014: "yoshinobu", 2015: "montesquieu", 2016: "anastasia",
  2017: "geronimo", 2018: "chacha", 2019: "kintaro", 2020: "mitsuhide",
  2021: "shinsaku", 2022: "andersen", 2023: "michelangelo", 2024: "salome",
  2025: "satoshi", 2026: "hideyoshi", 2027: "aesop", 2028: "chun_sisters",
  2029: "ikkyu", 2030: "izumo", 2031: "bismarck", 2032: "montgomery",
  2033: "goethe", 2034: "plato", 2035: "sarutahiko", 2036: "ichiyo",
  2037: "sunce", 2038: "kiyomori", 2039: "dostoevsky", 2040: "mulan",
  2041: "franklin", 2042: "gama", 2043: "saizo", 2044: "socrates",
  2045: "daruma", 2046: "masako", 2047: "aristotle", 2048: "renoir",
  2049: "chopin", 2050: "ippatsuman", 2051: "armaroid", 2052: "uka",
  2053: "ramon",
  // Rare 3001-3054 (PR #55、3033 欠番)
  3001: "etheremon_red", 3002: "dartagnan", 3003: "gennai", 3004: "mata_hari",
  3005: "etheremon_blue", 3006: "etheremon_green", 3007: "nero", 3008: "nostradamus",
  3009: "taikoubou", 3010: "hattori", 3011: "keiji", 3012: "shiro_amakusa",
  3013: "goemon", 3014: "kanetsugu", 3015: "ivan", 3016: "basho",
  3017: "sanzo", 3018: "benkei", 3019: "huangzhong", 3020: "diaochan",
  3021: "valentinus", 3022: "pocahontas", 3023: "sunjian", 3024: "rubens",
  3025: "yukimura", 3026: "robin_hood", 3027: "yangduanhe", 3028: "monet",
  3029: "mary_read", 3030: "shakespeare", 3031: "earp", 3032: "bonny",
  3034: "percival", 3035: "komachi", 3036: "starr", 3037: "magellan",
  3038: "sasuke", 3039: "lakshmibai", 3040: "gilgamesh", 3041: "raphael",
  3042: "columbus", 3043: "newton", 3044: "ieyasu", 3045: "hajime",
  3046: "maria_theresia", 3047: "attila", 3048: "machao", 3049: "dongzhuo",
  3050: "maeve", 3051: "yoritomo", 3052: "casshern", 3053: "crystal_boy",
  3054: "douran",
  // Epic 4001-4061 (PR #58)
  4001: "zhangfei", 4002: "nightingale", 4003: "beethoven", 4004: "kojiro",
  4005: "katsu_kaishu", 4006: "billy_kid", 4007: "edison", 4008: "marco_polo",
  4009: "masamune", 4010: "ouki", 4011: "marx", 4012: "okita",
  4013: "tchaikovsky", 4014: "antoinette", 4015: "yang_guifei", 4016: "lubu",
  4017: "curie", 4018: "sunquan", 4019: "kamehameha", 4020: "calamity_jane",
  4021: "vangogh", 4022: "tomoe", 4023: "zhaoyun", 4024: "yuefei",
  4025: "shingen", 4026: "caesar", 4027: "hijikata", 4028: "darwin",
  4029: "yamato_takeru", 4030: "mozart", 4031: "masakado", 4032: "kenshin",
  4033: "lincoln", 4034: "satoshi_omega", 4035: "kondo", 4036: "blackbeard",
  4037: "guanyu", 4038: "brynhildr", 4039: "saigo", 4040: "hanxin",
  4041: "tesla", 4042: "buddha", 4043: "atom", 4044: "fabre",
  4045: "lancelot", 4046: "rasputin", 4047: "hannibal", 4048: "zhouyu",
  4049: "xiahoudun", 4050: "simayi", 4051: "rama", 4052: "drake",
  4053: "tell", 4054: "michizane", 4055: "tadakatsu", 4056: "soseki",
  4057: "boudica", 4058: "yatterman", 4059: "cobra", 4060: "suzuishi",
  4061: "tyrfing",
  // Legendary 5001-5033 (PR #66)
  5001: "nobunaga", 5002: "napoleon", 5003: "caocao", 5004: "washington",
  5005: "davinci", 5006: "arthur", 5007: "jeanne", 5008: "ryoma",
  5009: "liubei", 5010: "einstein", 5011: "himiko", 5012: "bach",
  5013: "chinggis", 5014: "charlemagne", 5015: "kongming", 5016: "cleopatra",
  5017: "alexander", 5018: "qinshihuang", 5019: "yoshitsune", 5020: "tutankhamun",
  5021: "seimei", 5022: "guji", 5023: "richard", 5024: "hokusai",
  5025: "xiangyu", 5026: "liubang", 5027: "galileo", 5028: "yoichi",
  5029: "black_prince", 5030: "wuzetian", 5031: "scipio", 5032: "musashi",
  5033: "yatagarasu",
};

// ─── レアリティ別スケーリング ──────────────────────────────
const RARITY_SCALING = {
  Common:    { statCap: 3, debuffCap: 2, stackBase: 1 },
  Uncommon:  { statCap: 5, debuffCap: 4, stackBase: 1 },
  Rare:      { statCap: 6, debuffCap: 5, stackBase: 2 },
  Epic:      { statCap: 7, debuffCap: 6, stackBase: 3 },
  Legendary: { statCap: 9, debuffCap: 7, stackBase: 4 },
};

// ─── 既定 triggerRate (元 DB の {triggerRate} placeholder の代替) ────
const DEFAULT_TRIGGER_RATE = {
  "combat.started": 1.0,
  "self.cardPlayed": 0.4,
  "self.tookDamage": 0.5,
  "self.died": 1.0,
  "self.hpBelow": 1.0,         // oncePerCombat で実質 1 回
  "party.hpBelow": 1.0,
  "enemy.hpBelow": 1.0,
  "self.statRatioAbove": 1.0,
  "enemy.cardPlayed": 0.4,
};

// ─── CSV パース ─────────────────────────────────────────────────
function parseCsvLine(line) {
  const cells = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuote = false;
      else cur += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ",") { cells.push(cur); cur = ""; }
      else cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

function parseCsv(text) {
  const out = [];
  let buf = "", inQuote = false;
  for (const ch of text) {
    if (ch === '"') inQuote = !inQuote;
    if (ch === "\n" && !inQuote) { out.push(buf); buf = ""; }
    else buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

// ─── trigger 検出 ──────────────────────────────────────────────
function detectTrigger(text) {
  if (!text) return { kind: "combat.started", oncePerCombat: true };

  if (/敵の誰かがActive Skill/.test(text)) {
    return { kind: "enemy.cardPlayed", oncePerCombat: false };
  }
  if (/Active Skillを使用した後/.test(text)) {
    return { kind: "self.cardPlayed", oncePerCombat: false };
  }
  if (/Active Skillでダメージを受けた後/.test(text)) {
    return { kind: "self.tookDamage", oncePerCombat: false };
  }
  if (/死亡した後/.test(text)) {
    return { kind: "self.died", oncePerCombat: true };
  }
  // HP 閾値 (味方/敵全体は別)
  let m = text.match(/味方全体のHP合計が\s*(\d+)\s*%未満/);
  if (m) return { kind: "party.hpBelow", oncePerCombat: true, threshold: +m[1] / 100 };
  m = text.match(/敵全体のHP合計が\s*(\d+)\s*%未満/);
  if (m) return { kind: "enemy.hpBelow", oncePerCombat: true, threshold: +m[1] / 100 };
  m = text.match(/HPが\s*(\d+)\s*%未満/);
  if (m) return { kind: "self.hpBelow", oncePerCombat: true, threshold: +m[1] / 100 };
  m = text.match(/合計が元の値の\s*(\d+)\s*%以上/);
  if (m) return { kind: "self.statRatioAbove", oncePerCombat: true, threshold: +m[1] / 100 };
  if (/合計が元の値の\s*\d+\s*%未満/.test(text)) {
    // 例: 3012 天草四郎 (statRatioBelow 簡略化)
    return { kind: "combat.started", oncePerCombat: true, _note: "self.statRatioBelow → combat.started 簡略化" };
  }
  if (/バトル開始時/.test(text)) {
    return { kind: "combat.started", oncePerCombat: true };
  }
  // 不明 → combat.started fallback
  return { kind: "combat.started", oncePerCombat: true, _note: "trigger 不明、combat.started 既定値" };
}

// ─── 効果テキスト解析 ───────────────────────────────────────────
function parseEffects(text, rarity) {
  const scaling = RARITY_SCALING[rarity] || RARITY_SCALING.Common;
  const e = {
    phyDmg: null, intDmg: null, heal: null,
    selfPhy: 0, selfInt: 0, selfAgi: 0,
    enemyPhy: 0, enemyInt: 0, enemyAgi: 0,
    poison: 0, bleed: 0,
    shield: 0, guard: 0,
    resurrect: false,
    repeat: 1,
  };
  if (!text) return e;

  // 1v1 ベース: 自身/味方系は self、敵系は enemy.foremost に統一
  const SELF_PREFIX = "(?:自身|味方全体|先頭の味方|最後尾の味方|中衛の味方|HPが最も低い味方|最大HPが最も低い味方|PHYが最も高い味方|INTが最も高い味方|AGIが最も高い味方)";
  const ENEMY_PREFIX = "(?:敵全体|先頭の敵|最後尾の敵|中衛の敵|HPが最も低い敵|HPが最も高い敵|最大HPが最も高い敵|PHYが最も高い敵|PHYが最も低い敵|INTが最も高い敵|INTが最も低い敵|AGIが最も高い敵|敵)";

  // 連続発動回数
  const repeatM = text.match(/(\d+)回繰り返す/);
  if (repeatM) e.repeat = +repeatM[1];

  // PHY ダメ
  const phyRange = text.match(/自身のPHYの(\d+)\s*~\s*(\d+)\s*%\s*ダメージ/);
  if (phyRange) e.phyDmg = { min: +phyRange[1], max: +phyRange[2] };
  else {
    const phySingle = text.match(/自身のPHYの(\d+)\s*%\s*ダメージ/);
    if (phySingle) e.phyDmg = { min: +phySingle[1], max: +phySingle[1] };
  }

  // INT ダメ
  const intRange = text.match(/自身のINTの(\d+)\s*~\s*(\d+)\s*%\s*ダメージ/);
  if (intRange) e.intDmg = { min: +intRange[1], max: +intRange[2] };
  else {
    const intSingle = text.match(/自身のINTの(\d+)\s*%\s*ダメージ/);
    if (intSingle) e.intDmg = { min: +intSingle[1], max: +intSingle[1] };
  }

  // 回復係数
  const healRange = text.match(/回復係数の(\d+)\s*~\s*(\d+)\s*%\s*回復/);
  if (healRange) e.heal = { min: +healRange[1], max: +healRange[2] };
  else {
    const healSingle = text.match(/回復係数の(\d+)\s*%\s*回復/);
    if (healSingle) e.heal = { min: +healSingle[1], max: +healSingle[1] };
  }

  // 自己ステ buff
  function findStatUp(stat) {
    const re = new RegExp(`${SELF_PREFIX}の${stat}を[^/]*?の(\\d+)\\s*~?\\s*(\\d+)?\\s*%\\s*アップ`);
    const m = text.match(re);
    if (!m) return 0;
    const pct = +m[2] || +m[1];
    return Math.max(1, Math.min(scaling.statCap, Math.floor(pct / 10)));
  }
  e.selfPhy = findStatUp("PHY");
  e.selfInt = findStatUp("INT");
  e.selfAgi = findStatUp("AGI");
  // flat 系: "自身のINTを50アップ" のような表記
  const flatPhy = text.match(/自身のPHYを(\d+)アップ/);
  if (flatPhy && !e.selfPhy) e.selfPhy = Math.min(scaling.statCap, Math.max(1, Math.floor(+flatPhy[1] / 10)));
  const flatInt = text.match(/自身のINTを(\d+)アップ/);
  if (flatInt && !e.selfInt) e.selfInt = Math.min(scaling.statCap, Math.max(1, Math.floor(+flatInt[1] / 10)));
  const flatAgi = text.match(/自身のAGIを(\d+)アップ/);
  if (flatAgi && !e.selfAgi) e.selfAgi = Math.min(scaling.statCap, Math.max(1, Math.floor(+flatAgi[1] / 10)));

  // 敵ステ debuff
  function findStatDown(stat) {
    const re = new RegExp(`${ENEMY_PREFIX}の${stat}を[^/]*?の(\\d+)\\s*%\\s*ダウン`);
    const m = text.match(re);
    if (!m) return 0;
    return -Math.max(1, Math.min(scaling.debuffCap, Math.floor(+m[1] / 10)));
  }
  e.enemyPhy = findStatDown("PHY");
  e.enemyInt = findStatDown("INT");
  e.enemyAgi = findStatDown("AGI");

  // 状態異常
  if (/毒/.test(text)) e.poison += scaling.stackBase;
  if (/出血/.test(text)) e.bleed += scaling.stackBase;
  if (/気絶|睡眠/.test(text)) e.bleed += scaling.stackBase;
  if (/衰弱|恐怖|呪い|混乱|バインド/.test(text)) e.poison += scaling.stackBase;

  // シールド系
  if (/自身のシールド|シールド.*付与|シールド.*更新/.test(text)) {
    e.shield = (rarity === "Legendary" ? 12 : rarity === "Epic" ? 10 : rarity === "Rare" ? 9 : 8);
  }
  // バリア / デコイ → ガード
  if (/バリアを付与|デコイを付与/.test(text)) {
    e.guard = (rarity === "Legendary" ? 10 : rarity === "Epic" ? 8 : 6);
  }

  // 復活
  if (/復活/.test(text)) e.resurrect = true;

  return e;
}

// ─── PassiveDef 生成 ───────────────────────────────────────────
function buildPassiveDef(row) {
  const heroId = +row.id;
  const passiveKey = PASSIVE_KEYS[heroId];
  if (!passiveKey) return null; // skip 11xxx duplicates
  const rarity = row.rarity;
  const passiveName = row.passive_name_ja;
  const text = row.passive_text_ja || "";
  const trig = detectTrigger(text);
  const e = parseEffects(text, rarity);

  const effects = [];

  // 1v1 では damage/buff/etc の target を foremost か self に正規化
  if (e.phyDmg) {
    const avg = (e.phyDmg.min + e.phyDmg.max) / 2 / 100;
    if (e.repeat > 1) {
      for (let i = 0; i < e.repeat; i++) {
        effects.push({ target: "enemy.foremost", action: "damage", coef: { phy: avg } });
      }
    } else {
      effects.push({ target: "enemy.foremost", action: "damage", coef: { phy: avg } });
    }
  }
  if (e.intDmg) {
    const avg = (e.intDmg.min + e.intDmg.max) / 2 / 100;
    if (e.repeat > 1) {
      for (let i = 0; i < e.repeat; i++) {
        effects.push({ target: "enemy.foremost", action: "damage", coef: { int: avg } });
      }
    } else {
      effects.push({ target: "enemy.foremost", action: "damage", coef: { int: avg } });
    }
  }
  if (e.heal) {
    const avg = (e.heal.min + e.heal.max) / 2 / 100;
    effects.push({ target: "self", action: "heal", coef: { hp: avg } });
  }
  if (e.selfPhy) effects.push({ target: "self", action: "buffStat", stat: "phy", value: e.selfPhy });
  if (e.selfInt) effects.push({ target: "self", action: "buffStat", stat: "int", value: e.selfInt });
  if (e.selfAgi) effects.push({ target: "self", action: "buffStat", stat: "agi", value: e.selfAgi });
  if (e.enemyPhy) effects.push({ target: "enemy.foremost", action: "buffStat", stat: "phy", value: e.enemyPhy });
  if (e.enemyInt) effects.push({ target: "enemy.foremost", action: "buffStat", stat: "int", value: e.enemyInt });
  if (e.enemyAgi) effects.push({ target: "enemy.foremost", action: "buffStat", stat: "agi", value: e.enemyAgi });
  if (e.poison) effects.push({ target: "enemy.foremost", action: "applyStatus", status: "poison", stacks: e.poison });
  if (e.bleed) effects.push({ target: "enemy.foremost", action: "applyStatus", status: "bleed", stacks: e.bleed });
  if (e.shield) effects.push({ target: "self", action: "addShield", value: e.shield });
  if (e.guard) effects.push({ target: "self", action: "addGuard", value: e.guard });
  if (e.resurrect) effects.push({ target: "self", action: "revive", coef: { hpRatio: 0.20 } });

  // 効果が 0 件の場合 fallback (PHY+1)
  if (effects.length === 0) {
    effects.push({ target: "self", action: "buffStat", stat: "phy", value: 1 });
  }

  // PassiveDef オブジェクト
  const def = {
    passiveKey,
    trigger: trig.kind,
    triggerRate: DEFAULT_TRIGGER_RATE[trig.kind] ?? 1.0,
    oncePerCombat: !!trig.oncePerCombat,
  };
  if (trig.threshold != null) def.threshold = trig.threshold;
  def.effects = effects;
  def.cutinSkillName = passiveName;
  // 注記 (簡略化や fallback の根拠)
  const notes = [];
  if (trig._note) notes.push(trig._note);
  if (effects.length === 1 && effects[0].action === "buffStat" && effects[0].value === 1) {
    notes.push("元 DB の効果が解析不能 → PHY+1 fallback");
  }
  if (notes.length > 0) def.notes = notes.join("; ");
  return def;
}

// ─── main ───────────────────────────────────────────────────────
function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("usage: gen-passives.js <heroes csv>");
    process.exit(1);
  }
  const raw = fs.readFileSync(inputPath, "utf-8");
  const lines = parseCsv(raw);
  if (lines.length === 0) { console.error("empty CSV"); process.exit(1); }
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h] = cells[i] || "");
    return obj;
  });

  const targetRarities = new Set(["Common", "Uncommon", "Rare", "Epic", "Legendary"]);
  const defs = [];
  let skipped = 0;
  for (const row of rows) {
    if (!targetRarities.has(row.rarity)) continue;
    const id = +row.id;
    if (id >= 11001 && id <= 12000) { skipped++; continue; } // 11xxx invisible duplicates
    const def = buildPassiveDef(row);
    if (def) defs.push({ heroId: id, def });
  }
  defs.sort((a, b) => a.heroId - b.heroId);

  // 出力
  const lines2 = [];
  lines2.push("/**");
  lines2.push(" * passives-generated.js — SPEC-006 §18 Phase 4j codemod 出力");
  lines2.push(" *");
  lines2.push(` * 全 ${defs.length} 体のヒーローパッシブを宣言形式 PassiveDef に変換。`);
  lines2.push(" * 元データ: bearko/mycryptoheroes/Data/Heroes/heroes.csv");
  lines2.push(" * 生成スクリプト: prototype/tools/gen-passives.js");
  lines2.push(" *");
  lines2.push(" * 簡略化方針:");
  lines2.push(" * - 元 DB のパーティ系効果 (前衛/中衛/最後尾) は 1v1 ベースに合わせて self / enemy.foremost に統一");
  lines2.push(" * - 元 DB の状態異常 (気絶/睡眠/衰弱/恐怖/呪い/混乱/バインド) は出血 / 毒に集約");
  lines2.push(" * - 元 DB の {triggerRate} placeholder は実値が無いため trigger 種別ごとの既定値で埋める");
  lines2.push(" * - ステータス上昇 N% は flat +N にスケール (Common/Uncommon/Rare/Epic/Legendary で cap +3/+5/+6/+7/+9)");
  lines2.push(" * - 状態異常 stack は Common/Uncommon 1, Rare 2, Epic 3, Legendary 4");
  lines2.push(" *");
  lines2.push(" * runtime 仕様: prototype/js/passive-runtime.js + SPEC-006 §18.6");
  lines2.push(" */");
  lines2.push("");
  lines2.push("export const PASSIVES = {");

  for (const { heroId, def } of defs) {
    lines2.push(`  // heroId: ${heroId}`);
    lines2.push(`  ${JSON.stringify(def.passiveKey)}: ${stringifyDef(def)},`);
  }

  lines2.push("};");
  lines2.push("");

  const out = lines2.join("\n");
  console.log(out);

  console.error(`Generated ${defs.length} PassiveDefs (skipped ${skipped} 11xxx duplicates).`);
}

/** PassiveDef を 1 行 JSON に整形 (ただし effects は配列を読みやすく) */
function stringifyDef(def) {
  const parts = [];
  parts.push(`passiveKey: ${JSON.stringify(def.passiveKey)}`);
  parts.push(`trigger: ${JSON.stringify(def.trigger)}`);
  parts.push(`triggerRate: ${def.triggerRate}`);
  parts.push(`oncePerCombat: ${def.oncePerCombat}`);
  if (def.threshold != null) parts.push(`threshold: ${def.threshold}`);
  // effects は読みやすく
  const effLines = (def.effects || []).map(e => "      " + JSON.stringify(e));
  parts.push("effects: [\n" + effLines.join(",\n") + "\n    ]");
  if (def.cutinSkillName) parts.push(`cutinSkillName: ${JSON.stringify(def.cutinSkillName)}`);
  if (def.notes) parts.push(`notes: ${JSON.stringify(def.notes)}`);
  return "{\n    " + parts.join(",\n    ") + "\n  }";
}

main();
