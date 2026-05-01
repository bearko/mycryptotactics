# SPEC-006 Phase 4 進行状況

| 項目 | 値 |
|------|-----|
| ID | SPEC-006-PHASE4-STATUS |
| 状態 | Draft (随時更新) |
| 最終更新 | 2026-05-02 |
| 作業ブランチ | `feat/spec-006-phase4-prep` (このブランチ) |

[SPEC-006](./SPEC-006-card-caster.md) の Phase 4 実装トラッカー。

## サブフェーズ進捗

| Phase | 内容 | 優先度 | 状態 | 備考 |
|-------|------|--------|------|------|
| 4a | データ schema 追加 | P0 | 進行中 | カード schema 拡張は migration script 経由で 4c と同時に実施 |
| 4b | `resolveCaster` / `canPlayCard` + グレーアウト | P0 | **モジュール完成** | `prototype/js/caster.js` 作成済み。main.js への組み込みは未 |
| 4c | 全 392 カードに `caster` + `effects` 付与 | P0 | **スクリプト完成** | `prototype/tools/migrate-cards-to-spec006.js` で 98% 自動化 (未マッチ 8 件のみ) |
| 4d | `play(s, ctx)` 化 + battleApi caster 引数化 | P0 | 未着手 | content PR #50/#52 マージ後に着手 |
| 4e | カード券面 UI 左30/右70 + キャスターアイコン + ロールラベル | P0 | **基盤完成** | `target-labels.js` loader + CSS 変数 4 種を準備済み。実 UI 描画は未 |
| 4f | per-hero state 化 + legacy 廃止 | P0 | 未着手 | 大規模、最後に着手 |
| 4g | Phase 3j 撤去 | P0 | 未着手 | 4f 完了後 |
| 4h | バトル外カード券面係数表記 + 使用ヒーローログ | P1 | 未着手 | 4e 完了後 |
| 4i | 924 カード手動 caster 再指定 | P2 | 未着手 | content PR 全マージ後 |
| 4j | パッシブ trigger DSL 統合 (codemod) | P0 | 未着手 | content PR #50/#52 マージ後 |

## 完了した事前準備物 (このブランチ)

### 1. migration script — `prototype/tools/migrate-cards-to-spec006.js`

cards.js を解析して各カードに `caster: "foremost"` と `effects: [...]` を自動挿入するスクリプト。

**実行**:
```bash
# プレビュー (cards.spec006-preview.js を出力、cards.js は触らない)
powershell -ExecutionPolicy Bypass -File prototype/tools/migrate-cards.ps1

# in-place 適用
powershell -ExecutionPolicy Bypass -File prototype/tools/migrate-cards.ps1 -Apply
```

**現在の自動カバレッジ (cards.js 392 カードに対し)**:
- caster 自動付与: 392/392 (100%)
- effects 自動導出: 384/392 (98%)
- 手動レビュー必要: 8 件
  - cd205, cdH04, cd107, cd104, ext2003, ext1023, ext1022, ext1012

対応パターン (auto-derive):
- `api.dealPhySkillToEnemy(s, lo, hi)` → PHYダメ
- `api.dealIntSkillToEnemy(s, lo, hi)` / `dealIntSkillToEnemyCrit` → INTダメ
- `api.healPlayerFromIntSkill` → HP回復
- `api.addPoisonToEnemy` / `addBleedToEnemy` → 状態異常
- `api.addPlayerShield` / `setDamageReducedThisTurn` / `clearPlayerDebuffs`
- `api.drawCards`
- `s.player{Phy/Int/Agi/Guard/Shield} += N` → ステ加算
- `s.enemy{Phy/Int/Agi} = Math.max(1, ... - N)` 形式 → 敵ステ減
- `s.bonusEnergyNext` / `s.hasResurrection` / `s.phyPenaltyNext`

**Japanese-path 回避**: 既存 sync.ps1 と同じ TEMP コピー方式 (`migrate-cards.ps1` ラッパ)。

**preview.js は .gitignore 済み** (一時生成物のため commit しない)。

### 2. resolveCaster / canPlayCard モジュール — `prototype/js/caster.js`

純粋関数で SPEC-006 §5 のキャスターロール 8 種を解決。`unplayableReason` / `unplayableBadge` も提供 (Phase 4b のグレーアウト原因表示)。

