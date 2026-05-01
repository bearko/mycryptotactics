# SPEC-007: ランキング機能 + Absolute レギュレーション

## 1. 概要

クリア時のランキングシステムと、ユーザー設定可能な Absolute レギュレーションを並行実装する。両機能は連携：Absolute の倍率設定がランキングのスコア乗数になる。

## 2. 動機

- **ランキング**: クリア後の競争要素・コミュニティ感醸成。耐久プレイ（生存重視）と速攻プレイ（スコア重視）でゲーム性に幅
- **Absolute**: 既存 5 段階レギュレーション (Common〜Red) を超えた自由度。上位プレイヤーの設定倍率を観測することで難易度バランス調整の指標を得る

## 3. 用語

| 用語 | 意味 |
|---|---|
| Absolute レギュレーション | ユーザーが HP/ダメージ倍率 4 種を任意設定する第 6 のレギュレーション |
| 倍率 4 種 | 敵 HP / 敵ダメ / 自 HP / 自ダメ (各 0.1x〜5.0x) |
| ベーススコア | レギュレーション乗数を掛ける前のスコア値 |
| ファイナルスコア | ベース × レギュレーション乗数の最終値（ランキング登録値）|

## 4. 機能 A: Absolute レギュレーション

### 4.1 データモデル

`prototype/js/regulations.js` に追加:

```js
{
  id: "absolute",
  nameJa: "Absolute",
  iconUrl: CUP_BASE + "1305.png",  // 仮、別途調達
  color: "#a855f7",                 // 紫
  descShort: "ユーザー設定 (敵 HP / 敵ダメ / 自 HP / 自ダメ)",
  effects: {
    hpFactor: 1.0,    // = enemyHpMult, runtime に上書きされる
    atkFactor: 1.0,   // = enemyDmgMult
    guardPerTurn: 0,
    bleedOnAttack: 0,
    isAbsolute: true, // フラグ
  },
}
```

### 4.2 Absolute 設定の保存

新ファイル `prototype/js/absolute-config.js`:

```js
const LS_KEY = "mct.absoluteConfig";
const DEFAULT_CONFIG = {
  enemyHpMult: 1.0,   // 敵 HP 倍率 (0.1〜5.0)
  enemyDmgMult: 1.0,  // 敵ダメ倍率
  playerHpMult: 1.0,  // 自 HP 倍率
  playerDmgMult: 1.0, // 自ダメ倍率
};

export function loadAbsoluteConfig() { /* ... */ }
export function saveAbsoluteConfig(cfg) { /* ... */ }
export function getAbsoluteScoreMult(cfg) {
  // 高難易度ほどスコア倍率も高い
  return (cfg.enemyHpMult * cfg.enemyDmgMult) / (cfg.playerHpMult * cfg.playerDmgMult);
}
```

### 4.3 戦闘への適用

`startCombatFromMapNode` で:

```js
const reg = getCurrentRegulation();
const abs = reg.effects.isAbsolute ? loadAbsoluteConfig() : null;
const enemyHpMult = abs?.enemyHpMult ?? reg.effects.hpFactor;
const enemyDmgMult = abs?.enemyDmgMult ?? reg.effects.atkFactor;
const playerHpMult = abs?.playerHpMult ?? 1.0;
const playerDmgMult = abs?.playerDmgMult ?? 1.0;

// enemy stats: × enemyHpMult / × enemyDmgMult
// player stats: × playerHpMult (HP), 攻撃時に × playerDmgMult
```

`playerHpMult` は新規パラメータなので、`runState.playerHpMax` 初期化時に適用。
`playerDmgMult` は `dealPhySkillToEnemy` / `dealIntSkillToEnemy` 内でダメ計算に乗算（要追加）。

### 4.4 設定 UI

レギュレーション選択画面 (`#regulationSelectView`) で「Absolute」選択時に **設定モーダル** を開く:

