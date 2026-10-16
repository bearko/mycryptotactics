# SPEC-011: 設定（BGM・SE の音量、演出を減らす、言語）

| 項目 | 値 |
|------|-----|
| ID | SPEC-011 |
| 状態 | Accepted |
| 作成日 | 2026-10-16 |
| 最終更新 | 2026-10-16（1.1） |
| 作者 | Claude Code（作者 bearko の依頼） |
| レビュア | bearko |
| チケット | #132（親 #127） |

## 1. 概要

戦闘のヘッダーの ⚙ は押しても何も起きない（`// future: open settings panel`）。音を消す手段もない。⚙ で設定を開き、BGM・SE の音量（0 ＝ オフ）、演出を減らす、言語を変えられるようにして、端末に保存する。

## 2. 背景と動機

- 電車の中などで開くと BGM がいきなり鳴る。ブラウザの音量に任せるしかない（DESIGN_CHARTER 3.1「音量は控えめ（プレイヤーの環境を尊重）」）
- 別のタブに移っても BGM が鳴り続ける
- PROJECT_CHARTER 3.1（#128）で、設定は `mct.*` で端末に保存してよいことになった
- DESIGN_CHARTER 1.1 の軽い演出（SPEC-012）は、設定の「演出を減らす」で止まることが条件

## 3. 目標と非目標

### 目標

- マップと戦闘のヘッダーの ⚙ で設定を開く（マップのヘッダーにも ⚙ を足す）
- BGM の音量・SE の音量（0〜100%、5% 刻み、0% は「OFF」）。100% で今と同じ大きさ。動かすとその場で BGM の音量が変わる。SE は離したときに 1 回鳴らして確かめられる
- 演出を減らす（OS の reduced-motion が ON なら ON で固定し、そう書く）。ON のあいだ `<html>` に `reduce-fx` を付け、CSS のアニメーションを reduced-motion と同じく止める
- 言語（日本語・English）。今のヘッダーの JP/EN ボタンと同じ `setLang`
- `localStorage["mct.settings"] = { v: 1, bgm, se, reduceFx }` に保存。壊れた値は既定値に直す
- タブを離れたら BGM を止め、戻ったら再開する

### 非目標

- 音の素材の差し替え・追加
- キー割り当て・文字の大きさの設定
- ヘッダーの JP/EN ボタンを消すこと（今のまま残す）

## 4. スコープ

| ファイル | 変更 |
|---|---|
| `prototype/js/settings.js`（新規） | `normalizeSettings`・`mixVolume`（純関数）、`getSettings`・`updateSettings`・`onSettingsChange`、`prefersReducedMotion()`（OS か「演出を減らす」） |
| `prototype/js/main.js` | BGM・SE の音量を「呼び出し側の音量 × 設定」に。0 なら鳴らさない／BGM は読み込まない。設定の変更で鳴っている BGM の音量を直す。`visibilitychange` で BGM を止める・再開。⚙ で設定を開く |
| `prototype/index.html` | 設定のダイアログ（`role="dialog"`・`aria-modal`・`data-esc-close`）、マップのヘッダーに ⚙、`.reduce-fx` の CSS |
| `prototype/data/i18n/ui.json` | 設定の文言（ja/en） |

## 5. 受け入れ基準

- [x] マップ・戦闘の ⚙ で設定が開き、✕・閉じる・背景・Esc で閉じる
- [x] BGM 0% で BGM が止まり、上げると鳴り直す。リロードしても保存されている
- [x] SE 0% で効果音が鳴らない
- [x] 「演出を減らす」で `<html>` に `reduce-fx`、`prefersReducedMotion()` が true
- [x] 言語を切り替えると画面の文言が変わる
- [x] タブを隠すと BGM が止まり、戻ると再開する
- [x] `node --test tests/*.test.mjs` が通る（`normalizeSettings`・`mixVolume` のテストを足す）

## 6. テスト

- `tests/settings.test.mjs`：既定値・範囲外・壊れた値、音量の掛け算
- 手動（Playwright）：設定を開く・保存・リロード、`visibilitychange`、言語の切り替え

## 7. Human-in-the-loop

- 端末への保存は PROJECT_CHARTER 3.1（#128、作者の決定）に基づく（`mct.*`、設定だけ）

## 8. 改訂履歴

| 日付 | 版 | 変更内容 |
|---|---|---|
| 2026-10-16 | 1.0 | 初版 |
| 2026-10-16 | 1.1 | 実装（受け入れ基準をすべて確認） |
