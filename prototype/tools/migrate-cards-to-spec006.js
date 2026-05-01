#!/usr/bin/env node
/**
 * SPEC-006 Phase 4c migration script
 *
 * Reads `prototype/js/cards.js` and emits an analysis + an annotated copy with:
 *   - `caster: "foremost"` inserted after `target: ...` (default per SPEC-006 §9.1)
 *   - `effects: [...]` derived from existing `effectSummaryLines` and `play()` patterns
 *
 * Usage:
 *   node prototype/tools/migrate-cards-to-spec006.js          # report only (dry-run)
 *   node prototype/tools/migrate-cards-to-spec006.js --apply  # write cards.js in place (unsafe)
 *   node prototype/tools/migrate-cards-to-spec006.js --out FILE
 *
 * Notes:
 *   - Idempotent: cards already having `caster:` are left alone for that field.
 *   - The script never overwrites an existing `effects:` field.
 *   - Patterns it can auto-derive: dealPhySkillToEnemy / dealIntSkillToEnemy /
 *     dealIntSkillToEnemyCrit / healPlayerFromIntSkill / addPoisonToEnemy /
 *     addBleedToEnemy / addPlayerShield / setDamageReducedThisTurn / drawCards /
 *     direct stat additions (s.playerXxx += N / s.playerGuard += N).
 *   - Anything else gets `effects: [{target:"TODO",text:"TODO"}]` and is reported.
 *
 * The output is meant to be reviewed manually before merging — emit a side-by-side
 * .preview.js by default rather than mutating cards.js in place.
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const outIdx = args.indexOf("--out");
const rootIdx = args.indexOf("--root");
const PROTO_ROOT = rootIdx >= 0 ? args[rootIdx + 1] : path.join(__dirname, "..");

const CARDS_PATH = path.join(PROTO_ROOT, "js", "cards.js");
const OUT_PATH = outIdx >= 0 ? args[outIdx + 1]
                 : APPLY ? CARDS_PATH
                 : path.join(PROTO_ROOT, "js", "cards.spec006-preview.js");

function readSource() { return fs.readFileSync(CARDS_PATH, "utf8"); }

/** Find each top-level card block: ext1001 / cd101 / ext20xx etc. */
function findCardBlocks(src) {
  const cards = [];
  // Match e.g. "    ext1001: {" up through its matching closing "    },"
  // We rely on indentation: 4 spaces for entry, then balanced braces.
  const headerRe = /^    ((?:ext|cd)[0-9A-Za-z]+):\s*\{/gm;
  let m;
  while ((m = headerRe.exec(src)) !== null) {
    const key = m[1];
    const blockStart = m.index;
    const bodyStart = m.index + m[0].length;
    let depth = 1;
    let i = bodyStart;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    }
    if (depth !== 0) continue;
    // i is one past the closing `}`. Move past trailing comma+newline.
    cards.push({ key, start: blockStart, bodyStart, end: i });
  }
  return cards;
}

/** Extract the `target: "..."` literal from a block. */
function extractTarget(block) {
  const m = block.match(/target:\s*"([^"]+)"/);
  return m ? m[1] : null;
}