```
┌─ Absolute レギュレーション設定 ─┐
│ 敵 HP 倍率:   [== slider ==] 1.5x │
│ 敵ダメ倍率:   [==== slider ====] 2.0x │
│ 自 HP 倍率:   [== slider ==] 0.8x │
│ 自ダメ倍率:   [==== slider ====] 1.0x │
│                                    │
│ スコア倍率: 3.75x                  │
│ [キャンセル]  [この設定で開始]     │
└───────────────────────────────────┘
```

slider 範囲: 0.1〜5.0 (0.1 刻み)。スコア倍率 = `(enemyHpMult × enemyDmgMult) / (playerHpMult × playerDmgMult)` をリアルタイム計算表示。

## 5. 機能 B: ランキング機能

### 5.1 スコア計算

新ファイル `prototype/js/scoring.js`:

```js
const RARITY_VALUES = { legendary: 1, epic: 2, rare: 3, uncommon: 4, common: 5 };

export function computeBaseScore({ turns, deckSize, llExtCount, partyHeroes }) {
  const turnBonus = Math.max(0, 500 - turns) * 30;
  const deckBonus = deckSize * 50;
  const llBonus = llExtCount * 3000;
  const rarityBonus = partyHeroes.reduce((sum, h) =>
    sum + (RARITY_VALUES[h.rarity] || 3) * 500, 0);
  return turnBonus + deckBonus + llBonus + rarityBonus;
}

export function computeFinalScore({ baseScore, regulation, absoluteConfig }) {
  const regMult = REGULATION_SCORE_MULTS[regulation.id] || 1.0;
  const absMult = regulation.id === "absolute"
    ? getAbsoluteScoreMult(absoluteConfig)
    : 1.0;
  return Math.round(baseScore * regMult * absMult);
}

const REGULATION_SCORE_MULTS = {
  common: 1.0,
  egg: 1.2,
  baby: 1.5,
  blue: 2.0,
  red: 3.0,
  absolute: 1.0,  // absMult が別途掛かる
};
```

### 5.2 サンプル計算

| シナリオ | 計算 | スコア |
|---|---|---:|
| 100 turn / 20 deck / 0 LL / 3 common / Common reg | 12000+1000+0+7500 = 20500 × 1.0 | 20,500 |
| 100 turn / 20 deck / 2 LL / 3 common / Red reg | (12000+1000+6000+7500) × 3.0 | 79,500 |
| 100 turn / 20 deck / 2 LL / 3 legendary / Common reg | (12000+1000+6000+1500) × 1.0 | 20,500 |
| 100 turn / 20 deck / 2 LL / 3 common / Absolute (敵×2.0倍, 自×0.5倍) | 26500 × 8.0 | 212,000 |

→ 速攻 + 大デッキ + LL 活用 + 低レア縛り + 高難易度 でスコア最大化

### 5.3 ランキング送信フロー

クリア時:
1. `runState` から turn / deck / LL / party 抽出
2. スコア計算
3. **モーダル表示**: 「○○、ランキングに登録しますか？」
   - プレイヤー名表示（localStorage）/ 編集可能
   - 「登録する」「やめる」
4. 登録時: GAS web app に POST
5. 完了通知

### 5.4 ランキング表示画面

新規ビュー `#rankingView`:
- 全体トップ 50
- レギュレーション別フィルタ (Common / Egg / ... / Red / Absolute)
- 各エントリ: ランク / プレイヤー名 / スコア / レギュレーション / 内訳ハイライト (turn / deck / LL / rarity)
- Absolute エントリは **倍率 4 種を併記**

メイン画面から `[ランキング]` ボタンでアクセス。

### 5.5 GAS 仕様

`docs/setup-google-apps-script.md` に手順記載。要点:

#### Spreadsheet 列
| timestamp | playerName | score | regulation | turns | deckSize | llExt | heroIds | absoluteHpE | absoluteDmgE | absoluteHpP | absoluteDmgP | version |

