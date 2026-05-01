/**
 * sync_csv_json.js  —  敵 / ボス / ヒーロー / LLエクステ / エクステンション
 *                       パラメーター CSV ↔ JSON ↔ JS 双方向同期ツール
 *
 * 使用方法（prototype/ ディレクトリで実行）:
 *
 *   node tools/sync_csv_json.js json-to-csv
 *     → data/{enemies,bosses,heroes,ll-extensions}.json を読んで
 *       data/*.csv を（再）生成する。
 *       extensions.csv はカード定義（cards.js）から readonly 抽出して生成。
 *
 *   node tools/sync_csv_json.js csv-to-json
 *     → data/{enemies,bosses,heroes,ll-extensions}.csv を読んで
 *       JSON を更新し、対応する js/*.js を自動再生成する。
 *       extensions.csv は readonly のため反映されない。
 *
 * ─── CSV フォーマット ────────────────────────────────────────────────────
 * enemies.csv  : id, name, hp, phy, int, agi, imgId, i1 ~ i6
 * bosses.csv   : bossId, name, hp, phy, int, agi, imgId, initialShield,
 *                phase(0-based), hpThreshold, i1 ~ i6
 *   ※ ボスにフェーズが複数ある場合は同じ bossId の行を複数書く。
 *     hp/phy/int/agi/imgId/initialShield はフェーズ 0 行だけ読む。
 *
 * ─── intent エンコード形式 ──────────────────────────────────────────────
 *   attack/phyPct               例: attack/90
 *   attackPoison/phyPct/stacks  例: attackPoison/70/2
 *   attackBleed/phyPct/stacks   例: attackBleed/85/1
 *   attackDouble/phyPct         例: attackDouble/80
 *   attackInt/intPct            例: attackInt/110
 *   attackIntDouble/intPct      例: attackIntDouble/100
 *   healSelf/pct                例: healSelf/20
 *   buffSelf/phyAdd/intAdd      例: buffSelf/5/2  (片方のみなら buffSelf/5/0)
 *   guard/value                 例: guard/6
 *   special/pct                 例: special/15
 */

const fs   = require('fs');
const path = require('path');

// ROOT は引数で指定可能（引数なしの場合は process.cwd()）
// 例: node sync_csv_json.js json-to-csv C:\path\to\prototype
const ROOT      = path.resolve(process.argv[3] || process.cwd());
const DATA_DIR  = path.join(ROOT, 'data');
const JS_DIR    = path.join(ROOT, 'js');

// ─── intent エンコード / デコード ──────────────────────────────────
function encodeIntent(intent) {
  const k = intent.kind;
  switch (k) {
    case 'attack':          return `attack/${intent.phyPct}`;
    case 'attackPoison':    return `attackPoison/${intent.phyPct}/${intent.poisonStacks}`;
    case 'attackBleed':     return `attackBleed/${intent.phyPct}/${intent.bleedStacks}`;
    case 'attackDouble':    return `attackDouble/${intent.phyPct}`;
    case 'attackInt':       return `attackInt/${intent.intPct}`;
    case 'attackIntDouble': return `attackIntDouble/${intent.intPct}`;
    case 'healSelf':        return `healSelf/${intent.pct}`;
    case 'buffSelf':        return `buffSelf/${intent.phyAdd || 0}/${intent.intAdd || 0}`;
    case 'guard':           return `guard/${intent.value}`;
    case 'special':         return `special/${intent.pct}`;
    default:                return '';
  }
}

function decodeIntent(cell) {
  if (!cell || !cell.trim()) return null;
  const parts = cell.trim().split('/');
  const k = parts[0];
  const n = (i) => Number(parts[i]);
  switch (k) {
    case 'attack':          return { kind: 'attack',          phyPct: n(1) };
    case 'attackPoison':    return { kind: 'attackPoison',    phyPct: n(1), poisonStacks: n(2) };
    case 'attackBleed':     return { kind: 'attackBleed',     phyPct: n(1), bleedStacks: n(2) };
    case 'attackDouble':    return { kind: 'attackDouble',    phyPct: n(1) };
    case 'attackInt':       return { kind: 'attackInt',       intPct: n(1) };
    case 'attackIntDouble': return { kind: 'attackIntDouble', intPct: n(1) };
    case 'healSelf':        return { kind: 'healSelf',        pct: n(1) };
    case 'buffSelf': {
      const obj = { kind: 'buffSelf' };
      if (n(1)) obj.phyAdd = n(1);
      if (n(2)) obj.intAdd = n(2);
      return obj;
    }
    case 'guard':           return { kind: 'guard',   value: n(1) };
    case 'special':         return { kind: 'special', pct: n(1) };
    default:                return null;
  }
}