/** Whether the block already has `caster:` field. */
function hasCaster(block) { return /\bcaster:\s*"/.test(block); }
function hasEffects(block) { return /\beffects:\s*\[/.test(block); }

/** Extract the full play() function body as text. Returns null if not found. */
function extractPlayBody(block) {
  const start = block.search(/\bplay\s*\([^)]*\)\s*\{/);
  if (start < 0) return null;
  const braceStart = block.indexOf("{", start);
  let depth = 1;
  let i = braceStart + 1;
  while (i < block.length && depth > 0) {
    const ch = block[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  return block.slice(braceStart + 1, i - 1);
}

/** Derive a list of `{target, text}` entries from a play() body and target field. */
function deriveEffects(playBody, defaultTarget) {
  if (!playBody) return null;
  const out = [];
  let unmatchedNonTrivial = false;

  // Split into statements by both newlines and semicolons (some cards put
  // multiple stmts on one line, e.g. ext2185).
  const lines = playBody
    .split(/\n|;\s*/)
    .map(l => l.trim().replace(/;$/, ""))
    .filter(Boolean);

  for (const line of lines) {
    // Comments / debug-only / SE&FX calls are ignored for effect derivation
    if (/^\/\//.test(line)) continue;
    if (/^api\.playBattleSe\(/.test(line)) continue;
    if (/^api\.portraitFx\(/.test(line)) continue;
    if (/^se\(/.test(line)) continue;
    if (/^fx\(/.test(line)) continue;
    if (/^clog\(/.test(line)) continue;
    if (/^api\.addGold\(/.test(line)) continue;  // meta effect

    let m;

    // dealPhySkillToEnemy(s, lo, hi)
    if ((m = line.match(/api\.dealPhySkillToEnemy\(\s*s\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/))) {
      out.push({ target: defaultTarget || "enemy.foremost",
                 text: `PHYダメ ${m[1]}-${m[2]}%` });
      continue;
    }
    // dealIntSkillToEnemy(s, lo, hi) or Crit
    if ((m = line.match(/api\.dealIntSkillToEnemy(?:Crit)?\(\s*s\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/))) {
      const isCrit = /Crit\b/.test(line);
      out.push({ target: defaultTarget || "enemy.foremost",
                 text: `INTダメ ${m[1]}-${m[2]}%${isCrit ? " (CRIT固定)" : ""}` });
      continue;
    }
    // healPlayerFromIntSkill(s, lo, hi)
    if ((m = line.match(/api\.healPlayerFromIntSkill\(\s*s\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/))) {
      out.push({ target: "self", text: `HP回復 INT${m[1]}-${m[2]}%` });
      continue;
    }
    // addPoisonToEnemy(s, n)
    if ((m = line.match(/api\.addPoisonToEnemy\(\s*s\s*,\s*(\d+)\s*\)/))) {
      out.push({ target: defaultTarget || "enemy.foremost",
                 text: `毒 ×${m[1]}` });
      continue;
    }
    // addBleedToEnemy(s, n)
    if ((m = line.match(/api\.addBleedToEnemy\(\s*s\s*,\s*(\d+)\s*\)/))) {
      out.push({ target: defaultTarget || "enemy.foremost",
                 text: `出血 ×${m[1]}` });
      continue;
    }
    // addPlayerShield(s, n)
    if ((m = line.match(/api\.addPlayerShield\(\s*s\s*,\s*(\d+)\s*\)/))) {
      out.push({ target: "self", text: `シールド +${m[1]}` });
      continue;
    }
    // clearPlayerDebuffs(s)
    if (/api\.clearPlayerDebuffs\(\s*s\s*\)/.test(line)) {
      out.push({ target: "self", text: "状態異常解除" });
      continue;
    }
    // setDamageReducedThisTurn(s)
    if (/api\.setDamageReducedThisTurn\(\s*s\s*\)/.test(line)) {
      out.push({ target: "self", text: "被ダメ半減 (1ターン)" });
      continue;
    }
    // drawCards(s, n)
    if ((m = line.match(/api\.drawCards\(\s*s\s*,\s*(\d+)\s*\)/))) {
      out.push({ target: "self", text: `ドロー +${m[1]}` });
      continue;
    }

    // Direct player stat additions: s.playerPhy += 2 / s.playerGuard += 7 / ...
    if ((m = line.match(/s\.player(Phy|Int|Agi|Guard|Shield)\s*\+=\s*(\d+)/))) {
      const stat = m[1];
      const n = m[2];
      const map = { Phy: "PHY", Int: "INT", Agi: "AGI", Guard: "ガード", Shield: "シールド" };
      out.push({ target: "self", text: `${map[stat]} +${n}` });
      continue;
    }
    // Direct enemy stat subtractions:
    //   s.enemyInt = Math.max(1, s.enemyInt - 2)
    //   s.enemyAgi = Math.max(1, s.enemyAgi + (-3))   (ext2185 style)
    if ((m = line.match(/s\.enemy(Phy|Int|Agi)\s*=\s*Math\.max\(\d+,\s*s\.enemy\1\s*(?:-\s*(\d+)|\+\s*\(-(\d+)\))\s*\)/))) {
      const stat = m[1];
      const n = m[2] || m[3];
      const map = { Phy: "PHY", Int: "INT", Agi: "AGI" };
      out.push({ target: defaultTarget || "enemy.foremost",
                 text: `敵${map[stat]} -${n}` });
      continue;
    }
    // Direct enemy stat additions:
    //   s.enemyHp += N (heal-enemy, rare)
    //   s.enemyShield += N
    if ((m = line.match(/s\.enemy(Hp|Shield)\s*\+=\s*(\d+)/))) {
      const stat = m[1];
      const map = { Hp: "HP回復", Shield: "シールド" };
      out.push({ target: defaultTarget || "enemy.foremost",
                 text: `敵${map[stat]} +${m[2]}` });
      continue;
    }
    // bonusEnergyNext: 次ターン +1 エナジー
    if (/s\.bonusEnergyNext\s*=\s*\(s\.bonusEnergyNext\s*\|\|\s*0\)\s*\+\s*1/.test(line)) {
      out.push({ target: "self", text: "次ターン ⚡+1" });
      continue;
    }
    // hasResurrection
    if (/s\.hasResurrection\s*=\s*true/.test(line)) {
      out.push({ target: "self", text: "リザレクション付与" });
      continue;
    }
    // phyPenaltyNext: 次ターン PHY ペナルティ
    if ((m = line.match(/s\.phyPenaltyNext\s*=\s*\(s\.phyPenaltyNext\s*\|\|\s*0\)\s*\+\s*(\d+)/))) {
      out.push({ target: "self", text: `次ターン PHY -${m[1]}` });
      continue;
    }

    // Anything else: mark as needing manual review
    unmatchedNonTrivial = true;
  }

  return { effects: out, hasUnmatched: unmatchedNonTrivial };
}

/** Insert a `caster: "foremost",` line and an `effects: [...]` block.
 *  Returns the new block text. Both are inserted on the line after `target: ...`. */
function patchBlock(block, info) {
  let out = block;
  const indent = "      "; // 6 spaces (cards are nested inside a `return { ... }`)

  // 1) caster
  if (!hasCaster(out)) {
    out = out.replace(/(target:\s*"[^"]+",)/,
                      `$1\n${indent}caster: "foremost",`);
  }

  // 2) effects
  if (!hasEffects(out)) {
    const effectsLines = info.effects.length
      ? info.effects.map(e => `${indent}  { target: ${JSON.stringify(e.target)}, text: ${JSON.stringify(e.text)} }`)
      : [`${indent}  { target: "TODO", text: "TODO" }`];
    const effectsBlock =
      `${indent}// SPEC-006: auto-derived effects (review needed: ${info.hasUnmatched ? "YES" : "no"})\n` +
      `${indent}effects: [\n` + effectsLines.join(",\n") + `\n${indent}],`;
    // Insert AFTER the caster line we just added (or after target line if caster pre-existed)
    const anchor = /caster:\s*"[^"]+",/.exec(out) || /target:\s*"[^"]+",/.exec(out);
    if (anchor) {
      const insertAt = anchor.index + anchor[0].length;
      out = out.slice(0, insertAt) + "\n" + effectsBlock + out.slice(insertAt);
    }
  }

  return out;
}

function main() {
  const src = readSource();
  const blocks = findCardBlocks(src);
  let patched = src;
  let report = {
    total: blocks.length,
    needReview: [],
    autoDerived: 0,
    skippedHadCaster: 0,
    skippedHadEffects: 0,
    targets: {},
  };

  // Iterate from end to start so earlier indices stay valid.
  for (let bi = blocks.length - 1; bi >= 0; bi--) {
    const b = blocks[bi];
    const blockText = src.slice(b.start, b.end);
    const target = extractTarget(blockText);
    report.targets[target] = (report.targets[target] || 0) + 1;

    const playBody = extractPlayBody(blockText);
    const info = deriveEffects(playBody, target) || { effects: [], hasUnmatched: true };

    if (info.hasUnmatched) report.needReview.push({ key: b.key, target });
    if (!hasCaster(blockText)) report.autoDerived++;
    else report.skippedHadCaster++;
    if (hasEffects(blockText)) report.skippedHadEffects++;

    const newBlock = patchBlock(blockText, info);
    patched = patched.slice(0, b.start) + newBlock + patched.slice(b.end);
  }

  fs.writeFileSync(OUT_PATH, patched, "utf8");

  console.log(`\n=== SPEC-006 Phase 4c migration ===`);
  console.log(`Source : ${path.relative(process.cwd(), CARDS_PATH)}`);
  console.log(`Output : ${path.relative(process.cwd(), OUT_PATH)}`);
  console.log(`Mode   : ${APPLY ? "APPLY (in-place)" : "preview"}`);
  console.log(`---`);
  console.log(`Cards processed   : ${report.total}`);
  console.log(`Targets seen      : ${JSON.stringify(report.targets)}`);
  console.log(`caster added      : ${report.autoDerived}`);
  console.log(`caster pre-existed: ${report.skippedHadCaster}`);
  console.log(`effects pre-existed: ${report.skippedHadEffects}`);
  console.log(`Need manual review (effects): ${report.needReview.length}`);
  if (report.needReview.length > 0 && report.needReview.length <= 30) {
    for (const e of report.needReview) console.log(`  - ${e.key} (target: ${e.target})`);
  } else if (report.needReview.length > 30) {
    console.log(`  (showing first 30):`);
    for (const e of report.needReview.slice(0, 30)) console.log(`  - ${e.key} (target: ${e.target})`);
  }
  console.log(`\nDone.`);
}

main();
