# SPEC-009: bearko.games 共通基盤との連携（総合スコア）

| 項目 | 値 |
|------|-----|
| ID | SPEC-009 |
| 状態 | Accepted |
| 作成日 | 2026-10-16 |
| 最終更新 | 2026-10-17（1.1） |
| 作者 | Claude Code（作者 bearko の依頼） |
| レビュア | bearko |

## 1. 概要

bearko.games の総合スコア（[bearko/mycryptoportfolio の SPEC-002](https://github.com/bearko/mycryptoportfolio/blob/claude/game-portfolio-page-4afqbc/docs/specs/SPEC-002-total-score.md)。各タイトルの自己ベストの合計）に、本作から参加する。1 回の挑戦が終わったときに、その成績を共通基盤の SDK で送る。点の計算は共通基盤のサーバーが行う。

## 2. 背景と動機

- 共通基盤の段階 3（総合スコア）を始める（作者の決定 2026-10-16）。本作の計算式は SPEC-002 3.1
- SPEC-008（トロフィー）と同じ窓口（`prototype/js/platform.js`）を使う

## 3. 目標と非目標

### 目標（Goals）

- 挑戦が終わる（全章クリア・敗北）たびに成績を送り、共通基盤の総合ランキングに載る
- ログインしていなくても送れて、あとでログインしたときにまとめて登録される（共通基盤の仮アカウント）

### 非目標（Non-goals）

- 既存の GAS ランキング（SPEC-007）の置き換え・スコアの式の変更
- 本作のコードでの Cookie・localStorage の利用

## 4. スコープ

### 含む

- `prototype/js/platform.js`：送る成績を作る純関数 `scoreMetrics` と、送る `reportRunScore`
- `prototype/js/main.js`：挑戦の終わり（`captureRunSnapshot` を呼ぶ全章クリア・敗北の 2 か所）から送る

### 含まない

- 点の計算（共通基盤の `platform/scoring/tactics.v1.js`）
- 画面の追加（自己ベスト更新の通知は SDK が出す）

## 5. 契約と挙動

### 入力

挑戦の終わり（`captureRunSnapshot` の直後）のスナップショットと、クリアした章（`clearedChapters`）。

### 出力・副作用

送る成績：

| 項目 | 中身 |
|---|---|
| `chaptersCleared` | クリアした章の数（0〜5） |
| `cleared` | 全章クリアか |
| `finalScore` | 全章クリアのときの最終スコア（SPEC-007 の `scoreBreakdown.finalScore`。レギュレーション倍率込み）。敗北なら 0 |
| `regulation` | レギュレーション ID（共通基盤の難易度の係数を決める。1.1） |
| `baseScore` | 全章クリアのときの **倍率の前の点**（SPEC-007 の `scoreBreakdown.baseScore`。ターン数・デッキ枚数・LL・レアリティ）。敗北なら 0（1.1） |
| `absoluteMult` | ABSOLUTE のときだけ、ABSOLUTE の倍率（SPEC-007 の `scoreBreakdown.absMult`）。それ以外は送らない（1.1） |

- 1 回の挑戦で送るのは 1 回だけ（`runState.scoreSent`）
- 章を 1 つもクリアしていなければ送らない（点が 0 のため）
- 共通基盤での点（共通基盤の SPEC-002 3.1、計算式 `tactics.v2.js`）：クリアした章 × 1,000 ＋ 全章クリアなら **倍率の前の点 × 難易度の係数 × 0.25**
  - 難易度の係数は共通基盤で決める（Common 1.0 ／ Egg 1.2 ／ Baby 1.4 ／ Blue 1.7 ／ Red 2.0 ／ ABSOLUTE は ABSOLUTE の倍率そのもので上限 2.0）。ゲーム内のレギュレーション倍率（Red 3.0・ABSOLUTE 最大 2,500 倍）は総合スコアには使わない（ゲーム内のランキングはそのまま）
  - `finalScore` は今までどおり送る（1.0 の成績と同じ形のまま、記録として残す）

### エラー条件

- SDK が読めない・通信に失敗した場合は何もしない（ゲームの進行を止めない・例外を出さない）。失敗は `console.warn` だけ

### 互換性

- 依存の追加はない。SDK は SPEC-008 で読み込み済み

## 6. 非機能要件

- 通信は挑戦の終わりの 1 回だけ

## 7. Human-in-the-loop

- 係数（0.25・難易度の係数）は共通基盤の SPEC-002 で作者が見直す（本作の変更は要らない）

## 8. 受け入れ基準

- [ ] 第 2 章で敗北すると 2,000 点が送られ、`https://bearko.games/me/` の総合スコアに出る
- [ ] 全章クリアで「タイトルスコア 自己ベスト」の通知が出る
- [ ] SDK が読めない状態でも、全章クリアまで遊べる
- [ ] Red で全章クリアすると、送る成績に `baseScore` が入り、総合スコアが `5,000 ＋ baseScore × 0.5` になる（1.1）

## 9. テストと証跡

- `prototype/js/platform.js` の `scoreMetrics` を Node 標準 `assert` でテストする（`tests/platform.test.mjs`）
- 手動 QA：上の受け入れ基準を PR 本文のチェックリストで確認する

## 10. 改訂履歴

| 日付 | 版 | 内容 |
|---|---|---|
| 2026-10-16 | 1.0 | 初版 |
| 2026-10-17 | 1.1 | 倍率の前の点（`baseScore`）と ABSOLUTE の倍率（`absoluteMult`）を送る。共通基盤の計算式が v2（難易度の係数）になったため |