// ─── CSV ユーティリティ ──────────────────────────────────────────────
/** CSV 行を配列に分解（クォート対応） */
function parseCSVLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      result.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

/** 値を CSV セルに変換（カンマや改行を含む場合はクォート） */
function csvCell(v) {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV テキストをオブジェクト配列に変換 */
function parseCSV(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const cells = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (cells[i] || '').trim(); });
    return obj;
  });
}

/** オブジェクト配列を CSV テキストに変換 */
function toCSV(headers, rows) {
  const head = headers.map(csvCell).join(',');
  const body = rows.map(r => headers.map(h => csvCell(r[h] ?? '')).join(','));
  return [head, ...body].join('\n') + '\n';
}

// ─── JSON → CSV ──────────────────────────────────────────────────────
function enemiesJsonToCsv(json) {
  const INTENT_COLS = ['i1','i2','i3','i4','i5','i6'];
  const headers = ['id','name','hp','phy','int','agi','imgId', ...INTENT_COLS];
  const rows = Object.values(json).map(e => {
    const row = {
      id: e.id, name: e.name, hp: e.hp, phy: e.phy, int: e.int, agi: e.agi, imgId: e.imgId,
    };
    (e.intentRota || []).forEach((intent, idx) => {
      if (idx < INTENT_COLS.length) row[INTENT_COLS[idx]] = encodeIntent(intent);
    });
    return row;
  });
  return toCSV(headers, rows);
}

function bossesJsonToCsv(json) {
  const INTENT_COLS = ['i1','i2','i3','i4','i5','i6'];
  const headers = ['bossId','name','hp','phy','int','agi','imgId','initialShield','phase','hpThreshold', ...INTENT_COLS];
  const rows = [];
  for (const boss of Object.values(json)) {
    const base = {
      bossId: boss.id, name: boss.name, hp: boss.hp, phy: boss.phy,
      int: boss.int, agi: boss.agi, imgId: boss.imgId, initialShield: boss.initialShield ?? 0,
    };
    if (boss.phases) {
      boss.phases.forEach((phase, phIdx) => {
        const row = { ...base, phase: phIdx, hpThreshold: phase.hpThresholdPct };
        (phase.intentRota || []).forEach((intent, idx) => {
          if (idx < INTENT_COLS.length) row[INTENT_COLS[idx]] = encodeIntent(intent);
        });
        rows.push(row);
      });
    } else {
      const row = { ...base, phase: 0, hpThreshold: 0 };
      (boss.intentRota || []).forEach((intent, idx) => {
        if (idx < INTENT_COLS.length) row[INTENT_COLS[idx]] = encodeIntent(intent);
      });
      rows.push(row);
    }
  }
  return toCSV(headers, rows);
}

// ─── CSV → JSON ──────────────────────────────────────────────────────
function enemiesCsvToJson(csvText) {
  const INTENT_COLS = ['i1','i2','i3','i4','i5','i6'];
  const rows = parseCSV(csvText);
  const result = {};
  for (const row of rows) {
    const intentRota = INTENT_COLS
      .map(c => decodeIntent(row[c]))
      .filter(Boolean);
    result[row.id] = {
      id: row.id, name: row.name,
      hp: +row.hp, phy: +row.phy, int: +row.int, agi: +row.agi, imgId: +row.imgId,
      intentRota,
    };
  }
  return result;
}

