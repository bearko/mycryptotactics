# SPEC-016: bearko.games 共通のアイコンへの入口（設定の行）

| 項目 | 値 |
|------|-----|
| ID | SPEC-016 |
| 状態 | Accepted |
| 作成日 | 2026-10-17 |
| 最終更新 | 2026-10-17 |
| 作者 | Claude Code（作者 bearko の依頼） |
| レビュア | bearko |
| 関連 | 共通基盤 SPEC-005（チャット 2.0。選ぶ窓は SDK 1.7.0）・SPEC-008（共通基盤への窓口）・SPEC-012（設定） |

## 1. 概要

bearko.games のプレイヤーアイコン（チャットに出る絵）は全タイトルで共通になった（共通基盤 SPEC-005 5.3）。
設定に行「🙂 アイコン」を足し、押すと SDK の選ぶ窓が開く。窓の中に「bearko.games 全体のアイコンが変わります」と出る。

## 2. 背景と動機

作者の依頼（2026-10-17）：プレイヤーアイコンは bearko.games 全体で共通にし、ポータルでも各タイトルのマイページでも変えられる（他のゲームにも効くことを伝える）。

## 3. 仕様

- 設定（`#settingsOverlay`）の言語の行の上に「🙂 アイコン — bearko.games 全体（すべてのゲームとチャット）で同じ絵になる — 変える」
- SDK が読めていない・古い（`openAvatarPicker` が無い）ときは行ごと出さない（`platform.canPickAvatar`）。例外も出さない（SPEC-008 の作法）
- 絵の一覧・保存は SDK と共通基盤が持つ。このゲームは何も持たない（localStorage にも入れない。PROJECT_CHARTER 3.1）
- 文言は `prototype/data/i18n/ui.json`（JP / EN）

## 4. テスト

- `node --test tests/*.test.mjs`：`canPickAvatar` / `openAvatarPicker` が SDK の有無・新旧で例外を出さない
- 手で：設定を開いて「変える」→ 窓が出て、選ぶとチャットの発言に絵が付く
