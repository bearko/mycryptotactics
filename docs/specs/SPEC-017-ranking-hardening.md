# SPEC-017: ランキングの表示を固くする（セキュリティの見直し）

| 項目 | 値 |
|------|-----|
| ID | SPEC-017 |
| 状態 | Accepted |
| 作成日 | 2026-10-18 |
| 作者 | Claude Code（作者 bearko の依頼） |
| 関連 | SPEC-007（ランキング） |

## 1. 背景

作者の依頼（2026-10-18）でセキュリティを見直した（low）。ランキングの画面は、GAS から来た `rank`・`score`・`turns`・`deckSize`・`llExt`・`absolute.*` をそのまま HTML に入れていた。いまの GAS は数に直して返すので悪用はできないが、GAS の実装が変わったり、送り先（`mct.rankingApiUrl`）を別のサーバーに変えたりすると、そこから HTML が入る。

## 2. 仕様

- `fetchRanking` が受け取った行を `normalizeEntry` で整える：数の欄は数に（数でなければ 0）、名前とレギュレーションは文字に、`absolute` は 4 つの数だけ
- GAS のサンプル（`docs/setup-google-apps-script.md`）：`= + - @` で始まる名前・レギュレーションは先頭に `'` を付けて保存する（シートの数式として動かさない）。**デプロイ済みの GAS は作者が手で反映する**
- CI（`.github/workflows/test.yml`）に `permissions: contents: read`（GITHUB_TOKEN に書き込みの権限を持たせない）

## 3. テスト

- `tests/ranking-client.test.mjs`：数の欄に HTML の文字が来ても 0 になる