function bossesCsvToJson(csvText) {
  const INTENT_COLS = ['i1','i2','i3','i4','i5','i6'];
  const rows = parseCSV(csvText);
  const result = {};

  for (const row of rows) {
    const id = row.bossId;
    const phase = +row.phase;
    const intentRota = INTENT_COLS.map(c => decodeIntent(row[c])).filter(Boolean);

    if (!result[id]) {
      result[id] = {
        id, name: row.name,
        hp: +row.hp, phy: +row.phy, int: +row.int, agi: +row.agi,
        imgId: +row.imgId, initialShield: +row.initialShield || 0,
      };
    }

    // フェーズが 2 行以上ある場合は phases 配列に格納
    const maxPhase = rows.filter(r => r.bossId === id).length;
    if (maxPhase > 1) {
      if (!result[id].phases) result[id].phases = [];
      // phase 0 の行で stats を確定させる
      if (phase === 0) {
        result[id].hp  = +row.hp;
        result[id].phy = +row.phy;
        result[id].int = +row.int;
        result[id].agi = +row.agi;
      }
      result[id].phases[phase] = {
        hpThresholdPct: +row.hpThreshold,
        intentRota,
      };
    } else {
      // フェーズなし（単一行）
      result[id].intentRota = intentRota;
    }
  }
  return result;
}

// ─── JS ファイル再生成 ──────────────────────────────────────────────
function intentToJs(intent, indent) {
  const k = intent.kind;
  const parts = [`kind: '${k}'`];
  if (k === 'attack')          parts.push(`phyPct: ${intent.phyPct}`);
  if (k === 'attackPoison')  { parts.push(`phyPct: ${intent.phyPct}`); parts.push(`poisonStacks: ${intent.poisonStacks}`); }
  if (k === 'attackBleed')   { parts.push(`phyPct: ${intent.phyPct}`); parts.push(`bleedStacks: ${intent.bleedStacks}`); }
  if (k === 'attackDouble')    parts.push(`phyPct: ${intent.phyPct}`);
  if (k === 'attackInt')       parts.push(`intPct: ${intent.intPct}`);
  if (k === 'attackIntDouble') parts.push(`intPct: ${intent.intPct}`);
  if (k === 'healSelf')        parts.push(`pct: ${intent.pct}`);
  if (k === 'buffSelf')      { if (intent.phyAdd) parts.push(`phyAdd: ${intent.phyAdd}`); if (intent.intAdd) parts.push(`intAdd: ${intent.intAdd}`); }
  if (k === 'guard')           parts.push(`value: ${intent.value}`);
  if (k === 'special')         parts.push(`pct: ${intent.pct}`);
  return `${indent}{ ${parts.join(', ')} },`;
}

function generateEnemiesJs(json) {
  const header = `/**
 * 敵マスタ（auto-generated by tools/sync_csv_json.js — 直接編集不要）
 * 編集方法:
 *   data/enemies.csv を修正 → node tools/sync_csv_json.js csv-to-json
 *   data/enemies.json を修正 → node tools/sync_csv_json.js json-to-csv
 */
export const ENEMY_DEFS = {
`;
  const entries = Object.values(json).map(e => {
    const intents = (e.intentRota || []).map(i => intentToJs(i, '      ')).join('\n');
    return `  '${e.id}': {
    id: '${e.id}', name: '${e.name}',
    hp: ${e.hp}, phy: ${e.phy}, int: ${e.int}, agi: ${e.agi}, imgId: ${e.imgId},
    intentRota: [
${intents}
    ],
  },`;
  });
  return header + entries.join('\n') + '\n};\n';
}

function generateBossesJs(json) {
  const header = `/**
 * ボスマスタ（auto-generated by tools/sync_csv_json.js — 直接編集不要）
 * 編集方法:
 *   data/bosses.csv を修正 → node tools/sync_csv_json.js csv-to-json
 *   data/bosses.json を修正 → node tools/sync_csv_json.js json-to-csv
 */
export const BOSS_DEFS = {
`;
  const entries = Object.values(json).map(boss => {
    let body = `  '${boss.id}': {\n    id: '${boss.id}',\n    name: '${boss.name}',\n    hp: ${boss.hp}, phy: ${boss.phy}, int: ${boss.int}, agi: ${boss.agi}, imgId: ${boss.imgId},\n    initialShield: ${boss.initialShield || 0},\n`;
    if (boss.phases) {
      body += '    phases: [\n';
      body += boss.phases.map((ph, pi) => {
        const intents = (ph.intentRota || []).map(i => intentToJs(i, '          ')).join('\n');
        return `      {\n        // フェーズ ${pi + 1}\n        hpThresholdPct: ${ph.hpThresholdPct},\n        intentRota: [\n${intents}\n        ],\n      },`;
      }).join('\n');
      body += '\n    ],\n  },';
    } else {
      const intents = (boss.intentRota || []).map(i => intentToJs(i, '      ')).join('\n');
      body += `    intentRota: [\n${intents}\n    ],\n  },`;
    }
    return body;
  });
  return header + entries.join('\n') + '\n};\n';
}

