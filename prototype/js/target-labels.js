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
// 味方/敵 の区別は pill の色で表現するため、ラベルからは陣営プレフィックスを省略する
// (UX 改善 2026-05-02: 3 文字以内優先 + auto-fit fallback)
const LABELS = {
  // 自身
  "self":               { label: "自身",     color: "--target-self"  },

  // 味方 (緑) — 陣営は色で識別、ラベルは選択ルールのみ
  "ally.front":         { label: "前衛",     color: "--target-ally"  },
  "ally.mid":           { label: "中衛",     color: "--target-ally"  },
  "ally.back":          { label: "後衛",     color: "--target-ally"  },
  "ally.foremost":      { label: "先頭",     color: "--target-ally"  },
  "ally.rearmost":      { label: "最後尾",   color: "--target-ally"  },
  "ally.all":           { label: "全",       color: "--target-ally"  },
  "ally.random":        { label: "ランダム", color: "--target-ally"  },
  "ally.highest_phy":   { label: "PHY↑",   color: "--target-ally"  },
  "ally.lowest_phy":    { label: "PHY↓",   color: "--target-ally"  },
  "ally.highest_int":   { label: "INT↑",   color: "--target-ally"  },
  "ally.lowest_int":    { label: "INT↓",   color: "--target-ally"  },
  "ally.highest_hp":    { label: "HP↑",    color: "--target-ally"  },
  "ally.lowest_hp":     { label: "HP↓",    color: "--target-ally"  },

  // 敵 (赤) — 陣営は色で識別
  "enemy.front":        { label: "前衛",     color: "--target-enemy" },
  "enemy.mid":          { label: "中衛",     color: "--target-enemy" },
  "enemy.back":         { label: "後衛",     color: "--target-enemy" },
  "enemy.foremost":     { label: "先頭",     color: "--target-enemy" },
  "enemy.rearmost":     { label: "最後尾",   color: "--target-enemy" },
  "enemy.all":          { label: "全",       color: "--target-enemy" },
  "enemy.random":       { label: "ランダム", color: "--target-enemy" },
  "enemy.highest_phy":  { label: "PHY↑",   color: "--target-enemy" },
  "enemy.lowest_phy":   { label: "PHY↓",   color: "--target-enemy" },
  "enemy.highest_int":  { label: "INT↑",   color: "--target-enemy" },
  "enemy.lowest_int":   { label: "INT↓",   color: "--target-enemy" },
  "enemy.highest_hp":   { label: "HP↑",    color: "--target-enemy" },
  "enemy.lowest_hp":    { label: "HP↓",    color: "--target-enemy" },

  // 全体 (黒) — クロス陣営、明示的に「全体」と表示
  "all":                { label: "全体",     color: "--target-all"   },
  "all.random":         { label: "全ラン",   color: "--target-all"   },
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
