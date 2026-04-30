/**
 * sync_csv_json.js  —  敵 / ボス パラメーター CSV ↔ JSON ↔ JS 双方向同期ツール
 *
 * 使用方法（prototype/ ディレクトリで実行）:
 *
 *   node tools/sync_csv_json.js json-to-csv
 *     → data/enemies.json, data/bosses.json を読んで
 *       data/enemies.csv, data/bosses.csv を（再）生成する
 *
 *   node tools/sync_csv_json.js csv-to-json
 *     → data/enemies.csv, data/bosses.csv を読んで
 *       data/enemies.json, data/bosses.json を更新し、
 *       さらに js/enemies.js, js/bosses.js を自動再生成する
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

  console.log('[sync] 完了');

} else {
  console.log(`
使用方法:
  node tools/sync_csv_json.js json-to-csv   JSON/JS → CSV を生成
  node tools/sync_csv_json.js csv-to-json   CSV → JSON + JS を更新
`);
  process.exit(1);
}