// ─── ヒーロー (HERO_ROSTER) JSON(配列) ↔ CSV ↔ JS ───────────────────
const HERO_FIELDS = ['heroId','nameJa','rarity','hpMax','basePhy','baseInt','baseAgi','passiveKey','passiveName','passiveDesc'];

function heroesJsonToCsv(arr) {
  return toCSV(HERO_FIELDS, arr);
}

function heroesCsvToJson(csvText) {
  const rows = parseCSV(csvText);
  const numericFields = ['heroId','hpMax','basePhy','baseInt','baseAgi'];
  return rows.map(row => {
    const obj = {};
    HERO_FIELDS.forEach(f => { obj[f] = numericFields.includes(f) ? +row[f] : row[f]; });
    return obj;
  });
}

function generateHeroesJs(arr) {
  const header = `/**
 * ヒーローマスタ（auto-generated by tools/sync_csv_json.js — 直接編集不要）
 * 編集方法:
 *   data/heroes.csv を修正 → node tools/sync_csv_json.js csv-to-json
 *   data/heroes.json を修正 → node tools/sync_csv_json.js json-to-csv
 *
 * data/heroes.json は配列形式で、CSV と同じ並びで出力される（並び順を保持）。
 */
import { img } from "./constants.js";

export const HERO_ROSTER = [
`;
  const entries = arr.map(h => `  {
    heroId: ${h.heroId},
    nameJa: ${JSON.stringify(h.nameJa)},
    rarity: ${JSON.stringify(h.rarity || 'common')},
    hpMax: ${h.hpMax},
    basePhy: ${h.basePhy},
    baseInt: ${h.baseInt},
    baseAgi: ${h.baseAgi},
    passiveKey: ${JSON.stringify(h.passiveKey)},
    passiveName: ${JSON.stringify(h.passiveName)},
    passiveDesc: ${JSON.stringify(h.passiveDesc)},
    img: () => img("Image/Heroes/${h.heroId}.png"),
  },`);
  return header + entries.join('\n') + '\n];\n\n/** ID 検索用ルックアップ */\nexport const HERO_DEFS = Object.fromEntries(HERO_ROSTER.map(h => [String(h.heroId), h]));\n';
}

// ─── LLエクステ JSON(配列) ↔ CSV ↔ JS ─────────────────────────────
const LLEXT_FIELDS = ['extId','name','skillName','rarity','effectKey','desc'];

function llExtJsonToCsv(arr) {
  return toCSV(LLEXT_FIELDS, arr);
}

function llExtCsvToJson(csvText) {
  const rows = parseCSV(csvText);
  return rows.map(row => ({
    extId: +row.extId,
    name: row.name,
    skillName: row.skillName,
    rarity: row.rarity || 'll',
    effectKey: row.effectKey,
    desc: row.desc,
  }));
}

function generateLlExtJs(arr) {
  const header = `/**
 * LLエクステ定義（auto-generated by tools/sync_csv_json.js — 直接編集不要）
 * 編集方法:
 *   data/ll-extensions.csv を修正 → node tools/sync_csv_json.js csv-to-json
 *   data/ll-extensions.json を修正 → node tools/sync_csv_json.js json-to-csv
 *
 * effectKey の挙動は main.js 側の applyLlExtEffect() で分岐処理する。
 */
export const LL_EXT_POOL = [
`;
  const entries = arr.map(e => `  {
    extId: ${e.extId},
    name: ${JSON.stringify(e.name)},
    skillName: ${JSON.stringify(e.skillName)},
    desc: ${JSON.stringify(e.desc)},
    effectKey: ${JSON.stringify(e.effectKey)},
  },`);
  return header + entries.join('\n') + '\n];\n';
}

