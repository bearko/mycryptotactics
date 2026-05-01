/**
 * gen-legendary-heroes.js
 *
 * MCH ヒーロー CSV (Legendary) から本タイトル用のヒーロー定義 + パッシブ関数を生成。
 * gen-epic-heroes.js の Legendary 版（最高スケーリング）。
 *
 * 使い方:
 *   node prototype/tools/gen-legendary-heroes.js <input.csv> > out.txt
 *
 * 出力:
 *   1) heroes.json に append する 33 エントリ
 *   2) main.js に append するパッシブ関数 + dispatcher case 句
 *
 * Legendary スケーリング (最高位):
 *   - ステータス上昇 cap: +1〜+9 (vs Epic +1〜+7 / Rare +1〜+6)
 *   - ステータス減少 cap: -1〜-7 (vs Epic -1〜-6 / Rare -1〜-5)
 *   - 状態異常 stack: 4 (vs Epic 3 / Rare 2)
 *   - HP 範囲: 100-130 (vs Epic 95-120)
 *   - PHY/INT/AGI 範囲: 8-30 (vs Epic 7-26)
 *   - 元 DB の複雑な発動条件 (HP<N%, 死亡時, 被ダメ後 etc) は onCombatStart に簡略化
 *   - 既存の applyHeroPassiveOnCombatStart / applyHeroPassiveOnCardUse dispatcher に case 追加
 */
const fs = require("fs");

