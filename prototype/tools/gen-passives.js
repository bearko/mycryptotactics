/**
 * gen-passives.js — SPEC-006 §18 Phase 4j codemod (game CSV 対応版)
 *
 * `prototype/data/heroes.csv` (game 内で使用している正本) から PassiveDef
 * 宣言形式に変換、`passives-generated.js` を出力。
 *
 * 使い方:
 *   node prototype/tools/gen-passives.js prototype/data/heroes.csv > prototype/js/passives-generated.js
 *
 * 履歴:
 *   v1 (PR #76): MCH 内部 DB 形式の英訳混じり CSV を想定して書かれていたが、
 *     ゲームの heroes.csv (簡素化された日本語) と phrasing が大幅に異なり
 *     93 件のヒーローで trigger を誤分類していた (e.g. giraffa が
 *     self.statRatioAbove に分類され戦闘開始時に発動しない問題)。
 *   v2 (本ファイル): heroes.csv の実フォーマット
 *     `<trigger 句>に発動・<effect 1>／<effect 2>...` を直接パース。
 *
 * CSV カラム:
 *   heroId,nameJa,rarity,hpMax,basePhy,baseInt,baseAgi,passiveKey,passiveName,passiveDesc
 */
const fs = require("fs");

// ─── レアリティ別パラメータ ────────────────────────────────────
const RARITY_BY_LOWER = {
  common: "Common", uncommon: "Uncommon", rare: "Rare",
  epic: "Epic", legendary: "Legendary",
};
const RARITY_SCALING = {
  Common:    { stackBase: 1 },
  Uncommon:  { stackBase: 1 },
  Rare:      { stackBase: 2 },
  Epic:      { stackBase: 3 },
  Legendary: { stackBase: 4 },
};
const DEFAULT_TRIGGER_RATE = {
  "combat.started": 1.0,
  "self.cardPlayed": 0.4,
  "self.tookDamage": 0.5,
  "self.died": 1.0,
  "self.hpBelow": 1.0,
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
// passiveDesc は "<trigger 句>に発動・<effect>...(／<effect>)*" か、
// たまに "<trigger 句>・<effect>..." (発動 抜け) のことも。
function splitTriggerAndBody(text) {
  if (!text) return { triggerPart: "", body: "" };
  let m = text.match(/^([^・]+?)に発動・(.+)$/);
  if (m) return { triggerPart: m[1], body: m[2] };
  m = text.match(/^([^・]+?)・(.+)$/);
  if (m) return { triggerPart: m[1], body: m[2] };
  return { triggerPart: text, body: "" };
}

function detectTrigger(passiveDesc) {
  const { triggerPart, body } = splitTriggerAndBody(passiveDesc);
  const tp = triggerPart || passiveDesc || "";

  // 確率発動 ("N%の確率で")
  let triggerRate = null;
  const rateM = tp.match(/(\d+)\s*%\s*の確率で/);
  if (rateM) triggerRate = +rateM[1] / 100;

  // 戦闘開始時 / バトル開始時
  if (/戦闘開始時|バトル開始時/.test(tp)) {
    return { kind: "combat.started", oncePerCombat: true, triggerRate };
  }
  // カード使用後 (スキル / Active Skill / 単独カード)
  if (/(スキル)?カード使用後|Active\s*Skill\s*を使用した後/i.test(tp)) {
    return { kind: "self.cardPlayed", oncePerCombat: false, triggerRate };
  }
  // 被ダメージ後
  if (/被ダメージ後|ダメージを受けた後|Active\s*Skill\s*でダメージを受けた後/i.test(tp)) {
    return { kind: "self.tookDamage", oncePerCombat: false, triggerRate };
  }
  // HP 閾値: HPが N%(未満|以下)
  let m = tp.match(/HPが\s*(\d+)\s*%\s*(未満|以下)/);
  if (m) return { kind: "self.hpBelow", oncePerCombat: true, threshold: +m[1] / 100, triggerRate };
  // 死亡時 (能動的 trigger; 致死時生存は effect 側で扱う)
  if (/死亡時|死亡した後/.test(tp)) {
    return { kind: "self.died", oncePerCombat: true, triggerRate };
  }
  // 敵がカード使用 (rare)
  if (/敵の誰かが.*Active\s*Skill|敵がカード使用|敵がスキル使用/i.test(tp)) {
    return { kind: "enemy.cardPlayed", oncePerCombat: false, triggerRate };
  }
  // ターン開始時 / ターン終了時 (現状 runtime 未対応 → combat.started fallback)
  if (/ターン開始時|ターン終了時/.test(tp)) {
    return { kind: "combat.started", oncePerCombat: true, triggerRate, _note: `${tp.match(/ターン[^時]*時/)[0]} → combat.started 簡略化 (runtime 未対応)` };
  }
  // 全文に "戦闘開始時" が含まれていれば fallback
  if (/戦闘開始時|バトル開始時/.test(passiveDesc)) {
    return { kind: "combat.started", oncePerCombat: true, triggerRate, _note: "trigger 推定 (text 全体から検出)" };
  }
  // 不明 → combat.started (oncePerCombat) fallback
  return { kind: "combat.started", oncePerCombat: true, _note: `trigger 不明 (${tp}) → combat.started 既定値` };
}

// ─── 効果テキスト解析 ───────────────────────────────────────────
// body は "／" (全角スラッシュ) 区切り。各効果を 1 つずつパース。
function parseEffects(body, rarity, trig) {
  const out = [];
  if (!body) return out;
  const scaling = RARITY_SCALING[rarity] || RARITY_SCALING.Common;
  const parts = body.split(/[／/]/).map(s => s.trim()).filter(Boolean);

  for (const raw of parts) {
    const part = raw.replace(/[\s　]+/g, "");

    // ── ダメージ系 ──────────────────────────────────────────
    // 敵にPHY40%ダメージ / 敵にPHY30〜50%ダメージ / ...×N (繰り返し)
    let m = part.match(/敵にPHY(?:の)?(\d+)(?:[~〜](\d+))?%ダメージ(?:×(\d+))?/);
    if (m) {
      const lo = +m[1], hi = m[2] ? +m[2] : lo, repeat = m[3] ? +m[3] : 1;
      const coef = ((lo + hi) / 2) / 100;
      for (let i = 0; i < repeat; i++) {
        out.push({ target: "enemy.foremost", action: "damage", coef: { phy: coef } });
      }
      continue;
    }
    m = part.match(/敵にINT(?:の)?(\d+)(?:[~〜](\d+))?%ダメージ(?:×(\d+))?/);
    if (m) {
      const lo = +m[1], hi = m[2] ? +m[2] : lo, repeat = m[3] ? +m[3] : 1;
      const coef = ((lo + hi) / 2) / 100;
      for (let i = 0; i < repeat; i++) {
        out.push({ target: "enemy.foremost", action: "damage", coef: { int: coef } });
      }
      continue;
    }
    // 先頭の敵にPHYのN% / 先頭の敵にPHYN%追加ダメージ などのバリエーション
    m = part.match(/先頭の敵に(?:PHYの|PHY)?(\d+)%(?:追加)?ダメージ/);
    if (m) {
      out.push({ target: "enemy.foremost", action: "damage", coef: { phy: +m[1] / 100 } });
      continue;
    }
    m = part.match(/先頭の敵に(?:INTの|INT)?(\d+)%(?:追加)?ダメージ/);
    if (m) {
      out.push({ target: "enemy.foremost", action: "damage", coef: { int: +m[1] / 100 } });
      continue;
    }

    // ── 状態異常付与 ────────────────────────────────────────
    m = part.match(/敵に毒[×x](\d+)付与/);
    if (m) { out.push({ target: "enemy.foremost", action: "applyStatus", status: "poison", stacks: +m[1] }); continue; }
    m = part.match(/敵に出血[×x](\d+)付与/);
    if (m) { out.push({ target: "enemy.foremost", action: "applyStatus", status: "bleed", stacks: +m[1] }); continue; }

    // ── 自身ステ加算: 自身のPHY+N / 自身のINTを最大HPの N%アップ ─
    m = part.match(/自身の(PHY|INT|AGI)\+(\d+)/);
    if (m) {
      out.push({ target: "self", action: "buffStat", stat: m[1].toLowerCase(), value: +m[2] });
      continue;
    }
    // 短縮形: "INT +3" / "PHY +5" (自身の prefix 抜け、e.g. doyle "INT +3")
    m = part.match(/^(PHY|INT|AGI)\s*\+\s*(\d+)$/);
    if (m) {
      out.push({ target: "self", action: "buffStat", stat: m[1].toLowerCase(), value: +m[2] });
      continue;
    }
    m = part.match(/自身の(PHY|INT|AGI)を(\d+)アップ/);
    if (m) {
      out.push({ target: "self", action: "buffStat", stat: m[1].toLowerCase(), value: +m[2] });
      continue;
    }
    // 自身のINTを最大AGIの30%アップ — 別ステの相対バフ。簡略化として +ceil(stat * pct) を付ける
    m = part.match(/自身の(PHY|INT|AGI)を最大(PHY|INT|AGI)の(\d+)%アップ/);
    if (m) {
      const target = m[1].toLowerCase(), src = m[2].toLowerCase(), pct = +m[3];
      out.push({ target: "self", action: "buffStatFromOther", stat: target, fromStat: src, pct: pct / 100 });
      continue;
    }
    // PHYとINTを互いの値の N%アップ
    m = part.match(/PHYとINTを互いの値の(\d+)%アップ/);
    if (m) {
      const pct = +m[1] / 100;
      out.push({ target: "self", action: "buffStatFromOther", stat: "phy", fromStat: "int", pct });
      out.push({ target: "self", action: "buffStatFromOther", stat: "int", fromStat: "phy", pct });
      continue;
    }

    // ── 敵ステ減算: 敵のPHY-N / 敵のAGIを30%ダウン ──────────
    m = part.match(/敵の(PHY|INT|AGI)-(\d+)/);
    if (m) {
      out.push({ target: "enemy.foremost", action: "buffStat", stat: m[1].toLowerCase(), value: -(+m[2]) });
      continue;
    }
    m = part.match(/敵の(PHY|INT|AGI)を(\d+)%ダウン/);
    if (m) {
      const pct = +m[2] / 100;
      out.push({ target: "enemy.foremost", action: "buffStatPct", stat: m[1].toLowerCase(), pct: -pct });
      continue;
    }

    // ── ガード / シールド ───────────────────────────────────
    m = part.match(/ガード\+(\d+)/);
    if (m) { out.push({ target: "self", action: "addGuard", value: +m[1] }); continue; }
    m = part.match(/シールド\+(\d+)/);
    if (m) { out.push({ target: "self", action: "addShield", value: +m[1] }); continue; }

    // ── 回復 ────────────────────────────────────────────────
    // 自身のHPを最大HPのN%回復 / HPを回復係数のN〜N%回復 / HPを最大HPのN%回復
    m = part.match(/(?:自身の)?HPを最大HPの(\d+)%回復/);
    if (m) { out.push({ target: "self", action: "heal", coef: { hpRatio: +m[1] / 100 } }); continue; }
    m = part.match(/HPを回復係数の(\d+)(?:[~〜](\d+))?%回復/);
    if (m) {
      const lo = +m[1], hi = m[2] ? +m[2] : lo;
      out.push({ target: "self", action: "heal", coef: { int: ((lo + hi) / 2) / 100 } });
      continue;
    }

    // ── 致死時生存 (revive) ─────────────────────────────────
    if (/致死時に1回だけ1HPで生存|1回だけ1HPで生存/.test(part)) {
      out.push({ target: "self", action: "revive", coef: { hpRatio: 0.01 } });
      continue;
    }

    // ── ドロー / 充電 ────────────────────────────────────────
    m = part.match(/ドロー\s*\+?(\d+)/);
    if (m) { out.push({ target: "self", action: "drawCards", value: +m[1] }); continue; }
    m = part.match(/エネルギー\s*\+?(\d+)|充電\s*\+?(\d+)/);
    if (m) { out.push({ target: "self", action: "addEnergy", value: +(m[1] || m[2]) }); continue; }

    // ── 解析失敗 ────────────────────────────────────────────
    // 既知の Effect 種別に該当しない部分は notes 用に記録 (out には push しない)
    out._unparsed = (out._unparsed || []);
    out._unparsed.push(raw);
  }

  // 効果が 0 件の場合 fallback (PHY+1)
  if (out.length === 0) {
    out.push({ target: "self", action: "buffStat", stat: "phy", value: 1 });
    out._fallback = true;
  }
  return out;
}

// ─── PassiveDef builder ────────────────────────────────────────
function buildPassiveDef(row) {
  const heroId = +row.heroId;
  const passiveKey = row.passiveKey;
  if (!passiveKey) return null;
  const rarity = RARITY_BY_LOWER[(row.rarity || "").toLowerCase()];
  if (!rarity) return null;
  const passiveName = row.passiveName;
  const passiveDesc = row.passiveDesc || "";

  const trig = detectTrigger(passiveDesc);
  const { body } = splitTriggerAndBody(passiveDesc);
  const effects = parseEffects(body, rarity, trig);

  const def = {
    passiveKey,
    trigger: trig.kind,
    triggerRate: typeof trig.triggerRate === "number" ? trig.triggerRate : (DEFAULT_TRIGGER_RATE[trig.kind] ?? 1.0),
    oncePerCombat: !!trig.oncePerCombat,
  };
  if (trig.threshold != null) def.threshold = trig.threshold;
  // effects 配列 (符号情報を持たないコピー)
  def.effects = effects.map(e => ({ ...e }));
  if (passiveName) def.cutinSkillName = passiveName;

  // notes (簡略化や fallback の根拠)
  const notes = [];
  if (trig._note) notes.push(trig._note);
  if (effects._fallback) notes.push("元 DB の効果を解析できず → PHY+1 fallback");
  if (effects._unparsed && effects._unparsed.length > 0) {
    notes.push(`未解析効果: ${effects._unparsed.join(" / ")}`);
  }
  if (notes.length > 0) def.notes = notes.join("; ");
  return { heroId, def };
}

// ─── PassiveDef → 整形 JSON 文字列 ──────────────────────────────
function stringifyDef(def) {
  const parts = [];
  parts.push(`passiveKey: ${JSON.stringify(def.passiveKey)}`);
  parts.push(`trigger: ${JSON.stringify(def.trigger)}`);
  parts.push(`triggerRate: ${def.triggerRate}`);
  parts.push(`oncePerCombat: ${def.oncePerCombat}`);
  if (def.threshold != null) parts.push(`threshold: ${def.threshold}`);
  const effLines = (def.effects || []).map(e => "      " + JSON.stringify(e));
  parts.push("effects: [\n" + effLines.join(",\n") + "\n    ]");
  if (def.cutinSkillName) parts.push(`cutinSkillName: ${JSON.stringify(def.cutinSkillName)}`);
  if (def.notes) parts.push(`notes: ${JSON.stringify(def.notes)}`);
  return "{\n    " + parts.join(",\n    ") + "\n  }";
}

// ─── main ──────────────────────────────────────────────────────
function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("usage: gen-passives.js <heroes csv>");
    process.exit(1);
  }
  const raw = fs.readFileSync(inputPath, "utf-8");
  const lines = parseCsv(raw);
  if (lines.length === 0) { console.error("empty CSV"); process.exit(1); }
  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const cells = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h] = (cells[i] || "").trim());
    return obj;
  }).filter(Boolean);

  const defs = [];
  for (const row of rows) {
    const result = buildPassiveDef(row);
    if (result) defs.push(result);
  }
  defs.sort((a, b) => a.heroId - b.heroId);

  const outLines = [];
  outLines.push("/**");
  outLines.push(" * passives-generated.js — SPEC-006 §18 Phase 4j codemod 出力 (v2)");
  outLines.push(" *");
  outLines.push(` * 全 ${defs.length} 体のヒーローパッシブを宣言形式 PassiveDef に変換。`);
  outLines.push(" * 元データ: prototype/data/heroes.csv");
  outLines.push(" * 生成スクリプト: prototype/tools/gen-passives.js");
  outLines.push(" *");
  outLines.push(" * 変換方針:");
  outLines.push(" * - passiveDesc を '<trigger 句>に発動・<effects>' 形式でパース");
  outLines.push(" * - effects は ／ 区切りで個別パース、解析不能部は notes に記録");
  outLines.push(" * - 別ステ参照バフ (e.g. INTを最大AGIの30%アップ) は buffStatFromOther action で表現");
  outLines.push(" * - 状態異常 stack 数は CSV の明示値をそのまま使用");
  outLines.push(" * - 致死時生存は revive action (hpRatio 0.01) として inline 化");
  outLines.push(" *");
  outLines.push(" * runtime 仕様: prototype/js/passive-runtime.js + SPEC-006 §18.6");
  outLines.push(" */");
  outLines.push("");
  outLines.push("export const PASSIVES = {");

  for (const { heroId, def } of defs) {
    outLines.push(`  // heroId: ${heroId}`);
    outLines.push(`  ${JSON.stringify(def.passiveKey)}: ${stringifyDef(def)},`);
  }

  outLines.push("};");
  outLines.push("");

  console.log(outLines.join("\n"));
  console.error(`Generated ${defs.length} PassiveDefs.`);
}

main();
