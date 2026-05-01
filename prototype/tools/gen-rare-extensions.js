/**
 * gen-rare-extensions.js
 *
 * MCH エクステンション CSV (Rare) から本タイトル用カード定義を生成。
 * gen-cu-extensions.js の Rare 版。
 *
 * 使い方:
 *   node prototype/tools/gen-rare-extensions.js <input.csv> > out.txt
 *
 * 入力 CSV (bearko/mycryptoheroes/Data/Extensions/extensions.csv) のうち
 * Rarity=Rare の行を対象にする。
 *
 * Rare カードは Common/Uncommon より強力にスケーリング:
 * - ステータス上昇 flat: Common +1〜+3 / Uncommon +1〜+4 / Rare +1〜+5
 * - ステータス減少 flat: Common -1〜-2 / Uncommon -1〜-3 / Rare -1〜-4
 * - 状態異常 stack 数: Common 1 / Uncommon 1 / Rare 2
 * - cost: 高%ダメージや multi-hit は cost 2、それ以外は cost 1
 */
const fs = require("fs");
const path = require("path");

// 既に cards.js で定義済みの extId は cards.js から動的に抽出する
function loadExistingExtIds() {
  const cardsPath = path.join(__dirname, "..", "js", "cards.js");
  if (!fs.existsSync(cardsPath)) return new Set();
  const txt = fs.readFileSync(cardsPath, "utf-8");
  const set = new Set();
  const re = /extId:\s*(\d+)/g;
  let m;
  while ((m = re.exec(txt)) !== null) set.add(+m[1]);
  return set;
}
const EXISTING_EXT_IDS = loadExistingExtIds();

// ─── CSV パース ─────────────────────────────────────────────────
function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
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
  // 改行を含むセルがある可能性に備え、引用符状態を持って結合する
  const out = [];
  let buf = "";
  let inQuote = false;
  for (const ch of text) {
    if (ch === '"') inQuote = !inQuote;
    if (ch === "\n" && !inQuote) {
      out.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) out.push(buf);
  return out;
}

// ─── 効果テキスト解析 ───────────────────────────────────────────
function parseEffects(text, rarity) {
  text = text || "";
  const _rarity = (rarity || "").toLowerCase();
  const e = {
    phyDmg: null,        // {min, max} on enemy.foremost
    intDmg: null,        // {min, max} on enemy.foremost
    heal: null,          // {min, max} of healing coefficient
    selfPhy: 0,
    selfInt: 0,
    selfAgi: 0,
    enemyPhy: 0,
    enemyInt: 0,
    enemyAgi: 0,
    poison: 0,
    bleed: 0,
    isAoe: false,
    doubleHit: false,
  };
  if (!text) return e;
  function scaleStat(pct) {
    const cap = _rarity === "rare" ? 5 : (_rarity === "uncommon" ? 4 : 3);
    return Math.max(1, Math.min(cap, Math.floor(pct / 10)));
  }
  function scaleDebuff(pct) {
    const cap = _rarity === "rare" ? 4 : (_rarity === "uncommon" ? 3 : 2);
    return -Math.max(1, Math.min(cap, Math.floor(pct / 10)));
  }

  if (text.includes("敵全体")) e.isAoe = true;
  if (text.includes("2回繰り返す")) e.doubleHit = true;

  // damage extraction (range or single)
  const phyRange = text.match(/自身のPHYの(\d+)\s*~\s*(\d+)\s*%\s*ダメージ/);
  if (phyRange) e.phyDmg = { min: +phyRange[1], max: +phyRange[2] };
  else {
    const phySingle = text.match(/自身のPHYの(\d+)\s*%\s*ダメージ/);
    if (phySingle) e.phyDmg = { min: +phySingle[1], max: +phySingle[1] };
  }

  const intRange = text.match(/自身のINTの(\d+)\s*~\s*(\d+)\s*%\s*ダメージ/);
  if (intRange) e.intDmg = { min: +intRange[1], max: +intRange[2] };
  else {
    const intSingle = text.match(/自身のINTの(\d+)\s*%\s*ダメージ/);
    if (intSingle) e.intDmg = { min: +intSingle[1], max: +intSingle[1] };
  }

  const healRange = text.match(/回復係数の(\d+)\s*~\s*(\d+)\s*%\s*回復/);
  if (healRange) e.heal = { min: +healRange[1], max: +healRange[2] };
  else {
    const healSingle = text.match(/回復係数の(\d+)\s*%\s*回復/);
    if (healSingle) e.heal = { min: +healSingle[1], max: +healSingle[1] };
  }

  // Self stat buffs (倍率源は問わず flat +N。Common +1〜+3 / Uncommon +1〜+4 にクランプ)
  const phyUp = text.match(/自身のPHYを[^/]*?の(\d+)\s*~?\s*(\d+)?\s*%\s*アップ/);
  if (phyUp) {
    const pct = +phyUp[2] || +phyUp[1];
    e.selfPhy = scaleStat(pct);
  }
  const intUp = text.match(/自身のINTを[^/]*?の(\d+)\s*~?\s*(\d+)?\s*%\s*アップ/);
  if (intUp) {
    const pct = +intUp[2] || +intUp[1];
    e.selfInt = scaleStat(pct);
  }
  const agiUp = text.match(/自身のAGIを[^/]*?の(\d+)\s*~?\s*(\d+)?\s*%\s*アップ/);
  if (agiUp) {
    const pct = +agiUp[2] || +agiUp[1];
    e.selfAgi = scaleStat(pct);
  }

  // Enemy stat debuffs (敵デバフ: -1〜-2 Common / -1〜-3 Uncommon)
  const phyDown = text.match(/敵(?:全体)?のPHYを[^/]*?の(\d+)\s*%\s*ダウン/);
  if (phyDown) e.enemyPhy = scaleDebuff(+phyDown[1]);
  const intDown = text.match(/敵(?:全体)?のINTを[^/]*?の(\d+)\s*%\s*ダウン/);
  if (intDown) e.enemyInt = scaleDebuff(+intDown[1]);
  const agiDown = text.match(/敵(?:全体)?のAGIを[^/]*?の(\d+)\s*%\s*ダウン/);
  if (agiDown) e.enemyAgi = scaleDebuff(+agiDown[1]);

  // Status effects (本タイトルでは poison/bleed のみ)
  // Rare は stack 数を 2 にする
  const stackBase = _rarity === "rare" ? 2 : 1;
  if (text.includes("毒")) e.poison = stackBase;
  if (text.includes("出血")) e.bleed += stackBase;
  if (text.includes("気絶") || text.includes("睡眠")) e.bleed += stackBase;       // stun-like → bleed
  if (text.includes("衰弱") || text.includes("恐怖") ||
      text.includes("呪い") || text.includes("混乱")) e.poison += stackBase;     // debuff-like → poison

  return e;
}