// heroId -> passiveKey (romanized)
const PASSIVE_KEYS = {
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

// ─── スタッツスケール ──────────────────────────────────────────
// MCH オリジナルの数値を本タイトル範囲に圧縮。
// Legendary はヒーローとして最高位 (HP 100-130, P/I/A 8-30) に。
function scaleStats(hp, phy, int_, agi) {
  // HP scaling: target range 100-130
  const hpMax = Math.max(100, Math.min(130, Math.round(hp / 4)));
  // PHY/INT/AGI: divide by 7, clamp to 8-30
  const sP = phy === 0 ? 0 : Math.max(8, Math.min(30, Math.round(phy / 7)));
  const sI = int_ === 0 ? 0 : Math.max(8, Math.min(30, Math.round(int_ / 7)));
  const sA = agi === 0 ? 0 : Math.max(8, Math.min(30, Math.round(agi / 7)));
  // Ensure at least 1 in each (avoid 0 stats)
  return {
    hpMax,
    basePhy: Math.max(1, sP),
    baseInt: Math.max(1, sI),
    baseAgi: Math.max(1, sA),
  };
}

// ─── パッシブテキスト解析 ──────────────────────────────────────
function parsePassive(text) {
  text = text || "";
  const e = {
    hook: "combatStart",      // "combatStart" | "cardUse"
    phyDmg: null,              // {min, max, repeat}
    intDmg: null,
    heal: null,                // {min, max}
    selfPhy: 0, selfInt: 0, selfAgi: 0,
    enemyPhy: 0, enemyInt: 0, enemyAgi: 0,
    poison: 0, bleed: 0,
    resurrect: false,
    repeat: 1,
  };

  // Hook detection
  if (text.includes("Active Skillを使用した後")) e.hook = "cardUse";
  // 他のすべてのトリガーは onCombatStart に簡略化

  // Resurrection
  if (text.includes("復活")) e.resurrect = true;

  // Damage repeat
  const repeatMatch = text.match(/(\d+)回繰り返す/);
  const repeat = repeatMatch ? +repeatMatch[1] : 1;

  // PHY damage
  const phyRange = text.match(/自身のPHYの(\d+)\s*~\s*(\d+)\s*%\s*ダメージ/);
  if (phyRange) e.phyDmg = { min: +phyRange[1], max: +phyRange[2], repeat };
  else {
    const phyOne = text.match(/自身のPHYの(\d+)\s*%\s*ダメージ/);
    if (phyOne) e.phyDmg = { min: +phyOne[1], max: +phyOne[1], repeat };
  }

  // INT damage
  const intRange = text.match(/自身のINTの(\d+)\s*~\s*(\d+)\s*%\s*ダメージ/);
  if (intRange) e.intDmg = { min: +intRange[1], max: +intRange[2], repeat };
  else {
    const intOne = text.match(/自身のINTの(\d+)\s*%\s*ダメージ/);
    if (intOne) e.intDmg = { min: +intOne[1], max: +intOne[1], repeat };
  }

  // Heal
  const healRange = text.match(/回復係数の(\d+)\s*~\s*(\d+)\s*%\s*回復/);
  if (healRange) e.heal = { min: +healRange[1], max: +healRange[2] };
  else {
    const healOne = text.match(/回復係数の(\d+)\s*%\s*回復/);
    if (healOne) e.heal = { min: +healOne[1], max: +healOne[1] };
  }

  // Self stat buffs (Legendary: cap at +1〜+9)
  function scaleStat(pct) {
    return Math.max(1, Math.min(9, Math.floor(pct / 10)));
  }
  function scaleDebuff(pct) {
    return -Math.max(1, Math.min(7, Math.floor(pct / 10)));
  }

  // 1v1 ベースなので「自身」「味方全体」「PHYが最も高い味方」「先頭の味方」「最後尾の味方」等は
  // すべて self (player) として解釈
  const SELF_PREFIX = "(?:自身|味方全体|先頭の味方|最後尾の味方|中衛の味方|HPが最も低い味方|最大HPが最も低い味方|PHYが最も高い味方|INTが最も高い味方|AGIが最も高い味方)";
  const ENEMY_PREFIX = "(?:敵全体|先頭の敵|最後尾の敵|中衛の敵|HPが最も低い敵|HPが最も高い敵|最大HPが最も高い敵|PHYが最も高い敵|PHYが最も低い敵|INTが最も高い敵|INTが最も低い敵|AGIが最も高い敵|敵)";

  // Self stat ups: "<self>のPHY/INT/AGI を ... の N% アップ"
  function findStatUp(stat) {
    const re = new RegExp(`${SELF_PREFIX}の${stat}を[^/]*?の(\\d+)\\s*~?\\s*(\\d+)?\\s*%\\s*アップ`);
    const m = text.match(re);
    if (!m) return 0;
    return scaleStat(+m[2] || +m[1]);
  }
  e.selfPhy = findStatUp("PHY");
  e.selfInt = findStatUp("INT");
  e.selfAgi = findStatUp("AGI");

  // Enemy stat downs: "<enemy>のPHY/INT/AGI を ... の N% ダウン"
  function findStatDown(stat) {
    const re = new RegExp(`${ENEMY_PREFIX}の${stat}を[^/]*?の(\\d+)\\s*~?\\s*(\\d+)?\\s*%\\s*ダウン`);
    const m = text.match(re);
    if (!m) return 0;
    return scaleDebuff(+m[2] || +m[1]);
  }
  e.enemyPhy = findStatDown("PHY");
  e.enemyInt = findStatDown("INT");
  e.enemyAgi = findStatDown("AGI");

  // Damage to enemy positions other than 先頭: also captured already by phyRange/intRange
  // (regex didn't anchor target prefix, so e.g. "最後尾の敵に自身のPHYのN%ダメージ" still matches)

  // Shield buff: "自身のシールドを ... に更新" or "自身に ... シールドを付与"
  if (text.match(/自身のシールド|シールド.*付与|シールド.*更新/)) {
    e.shield = (e.shield || 0) + 8;  // flat +8 shield (Uncommon)
  }

  // Flat stat buff: "自身のXXX を N アップ" (no '%')
  const flatPhy = text.match(/自身のPHYを(\d+)アップ/);
  if (flatPhy && !e.selfPhy) e.selfPhy = Math.min(5, Math.max(1, Math.floor(+flatPhy[1] / 10)));
  const flatInt = text.match(/自身のINTを(\d+)アップ/);
  if (flatInt && !e.selfInt) e.selfInt = Math.min(5, Math.max(1, Math.floor(+flatInt[1] / 10)));
  const flatAgi = text.match(/自身のAGIを(\d+)アップ/);
  if (flatAgi && !e.selfAgi) e.selfAgi = Math.min(5, Math.max(1, Math.floor(+flatAgi[1] / 10)));

  // バリア/デコイ → ガード +6 として簡略化
  if (text.match(/バリアを付与|デコイを付与/)) {
    e.guard = (e.guard || 0) + 6;
  }

  // 「PHY/INT 減少量の N% ダメージ」 → 0.4 * stat ダメージで簡略化
  if (text.match(/PHY減少量の.*%ダメージ/) && !e.phyDmg) {
    e.phyDmg = { min: 40, max: 50, repeat: 1 };
  }
  if (text.match(/INT減少量の.*%ダメージ/) && !e.intDmg) {
    e.intDmg = { min: 40, max: 50, repeat: 1 };
  }

  // Status effects (project has poison/bleed only); Legendary は stack 数 4
  if (text.includes("毒")) e.poison += 4;
  if (text.includes("出血")) e.bleed += 4;
  if (text.includes("気絶") || text.includes("睡眠")) e.bleed += 4;
  if (text.includes("衰弱") || text.includes("恐怖") || text.includes("呪い") ||
      text.includes("混乱") || text.includes("バインド")) e.poison += 4;

  return e;
}

// ─── パッシブ関数名 (PascalCase) ───────────────────────────────
function pascalize(key) {
  return key.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

// ─── 説明文生成 (passiveDesc) ─────────────────────────────────
function generatePassiveDesc(e, isOnCardUse) {
  const parts = [];
  if (e.phyDmg) parts.push(`敵にPHY${e.phyDmg.min}〜${e.phyDmg.max}%ダメージ${e.phyDmg.repeat>1?"×"+e.phyDmg.repeat:""}`);
  if (e.intDmg) parts.push(`敵にINT${e.intDmg.min}〜${e.intDmg.max}%ダメージ${e.intDmg.repeat>1?"×"+e.intDmg.repeat:""}`);
  if (e.heal) parts.push(`HPを回復係数の${e.heal.min}〜${e.heal.max}%回復`);
  if (e.selfPhy) parts.push(`自身のPHY+${e.selfPhy}`);
  if (e.selfInt) parts.push(`自身のINT+${e.selfInt}`);
  if (e.selfAgi) parts.push(`自身のAGI+${e.selfAgi}`);
  if (e.enemyPhy) parts.push(`敵のPHY${e.enemyPhy}`);
  if (e.enemyInt) parts.push(`敵のINT${e.enemyInt}`);
  if (e.enemyAgi) parts.push(`敵のAGI${e.enemyAgi}`);
  if (e.poison) parts.push(`敵に毒×${e.poison}付与`);
  if (e.bleed) parts.push(`敵に出血×${e.bleed}付与`);
  if (e.resurrect) parts.push(`致死時に1回だけ1HPで生存`);
  if (e.shield) parts.push(`シールド+${e.shield}`);
  if (e.guard) parts.push(`ガード+${e.guard}`);
  const trig = isOnCardUse ? "カード使用後" : "戦闘開始時";
  if (parts.length === 0) {
    // Fallback effect
    return `${trig}・自身のPHY+1（DBに無い効果のため代替）`;
  }
  return `${trig}に発動・${parts.join("／")}`;
}

// ─── パッシブ関数本体生成 ─────────────────────────────────────
// 3v3 helper API (applyHpDeltaToEnemy / applyHpDeltaToHero / etc.) を使用
function generatePassiveFunction(passiveKey, passiveName, e, isOnCardUse) {
  const fnName = "apply" + pascalize(passiveKey) + "Passive";
  const lines = [];
  const isAsync = isOnCardUse;
  lines.push(`${isAsync ? "async " : ""}function ${fnName}(s) {`);

  // Determine if we need target/hero refs
  const needsTarget = !!(e.phyDmg || e.intDmg || e.enemyPhy || e.enemyInt || e.enemyAgi || e.poison || e.bleed);
  const needsHero = !!(e.heal || e.selfPhy || e.selfInt || e.selfAgi || e.shield || e.guard || e.resurrect);

  if (needsTarget) lines.push(`  const target = getPlayerAttackTargetEnemy(s);`);
  if (needsHero) lines.push(`  const hero = s.heroes?.[0];`);

  if (isOnCardUse) {
    lines.push(`  if (isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;`);
    lines.push(`  if (Math.random() >= 0.4) return;`);
    lines.push(`  combatInputLocked = true;`);
    lines.push(`  await showPassiveCutin("${passiveName}", typeof LEADER.img === "function" ? LEADER.img() : (LEADER.img || ""));`);
    lines.push(`  combatInputLocked = false;`);
    lines.push(`  if (!combat || isPartyWipedOut(s) || areAllEnemiesDefeated(s)) return;`);
  }

  // Apply effects
  let hasEffect = false;

  if (e.phyDmg) {
    hasEffect = true;
    const avg = Math.floor((e.phyDmg.min + e.phyDmg.max) / 2);
    if (e.phyDmg.repeat > 1) {
      lines.push(`  for (let i = 0; i < ${e.phyDmg.repeat} && !areAllEnemiesDefeated(s); i++) {`);
      lines.push(`    const dmg = Math.max(1, Math.floor(s.playerPhy * ${avg / 100}));`);
      lines.push(`    applyHpDeltaToEnemy(s, target, -dmg);`);
      lines.push(`    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");`);
      lines.push(`    clog(\`【${passiveName}】PHY ${"$"}{dmg} ダメージ\`);`);
      lines.push(`  }`);
    } else {
      lines.push(`  { const dmg = Math.max(1, Math.floor(s.playerPhy * ${avg / 100}));`);
      lines.push(`    applyHpDeltaToEnemy(s, target, -dmg);`);
      lines.push(`    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");`);
      lines.push(`    clog(\`【${passiveName}】発動！ PHY ${"$"}{dmg} ダメージ\`); }`);
    }
  }

  if (e.intDmg) {
    hasEffect = true;
    const avg = Math.floor((e.intDmg.min + e.intDmg.max) / 2);
    if (e.intDmg.repeat > 1) {
      lines.push(`  for (let i = 0; i < ${e.intDmg.repeat} && !areAllEnemiesDefeated(s); i++) {`);
      lines.push(`    const dmg = Math.max(1, Math.floor(s.playerInt * ${avg / 100}));`);
      lines.push(`    applyHpDeltaToEnemy(s, target, -dmg);`);
      lines.push(`    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");`);
      lines.push(`    clog(\`【${passiveName}】INT ${"$"}{dmg} ダメージ\`);`);
      lines.push(`  }`);
    } else {
      lines.push(`  { const dmg = Math.max(1, Math.floor(s.playerInt * ${avg / 100}));`);
      lines.push(`    applyHpDeltaToEnemy(s, target, -dmg);`);
      lines.push(`    playPortraitEffect("enemy", "hit", target); playBattleSe("hit");`);
      lines.push(`    clog(\`【${passiveName}】発動！ INT ${"$"}{dmg} ダメージ\`); }`);
    }
  }

  if (e.heal) {
    hasEffect = true;
    const avg = Math.floor((e.heal.min + e.heal.max) / 2);
    lines.push(`  { const heal = Math.max(1, Math.floor(s.playerHpMax * ${avg / 100}));`);
    lines.push(`    applyHpDeltaToHero(s, hero, +heal);`);
    lines.push(`    playPortraitEffect("player", "heal", hero); playBattleSe("heal");`);
    lines.push(`    clog(\`【${passiveName}】HP +${"$"}{heal}\`); }`);
  }

  if (e.selfPhy) {
    hasEffect = true;
    lines.push(`  s.playerPhy += ${e.selfPhy}; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(\`【${passiveName}】PHY +${e.selfPhy}\`);`);
  }
  if (e.selfInt) {
    hasEffect = true;
    lines.push(`  s.playerInt += ${e.selfInt}; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(\`【${passiveName}】INT +${e.selfInt}\`);`);
  }
  if (e.selfAgi) {
    hasEffect = true;
    lines.push(`  s.playerAgi += ${e.selfAgi}; playPortraitEffect("player", "buff", hero); playBattleSe("buff"); clog(\`【${passiveName}】AGI +${e.selfAgi}\`);`);
  }
  if (e.enemyPhy) {
    hasEffect = true;
    lines.push(`  s.enemyPhy = Math.max(1, s.enemyPhy + (${e.enemyPhy})); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(\`【${passiveName}】敵 PHY ${e.enemyPhy}\`);`);
  }
  if (e.enemyInt) {
    hasEffect = true;
    lines.push(`  s.enemyInt = Math.max(1, s.enemyInt + (${e.enemyInt})); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(\`【${passiveName}】敵 INT ${e.enemyInt}\`);`);
  }
  if (e.enemyAgi) {
    hasEffect = true;
    lines.push(`  s.enemyAgi = Math.max(1, s.enemyAgi + (${e.enemyAgi})); playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(\`【${passiveName}】敵 AGI ${e.enemyAgi}\`);`);
  }
  if (e.poison) {
    hasEffect = true;
    lines.push(`  s.enemyPoison = (s.enemyPoison || 0) + ${e.poison}; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(\`【${passiveName}】毒 ×${e.poison} 付与\`);`);
  }
  if (e.bleed) {
    hasEffect = true;
    lines.push(`  s.enemyBleed = (s.enemyBleed || 0) + ${e.bleed}; playPortraitEffect("enemy", "debuff", target); playBattleSe("debuff"); clog(\`【${passiveName}】出血 ×${e.bleed} 付与\`);`);
  }
  if (e.resurrect) {
    hasEffect = true;
    // hero.alive=true は checkResurrection が自動復元するため不要だが、防御的に残す
    lines.push(`  s.hasResurrection = true; if (hero) hero.alive = true; playBattleSe("buff"); clog(\`【${passiveName}】リザレクション付与\`);`);
  }
  if (e.shield) {
    hasEffect = true;
    lines.push(`  s.playerShield = (s.playerShield || 0) + ${e.shield}; playBattleSe("buff"); clog(\`【${passiveName}】シールド +${e.shield}\`);`);
  }
  if (e.guard) {
    hasEffect = true;
    lines.push(`  s.playerGuard = (s.playerGuard || 0) + ${e.guard}; playBattleSe("buff"); clog(\`【${passiveName}】ガード +${e.guard}\`);`);
  }

  // Fallback if no effect parsed
  if (!hasEffect) {
    lines.push(`  // Fallback: 元 DB の効果が解析不能 → 控えめな PHY+1 を付与`);
    lines.push(`  s.playerPhy += 1; playBattleSe("buff"); clog(\`【${passiveName}】PHY +1\`);`);
  }

  if (isOnCardUse) {
    lines.push(`  renderCombat();`);
  }
  lines.push(`}`);
  return lines.join("\n");
}

// ─── main ───────────────────────────────────────────────────────
function main() {
  const inputPath = process.argv[2];
  if (!inputPath) { console.error("usage: gen-uncommon-heroes.js <csv>"); process.exit(1); }
  const raw = fs.readFileSync(inputPath, "utf-8");
  const lines = parseCsv(raw);
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(l => {
    const cells = parseCsvLine(l);
    const obj = {};
    headers.forEach((h, i) => obj[h] = cells[i] || "");
    return obj;
  }).filter(r => r.id && r.rarity === "Legendary");

  const heroJsonEntries = [];
  const passiveFunctions = [];
  const dispatcherCombat = [];
  const dispatcherCard = [];

  for (const row of rows) {
    const heroId = +row.id;
    const passiveKey = PASSIVE_KEYS[heroId];
    if (!passiveKey) {
      console.error(`MISSING PASSIVE_KEY for heroId=${heroId} ${row.name_ja}`);
      continue;
    }

    const stats = scaleStats(+row.hp, +row.phy, +row.int, +row.agi);
    const passive = parsePassive(row.passive_text_ja);
    const isOnCardUse = passive.hook === "cardUse";
    const passiveName = row.passive_name_ja;
    const desc = generatePassiveDesc(passive, isOnCardUse);

    // heroes.json entry
    const entry = {
      heroId,
      nameJa: row.name_ja,
      rarity: "legendary",
      hpMax: stats.hpMax,
      basePhy: stats.basePhy,
      baseInt: stats.baseInt,
      baseAgi: stats.baseAgi,
      passiveKey,
      passiveName,
      passiveDesc: desc,
    };
    heroJsonEntries.push(entry);

    // passive function
    passiveFunctions.push(`// ${heroId} ${row.name_ja}「${passiveName}」 hook=${isOnCardUse ? "onCardUse" : "onCombatStart"}\n` +
      generatePassiveFunction(passiveKey, passiveName, passive, isOnCardUse));

    // dispatcher entry
    const fnName = "apply" + pascalize(passiveKey) + "Passive";
    if (isOnCardUse) {
      dispatcherCard.push(`    case "${passiveKey}": await ${fnName}(s); break;`);
    } else {
      dispatcherCombat.push(`    case "${passiveKey}": ${fnName}(s); break;`);
    }
  }

  // Output
  console.log(`// ━━━━━ heroes.json fragment (${heroJsonEntries.length} entries) ━━━━━`);
  for (const e of heroJsonEntries) console.log(JSON.stringify(e, null, 2) + ",");
  console.log("");
  console.log("// ━━━━━ main.js: passive functions ━━━━━");
  for (const f of passiveFunctions) {
    console.log(f);
    console.log("");
  }
  console.log("// ━━━━━ main.js: dispatcher onCombatStart cases ━━━━━");
  for (const c of dispatcherCombat) console.log(c);
  console.log("");
  console.log("// ━━━━━ main.js: dispatcher onCardUse cases ━━━━━");
  for (const c of dispatcherCard) console.log(c);

  console.error(`Generated ${heroJsonEntries.length} heroes (${dispatcherCombat.length} onCombatStart + ${dispatcherCard.length} onCardUse)`);
}

main();
