# SPEC-010: UI の土台（トークン・フォント・ボタン・モーダル・safe-area・reduced-motion）

| 項目 | 値 |
|------|-----|
| ID | SPEC-010 |
| 状態 | Accepted |
| 作成日 | 2026-10-16 |
| 最終更新 | 2026-10-16（1.0） |
| 作者 | Claude Code（作者 bearko の依頼） |
| レビュア | bearko |
| チケット | #131（親 #127） |

## 1. 概要

bearko.games のタイトルを DeckBattle・10 buy year の UI/UX の水準にそろえる（[MyCryptoPortfolio docs/ROADMAP.md](https://github.com/bearko/MyCryptoPortfolio/blob/claude/game-portfolio-page-4afqbc/docs/ROADMAP.md) 3 章）。その土台として、画面の器・トークン・フォント・ボタン・モーダルの振る舞い・reduced-motion をそろえる。見た目の構成（DESIGN_CHARTER 4 章の情報の順番）は変えない。

## 2. 背景と動機

2026-10-16 の調査（#127）：

| 基準 | いま |
|---|---|
| 画面の器 | `viewport-fit=cover` なし、safe-area なし、`min-height: 100vh`（iOS のアドレスバーでずれる） |
| トークン | `:root` は色 15 個だけ。角・余白・文字・z-index・動きは直書き（16 進の色の直書きが 341 か所） |
| フォント | システムフォントだけ。数字の桁がそろわない |
| ボタン | 押したときの手ごたえがばらばら。`focus-visible` なし |
| モーダル | 7 つのダイアログのうち `aria-modal` は 4 つ。Esc で閉じるのはヘルプだけ。開いてもフォーカスが動かない |
| 通知 | 活動レポートの画像の保存とデータの読み込み失敗で `window.alert()`（遊びが止まり、見た目も OS 任せ） |
| reduced-motion | 対応なし |
| レギュレーションのアイコン | `www.mycryptoheroes.net` の画像が読めないと、ヘッダーに壊れた画像と alt の文字が出る |

憲章の改定（PROJECT_CHARTER 3.1・DESIGN_CHARTER 1.1、#128）で、見出し・数字の Web フォントと reduced-motion への対応が決まった。

## 3. 目標と非目標

### 目標

- 画面の器：`viewport-fit=cover`、`theme-color`、`100dvh`、画面端（ノッチ・ホームバー）を safe-area で避ける
- `:root` にトークン（角・余白・文字の大きさ・フォント・z-index・動き・safe-area）。**新しく書く CSS はトークンだけで書ける**
- 見出しに Dela Gothic One、数字に Chakra Petch（Google Fonts、`display=swap`、読めなければシステムフォント）
- ボタンの押した感じ（`scale(.97)`）、`focus-visible` の枠、タップのハイライトを消す
- モーダル共通：全部に `aria-modal`、閉じてよいものは Esc で閉じる、キーボードで開いたときは最初のボタンにフォーカス
- `alert()` をやめて、画面の下に出るトースト（`aria-live`、自動で消える）
- `prefers-reduced-motion` で、アニメーション・トランジションをほぼ 0 に
- レギュレーションのアイコンが読めないときは、画像を隠して名前の文字を出す
- タイトルの「PRESS TO START」を読みやすく（今は背景とのコントラストが低い）

### 非目標

- 情報の並び（DESIGN_CHARTER 4 章）・画面の構成の変更
- 手札のカードの重なり：横幅が足りないときに重ねて、タップで持ち上げて読む今の作り（`--card-margin`・`--peek-lift`）は意図した設計なので変えない
- 既存の 16 進の色の直書きをすべてトークンに置き換えること（触る部分から順に）
- 設定画面（SPEC-011）、演出（SPEC-012）、はじめての案内（SPEC-013）

## 4. スコープ

| ファイル | 変更 |
|---|---|
| `prototype/index.html` の `<head>` | `viewport-fit=cover`、`theme-color`、Google Fonts（preconnect ＋ `display=swap`） |
| `prototype/index.html` の `:root` ほか CSS | トークン、`body` の `100dvh` と safe-area、ボタン・`focus-visible`、見出し・数字のフォント、トースト、reduced-motion、タイトルの「PRESS TO START」 |
| `prototype/index.html` のダイアログ | 全部に `aria-modal="true"`。閉じてよいものに `data-esc-close="<閉じるボタンの CSS セレクタ>"` |
| `prototype/js/ui-kit.js`（新規） | `installModalA11y()`、`showToast(message, { tone })`、`escTarget()`（純関数） |
| `prototype/js/main.js` | 起動時に `installModalA11y()`。`alert()` 2 か所を `showToast()` に。レギュレーションのアイコンの `onerror` |

### Esc で閉じるダイアログ

| ダイアログ | Esc |
|---|---|
| ヘルプ（`helpOverlay`） | 既存の処理のまま |
| デッキ（`ownedDeckOverlay`・`deckModal`） | 閉じる |
| 活動レポート（`activityReportOverlay`） | 閉じる |
| ランキングに送る（`rankingSubmitOverlay`） | キャンセル |
| Absolute の設定（`absoluteConfigOverlay`） | キャンセル |
| レジェンダリーのエクステ（`llExtModal`） | **閉じない**（受け取るまで進めない） |

### トークン

| 種類 | トークン |
|---|---|
| 角 | `--r-sm 6px` `--r-md 10px` `--r-lg 14px` `--r-pill 999px` |
| 余白 | `--sp-1 .25rem` 〜 `--sp-6 1.6rem` |
| 文字 | `--fs-xs .7rem` `--fs-sm .8rem` `--fs-md .9rem` `--fs-lg 1.1rem` `--fs-xl 1.4rem` |
| フォント | `--font-body`（今のシステムフォント）、`--font-display`、`--font-num` |
| z-index | `--z-toast` など、増やすときはトークンで |
| 動き | `--ease-out` `--ease-spring` `--dur-fast 120ms` `--dur-base 220ms` |
| safe-area | `--safe-t/r/b/l` |

## 5. 受け入れ基準

- [ ] 390×844・360×640・1280×800 で、タイトル → レギュレーション → パーティ編成 → マップ → 戦闘 が崩れない（変更前と見比べる）
- [ ] 見出しと数字のフォントが当たる。フォントが読めないとき（オフライン）もレイアウトが崩れない
- [ ] デッキ・活動レポート・ランキングに送る・Absolute の設定が Esc で閉じる。レジェンダリーのエクステは閉じない
- [ ] キーボードでダイアログを開くと最初のボタンにフォーカスが来る（タッチ・マウスでは動かない）
- [ ] `alert()` がコードに残っていない
- [ ] レギュレーションのアイコンが読めないとき、壊れた画像ではなく名前が出る
- [ ] reduced-motion でアニメーションが止まる
- [ ] `node --test tests/*.test.mjs` が通る（`escTarget` のテストを足す）

## 6. テスト

- `tests/ui-kit.test.mjs`：`escTarget`（開いているダイアログのうち一番上が Esc を受けるか）
- 手動（Playwright で撮影）：上の画面サイズ、Esc、トースト、アイコンの代わりの表示、reduced-motion

## 7. Human-in-the-loop

- Web フォントと reduced-motion は DESIGN_CHARTER 1.1（#128、作者の決定）に基づく

## 8. 改訂履歴

| 日付 | 版 | 変更内容 |
|---|---|---|
| 2026-10-16 | 1.0 | 初版 |
