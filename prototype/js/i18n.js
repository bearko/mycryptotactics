/**
 * i18n.js — JP/EN language switching
 *
 * Public API:
 *   getLang() / setLang(lang)
 *   t(key)                       — UI string lookup (data/i18n/ui.json)
 *   tHero(heroId, jaName)        — hero name lookup
 *   tExt(extId, jaName)          — extension name lookup
 *   tExtSkill(extId, jaName)     — extension active-skill name lookup
 *   tEnemy(enemyId, jaName)      — enemy name lookup
 *   tPassive(heroId, jaName)     — hero passive name lookup
 *   translateGameText(text)      — translates runtime-computed game text
 *                                   (effect strings like "PHYダメ 25-30%")
 *   onLangChange(handler)        — register a callback fired when lang changes
 *   applyDataI18n(root?)         — apply [data-i18n] attributes to text content
 *
 * Lang code: "ja" or "en". Default "ja". Persisted in localStorage("mct.lang").
 */

const LANG_KEY = "mct.lang";
const DEFAULT_LANG = "ja";

let _lang = DEFAULT_LANG;
let _ui = null;          // ui.json strings
let _heroes = null;      // heroes-en.json
let _exts = null;        // extensions-en.json
let _enemies = null;     // enemies-en.json
let _ready = false;
const _listeners = new Set();

export function getLang() { return _lang; }

export function setLang(lang) {
  if (lang !== "ja" && lang !== "en") return;
  if (lang === _lang) return;
  _lang = lang;
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
  document.documentElement.setAttribute("lang", lang);
  applyDataI18n(document);
  for (const fn of _listeners) {
    try { fn(lang); } catch (e) { console.error("lang listener error", e); }
  }
}

export function onLangChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function isReady() { return _ready; }

/** Init: reads localStorage + fetches all i18n JSON files. */
export async function initI18n() {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "ja" || stored === "en") _lang = stored;
  } catch (e) { /* ignore */ }
  document.documentElement.setAttribute("lang", _lang);

  const base = "data/i18n/";
  const [ui, heroes, exts, enemies] = await Promise.all([
    fetch(base + "ui.json").then(r => r.json()).catch(() => ({})),
    fetch(base + "heroes-en.json").then(r => r.json()).catch(() => ({})),
    fetch(base + "extensions-en.json").then(r => r.json()).catch(() => ({})),
    fetch(base + "enemies-en.json").then(r => r.json()).catch(() => ({})),
  ]);
  _ui = ui;
  _heroes = heroes;
  _exts = exts;
  _enemies = enemies;
  _ready = true;
}

/** UI string lookup. Returns key itself if not found. */
export function t(key, fallback) {
  if (!_ui) return fallback ?? key;
  const entry = _ui[key];
  if (!entry) return fallback ?? key;
  if (typeof entry === "string") return entry;
  return entry[_lang] ?? entry.ja ?? fallback ?? key;
}

function _lookupEn(table, id) {
  if (!table || id == null) return null;
  return table[String(id)] || null;
}

/** Hero name. Returns JA name if EN unavailable. */
export function tHero(heroId, jaName) {
  if (_lang === "ja") return jaName ?? "";
  const e = _lookupEn(_heroes, heroId);
  return (e && e.name) ? e.name : (jaName ?? "");
}

export function tPassive(heroId, jaName) {
  if (_lang === "ja") return jaName ?? "";
  const e = _lookupEn(_heroes, heroId);
  return (e && e.passiveName) ? e.passiveName : (jaName ?? "");
}

/** Returns full English passive description (or JA fallback). */
export function tPassiveText(heroId, jaText) {
  if (_lang === "ja") return jaText ?? "";
  const e = _lookupEn(_heroes, heroId);
  const raw = (e && e.passiveText) ? e.passiveText : (jaText ?? "");
  return condensePassiveText(raw);
}

/**
 * Shorten the upstream MCH English passive text — verbose by default
 * ("After this hero uses an Active Skill, {triggerRate}% chance to trigger.
 *   / Decrease the first ally's PHY by 15% of this hero's PHY. / ...")
 * → terse game-y phrasing readable at a glance.
 */
