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
| 4a | データ schema 追加 | P0 | ✅ **完了** | 4c で migration script を --apply 実行、cards.js が新 schema に |
| 4b | `resolveCaster` / `canPlayCard` + グレーアウト | P0 | ✅ **完了** | caster.js を main.js にインポート、playCard で canPlayCard 検証、ハンド render に `card-unplayable-badge` (`⚡不足` / `👤不在`) を表示 |
| 4c | 全 577 カードに `caster` + `effects` 付与 | P0 | ✅ **完了** | 569 件 (98.6%) 自動 + 9 件手動修正 (cd205/cd206/cdH04/cd107/cd104/ext2003/ext1023/ext1022/ext1012)。残り TODO ゼロ |
| 4d | `play(s, ctx)` 化 + caster 個別 stats 反映 | P0 | ✅ **完了** | swap 方式: `loadCasterStatsToLegacy` で caster の phy/int/agi/hp を legacy に load → card.play() 実行 → `syncLegacyStatsToCaster` で書き戻し。card.play() 本体は無変更 (=ctx は将来用に予約)。caster=A の攻撃カードは A の PHY で計算、self-buff も caster 個人に乗る |
| 4e | カード券面 UI 左30/右70 + キャスターアイコン + ロールラベル | P0 | ✅ **完了** | バトル中ハンド render が effects 配列 + caster icon (hero portrait + ロール名) を使用。target-labels.js を init で load し CSS 変数注入。card-effect-row はターゲット pill (色付) 30% + 効果テキスト 70% のグリッド |
| 4f | per-hero state 化 + legacy 廃止 | P0 | ✅ **完了** (legacy 完全廃止は Phase 4g) | guard/shield/poison/bleed/vulnerable を heroes[i] 個別に。swap 拡張、damage 吸収を target hero 経由、毒 tick・guard reset を per-hero、敵攻撃の状態異常付与を target hero 個別に。Status badges UI もサブ portrait に展開 |
| 4g | Phase 3j 撤去 | P0 | ✅ **完了** | setActiveHero / getActiveHero / ensureActiveHeroAlive / loadActiveHeroStatsToLegacy / syncLegacyStatsToActiveHero / activeHeroIdx を全削除。portrait click handler + ▶ ACTIVE バッジ + hover lift CSS も撤去。getActiveHero 利用箇所は transient な `combat._currentCaster` (playCard スコープ) に置換 |
| 4h | バトル外カード券面 effects ベース統一 + caster ロール表示 | P1 | ✅ **完了** | buildRewardPickButton (リワード/デッキ/ショップ/クラフト共通) と showOwnedDeckPeek を effects 配列 + caster ロールラベル ベースに更新。バトル外は具体ヒーロー portrait は出さず「先頭」「前衛」等のロール pill のみ表示 |
| 4i | 945 カード手動 caster 再指定 | P2 | **デモ完了 (5 ペア)** | ext9001-9005 を新設して 5 種の caster ロール (front/highest_int/highest_phy/back/highest_hp) をデモ。chapter 1 cardPool に組み込み。受け入れ基準「5 対以上の差別化ペア」達成 |
| 4j | パッシブ trigger DSL 統合 (codemod) | P0 | **runtime 完成、codemod 出力待ち** | passive-runtime.js + 12 種 effect handler + 5 件サンプル変換完了。content 担当の codemod 出力 (210 関数 → PassiveDef) を待って既存 hardcoded 関数を全削除 |

### 完了済みフェーズの動作確認済み事項 (Phase 4a-4d)

- 全 577 カードに `caster: "foremost"` + `effects: [{target, text}]` フィールドが付与されている (idempotent: re-run しても変化なし)
- 旧 `effectSummaryLines` / `previewLines` / `play(s)` は無変更で従来通り動作 (Phase 4f で段階廃止)
- `canPlayCard(card, combat)` がコスト不足 + キャスター不在の両方を判定
- ハンド表示で原因バッジ (`⚡不足` / `👤不在`) が右上に出る
- 現状 caster は全て `"foremost"` (デフォルト)、解決は `foremostAlive(combat.heroes)` → 前衛が生存している限り全カードプレイ可能
- **Phase 4d**: card.play() は依然として `combat.player*` を読み書きするが、playCard 側で **caster の stats を毎回 swap** しているため、caster=A のカードは A の PHY/INT/AGI/HP で計算され、self バフ (`s.playerPhy += 5` 等) も A 個人に書き戻される
- **使用ヒーロー明示ログ** (party 2+ 体時のみ): `【〇〇】が【△△】を使用` を clog に出力 (SPEC-006 §16 Q4 確定)
- **`activeHeroIdx` を caster に同期**: Phase 3j の `▶ ACTIVE` バッジが caster 追従 (UX 整合)

### Phase 4d の制約 / 既知事項

- `combat.playerGuard` / `playerShield` / `playerPoison` / `playerBleed` は **legacy shared 据え置き** (Phase 4f で per-hero 化予定)。現状はどの caster がカードを使ってもガード/シールドは "プレイヤー陣営共通プール" として動作 (前衛の portrait に紐付く)
- Phase 3j の `setActiveHero` (portrait click 切替) はそのまま残るが、playCard が caster を上書きするため事実上無効。Phase 4g で完全削除予定

### Phase 4e の動作確認済み事項

