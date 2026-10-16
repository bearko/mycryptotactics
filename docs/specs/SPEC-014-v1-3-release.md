# SPEC-014: 公開版 v1.3.0（版・manifest・アイコン・OGP・README）

| 項目 | 値 |
|------|-----|
| ID | SPEC-014 |
| 状態 | Accepted |
| 作成日 | 2026-10-16 |
| 最終更新 | 2026-10-16（1.0） |
| 作者 | Claude Code（作者 bearko の依頼） |
| レビュア | bearko |
| チケット | #135（親 #127） |

## 1. 概要

v1.x の仕上げ（SPEC-010〜013）を **v1.3.0** として出す。版の表記をそろえ、ホーム画面に追加できるように manifest とアイコンを足し、ルートのページ（`tactics.bearko.games/` の転送）の「アルファ版」の表記を直し、README に今回の変更を書く。

## 2. 背景と動機

- 版の表記が `main.js` の `APP_VERSION`・`<title>`・OGP・タイトル画面・フッター（i18n）に散らばっている
- manifest・apple-touch-icon がなく、ホーム画面に追加してもアプリのように開かない。ファビコンは mycryptoheroes の raw URL の `MAI_SD.png`
- ルートの `index.html`（`/prototype/` へ転送）の `<title>` と OGP が「アルファ版」のまま
- ランキングの版の絞り込みは「今の版」が既定。版を上げた瞬間、ランキングが空に見える（v1.3.0 でスコアの式は変えていない）

## 3. 目標と非目標

### 目標

- `APP_VERSION = "1.3.0"`、`<title>`・OGP・Twitter・タイトル画面・フッター（ja/en）を 1.3.0 に
- アイコン：リポジトリにある `prototype/MCT_logo.png` の紋章を正方形に切り出し、48・180・192・512px を `prototype/icons/` に。`prototype/manifest.json`（standalone・縦・any/maskable）、`apple-touch-icon`、`apple-mobile-web-app-*`
- ルートの `index.html`：`<title>`・OGP から「アルファ版」を外す
- ランキングの版の絞り込みの既定を「全バージョン」に（選んだ版があればそのまま）
- README：v1.3.0 の変更（UI の土台・設定・演出・はじめての案内）、遊び方に ⚙ と案内、テスト
- RELEASE_ROADMAP の「いまの状態」を v1.3.0 に

### 非目標

- service worker（オフラインで遊ぶ）。素材を raw URL から読むので、オフラインでは遊べない
- OGP 画像の作り直し（今の `og-image.png` を使う）

## 4. スコープ

| ファイル | 変更 |
|---|---|
| `prototype/js/main.js` | `APP_VERSION`、ランキングの既定の絞り込み |
| `prototype/index.html` | 版の表記、manifest・アイコンの `<link>` |
| `prototype/data/i18n/ui.json` | フッターの版 |
| `prototype/manifest.json`・`prototype/icons/`（新規） | manifest とアイコン（ロゴの派生。LICENSE の「MCH の素材を含む画像は対象外」に当たる） |
| `index.html`（ルート） | 「アルファ版」を外す |
| `README.md`・`docs/roadmap/RELEASE_ROADMAP.md` | v1.3.0 |

## 5. 受け入れ基準

- [ ] 版の表記（`APP_VERSION`・title・OGP・タイトル画面・フッター ja/en）がすべて 1.3.0
- [ ] `manifest.json` とアイコン 4 枚が 200 で読め、`<link rel="manifest">`・`apple-touch-icon` がある
- [ ] ルートの `index.html` に「アルファ版」がない
- [ ] ランキングを開くと「全バージョン」が選ばれている
- [ ] `node --test tests/*.test.mjs` が通る

## 6. テスト

- 手動（Playwright）：版の表記、manifest とアイコン、ランキングの既定値
- `node --test tests/*.test.mjs`

## 7. Human-in-the-loop

- 公開（`main` へのマージで Cloudflare に自動公開）は作者の依頼（#127）の範囲
- アイコンはリポジトリにあるロゴの派生で、mycryptoheroes の素材を新しくコミットしない

## 8. 改訂履歴

| 日付 | 版 | 変更内容 |
|---|---|---|
| 2026-10-16 | 1.0 | 初版 |
