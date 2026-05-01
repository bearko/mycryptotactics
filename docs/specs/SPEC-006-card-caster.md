# SPEC-006: カード単位のキャスター指定システム

| 項目 | 値 |
|------|-----|
| ID | SPEC-006 |
| 状態 | Draft |
| 作成日 | 2026-05-02 |
| 最終更新 | 2026-05-02 |
| 作者 | bearko + Claude Code |
| 想定リリース | β版 (Phase 3 完了後・Phase 4) |
| 依存 | [SPEC-005](./SPEC-005-party-3v3.md) (3v3 + ターゲット仕様) |

## 1. 概要

SPEC-005 Phase 3j で導入した「ユーザーが任意のヒーローをアクティブキャスターに切替える」方式を廃止し、**各カードがキャスター（利用者）の選択ルールを保持** する方式へ移行する。

加えて、カード券面 UI を **左 30% : ターゲット表示エリア / 右 70% : 効果テキストエリア** に再構成し、キャスターアイコンをエクステンション画像エリアの右下に重ねる。

## 2. 背景と動機

### 2.1 アクティブキャスター方式の問題

- ユーザーが手動でアクティブを切替えるオーバーヘッドが大きい
- カードによって最適キャスターが異なる（攻撃カードは PHY 高、回復カードは INT 高）にもかかわらず、毎回手動で切替えるのは煩雑
- 「前衛が死亡したらこのカードは死に札になる」のような **戦略的トレードオフ** がカード単位で表現できない
- 同じスキル名・効果でも「使い手」を差別化することでカードプールに多様性を与えられない（例: ノービスブレード「先頭版」と「前衛版」）

### 2.2 カードキャスター方式のメリット

- **カード設計時にキャスター選択を組み込める** → 同名スキルでも「使い手」で差別化可能
- バランス調整時に「効果係数 × 使い手リスク」の 2 軸で調整できる
- ユーザー操作が **ターゲット選択のみ** に簡素化（キャスターは自動）
- 死亡耐性のバランスが取れる（「前衛」専用 = ハイリスク・ハイリターン / 「先頭」 = ロバスト・標準威力）

## 3. 目標と非目標

### 目標（Goals）

- カード定義に `caster` フィールドを追加（キャスター選択ルール）
- バトル中のカード券面に **そのターン時点で誰が使うか** をヒーローアイコンで表示
- バトル外（デッキ・ショップ・クラフト）のカード券面に **キャスターロール ラベル** ＋ **係数表記** で表示
- 効果テキストエリアを **左 30% / 右 70%** に分割して `[ターゲット] [効果]` を 1 行ずつ表示
- 1 枚のカードに **複数の (ターゲット, 効果) ペア** を持てる（「敵先頭 ダメ + 自身 PHY+」等）
- キャスターが解決不能（指定ヒーローが全員死亡等）のカードは **グレーアウト = 使用不可**（コスト不足と同じ扱い）
- バフ/デバフ/ガード/シールド等の状態を **ヒーロー個別** に持つ（Unit 型へ統合）
- アクティブキャスター切替 UI（Phase 3j）を削除

### 非目標（Non-goals）

- カード効果の数値再バランス（β v1.x 以降の別 Issue）
- 既存 392 カード全件の caster 手動再指定（**デフォルト = "先頭"** で自動移行する）
- ターゲット仕様の語彙拡張（SPEC-005 §6 で定義済みのものをそのまま流用）
- caster と target の解決ルールが衝突するケース（例: caster=前衛 / target=ally.front は同一）の特別扱い

## 4. 用語

| 用語 | 意味 |
|------|------|
| **キャスター (caster)** | 1 枚のカードを実際に使うヒーロー。カード定義の `caster` フィールドから戦闘状態を引いて解決される |
| **キャスターロール (CasterRole)** | キャスター選択ルール（"前衛" / "先頭" / "高PHY" 等の文字列定数） |
| **エフェクトエントリ (EffectEntry)** | カード券面に並ぶ 1 行 = `{target, text}` のペア |
| **解決不能カード (uncastable)** | キャスター候補が全員死亡しているカード。手札に残るがプレイ不可（グレーアウト） |

