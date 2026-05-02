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
