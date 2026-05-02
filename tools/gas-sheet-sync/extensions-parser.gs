/**
 * extensions-parser.gs — cards.js から extension エンティティを抽出
 *
 * cards.js は JS のメソッド (effectSummaryLines / play / etc.) を含む大きな
 * ファイルなので、AST ではなく正規表現で **データフィールドのみ** を抽出する。
 * Push (cards.js への書き戻し) はサポートせず、Pull (View) 専用。
 *
 * 各 ext エントリの抽出フィールド:
 *   libraryKey, extId, extNameJa, skillNameJa, skillIcon,
 *   cost, type, target, caster, effects (array)
 * + CARD_RARITIES から rarity を結合
 */

/** raw cards.js テキストから ext エントリ配列を抽出 */
function parseExtensionsFromCardsJs_(text) {
  const out = [];
  // まず CARD_RARITIES dict を抽出 (cards.js 末尾)
  const rarities = parseCardRarities_(text);

  // 各 ext エントリのスタートを find: "    ext1234: {"
  const startRe = /^( {4})ext(\d+):\s*\{$/gm;
  let m;
  while ((m = startRe.exec(text)) !== null) {
    const indent = m[1];
    const extId = +m[2];
    const blockStart = m.index;
    // 対応する閉じ "    }," を探す (同 indent + },)
    const closeRe = new RegExp("^" + indent + "\\},?$", "m");
    closeRe.lastIndex = blockStart + m[0].length;
    const closeMatch = closeRe.exec(text.substring(blockStart));
    if (!closeMatch) continue;
    const blockEnd = blockStart + closeMatch.index + closeMatch[0].length;
    const block = text.substring(blockStart, blockEnd);
    const entry = parseExtBlock_(block);
    if (entry) {
      entry.rarity = rarities[entry.libraryKey] || "";
      out.push(entry);
    }
  }
  return out;
}

/** ext ブロックテキストからデータフィールドを抽出 */
function parseExtBlock_(block) {
  const get = (key, regex) => {
    const m = block.match(regex);
    return m ? m[1] : "";
  };
  const libraryKey   = get("libraryKey",   /libraryKey:\s*"([^"]+)"/);
  const extId        = +get("extId",       /extId:\s*(\d+)/);
  const extNameJa    = get("extNameJa",    /extNameJa:\s*"([^"]+)"/);
  const skillNameJa  = get("skillNameJa",  /skillNameJa:\s*"([^"]+)"/);
  const skillIcon    = get("skillIcon",    /skillIcon:\s*"([^"]+)"/);
  const cost         = +get("cost",        /cost:\s*(\d+)/);
  const type         = get("type",         /type:\s*"([^"]+)"/);
  const target       = get("target",       /target:\s*"([^"]+)"/);
  const caster       = get("caster",       /caster:\s*"([^"]+)"/);
  if (!libraryKey) return null;

  // effects 配列を抽出: effects: [ { target: "...", text: "..." }, ... ]
  const effectsBlock = block.match(/effects:\s*\[([\s\S]*?)\]\s*,/);
  const effects = [];
  if (effectsBlock) {
    const inner = effectsBlock[1];
    const itemRe = /\{\s*target:\s*"([^"]+)"\s*,\s*text:\s*"([^"]+)"\s*\}/g;
    let em;
    while ((em = itemRe.exec(inner)) !== null) {
      effects.push({ target: em[1], text: em[2] });
    }
  }
  return {
    libraryKey, extId, extNameJa, skillNameJa, skillIcon,
    cost, type, target, caster, effects,
  };
}

/** CARD_RARITIES dict を抽出して { extKey: rarity } を返す */
function parseCardRarities_(text) {
  const out = {};
  // const CARD_RARITIES = { ... }; ブロック
  const m = text.match(/(?:export\s+)?const\s+CARD_RARITIES\s*=\s*\{([\s\S]*?)\n\};/);
  if (!m) return out;
  const inner = m[1];
  const lineRe = /(\w+):\s*'([a-z]+)'/g;
  let lm;
  while ((lm = lineRe.exec(inner)) !== null) {
    out[lm[1]] = lm[2];
  }
  return out;
}

/** ext エントリ配列を sheet 行 (2 次元配列) に変換
 *  schema.columns 順序 + effects は最大 3 スロットに展開 */
function extensionsToRows_(entries) {
  const rows = [];
  for (const e of entries) {
    const row = [
      e.libraryKey,
      e.extId,
      e.extNameJa,
      e.skillNameJa,
      e.skillIcon,
      e.cost,
      e.type,
      e.target,
      e.caster,
      e.rarity,
      // effects 最大 3 スロット (target / text 各 2 列ずつ)
      e.effects[0]?.target || "",
      e.effects[0]?.text   || "",
      e.effects[1]?.target || "",
      e.effects[1]?.text   || "",
      e.effects[2]?.target || "",
      e.effects[2]?.text   || "",
    ];
    rows.push(row);
  }
  return rows;
}

// ─── Push: cards.js text に対する安全なフィールド書き戻し ──────────
// 編集対象 (top-level literal + CARD_RARITIES + effects[].text) のみ regex 置換。
// JS 関数本体 (play / effectSummaryLines / previewLines / peekHelpKeys) は触らない。
// ダメージ係数は play() に hardcoded のため Push 不可 (README 参照)。

/** sheet rows + 既存 cards.js text → 編集後 cards.js text + 変更内訳サマリ
 *  rows は schema.columns 順序の 2 次元配列。空行 / 不明 ext は skip。 */