## 5. キャスターロール語彙

カード定義の `caster` フィールドに書く文字列定数。

| ロール | 識別子 | 解決ルール |
|--------|--------|-----------|
| 前衛 | `front` | `heroes[0]` 固定。死亡時は **解決不能** |
| 中衛 | `mid` | `heroes[1]` 固定。死亡時は **解決不能** |
| 後衛 | `back` | `heroes[2]` 固定。死亡時は **解決不能** |
| 先頭 | `foremost` | 前衛 → 中衛 → 後衛 の順に最初に生存しているヒーロー（SPEC-005 `foremostAlive`） |
| 最後尾 | `rearmost` | 後衛 → 中衛 → 前衛 の順に最初に生存しているヒーロー |
| 最も PHY 高い | `highest_phy` | 生存中で `phy` が最大のヒーロー（同値時は前位置優先） |
| 最も INT 高い | `highest_int` | 同上 INT |
| 最も HP 高い | `highest_hp` | 同上 HP |

### 5.1 解決の優先順位とタイミング

- カード使用時に **その瞬間の `combat.heroes` 配列** を見て解決する（バフ等によって候補が変わるのは織り込み済み）
- 一度解決したキャスターは **そのカードのプレイ完了まで固定**（プレイ中にバフで他ヒーローの PHY が変わっても切替わらない）
- バフ/デバフによる前提崩れ（例: caster=高PHY 解決後にデバフで PHY が下がる）は **その回の使用には影響しない**

### 5.2 「自身」ターゲットとの関係

エフェクトの `target: "self"` は **そのカードのキャスター** と同一視する。caster=`front` のカードに `target: "self"` のエフェクトがあれば前衛にバフが乗る。caster=`highest_phy` なら高 PHY ヒーローにバフが乗る。

## 6. データモデル

### 6.1 Card 型（拡張）

```ts
type CasterRole = 'front' | 'mid' | 'back' | 'foremost' | 'rearmost'
                | 'highest_phy' | 'highest_int' | 'highest_hp';

type EffectEntry = {
  target: TargetSpec;            // SPEC-005 §6 の語彙（"enemy.foremost" 等）
  text: string;                  // 「PHYダメ 60%」「PHY +5%」等。バトル外/バトル内共通の係数ベース表現
};

type Card = {
  // 既存フィールド
  libraryKey: string;
  extId: number;
  extNameJa: string;
  skillNameJa: string;
  skillIcon: string;             // バトル外でも参照されるアイコン
  cost: number;
  type: 'atk' | 'skl';
  exhaust?: boolean;

  // SPEC-006 新規
  caster: CasterRole;            // 必須。未指定の旧データは "foremost" にデフォルト解決
  effects: EffectEntry[];        // 1 行 = 1 ペア。表示順 = 配列順

  // 旧・既存（移行中は併存）
  target?: TargetSpec;           // 主ターゲット（後方互換）。effects[0].target と同義扱い
  effectSummaryLines?: (s) => string[];  // 旧: 削除候補
  previewLines?:        (s) => string[]; // 旧: 削除候補
  play: (s, ctx) => void;        // ctx に { caster: HeroUnit, resolvedTargets: Map<TargetSpec, Unit[]> }
};
```

### 6.2 Hero Unit 拡張（per-hero state 化）

SPEC-005 §7.1 の Unit 型は既に `guard / shield / poison / bleed / vulnerable` を持つが、現実装では `combat.playerGuard` 等の **共有 legacy フィールド** に書かれている。SPEC-006 では:

