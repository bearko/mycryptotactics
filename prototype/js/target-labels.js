/**
 * target-labels.js — SPEC-006 Phase 4e: TargetSpec → 日本語ラベル + 色変数
 *
 * 同期で利用できるよう、ラベル定義を **モジュール内に embed** する。
 * `data/target-labels.json` は SPEC-006 §7.1.1 の正本データだが、ここでは
 * fetch を待たずに最初の render から正しい日本語ラベルが出るよう、
 * 同じ内容を JS 側にもコピーする。JSON 側を更新したら本ファイルも併せて更新する。
 */

// ─── 色変数 (HTML 側の :root と一致。デフォルト値) ───────────────
// 「全体=黒 / 敵=赤 / 味方=緑 / 自身=緑 (味方扱い)」 (UX 改善 2026-05-02)
const CSS_VARIABLES = {
  "--target-ally":  "#7ed957",  // 味方 = 緑
  "--target-enemy": "#e76060",  // 敵 = 赤
  "--target-all":   "#1a1420",  // 全体 = 黒
  "--target-self":  "#7ed957",  // 自身 = 緑 (味方扱い)
};

// ─── ラベルマップ (sync) ────────────────────────────────────────
const LABELS = {
  // 自身
  "self":               { label: "自身",         color: "--target-self"  },

  // 味方
  "ally.front":         { label: "味方前",       color: "--target-ally"  },
  "ally.mid":           { label: "味方中",       color: "--target-ally"  },
  "ally.back":          { label: "味方後",       color: "--target-ally"  },
  "ally.foremost":      { label: "味方先頭",     color: "--target-ally"  },
  "ally.rearmost":      { label: "味方最後尾",   color: "--target-ally"  },
  "ally.all":           { label: "味方全",       color: "--target-ally"  },
  "ally.random":        { label: "味方ランダム", color: "--target-ally"  },
  "ally.highest_phy":   { label: "味PHY↑",      color: "--target-ally"  },
  "ally.lowest_phy":    { label: "味PHY↓",      color: "--target-ally"  },
  "ally.highest_int":   { label: "味INT↑",      color: "--target-ally"  },
  "ally.lowest_int":    { label: "味INT↓",      color: "--target-ally"  },
  "ally.highest_hp":    { label: "味HP↑",       color: "--target-ally"  },
  "ally.lowest_hp":     { label: "味HP↓",       color: "--target-ally"  },

  // 敵
  "enemy.front":        { label: "敵前",         color: "--target-enemy" },
  "enemy.mid":          { label: "敵中",         color: "--target-enemy" },
  "enemy.back":         { label: "敵後",         color: "--target-enemy" },
  "enemy.foremost":     { label: "敵先頭",       color: "--target-enemy" },
  "enemy.rearmost":     { label: "敵最後尾",     color: "--target-enemy" },
  "enemy.all":          { label: "敵全",         color: "--target-enemy" },
  "enemy.random":       { label: "敵ランダム",   color: "--target-enemy" },
  "enemy.highest_phy":  { label: "敵PHY↑",      color: "--target-enemy" },
  "enemy.lowest_phy":   { label: "敵PHY↓",      color: "--target-enemy" },
  "enemy.highest_int":  { label: "敵INT↑",      color: "--target-enemy" },
  "enemy.lowest_int":   { label: "敵INT↓",      color: "--target-enemy" },
  "enemy.highest_hp":   { label: "敵HP↑",       color: "--target-enemy" },
  "enemy.lowest_hp":    { label: "敵HP↓",       color: "--target-enemy" },

  // 全体
  "all":                { label: "全体",         color: "--target-all"   },
  "all.random":         { label: "全体ランダム", color: "--target-all"   },
};

const PATH = "./data/target-labels.json";
let _loadingPromise = null;

/** 非同期ロード。JSON 側で hot-update したい場合用。同期ルックアップは embed 値で常時動作する。 */
export async function loadTargetLabels() {
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = fetch(PATH)
    .then(r => {
      if (!r.ok) throw new Error(`target-labels.json fetch failed: ${r.status}`);
      return r.json();
    })
    .then(json => {
      // JSON が新しいキー / ラベル変更を持っていれば反映 (hot reload)
      for (const [k, v] of Object.entries(json)) {
        if (k === "_meta") continue;
        if (v && typeof v === "object" && v.label) LABELS[k] = v;
      }
      if (json._meta?.css_variables) {
        for (const [n, val] of Object.entries(json._meta.css_variables)) {
          CSS_VARIABLES[n] = val;
        }
      }
      return json;
    });
  return _loadingPromise;
}

/** 同期ルックアップ。embed 値で常時動作する。 */
export function getTargetLabel(spec) {
  return LABELS[spec] || null;
}

/** ラベル文字列のみ。未定義時は spec をそのまま返却 (フォールバック)。 */
export function targetLabelText(spec) {
  const e = getTargetLabel(spec);
  return e ? e.label : (spec || "");
}

/** CSS 変数名 (`--target-ally` 等)。未定義時は `--text`。 */
export function targetColorVar(spec) {
  const e = getTargetLabel(spec);
  return e ? e.color : "--text";
}

/** CSS 変数を `:root` に注入。embed 値で常時動作するため init で同期呼び出し可。 */
export function applyCssVariables() {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(CSS_VARIABLES)) {
    root.style.setProperty(name, value);
  }
}