function pushExtensionsToCardsJs_(rows, cardsJsText) {
  let text = cardsJsText;
  const summary = { changed: 0, skipped: 0, fieldChanges: 0, missingExt: [] };

  for (const row of rows) {
    if (!row || row.every(c => c === "" || c === null)) { summary.skipped++; continue; }
    const [
      libraryKey, extId, extNameJa, skillNameJa, skillIcon,
      cost, type, target, caster, rarity,
      e1t, e1text, e2t, e2text, e3t, e3text,
    ] = row;
    if (!libraryKey || !String(libraryKey).match(/^ext\d+$/)) { summary.skipped++; continue; }

    // ext ブロックを抽出
    const block = extractExtBlock_(text, libraryKey);
    if (!block) { summary.missingExt.push(libraryKey); summary.skipped++; continue; }
    const oldBlock = block.text;
    let newBlock = oldBlock;
    let blockChanged = false;

    // top-level literal フィールド (Push 安全) の置換
    newBlock = replaceFieldStr_(newBlock, "extNameJa",   extNameJa,   () => blockChanged = true);
    newBlock = replaceFieldStr_(newBlock, "skillNameJa", skillNameJa, () => blockChanged = true);
    newBlock = replaceFieldStr_(newBlock, "skillIcon",   skillIcon,   () => blockChanged = true);
    newBlock = replaceFieldInt_(newBlock, "cost",        cost,        () => blockChanged = true);
    newBlock = replaceFieldStr_(newBlock, "type",        type,        () => blockChanged = true);
    newBlock = replaceFieldStr_(newBlock, "target",      target,      () => blockChanged = true);
    newBlock = replaceFieldStr_(newBlock, "caster",      caster,      () => blockChanged = true);

    // effects[*].text のみ置換 (effects[].target は play() 連動のため触らない)
    const sheetTexts = [e1text, e2text, e3text].map(v => (v == null ? "" : String(v)));
    const updated = replaceEffectsText_(newBlock, sheetTexts);
    if (updated !== newBlock) { newBlock = updated; blockChanged = true; }

    if (blockChanged) {
      text = text.replace(oldBlock, newBlock);
      summary.changed++;
      summary.fieldChanges++;
    }

    // CARD_RARITIES dict の更新 (cards.js 末尾、別 dict 内の単一行)
    if (rarity && /^[a-z]+$/.test(String(rarity))) {
      const rarityRe = new RegExp("(\\b" + libraryKey + ":\\s*)'[a-z]+'");
      const before = text.length;
      text = text.replace(rarityRe, `$1'${rarity}'`);
      if (text.length !== before) summary.fieldChanges++;
    }
  }

  return { text, summary };
}

/** ext ブロック (`    extXXXX: { ... \n    },`) を抽出 */
function extractExtBlock_(text, libraryKey) {
  // ブロックの開始行 "    extXXXX: {" を探す
  const startRe = new RegExp("^( {4})" + libraryKey + ":\\s*\\{$", "m");
  const m = startRe.exec(text);
  if (!m) return null;
  const indent = m[1];
  const startIdx = m.index;
  // 対応する閉じ "    }," / "    }" を探す
  const closeRe = new RegExp("^" + indent + "\\},?$", "m");
  closeRe.lastIndex = 0;
  const sub = text.substring(startIdx);
  const closeMatch = closeRe.exec(sub);
  if (!closeMatch) return null;
  const blockText = sub.substring(0, closeMatch.index + closeMatch[0].length);
  return { text: blockText, startIdx, endIdx: startIdx + blockText.length };
}

/** ブロック内の文字列フィールド (`field: "value",`) を置換 */
function replaceFieldStr_(block, fieldName, newValue, onChange) {
  if (newValue == null) return block;
  const newStr = String(newValue);
  const re = new RegExp("(" + fieldName + ":\\s*)\"([^\"]*)\"");
  const m = block.match(re);
  if (!m) return block;
  if (m[2] === newStr) return block;  // 変化なし
  if (onChange) onChange();
  return block.replace(re, `$1"${newStr.replace(/"/g, '\\"')}"`);
}

/** ブロック内の整数フィールド (`field: 123,`) を置換 */
function replaceFieldInt_(block, fieldName, newValue, onChange) {
  if (newValue === "" || newValue == null) return block;
  const n = Number(newValue);
  if (!Number.isFinite(n)) return block;
  const re = new RegExp("(" + fieldName + ":\\s*)(\\d+)");
  const m = block.match(re);
  if (!m) return block;
  if (+m[2] === n) return block;
  if (onChange) onChange();
  return block.replace(re, `$1${n}`);
}

/** effects: [{target,text}, ...] 配列の text フィールドのみ置換。
 *  sheetTexts は最大 3 件 (slot 1〜3)。空文字列は「変更なし」、非空は上書き。 */
function replaceEffectsText_(block, sheetTexts) {
  // effects 配列ブロックを抽出
  const effectsBlockRe = /(effects:\s*\[)([\s\S]*?)(\]\s*,)/;
  const m = block.match(effectsBlockRe);
  if (!m) return block;
  const inner = m[2];
  // 各 effect item の text を順に置換
  const itemRe = /(\{\s*target:\s*"[^"]+"\s*,\s*text:\s*")([^"]*)("\s*\})/g;
  let i = 0;
  let changed = false;
  const newInner = inner.replace(itemRe, (full, prefix, oldText, suffix) => {
    const slot = i++;
    if (slot >= sheetTexts.length) return full;
    const newText = sheetTexts[slot];
    if (!newText || newText === "") return full;     // 空 = 変更なし
    if (newText === oldText) return full;
    changed = true;
    return prefix + newText.replace(/"/g, '\\"') + suffix;
  });
  if (!changed) return block;
  return block.replace(effectsBlockRe, `$1${newInner}$3`);
}