- バフ・デバフ・ガード・シールド・毒・出血・脆弱・不屈フラグ等は **すべて該当ヒーロー個人の Unit に格納**
- legacy `combat.player*` は読み出し用 shim として `heroes[0]` を反映するのみ（書き込み API は廃止）
- ガード/シールド吸収やダメージ反映時は対象ヒーロー個人の数値を参照

### 6.3 章バンドルへの影響

`prototype/data/extensions.json`（および readonly な csv）の各エントリに `caster` カラムを追加する。CSV カラム順:

```
libraryKey, extId, extNameJa, skillNameJa, skillIcon, cost, type, caster, effect_target1, effect_text1, effect_target2, effect_text2
```

`tools/sync_csv_json.js` を拡張。

## 7. UI / 画面仕様

### 7.1 カード券面（バトル中）

```
┌─────────────────────────┐
│      ⚡ コスト値          │  ← カード上部 (既存)
├─────────────────────────┤
│   エクステンション名       │  ← カード上部
│ [Type1] [Type2]          │  ← rare 表示等
│                          │
│      [メイン画像]         │  ← エクステ画像
│              [Hero icon] │  ← キャスター（解決後ヒーロー portrait）バトル中のみ
│                          │
├──────┬──────────────────┤
│ 対象 │       効果         │  ← 左 30% / 右 70%
│敵先頭│  PHYダメ 60%      │
│ 自身 │  PHY +5%          │
└──────┴──────────────────┘
```

- **キャスター表示エリア**: エクステ画像の右下に重ねて配置。バトル中は **解決された個別ヒーローの portrait**。アイコン下にキャスターロール（"先頭" 等の小ラベル）を併記
- **効果エリア**: 縦に 1 〜 N 行（カード設計時の `effects` 配列）。左カラムにターゲット (色付きピル: 自身=緑 / 味方=緑 / 敵=赤)、右カラムに係数テキスト
- **解決不能カード**（caster が全員死亡）: 全体グレーアウト + クリック無効。コスト不足と同じ視覚処理を流用

### 7.2 カード券面（バトル外: デッキ / ショップ / クラフト）

- **キャスター表示エリア**: ロールラベル文字列のみ（"先頭" / "前衛" / "高PHY" 等）。具体ヒーローは未確定なのでアイコンは表示しない
- **効果エリア**: バトル中と同じレイアウト + 係数表記。具体数値（「12 ダメージ」等）は表示しない（パーティ未確定のため）

### 7.3 バトル UI からの削除

- アクティブキャスター highlight (`combatant--active` の金色グロー) を削除
- "▶ ACTIVE" バッジを削除
- ヒーロー portrait の click イベント（`setActiveHero`）を削除
- ヒーロー portrait の hover lift エフェクトは残す（タップ可能感）

## 8. キャスター解決とカード使用フロー

### 8.1 `resolveCaster(role, s)` 関数

```js
function resolveCaster(role, s) {
  const heroes = s.heroes || [];
  switch (role) {
    case 'front':       return heroes[0]?.alive ? heroes[0] : null;
    case 'mid':         return heroes[1]?.alive ? heroes[1] : null;
    case 'back':        return heroes[2]?.alive ? heroes[2] : null;
    case 'foremost':    return foremostAlive(heroes);
    case 'rearmost':    return rearmostAlive(heroes);
    case 'highest_phy': return pickByMax(heroes, h => h.phy);
    case 'highest_int': return pickByMax(heroes, h => h.int);
    case 'highest_hp':  return pickByMax(heroes, h => h.hp);
    default:            return foremostAlive(heroes);  // 後方互換のフォールバック
  }
}
```

### 8.2 カード使用時のシーケンス

1. ユーザーがカードをタップ
2. `caster = resolveCaster(card.caster, combat)` を呼ぶ
3. `caster == null` なら何もしない（`canPlayCard()` ではこの時点でグレーアウト返却）
4. 各エフェクトについて `targets = resolveTargets(effect.target, caster, combat)` を解決
5. `card.play(combat, { caster, effects: resolvedTargets })` を呼ぶ
6. `card.play` 内では caster.phy / int / agi を使ってダメージ計算

