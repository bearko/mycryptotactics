#!/usr/bin/env node
/**
 * purge-non-mch-cards.js — MCH 非準拠カード (cd*) を cards.js から削除
 *
 * 削除対象 (25 件):
 *   cd101-cd108  : 章 1 アバカス (8)
 *   cdH01-cdH06  : 章 2 ホレリス (6)
 *   cd201-cd206  : 章 3 アタナソフ (6)
 *   cd301-cd305  : 章 4 古代 (5)
 *
 * 出力:
 *   1. cards.js から該当 25 ブロックを削除
 *   2. CARD_RARITIES の対応エントリを削除
 *
 * usage: node purge-non-mch-cards.js [--root <prototype-path>]
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
const PROTO_ROOT = rootIdx >= 0 ? args[rootIdx + 1] : path.join(__dirname, "..");
const CARDS_PATH = path.join(PROTO_ROOT, "js", "cards.js");

// 削除対象 libraryKey 一覧
const TARGETS = new Set([
  "cd101","cd102","cd103","cd104","cd105","cd106","cd107","cd108",
  "cdH01","cdH02","cdH03","cdH04","cdH05","cdH06",
  "cd201","cd202","cd203","cd204","cd205","cd206",
  "cd301","cd302","cd303","cd304","cd305",
]);

let src = fs.readFileSync(CARDS_PATH, "utf8");

// 1. CARD_RARITIES から該当行を削除
//    形式: `  cdXXX:   'rarity', // ... \n` (行単位)
let removedRarities = 0;
src = src.replace(/^\s*(cd[0-9H]+):\s*'\w+',\s*\/\/[^\n]*\n/gm, (m, key) => {
  if (TARGETS.has(key)) { removedRarities++; return ""; }
  return m;
});
// trailing-comma なし行 / コメントなし行も拾う
src = src.replace(/^\s*(cd[0-9H]+):\s*'\w+',?\s*\n/gm, (m, key) => {
  if (TARGETS.has(key)) { removedRarities++; return ""; }
  return m;
});

// 2. cards.js から該当ブロックを削除 (4 スペースインデント想定)
//    `    cdXXX: { ... \n    },\n` を削除
let removedBlocks = 0;
const cardBlockRe = /^( {4})((?:cd|ext)[0-9A-Za-z]+):\s*\{/gm;
let lastIndex = 0;
const out = [];
let m;
const matches = [];
while ((m = cardBlockRe.exec(src)) !== null) {
  matches.push({ key: m[2], start: m.index, bodyStart: m.index + m[0].length });
}
// 各ブロックの終端を検出
for (const blk of matches) {
  let depth = 1;
  let i = blk.bodyStart;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  // 末尾のカンマ + 改行も削除対象に
  while (i < src.length && (src[i] === ',' || src[i] === ' ')) i++;
  if (src[i] === '\n') i++;
  blk.end = i;
}

// 末尾から消していく (index がずれないように)
for (let bi = matches.length - 1; bi >= 0; bi--) {
  const blk = matches[bi];
  if (TARGETS.has(blk.key)) {
    src = src.slice(0, blk.start) + src.slice(blk.end);
    removedBlocks++;
  }
}

fs.writeFileSync(CARDS_PATH, src, "utf8");
console.log(`Removed ${removedBlocks} card blocks from cards.js`);
console.log(`Removed ${removedRarities} CARD_RARITIES entries`);
