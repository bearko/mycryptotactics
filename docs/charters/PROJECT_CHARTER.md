# プロジェクト憲章（PROJECT CHARTER）

**mycryptotactics** — 歴史偉人を題材にした **ローグライク × デッキ構築**（仕様駆動で拡張するブラウザ向けプロトタイプ）。

## 1. 目的（Why）

- **ミッション**: 仕様（SPEC）を正として、プレイ可能なモックと将来の本実装を段階的に積み上げる。
- **成功の定義**: 合意された SPEC の受け入れ基準を満たす成果物が `main` にマージされ、デプロイ先で確認できる状態であること。

## 2. スコープ

### 含む（In scope）

- 静的 HTML モック（`mock/`）、企画・仕様ドキュメント（`docs/`）、Vercel 等でのホスティング。
- [bearko/mycryptoheroes](https://github.com/bearko/mycryptoheroes) 由来アセットの **参照**（利用条件は同リポジトリのライセンスに従う）。
- SPEC / 憲章に沿った機能追加・バグ修正。

### 含まない（Out of scope）

- 本番用バックエンド・課金・ブロックチェーン連携（SPEC で明示的に取り込むまで）。
- mycryptoheroes データのライセンスに反する利用（必ず人の判断で確認する → [HUMAN_IN_THE_LOOP.md](../process/HUMAN_IN_THE_LOOP.md)）。

## 3. ステークホルダー

| 役割 | 責任 |
|------|------|
| プロダクトオーナー / 意思決定者 | 優先度、SPEC 承認、受け入れの最終判断 |
| 開発 | 設計・実装・テスト証跡・PR |
| 外部素材 | mycryptoheroes 側の利用条件遵守 |

## 4. 制約と前提

- **文書の正**: チーム・エージェントは **リモートに push されたコミット** を正とする（[AGENTS.md](../../AGENTS.md)）。
- **技術**: 現状はビルドレスの静的サイト。スタック変更は SPEC で合意する。
- **法令・契約**: 実在人物の表現・配信プラットフォーム規約は SPEC / 企画書で都度確認する。

## 5. 用語と優先順位

- **憲章と仕様の関係**: 本憲章と [DEVELOPMENT_CHARTER.md](./DEVELOPMENT_CHARTER.md) はプロジェクト全体の枠である。個別機能の詳細は [SPEC-INDEX.md](../specs/SPEC-INDEX.md) の各 SPEC が優先するが、憲章と矛盾する SPEC は無効とみなし、憲章または SPEC を改定して整合を取る。
- **企画メモ**: [CHRONO_TACTICS_DESIGN.md](../CHRONO_TACTICS_DESIGN.md) は高レベルな製品メモ。実装の契約は SPEC に落とす。

## 6. 改定

- 改定提案は Pull Request で行う。
- **改定履歴**

| 日付 | 要約 |
|------|------|
| 2026-05-01 | mycryptotactics 向けに初版（テンプレートから派生） |

---

*バージョン: 1.0 | 最終更新: 2026-05-01*