### 8.3 `canPlayCard(card, s)` 関数

```js
function canPlayCard(card, s) {
  if (card.cost > s.energy) return false;
  if (resolveCaster(card.caster, s) == null) return false;
  return true;
}
```

UI レンダリング時に true/false で `card-slot--disabled` クラスを切替える。理由テキスト（"コスト不足" / "キャスター不在"）はツールチップで提示。

## 9. 既存カードの移行戦略

### 9.1 デフォルト `caster` の自動付与

|現 `target` | デフォルト `caster` | 理由 |
|------------|---------------------|------|
| `enemy.foremost` / `enemy.front` | `foremost` | 攻撃カードは生存先頭ヒーローが使う想定 |
| `enemy.*` (それ以外) | `foremost` | 同上 |
| `self` | `foremost` | 既存 self バフは前衛優先 |
| `ally.*` | `foremost` | 同上 |
| 未指定 | `foremost` | 全フォールバック |

`scripts/sync_csv_json.js` または手動スクリプトで一括付与する。

### 9.2 `effects` 配列への変換

既存 `effectSummaryLines(s)` は `s.playerPhy` 等の現在値で計算した文字列配列を返している。これを **係数ベースの定数文字列配列** に書き換える:

| 旧 (実数) | 新 (係数) |
|-----------|---------|
| 「敵にダメージ 12」 | `{target: "enemy.foremost", text: "PHYダメ 50%"}` |
| 「HP +30」 | `{target: "self", text: "HP回復 INT30%"}` |
| 「PHY +6」 | `{target: "self", text: "PHY +6"}` |

実数表記が欲しいバトル中の hover プレビューは別 API（`previewWithCaster(card, caster, s)`）として残すか、ツールチップ専用関数に格上げ。

### 9.3 `play()` シグネチャ変更

旧: `play(s)` — `s.playerPhy` 等を読む
新: `play(s, ctx)` — `ctx.caster.phy` 等を読む

`battleApi.dealPhySkillToEnemy` 等のヘルパに **caster Unit を引数として追加**。例:

```js
function dealPhySkillToEnemyByCaster(s, caster, target, skillPct) {
  const cut = cutRateFromPhy(target.phy);
  const base = phyIntDamageAfterCut(caster.phy, skillPct, cut);
  // ...
}
```

旧 `dealPhySkillToEnemy(s, minPct, maxPct)` は legacy shim として `caster = heroes[0]`, `target = foremost` で呼び出すラッパに退避（既存カードがすぐ動かなくならないように）。

## 10. グレーアウト挙動

### 10.1 トリガー

- `card.cost > combat.energy` （既存）
- `resolveCaster(card.caster, combat) == null` （新）

### 10.2 視覚処理

- カードスロットに `card-slot--disabled` クラスを付与（既存）
- カード上部に小バッジ "キャスター不在" / "コスト不足" を表示
- クリック無効

### 10.3 復帰条件

- 生き返らせるカード（リザレクション系）でキャスターが復帰した場合、自動的にグレーアウトが解除される（毎ターン render で再判定）

## 11. アクティブキャスター方式の削除（Phase 3j → 3k）

Phase 3j で実装した以下を削除:

- `setActiveHero(idx)` 関数
- `combat.activeHeroIdx` フィールド（残しても無害だが使用箇所なし）
- `loadActiveHeroStatsToLegacy` / `syncLegacyStatsToActiveHero` (キャスター解決時に都度ロードするため不要)
- `playCard` の `ensureActiveHeroAlive` / `loadActiveHeroStatsToLegacy` 呼び出し
- `.combatant--active` CSS（"▶ ACTIVE" バッジ含む）
- `.party-side--player` のクリックハンドラ