// ─── カード定義生成 ─────────────────────────────────────────────
function escapeJaForJs(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function generateCardEntry(row) {
  const extId = +row.id;
  const nameJa = row.name_ja;
  const skillName = row.active_skill_name_ja || nameJa;
  const text = row.active_skill_text_ja || "";
  const rarity = (row.rarity || "").toLowerCase();
  const hp = +(row.hp || 0);
  const phy = +(row.phy || 0);
  const int_ = +(row.int || 0);
  const agi = +(row.agi || 0);

  const e = parseEffects(text, rarity);

  // type / target / icon
  let type = "skl";
  let target = "self";
  let icon = "phy.png";

  if (e.phyDmg) { type = "atk"; target = "enemy.foremost"; icon = "phy.png"; }
  else if (e.intDmg) { type = "atk"; target = "enemy.foremost"; icon = "int.png"; }
  else if (e.heal) { type = "skl"; target = "self"; icon = "hp.png"; }
  else if (e.selfPhy > 0) icon = "BUF_phy.png";
  else if (e.selfInt > 0) icon = "BUF_int.png";
  else if (e.selfAgi > 0) icon = "BUF_agi.png";
  else if (e.enemyPhy || e.enemyInt || e.enemyAgi || e.poison || e.bleed) {
    type = "skl"; target = "enemy.foremost";
    icon = e.enemyInt ? "DBF_int.png" : e.enemyAgi ? "DBF_agi.png" : "DBF_phy.png";
  }

  // cost
  let cost = 1;
  if (e.phyDmg && e.phyDmg.max >= 100) cost = 2;
  if (e.intDmg && e.intDmg.max >= 100) cost = 2;
  if (e.doubleHit) cost = 2;
  if (rarity === "uncommon" && (e.phyDmg || e.intDmg) && cost < 2 &&
      ((e.phyDmg && e.phyDmg.max >= 80) || (e.intDmg && e.intDmg.max >= 80))) {
    cost = 2;
  }

  // build summary / preview / play lines
  const summaryLines = [];
  const previewLines = [];
  const peekKeys = [];
  const playLines = [];
  const stMode = []; // for damage: "phy" or "int"

  if (e.phyDmg) {
    const { min, max } = e.phyDmg;
    if (e.doubleHit) {
      summaryLines.push("`敵にダメージ ×2`");
      previewLines.push(`\`敵1体に PHY ${min}〜${max}% × 2 回ダメージ\``);
      playLines.push(`api.dealPhySkillToEnemy(s, ${min}, ${max});`);
      playLines.push(`if (s.enemyHp > 0) api.dealPhySkillToEnemy(s, ${min}, ${max});`);
    } else {
      summaryLines.push("`敵にダメージ\\u3000${estPhyHit(s.playerPhy, s.enemyPhy, " + min + ", " + max + ")}`");
      previewLines.push(`\`敵1体に \${estPhyHit(s.playerPhy, s.enemyPhy, ${min}, ${max})} ダメージ（PHY ${min}〜${max}%）\``);
      playLines.push(`api.dealPhySkillToEnemy(s, ${min}, ${max});`);
    }
    stMode.push("phy");
  }
  if (e.intDmg) {
    const { min, max } = e.intDmg;
    summaryLines.push("`敵にダメージ\\u3000${estIntHit(s.playerInt, s.enemyInt, " + min + ", " + max + ")}`");
    previewLines.push(`\`敵${e.isAoe ? "全体相当" : "1体"}に \${estIntHit(s.playerInt, s.enemyInt, ${min}, ${max})} ダメージ（INT ${min}〜${max}%${e.isAoe ? "・1v1=単体" : ""}）\``);
    playLines.push(`${e.isAoe ? 'api.playBattleSe("area"); ' : ""}api.dealIntSkillToEnemy(s, ${min}, ${max});`);
    stMode.push("int");
  }
  if (e.heal) {
    const { min, max } = e.heal;
    summaryLines.push("\"HP\\u3000+\" + estHealInt(s.playerInt, s.playerPhy, " + min + ", " + max + ")");
    previewLines.push(`\`HP を回復係数 ${min}〜${max}% 分回復（推定 +\${estHealInt(s.playerInt, s.playerPhy, ${min}, ${max})}）\``);
    peekKeys.push("hp");
    playLines.push(`api.healPlayerFromIntSkill(s, ${min}, ${max});`);
  }

  if (e.selfPhy > 0) {
    summaryLines.push(`"PHY\\u3000+${e.selfPhy}"`);
    previewLines.push(`"PHY を +${e.selfPhy}"`);
    peekKeys.push("phy");
    playLines.push(`s.playerPhy += ${e.selfPhy};`);
  }
  if (e.selfInt > 0) {
    summaryLines.push(`"INT\\u3000+${e.selfInt}"`);
    previewLines.push(`"INT を +${e.selfInt}"`);
    peekKeys.push("int");
    playLines.push(`s.playerInt += ${e.selfInt};`);
  }
  if (e.selfAgi > 0) {
    summaryLines.push(`"AGI\\u3000+${e.selfAgi}"`);
    previewLines.push(`"AGI を +${e.selfAgi}"`);
    peekKeys.push("agi");
    playLines.push(`s.playerAgi += ${e.selfAgi};`);
  }
  if (e.enemyPhy < 0) {
    summaryLines.push(`"PHY\\u3000${e.enemyPhy}（敵）"`);
    previewLines.push(`"敵の PHY を ${e.enemyPhy}"`);
    peekKeys.push("phy");
    playLines.push(`s.enemyPhy = Math.max(1, s.enemyPhy + (${e.enemyPhy})); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");`);
  }
  if (e.enemyInt < 0) {
    summaryLines.push(`"INT\\u3000${e.enemyInt}（敵）"`);
    previewLines.push(`"敵の INT を ${e.enemyInt}"`);
    peekKeys.push("int");
    playLines.push(`s.enemyInt = Math.max(1, s.enemyInt + (${e.enemyInt})); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");`);
  }
  if (e.enemyAgi < 0) {
    summaryLines.push(`"AGI\\u3000${e.enemyAgi}（敵）"`);
    previewLines.push(`"敵の AGI を ${e.enemyAgi}"`);
    peekKeys.push("agi");
    playLines.push(`s.enemyAgi = Math.max(1, s.enemyAgi + (${e.enemyAgi})); api.playBattleSe("debuff"); api.portraitFx("enemy", "debuff");`);
  }
  if (e.bleed > 0) {
    summaryLines.push(`"出血 ×${e.bleed}（敵）"`);
    previewLines.push(`"敵に出血 ×${e.bleed} 付与"`);
    playLines.push(`api.addBleedToEnemy(s, ${e.bleed});`);
  }
  if (e.poison > 0) {
    summaryLines.push(`"毒 ×${e.poison}（敵）"`);
    previewLines.push(`"敵に毒 ×${e.poison} 付与"`);
    playLines.push(`api.addPoisonToEnemy(s, ${e.poison});`);
  }

  // Fallback (StS-style replacement) if no effect could be extracted
  if (playLines.length === 0) {
    if (phy > 0 && int_ === 0) {
      type = "atk"; target = "enemy.foremost"; icon = "phy.png";
      summaryLines.push("`敵にダメージ\\u3000${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)}`");
      previewLines.push("`敵1体に ${estPhyHit(s.playerPhy, s.enemyPhy, 50, 60)} ダメージ（PHY 50〜60%・代替効果）`");
      playLines.push("api.dealPhySkillToEnemy(s, 50, 60);");
    } else if (int_ > 0 && phy === 0) {
      type = "atk"; target = "enemy.foremost"; icon = "int.png";
      summaryLines.push("`敵にダメージ\\u3000${estIntHit(s.playerInt, s.enemyInt, 50, 60)}`");
      previewLines.push("`敵1体に ${estIntHit(s.playerInt, s.enemyInt, 50, 60)} ダメージ（INT 50〜60%・代替効果）`");
      playLines.push("api.dealIntSkillToEnemy(s, 50, 60);");
    } else if (hp > 0) {
      type = "skl"; target = "self"; icon = "guard.png";
      summaryLines.push('"ガード\\u3000+6"');
      previewLines.push('"ガードを 6 得る（StS 風代替効果）"');
      peekKeys.push("guard");
      playLines.push("s.playerGuard += 6; api.playBattleSe(\"buff\"); api.portraitFx(\"player\", \"buff\");");
    } else {
      type = "skl"; target = "self"; icon = "hp.png";
      summaryLines.push('"ドロー　1"');
      previewLines.push('"カードを 1 枚引く（StS 風代替効果）"');
      peekKeys.push("draw");
      playLines.push("api.drawCards(s, 1);");
    }
  }

  // Build effectSummaryLines, previewLines, play function strings
  const sumBody = summaryLines.length > 0
    ? `[${summaryLines.join(", ")}]`
    : `[]`;
  const prevBody = previewLines.length > 0
    ? `[${previewLines.join(", ")}]`
    : `[]`;
  const peekBody = peekKeys.length > 0
    ? `[${[...new Set(peekKeys)].map(k => `"${k}"`).join(", ")}]`
    : `[]`;

  // detect whether s is referenced
  const sumNeedsS = sumBody.includes("s.");
  const prevNeedsS = prevBody.includes("s.");

  const key = `ext${extId}`;
  const lines = [];
  lines.push(`    ${key}: {`);
  lines.push(`      libraryKey: "${key}",`);
  lines.push(`      extId: ${extId},`);
  lines.push(`      extNameJa: "${escapeJaForJs(nameJa)}",`);
  lines.push(`      skillNameJa: "${escapeJaForJs(skillName)}",`);
  lines.push(`      skillIcon: "${icon}",`);
  lines.push(`      cost: ${cost},`);
  lines.push(`      type: "${type}",`);
  lines.push(`      target: "${target}",`);
  lines.push(`      effectSummaryLines(${sumNeedsS ? "s" : ""}) { return ${sumBody}; },`);
  lines.push(`      peekHelpKeys() { return ${peekBody}; },`);
  lines.push(`      previewLines(${prevNeedsS ? "s" : ""}) { return ${prevBody}; },`);
  lines.push(`      play(s) {`);
  for (const pl of playLines) lines.push(`        ${pl}`);
  lines.push(`      },`);
  lines.push(`    },`);

  return { key, rarity: rarity || "common", code: lines.join("\n") };
}

// ─── main ───────────────────────────────────────────────────────
function main() {
  const inputPath = process.argv[2];
  if (!inputPath) { console.error("usage: node gen-cu-extensions.js <csv>"); process.exit(1); }
  const raw = fs.readFileSync(inputPath, "utf-8");
  const lines = parseCsv(raw);
  if (lines.length === 0) { console.error("empty CSV"); process.exit(1); }
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(l => {
    const cells = parseCsvLine(l);
    const obj = {};
    headers.forEach((h, i) => obj[h] = cells[i] || "");
    return obj;
  }).filter(r => r.id && r.rarity === "Rare");

  const generated = [];
  const skipped = [];
  for (const row of rows) {
    const extId = +row.id;
    if (EXISTING_EXT_IDS.has(extId)) { skipped.push(extId); continue; }
    const card = generateCardEntry(row);
    generated.push(card);
  }

  // Output: card library blocks
  console.log("// ─── auto-generated Rare extensions (" + generated.length + " cards) ───");
  for (const g of generated) console.log(g.code);
  console.log("");
  console.log("// ─── auto-generated CARD_RARITIES entries ───");
  for (const g of generated) {
    console.log(`  ${g.key}: '${g.rarity}',`);
  }
  console.error(`Generated ${generated.length} cards. Skipped ${skipped.length} existing: ${skipped.join(",")}`);
}

main();