- バトル中の手札カード右下に **caster ヒーローの portrait + ロール名** (`先頭`/`前衛`/`高PHY` 等) が表示される
- 効果エリアが「**対象 pill (30%) + 効果テキスト (70%)**」のグリッド構成に
- 対象 pill の色は target-labels.js から (味方=緑 / 敵=赤 / 全=黒 / 自身=緑)
- `app init` 時に `loadTargetLabels()` → `applyCssVariables()` で CSS 変数 :root に注入。fetch 失敗時は HTML 側の fallback CSS 変数を使用
- effects 配列が空のカード (将来発生し得る) は旧 effectSummaryLines にフォールバック

### Phase 4f の動作確認済み事項

- `combat.heroes[i].guard / shield / poison / bleed / vulnerable` が個別 state の source-of-truth
- `loadCasterStatsToLegacy` / `syncLegacyStatsToCaster` が上記フィールドも load/sync
- `applyHeroPassiveOnCombatStart` / `applyHeroPassiveOnCardUse` を passiveHero swap でラップ → パッシブ書き込み (`s.playerGuard += 6` 等) が LEADER 個人に反映
- 敵攻撃時:
  - ガード吸収は **target hero 個別** の `applyGuardToDamage(targetUnit, raw)` を使用
  - シールド吸収は **target hero 個別** の `applyDamageThroughShield(s, targetUnit, raw)`
  - 出血ダメ加算は **target.bleed** を読む
- 状態異常付与 (敵 attackPoison / attackBleed / レギュレーション bleed / サブ敵 attackPoison/Bleed) は **target hero 個別** に `addStatusToHero(s, hero, kind, stacks)` で付与
- `startPlayerTurn` 開始時:
  - 全ヒーローの `guard` を per-hero リセット
  - 全ヒーローの `poison` を個別に tick (各ヒーロー portrait に FX)
- Status badges UI もサブヒーロー portrait wrap 内に動的注入 (`☠N` / `🩸N`)
- `combat.playerGuard / Shield / Poison / Bleed / Vulnerable` は `heroes[0]` の mirror として残る (UI compatibility のため当面維持、別途 PR でも完全廃止可能)

### Phase 4g の動作確認済み事項

- 味方 portrait click → 何も起きない (handler 削除)
- ▶ ACTIVE バッジ非表示 (CSS + render code 撤去)
- hover lift エフェクト撤去
- `combat.activeHeroIdx` フィールドは初期化も参照もされない
- player attack 時 `lungePortrait("player", ...)` は `combat._currentCaster ?? heroes[0]` を使用 (transient ref。playCard で set/clear)
- Phase 3j 関連 helper 関数 5 件 (setActiveHero / getActiveHero / ensureActiveHeroAlive / loadActiveHeroStatsToLegacy / syncLegacyStatsToActiveHero) はソースから完全削除

### Phase 4h の動作確認済み事項

- **buildRewardPickButton** (リワード / デッキ一覧 / ショップ / クラフト で共有) が effects 配列ベースで描画
- caster ロール pill (「先頭」「前衛」「高PHY」等) が card-caster-display--rolelabel として表示 (バトル中の hero portrait の代わり)
- 効果テキストは effects[].text を simplifyEffectText で整形、effects 未定義時は旧 effectSummaryLines にフォールバック
- showOwnedDeckPeek (タップ tooltip) も「使い手: 先頭」のロール表記を opc-meta に追加
- reward-card-inner 用 CSS で effect-row のフォントサイズを container query で大きめに調整 (バトル中より見やすく)

### Phase 4j の進捗 (runtime 完成、codemod 出力待ち)

- **passive-runtime.js** 新設:
  - `registerPassives(defs)` / `registerEffectHandlers(handlers)` で外部注入
  - `applyPassiveTrigger(s, kind, ctx)` で trigger 別 dispatch
  - `applyPassiveEffect(s, caster, effect)` で effect ごとの dispatch
  - `checkPassiveThresholds(s, hero)` で HP/statRatio 閾値ベース判定
  - oncePerCombat 管理 (hero.passiveTriggered Set)、triggerRate (確率発動)
- **12 種 effect handler 実装** (PASSIVE_EFFECT_HANDLERS in main.js):
  damage / damageRaw / damageMaxHpPct / heal / healRaw / applyStatus /
  buffStat / addGuard / addShield / addEnergy / drawCards / revive / clearStatus + showCutin
- **passives-sample.js** 新設: 5 件手動変換 (kaihime / zhang / doyle / seton / schubert)
  → 復活系 schubert は §18.6.3 case A (hasResurrection 廃止) で revive action を直接実行
- **既存 hook 点に applyPassiveTrigger 設置**:
  - startCombatFromMapNode 末尾: `combat.started`
  - playCard 末尾: `self.cardPlayed` (caster 一致のみ発動)
  - dealPhy/IntSkillFromEnemyToPlayer 末尾: `self.tookDamage` (target=被弾ヒーロー)
  - applyHpDeltaToHero 内 alive=false 化直後: `self.died` (§18.6.1 同期実行)
  - applyHpDeltaToHero 内 HP 減少時: `checkPassiveThresholds` で self.hpBelow / party.hpBelow / enemy.hpBelow / self.statRatioAbove を判定
- **既存 hardcoded apply\*Passive 関数群は維持** (PASSIVES 出力到着までの保険)
  → Phase 4j 完了時に codemod 出力で全 210 関数を一括削除予定

### Phase 4j 残作業 (content 担当依頼中: HANDOFF-PHASE4J-KICKOFF.md)
- 依頼 1: 210 関数 → PassiveDef 変換 codemod スクリプト + 出力 (passives-generated.js)
- 依頼 2: caster × trigger 対応表 (Epic / Legendary)
- 依頼 3: triggerRate 元 DB 値抽出

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