**API**:
```js
import { resolveCaster, canPlayCard, unplayableBadge, CASTER_ROLE_LABELS } from "./caster.js";

resolveCaster("foremost", combat);          // → HeroUnit | null
canPlayCard(card, combat);                  // → boolean
unplayableBadge(card, combat);              // → {badge, title} | null
CASTER_ROLE_LABELS["highest_phy"];          // → "高PHY"
```

main.js 側で:
- `playCard(idx)` の冒頭で `if (!canPlayCard(combat.hand[idx], combat)) return;`
- `renderCombat()` の hand render ループで `unplayableBadge(card, combat)` を描画

### 3. target-labels.js loader — `prototype/js/target-labels.js`

`prototype/data/target-labels.json` を fetch → キャッシュ → ルックアップ。CSS 変数の `:root` 注入も担当。

**API**:
```js
import { loadTargetLabels, targetLabelText, targetColorVar, applyCssVariables } from "./target-labels.js";

await loadTargetLabels();      // アプリ初期化時 1 回
applyCssVariables();           // _meta.css_variables を :root に注入

targetLabelText("enemy.foremost");  // → "敵先頭"
targetColorVar("self");             // → "--target-self"
```

main.js 側で:
- アプリ初期化 (`init()`) に `loadTargetLabels()` を組み込む
- カード券面 render で `targetLabelText(effect.target)` を呼ぶ

### 4. CSS 変数 4 種 — `prototype/index.html` `:root`

```css
--target-ally: #7ed957;
--target-enemy: #e76060;
--target-all: #c47ed9;
--target-self: #5ab4c4;
```

target-labels.json の `_meta.css_variables` と一致。runtime で `applyCssVariables()` が上書きする想定だが、JSON ロード前のフォールバックとして HTML 側にもハードコード。

## 残作業 (content PR マージ待ち)

### content 側のマージ完了が必要なもの
- **PR #53 (Rare 185 ext)**: cards.js が +185 カードに膨らむ → migration script を再実行
- **PR #50 (Common 7 hero)** + **PR #52 (Uncommon 53 hero)**: 新規パッシブ関数群が main.js に追加される → SPEC-006 §18 の trigger DSL に変換 (Phase 4j)

### 4d / 4e / 4f / 4g / 4h を実行する順序

1. **PR #53 マージ通知**を待つ
2. cards.js 全 577 カード (392 + 185) に対して migration script を **`-Apply`** モードで実行 → cards.js が新 schema に
3. `playCard` を `play(s, ctx)` 経由に変更し、`battleApi` を caster 引数受け取り型にリファクタ (Phase 4d)
4. `renderCombat` のカード描画を新 schema (`effects` 配列 + caster 解決) で書き直し (Phase 4e)
5. per-hero state 化 (Phase 4f) — 既存の deal\* 関数を `combat.heroes[i]` 直接参照に
6. Phase 3j 撤去 (Phase 4g)
7. バトル外 UI 係数表記 + clog ログ (Phase 4h)

### 4j (passive trigger DSL) は最後

content PR #50/#52 マージ後に着手。SPEC-006 §18 の `applyPassiveTrigger(s, kind, ctx)` を実装し、PR #50/#52 が定義した手書きパッシブ関数群を `PassiveDef` 宣言に codemod 変換 (gen-uncommon-heroes.js のテンプレート更新も含む)。

## マイルストーン目安

| 日付 | 想定状態 |
|------|--------|
| 2026-05-02 (今日) | 事前準備 完了 (本ファイル) |
| PR #53 マージ後 | Phase 4c (in-place migration) 実行 → Phase 4d 着手 |
| Phase 4d-4f 完了 | バトル系の数値ロジックが新 schema 上で動く |
| Phase 4e-4h 完了 | UI が新仕様を表示 |
| PR #50/#52 マージ後 | Phase 4j 着手 |
| Phase 4 全完 | β v1.x として SPEC-006 受け入れ基準 §15 を全達成 |

## 関連文書

- [SPEC-006-card-caster.md](./SPEC-006-card-caster.md) — 親仕様
- [SPEC-005-party-3v3.md](./SPEC-005-party-3v3.md) — 3v3 基盤
- HANDOFF: `C:/Users/beark/mct-extensions/MERGE-NOTIFICATION-PR48.md`
- HANDOFF: `C:/Users/beark/mct-extensions/PASSIVE-TRIGGERS-PR50-PR52.md`