`getActiveHero(s)` は **「最後にカードを使ったヒーロー」** の参照として使う場合は残す（passive 系で「直近のキャスター」を引きたいケース）。残さない場合は削除。

## 12. 実装フェーズ

| Phase | 内容 | 優先度 |
|-------|------|--------|
| 4a | SPEC-006 確定 + データ schema 追加 (CSV/JSON カラム拡張) | P0 |
| 4b | `resolveCaster` 実装 + `canPlayCard` 拡張 + 手札 render での grayed-out | P0 |
| 4c | 既存 45 カードの `caster: "foremost"` デフォルト付与 + `effects` 配列化 | P0 |
| 4d | 新カードを `play(s, ctx)` 化（caster.phy/int/agi 参照、新 battleApi）| P0 |
| 4e | カード券面 UI: 左 30%/右 70% 分割 + キャスターアイコン重ね + ロールラベル | P0 |
| 4f | per-hero state 化（guard/shield/poison/bleed を Unit 内に） | P1 |
| 4g | アクティブキャスター方式の撤去（Phase 3j 関連コード削除） | P1 |
| 4h | バトル外（デッキ/ショップ/クラフト）のカード券面係数表記 | P1 |
| 4i | PR #50/#51 マージ後、347 ext + 7 hero に対し caster 手動再指定 | P2 |

## 13. 影響範囲

| ファイル | 変更レベル | 内容 |
|----------|-----------|------|
| `prototype/js/cards.js` | **大** | 全カードの schema 移行（caster, effects） |
| `prototype/js/main.js` | **大** | `playCard` フロー、deal* helper の caster 引数化、UI 描画変更、Phase 3j 削除 |
| `prototype/index.html` | **大** | カード券面レイアウト全面更新 (`.card-effect-row` 構造) |
| `prototype/data/extensions.json` / `extensions.csv` | 中 | caster カラム追加 |
| `prototype/tools/sync_csv_json.js` | 中 | caster カラム同期サポート |
| `prototype/data/heroes.json` | 小 | passive 関連の caster 整合（基本不要） |

## 14. リスクと軽減策

| # | リスク | 影響 | 軽減策 |
|---|--------|------|--------|
| R1 | 既存 392 カード一括移行で挙動破壊 | 重大リグレッション | デフォルト `caster: "foremost"` で旧挙動維持 → 段階的に手動再指定 |
| R2 | per-hero state 化で全カード play() 書き換え | 工数大 | Phase 4f に分離、battleApi の legacy shim を残す |
| R3 | キャスター不在で大量カードが死に札 | プレイ感悪化 | デフォルトを `foremost` にすることで「全滅以外死に札ゼロ」に |
| R4 | 高PHY/高INT/高HP 選択でユーザーが「誰が使ったか」分からない | UX 悪化 | カード使用時に clog で `【シャーロック・ホームズ】が ノービスブレード を使用` 等の明示ログ |
| R5 | UI が混雑（caster icon + role label + effect rows） | 視認性悪化 | バトル中は icon、外では label のみで切替 |
| R6 | PR #50 (新ヒーロー passive) と方針衝突 | マージ困難 | パッシブの "自身" 解釈を SPEC-006 §5.2 に整合させる方針を共有（HANDOFF 経由） |

## 15. 受け入れ基準

### β v1.x（最小ライン）

- [ ] 全既存カードに `caster` フィールドが付与され、デフォルト `"foremost"` で旧挙動と完全一致
- [ ] カード券面が左 30% / 右 70% に再構成され、`{target, text}` ペアが行ごとに表示される
- [ ] バトル中、カード券面右下にキャスターヒーローの portrait が出る
- [ ] バトル外、カード券面右下にキャスターロール ラベルが出る
- [ ] キャスターが解決不能なカードがグレーアウトされ、クリック無効になる
- [ ] アクティブキャスター切替 UI（Phase 3j）が削除されている
- [ ] バフ・デバフ・ガード・シールド・毒・出血が **ヒーロー個別** に管理される
- [ ] caster=`highest_phy` 等のカードを試作し、PHY 順でキャスターが変わることが目視確認できる