#### GAS web app コード（雛形）
```js
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ranking");
  sheet.appendRow([
    new Date(),
    data.playerName,
    data.score,
    data.regulation,
    data.turns,
    data.deckSize,
    data.llExt,
    data.heroIds.join(","),
    data.absoluteConfig?.enemyHpMult || "",
    data.absoluteConfig?.enemyDmgMult || "",
    data.absoluteConfig?.playerHpMult || "",
    data.absoluteConfig?.playerDmgMult || "",
    data.version,
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const filter = e.parameter.regulation;  // optional
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ranking");
  let rows = sheet.getDataRange().getValues().slice(1);  // skip header
  if (filter) rows = rows.filter(r => r[3] === filter);
  rows.sort((a, b) => b[2] - a[2]);  // by score desc
  const top = rows.slice(0, 50).map(r => ({
    timestamp: r[0],
    playerName: r[1],
    score: r[2],
    regulation: r[3],
    turns: r[4],
    deckSize: r[5],
    llExt: r[6],
    heroIds: r[7],
    absolute: r[8] ? { enemyHpMult: r[8], enemyDmgMult: r[9], playerHpMult: r[10], playerDmgMult: r[11] } : null,
  }));
  return ContentService.createTextOutput(JSON.stringify({ ok: true, ranking: top }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

#### デプロイ
- 「ウェブアプリとしてデプロイ」 → 「全員（匿名含む）」アクセス可
- URL を `prototype/js/ranking-client.js` の定数に書き込み

### 5.6 不正対策

クライアント送信値をそのまま信頼。CORS 設定だけ適切に。「カジュアルランキング」として位置付け、将来必要なら GAS 側で異常値フィルタ追加（例：score 上限 10,000,000 / turn 下限 10）。

## 6. データモデルへの追加

### 6.1 runState 拡張

```js
runState = {
  // 既存...
  totalTurns: 0,            // ★新規 — クリア時のターン数積算
};
```

各戦闘終了時に `runState.totalTurns += combat.turn` で加算。

### 6.2 localStorage キー追加

| キー | 内容 |
|---|---|
| `mct.absoluteConfig` | Absolute 倍率 4 種 |
| `mct.playerName` | ランキング送信用名 |
| `mct.rankingApiUrl` | GAS web app URL（ユーザー設定可、空なら送信無効）|

## 7. 実装順序

1. **PR A**: Absolute レギュレーション
   - regulations.js 拡張
   - absolute-config.js 新設
   - 戦闘への倍率適用
   - 設定モーダル UI
2. **PR B**: ランキング機能 (PR A 依存)
   - scoring.js 新設
   - turn 集計 (runState)
   - ranking-client.js 新設
   - 送信モーダル / 表示画面
   - GAS セットアップ手順書

両 PR は **3v3 担当の Phase 4 進行と無干渉** (新規ファイル中心 + 既存への INSERT のみ)。Phase 4f (per-hero state) 進行時に runState shape が変わる可能性あり、その場合 rebase で対応。

## 8. UI 仕様詳細（Phase 4 整合）

3v3 担当の Phase 4e でカード券面 UI が刷新済み。新規 UI は同じ視覚言語で:
- 色: `--target-ally` (緑) を「自分」、`--target-enemy` (赤) を「敵」のラベルに使用
- フォント: 既存の `var(--accent)` ベース
- モーダル: 既存の cutin / help overlay と同じ z-index 階層

## 9. 非目標

- ✗ サーバー側のスコア検証（クライアント信頼）
- ✗ リアルタイムランキング更新（手動リロード）
- ✗ 複数アカウント対応（localStorage のみ）
- ✗ プレイ動画/リプレイ
- ✗ シーズン制（時系列でテーブル分割しない）

## 10. 関連 SPEC

- SPEC-005 §6: ターゲット仕様（Absolute 倍率は target.\* に直接影響しない、計算層で適用）
- SPEC-006 §18: Phase 4j で passive trigger DSL 化される際、Absolute 倍率は trigger 解決には影響なし