function condensePassiveText(text) {
  if (!text) return "";
  let s = String(text);
  // Trigger preludes → compact tag at the start
  s = s.replace(/At the start of battle,?\s*\{triggerRate\}%\s*chance to trigger\.\s*\/?/gi, "[Battle start, {triggerRate}%]: ");
  s = s.replace(/At the start of battle,?\s*/gi, "[Battle start]: ");
  s = s.replace(/At the end of (?:the |this )?turn,?\s*\{triggerRate\}%\s*chance to trigger\.\s*\/?/gi, "[Turn end, {triggerRate}%]: ");
  s = s.replace(/At the start of (?:the |this )?turn,?\s*\{triggerRate\}%\s*chance to trigger\.\s*\/?/gi, "[Turn start, {triggerRate}%]: ");
  s = s.replace(/After this hero (?:uses|casts) an Active Skill,?\s*\{triggerRate\}%\s*chance to trigger\.\s*\/?/gi, "[After Active, {triggerRate}%]: ");
  s = s.replace(/After this hero takes damage(?: from an Active Skill)?,?\s*\{triggerRate\}%\s*chance to trigger\.\s*\/?/gi, "[On damaged, {triggerRate}%]: ");
  s = s.replace(/(?:If|When) this hero(?:'s)? HP (?:is|drops|becomes) (?:less than|below|under)\s*(\d+)% ,?\s*\{triggerRate\}%\s*chance to trigger(?: once)?\.\s*\/?/gi, "[HP<$1%, once, {triggerRate}%]: ");
  s = s.replace(/(?:If|When) this hero(?:'s)? HP (?:is|drops|becomes) (?:less than|below|under)\s*(\d+)% ,?\s*/gi, "[HP<$1%]: ");
  // "Deal damage to the first enemy equal to N% of this hero's PHY" → "first enemy: N% PHY"
  s = s.replace(/Deal damage to the first enemy equal to (\d+)% of this hero's (PHY|INT)\.?/gi, "front enemy: $1% $2 dmg.");
  s = s.replace(/Deal damage to the last enemy equal to (\d+)% of this hero's (PHY|INT)\.?/gi, "back enemy: $1% $2 dmg.");
  s = s.replace(/Deal damage to all enemies equal to (\d+)% of this hero's (PHY|INT)\.?/gi, "all enemies: $1% $2 dmg.");
  s = s.replace(/Deal damage to the enemy with the highest (PHY|INT|HP) equal to (\d+)% of this hero's (PHY|INT)\.?/gi, "highest-$1 enemy: $2% $3 dmg.");
  // Increase / Decrease X stat
  s = s.replace(/Increase the first ally's (PHY|INT|AGI|HP) by (\d+)% of this hero's (PHY|INT|AGI|HP)\.?/gi, "front ally: $1 +$2% (self $3).");
  s = s.replace(/Increase all allies' (PHY|INT|AGI|HP) by (\d+)% of this hero's (PHY|INT|AGI|HP)\.?/gi, "all allies: $1 +$2% (self $3).");
  s = s.replace(/Increase this hero's (PHY|INT|AGI|HP) by (\d+)% of this hero's (PHY|INT|AGI|HP)\.?/gi, "self: $1 +$2% (self $3).");
  s = s.replace(/Increase this hero's max (PHY|INT|AGI|HP) by (\d+)\.?/gi, "self: max-$1 +$2.");
  s = s.replace(/Decrease the first ally's (PHY|INT|AGI|HP) by (\d+)% of this hero's (PHY|INT|AGI|HP)\.?/gi, "front ally: $1 -$2% (self $3).");
  s = s.replace(/Decrease the first enemy's (PHY|INT|AGI|HP) by (\d+)% of this hero's (PHY|INT|AGI|HP)\.?/gi, "front enemy: $1 -$2% (self $3).");
  s = s.replace(/Decrease all enemies' (PHY|INT|AGI|HP) by (\d+)% of this hero's (PHY|INT|AGI|HP)\.?/gi, "all enemies: $1 -$2% (self $3).");
  // Status conditions
  s = s.replace(/\{successRate\}% chance to inflict (Bleed|Poison) on the (first|last|highest-PHY|highest-INT|highest-HP) enemy\.?/gi, "{successRate}% $2 enemy → $1.");
  s = s.replace(/\{successRate\}% chance to inflict (Bleed|Poison) on all enemies\.?/gi, "{successRate}% all enemies → $1.");
  // Generic cleanup
  s = s.replace(/this hero's /gi, "self ");
  s = s.replace(/this hero/gi, "self");
  s = s.replace(/\s*\/\s*/g, " · ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function tExt(extId, jaName) {
  if (_lang === "ja") return jaName ?? "";
  const e = _lookupEn(_exts, extId);
  return (e && e.name) ? e.name : (jaName ?? "");
}

export function tExtSkill(extId, jaName) {
  if (_lang === "ja") return jaName ?? "";
  const e = _lookupEn(_exts, extId);
  return (e && e.skillName) ? e.skillName : (jaName ?? "");
}

export function tEnemy(enemyId, jaName) {
  if (_lang === "ja") return jaName ?? "";
  const e = _lookupEn(_enemies, enemyId);
  return (e && e.name) ? e.name : (jaName ?? "");
}

// ─── Runtime text translation (computed effect strings, navigator etc.) ──

const RUNTIME_REPLACEMENTS = [
  // ─── 単語レベル (longer first to avoid partial overlap) ───
  [/PHY最高/g, "Highest PHY"],
  [/INT最高/g, "Highest INT"],
  [/HP最高/g,  "Highest HP"],
  [/AGI最高/g, "Highest AGI"],
  [/PHYダメ/g, "PHY dmg"],
  [/INTダメ/g, "INT dmg"],
  [/PHY攻撃/g, "PHY attack"],
  [/INT攻撃/g, "INT attack"],
  [/出血/g, "Bleed"],
  [/毒/g, "Poison"],
  [/ドロー/g, "Draw"],
  [/ガード/g, "Guard"],
  [/シールド/g, "Shield"],
  [/回復/g, "Heal"],
  [/ダメージ/g, "damage"],
  [/敵全体/g, "all enemies"],
  [/味方全体/g, "all allies"],
  [/先頭の敵/g, "the front enemy"],
  [/後尾の敵/g, "the back enemy"],
  [/中衛の敵/g, "the mid enemy"],
  [/先頭の味方/g, "the front ally"],
  [/後尾の味方/g, "the back ally"],
  [/中衛の味方/g, "the mid ally"],
  [/敵1体/g, "1 enemy"],
  [/敵\s*1\s*体/g, "1 enemy"],
  [/味方1人/g, "1 ally"],
  [/全員/g, "everyone"],
  [/自身/g, "self"],
  [/自分/g, "self"],
  [/に\s+/g, " to "],     // "敵に X" → "1 enemy to X"
  [/枚引く/g, "card(s)"],
  [/枚/g, ""],
  [/カードを/g, "cards "],
  [/その後、/g, "Then, "],
  [/その後/g, "Then "],
  [/想定/g, "est."],
  [/戦闘中ずっと/g, "for the whole battle"],
  [/戦闘開始時/g, "at battle start"],
  [/戦闘終了時/g, "at battle end"],
  [/ターン開始時/g, "at turn start"],
  [/ターン終了時/g, "at turn end"],
  // 敵 / 味方 stand-alone
  [/敵/g, "enemy"],
  [/味方/g, "ally"],
  // 接続詞
  [/、/g, ", "],
  [/。/g, ". "],
  [/（/g, " ("],
  [/）/g, ") "],
  [/～/g, "~"],
  [/〜/g, "~"],
  [/×/g, "×"],
  // post-clean spaces
  [/ +/g, " "],
];

export function translateGameText(text) {
  if (_lang === "ja" || !text) return text ?? "";
  let out = String(text);
  for (const [pat, rep] of RUNTIME_REPLACEMENTS) {
    out = out.replace(pat, rep);
  }
  return out.trim();
}

/**
 * Translate MCT chapter / node codenames (Japanese ↔ English).
 * The full chapter name is "node : <codename>" in JA — we strip the prefix,
 * translate the codename, and rebuild as "node : <Codename>" for EN.
 *
 * Codenames are MCT proper nouns (well-known computers / pioneers / sites)
 * authored by the user; mapping list is fixed per user direction.
 */
const CHAPTER_NAME_MAP_JA_EN = {
  "アバカス":         "Abacus",
  "アタナソフ":       "Atanasoff",
  "アンティキティラ": "Antikythera",
  "ホレリス":         "Hollerith",
  "トロイ":           "Troy",
};

export function tChapterName(jaName) {
  if (_lang === "ja" || !jaName) return jaName ?? "";
  // Match patterns "node : XXX" / "node :XXX" / bare "XXX"
  const m = String(jaName).match(/^(node\s*:\s*)?(.+)$/);
  const prefix = m && m[1] ? m[1] : "";
  const body   = m && m[2] ? m[2] : String(jaName);
  const en = CHAPTER_NAME_MAP_JA_EN[body];
  return en ? (prefix ? "node : " + en : en) : jaName;
}

/** Apply [data-i18n] attributes to update DOM text on lang change. */
export function applyDataI18n(root) {
  const r = root || document;
  // [data-i18n="key"] → element.textContent
  r.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const v = t(key);
    if (v != null) el.textContent = v;
  });
  // [data-i18n-html="key"] → element.innerHTML (for content with markup)
  r.querySelectorAll("[data-i18n-html]").forEach(el => {
    const key = el.getAttribute("data-i18n-html");
    if (!key) return;
    const v = t(key);
    if (v != null) el.innerHTML = v;
  });
  // [data-i18n-attr-<attr>="key"] → element.setAttribute(attr, t(key))
  // Used for placeholder, title, aria-label, etc.
  r.querySelectorAll("*").forEach(el => {
    for (const a of Array.from(el.attributes)) {
      if (!a.name.startsWith("data-i18n-attr-")) continue;
      const targetAttr = a.name.slice("data-i18n-attr-".length);
      const v = t(a.value);
      if (v != null) el.setAttribute(targetAttr, v);
    }
  });
}
