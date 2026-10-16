# 仕様インデックス（SPEC-INDEX）

全ての仕様文書の一覧。状態は [SPEC_DRIVEN_DEVELOPMENT.md](../process/SPEC_DRIVEN_DEVELOPMENT.md) のライフサイクルに従う。

## アクティブ

| ID | 題名 | 状態 | パス |
|----|------|------|------|
| SPEC-000 | 仕様テンプレート | Accepted（ひな形） | [SPEC-000-template.md](./SPEC-000-template.md) |
| SPEC-001 | ローグライク・デッキ観覧用モック | Accepted | [SPEC-001-roguelike-deck-mock.md](./SPEC-001-roguelike-deck-mock.md) |
| SPEC-002 | ブラウザプロトタイプ（MCH 式戦闘・UX・手札3列） | Accepted | [SPEC-002-prototype.md](./SPEC-002-prototype.md) |
| SPEC-003 | 一般公開リリース要件 | Accepted（実装済み・公開中） | [SPEC-003-public-release.md](./SPEC-003-public-release.md) |
| SPEC-004 | ステージコンテンツ（章 1〜5） | Accepted（実装済み） | [SPEC-004-stage-content.md](./SPEC-004-stage-content.md) |
| SPEC-005 | パーティ編成（3v3）+ ターゲット指定システム | Accepted（β v1 実装済み。残りは #44） | [SPEC-005-party-3v3.md](./SPEC-005-party-3v3.md) |
| SPEC-006 | カードキャスター（Phase 4 の進行状況のみ。本文のファイルはない） | 完了 | [SPEC-006-PHASE4-STATUS.md](./SPEC-006-PHASE4-STATUS.md) |
| SPEC-007 | ランキング機能 + Absolute レギュレーション | Accepted（実装済み） | [SPEC-007-ranking-and-absolute.md](./SPEC-007-ranking-and-absolute.md) |
| SPEC-008 | bearko.games 共通基盤との連携（トロフィー） | Accepted | [SPEC-008-platform-trophies.md](./SPEC-008-platform-trophies.md) |
| SPEC-009 | bearko.games 共通基盤との連携（総合スコア） | Accepted | [SPEC-009-platform-score.md](./SPEC-009-platform-score.md) |
| SPEC-010 | UI の土台（トークン・フォント・ボタン・モーダル・safe-area・reduced-motion） | Accepted | [SPEC-010-ui-foundation.md](./SPEC-010-ui-foundation.md) |
| SPEC-011 | 設定（BGM・SE の音量、演出を減らす、言語） | Accepted | [SPEC-011-settings.md](./SPEC-011-settings.md) |
| SPEC-012 | 演出（撃破・被弾・数字のカウントアップ・画面の切り替え） | Accepted | [SPEC-012-effects.md](./SPEC-012-effects.md) |

## レビュー中・草案

| ID | 題名 | 状態 | パス |
|----|------|------|------|
| SPEC-002.5 | プロトタイプ現況スナップショット（2026-05 時点の記録） | Draft | [SPEC-002.5-prototype-snapshot.md](./SPEC-002.5-prototype-snapshot.md) |

## 廃止（Deprecated）

| ID | 題名 | 置き換え | パス |
|----|------|----------|------|
| — | — | — | — |

## 番号付与ルール

- `SPEC-<連番>-<短い題名>.md` とする。INDEX と実ファイルを常に同期させる。

## 関連文書

- ロードマップ：[RELEASE_ROADMAP.md](../roadmap/RELEASE_ROADMAP.md)（v1.x の仕上げは #127）
- 製品メモ（非 SPEC）: [CHRONO_TACTICS_DESIGN.md](../CHRONO_TACTICS_DESIGN.md)
- [SPEC_DRIVEN_DEVELOPMENT.md](../process/SPEC_DRIVEN_DEVELOPMENT.md)
- [GIT_WORKFLOW.md](../process/GIT_WORKFLOW.md)