// ─── エクステンション (cards) サマリー CSV (readonly) ───────────────
/**
 * cards.js の CARD_LIBRARY と CARD_RARITIES から readonly な CSV を生成。
 * 完全 bidirectional 化は cards.js リファクタが必要なため別 Issue で対応。
 *
 * 単純なライン by ライン抽出（regex バックトラックを避ける）。
 */
function generateExtensionsReadonlyCsv() {
  const cardsText = fs.readFileSync(path.join(JS_DIR, 'cards.js'), 'utf8');
  const headers = ['libraryKey','extId','extName','skillName','type','cost','rarity','readonly_note'];
  const rows = [];

  // CARD_RARITIES マップ抽出（単純ライン by ライン）
  const rarityMap = {};
  const rarityStart = cardsText.indexOf('CARD_RARITIES');
  if (rarityStart >= 0) {
    const sectionEnd = cardsText.indexOf('};', rarityStart);
    const section = cardsText.slice(rarityStart, sectionEnd >= 0 ? sectionEnd : cardsText.length);
    const lines = section.split('\n');
    for (const ln of lines) {
      // パターン: "  libraryKey: 'rarity',"
      const m = ln.match(/^\s*(\w+):\s*'(\w+)'/);
      if (m) rarityMap[m[1]] = m[2];
    }
  }

  // カード定義の抽出（ライン by ライン、ブロック単位）
  const lines = cardsText.split('\n');
  let cur = null;
  for (const ln of lines) {
    // ブロック開始: "    ext1001: {" or "    cd101: {"
    const startM = ln.match(/^\s+(\w+):\s*\{/);
    if (startM && !cur) {
      cur = { libraryKey: null, extId: '', extName: '', skillName: '', type: '', cost: '' };
      continue;
    }
    if (cur) {
      let m;
      if ((m = ln.match(/libraryKey:\s*"(\w+)"/))) cur.libraryKey = m[1];
      else if ((m = ln.match(/extId:\s*(\d+)/))) cur.extId = m[1];
      else if ((m = ln.match(/extNameJa:\s*"([^"]*)"/))) cur.extName = m[1];
      else if ((m = ln.match(/skillNameJa:\s*"([^"]*)"/))) cur.skillName = m[1];
      else if ((m = ln.match(/^\s+cost:\s*(\d+)/))) cur.cost = m[1];
      else if ((m = ln.match(/^\s+type:\s*"(\w+)"/))) cur.type = m[1];
      // ブロック終了: 「    }, 」または閉じる前にもう一度 ext/cd 名 → コミット
      if (/^\s+\},/.test(ln)) {
        if (cur.libraryKey) {
          rows.push({
            libraryKey: cur.libraryKey,
            extId: cur.extId,
            extName: cur.extName,
            skillName: cur.skillName,
            type: cur.type,
            cost: cur.cost,
            rarity: rarityMap[cur.libraryKey] || '',
            readonly_note: 'cards.js から自動抽出（編集不可、cards.js を直接修正）',
          });
        }
        cur = null;
      }
    }
  }
  return toCSV(headers, rows);
}

// ─── メイン ──────────────────────────────────────────────────────────
const command = process.argv[2];

if (command === 'json-to-csv') {
  console.log('[sync] JSON → CSV + JS ...');

  const ej = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'enemies.json'), 'utf8'));
  fs.writeFileSync(path.join(DATA_DIR, 'enemies.csv'), enemiesJsonToCsv(ej), 'utf8');
  console.log('  ✓ data/enemies.csv を更新しました');
  fs.writeFileSync(path.join(JS_DIR, 'enemies.js'), generateEnemiesJs(ej), 'utf8');
  console.log('  ✓ js/enemies.js を再生成しました');

  const bj = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'bosses.json'), 'utf8'));
  fs.writeFileSync(path.join(DATA_DIR, 'bosses.csv'), bossesJsonToCsv(bj), 'utf8');
  console.log('  ✓ data/bosses.csv を更新しました');
  fs.writeFileSync(path.join(JS_DIR, 'bosses.js'), generateBossesJs(bj), 'utf8');
  console.log('  ✓ js/bosses.js を再生成しました');

  const hj = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'heroes.json'), 'utf8'));
  fs.writeFileSync(path.join(DATA_DIR, 'heroes.csv'), heroesJsonToCsv(hj), 'utf8');
  console.log('  ✓ data/heroes.csv を更新しました');
  fs.writeFileSync(path.join(JS_DIR, 'heroes.js'), generateHeroesJs(hj), 'utf8');
  console.log('  ✓ js/heroes.js を再生成しました');

  const llj = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'll-extensions.json'), 'utf8'));
  fs.writeFileSync(path.join(DATA_DIR, 'll-extensions.csv'), llExtJsonToCsv(llj), 'utf8');
  console.log('  ✓ data/ll-extensions.csv を更新しました');
  fs.writeFileSync(path.join(JS_DIR, 'll-extensions.js'), generateLlExtJs(llj), 'utf8');
  console.log('  ✓ js/ll-extensions.js を再生成しました');

  fs.writeFileSync(path.join(DATA_DIR, 'extensions.csv'), generateExtensionsReadonlyCsv(), 'utf8');
  console.log('  ✓ data/extensions.csv を更新しました（readonly サマリー）');

  console.log('[sync] 完了');

} else if (command === 'csv-to-json') {
  console.log('[sync] CSV → JSON + JS ...');

  const ecsvText = fs.readFileSync(path.join(DATA_DIR, 'enemies.csv'), 'utf8');
  const ej = enemiesCsvToJson(ecsvText);
  fs.writeFileSync(path.join(DATA_DIR, 'enemies.json'), JSON.stringify(ej, null, 2) + '\n', 'utf8');
  console.log('  ✓ data/enemies.json を更新しました');
  fs.writeFileSync(path.join(JS_DIR, 'enemies.js'), generateEnemiesJs(ej), 'utf8');
  console.log('  ✓ js/enemies.js を再生成しました');

  const bcsvText = fs.readFileSync(path.join(DATA_DIR, 'bosses.csv'), 'utf8');
  const bj = bossesCsvToJson(bcsvText);
  fs.writeFileSync(path.join(DATA_DIR, 'bosses.json'), JSON.stringify(bj, null, 2) + '\n', 'utf8');
  console.log('  ✓ data/bosses.json を更新しました');
  fs.writeFileSync(path.join(JS_DIR, 'bosses.js'), generateBossesJs(bj), 'utf8');
  console.log('  ✓ js/bosses.js を再生成しました');

  const hcsvText = fs.readFileSync(path.join(DATA_DIR, 'heroes.csv'), 'utf8');
  const hj = heroesCsvToJson(hcsvText);
  fs.writeFileSync(path.join(DATA_DIR, 'heroes.json'), JSON.stringify(hj, null, 2) + '\n', 'utf8');
  console.log('  ✓ data/heroes.json を更新しました');
  fs.writeFileSync(path.join(JS_DIR, 'heroes.js'), generateHeroesJs(hj), 'utf8');
  console.log('  ✓ js/heroes.js を再生成しました');

  const llcsvText = fs.readFileSync(path.join(DATA_DIR, 'll-extensions.csv'), 'utf8');
  const llj = llExtCsvToJson(llcsvText);
  fs.writeFileSync(path.join(DATA_DIR, 'll-extensions.json'), JSON.stringify(llj, null, 2) + '\n', 'utf8');
  console.log('  ✓ data/ll-extensions.json を更新しました');
  fs.writeFileSync(path.join(JS_DIR, 'll-extensions.js'), generateLlExtJs(llj), 'utf8');
  console.log('  ✓ js/ll-extensions.js を再生成しました');

  console.log('[sync] 完了');
  console.log('[note] data/extensions.csv は readonly のため変更は反映されません');
  console.log('       extensions の CSV 編集対応は別 Issue で予定');

} else {
  console.log(`
使用方法:
  node tools/sync_csv_json.js json-to-csv   JSON/JS → CSV を生成
  node tools/sync_csv_json.js csv-to-json   CSV → JSON + JS を更新
`);
  process.exit(1);
}
