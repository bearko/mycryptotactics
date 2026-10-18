# SPEC-018: 版権キャラクター（猿田彦）を表示しない

| 項目 | 値 |
|------|-----|
| ID | SPEC-018 |
| 状態 | Accepted |
| 作成日 | 2026-10-18 |
| 作者 | Claude Code（作者 bearko の依頼） |
| 関連 | bearko/mycryptoheroes #16（素材 DB から削除済み）、MyCryptoWorkshop #15、mycryptofactory SPEC-014 |

## 1. 背景

作者の依頼（2026-10-18）：猿田彦（ヒーロー 2035、レプリカ 12035）とエネミーのゴースト・猿田彦（715・745）は第三者の版権キャラクター（コラボのヒーロー。MCH の属性は TEZUKA）なので、bearko.games のどのタイトルにも出さない。素材 DB（bearko/mycryptoheroes）からは画像と記録が消えているので、本作のデータに残っていると、名前だけ出て画像が空のヒーローになる。

## 2. 仕様

- `prototype/data/heroes.json` から 2035 を、`prototype/data/i18n/heroes-en.json` から 2035・12035 を、`prototype/data/i18n/enemies-en.json` から 715・745 を消す
- パッシブ「西暦3344年」（`passives-generated.js` の `sarutahiko`、`main.js` の `applySarutahikoPassive`）を消す。生成スクリプト（`tools/gen-uncommon-heroes.js`）の対応表からも外す
- `prototype/js/heroes.js` の `EXCLUDED_HERO_IDS`：`heroes.json` に戻っても読み込まない
- 本作は戦闘の途中経過を保存しないので（PROJECT_CHARTER 3.1）、前のセーブの扱いは要らない
- **GAS のスプレッドシート（`tools/gas-sheet-sync`）に 2035 の行が残っていると、Push で `heroes.json` に戻る。作者がシートから行を消す**（戻った場合はテストで CI が落ちる）

## 3. テスト

- `tests/excluded-heroes.test.mjs`：データ・英名の表・パッシブの表に残っていない