### β v1.x（拡張）

- [ ] 新 347 ext のうち少なくとも 30% に手動 caster 再指定を入れる（差別化サンプル）
- [ ] caster=`front`（前衛限定）と caster=`foremost`（先頭）でゲームバランスを差別化したカードペアが 5 対以上ある

## 16. 未確定事項 / 仕様提案

実装着手前に確認したい論点。それぞれに **当方の推奨案** を提示。

### Q1. caster と target=`self` の整合

エフェクトの target=`self` は「カードのキャスター」と同一視する（§5.2）。
**推奨案**: 仕様確定済み。実装に乗せて OK。

### Q2. caster ごとに異なる使用ログ

caster=`highest_phy` のカードを使った時、「誰が使ったか」をログに残すか？
**推奨案**: 残す（"【シャーロック・ホームズ】が【ノービスブレード】を使用" 形式）。R4 軽減のため。

### Q3. 同一カードの連続使用と caster 一貫性

caster=`foremost` のカード A を使うと前衛がダメージを与える。次に caster=`highest_int` のカード B を使うと、その瞬間 INT が最も高いヒーローが使う。
**推奨案**: そのまま。これが SPEC-006 のキモなので例外を作らない。

### Q4. パッシブ系の「自分」「キャスター」の関係

ヒーローのパッシブが「カード使用時に PHY +X」のような場合、「カード使用時」とは「そのヒーローが caster になった時」と解釈する。
**推奨案**: パッシブ定義に `trigger: "self.cardPlayed"` 等の明示を導入。PR #50/#51 と整合させる必要あり。

### Q5. バトル外のカード券面の "対象" 表示

バトル外でも左 30% に target ラベルを出す（"敵先頭" / "自身" / "敵全体" 等）。
**推奨案**: 仕様確定済み。

### Q6. 効果テキストの係数表記の標準化

ダメージ: `PHYダメ 50%` / `INTダメ 25%` / `特殊ダメ HP 5%`
回復: `HP回復 INT30%`
バフ: `PHY +5%` / `PHY +6` （定数加算）
バフ: `ガード +20`
状態異常: `毒 ×2` / `出血 ×3`
**推奨案**: 上記を標準語彙とする。揺れがある場合は SPEC-006 改訂で統一。

### Q7. 解決不能カードを "強制使用" するオプション

エネルギーだけ消費して効果なしで終わる "捨てる" モードは設けない。
**推奨案**: 設けない。コスト不足と同じ単純グレーアウトで OK。

### Q8. caster と target が同一ヒーロー（self バフ等）の場合の表示

「自身 PHY +5%」のターゲットラベルは "自身" で統一。caster=`highest_phy` でも target=`self` の表示は "自身"（具体ヒーロー名にはしない）。
**推奨案**: 仕様確定済み。

### Q9. 移行期の旧 `effectSummaryLines` / `previewLines` の維持

新 `effects` 配列を導入後、旧 API は **3 リリースを目処に削除**。それまでは shim で `effects` から旧形式に変換可能。
**推奨案**: 仕様確定済み。

### Q10. グレーアウト原因の表示位置

`card-slot--disabled` のときに何が原因かを示すバッジを上部に出す（"⚡不足" / "👤不在"）。
**推奨案**: 仕様確定済み。`title` 属性 + 視覚バッジの併用。

## 17. 関連文書

- [SPEC-005-party-3v3.md](./SPEC-005-party-3v3.md) — 3v3 / ターゲット仕様の元仕様
- [SPEC-INDEX.md](./SPEC-INDEX.md) — 仕様インデックス
- HANDOFF: `C:/Users/beark/mct-extensions/HANDOFF-FOR-3V3-AGENT.md` — PR #50/#51 との整合確認
