# SPEC-005: パーティ編成（3v3）+ ターゲット指定システム

| 項目 | 値 |
|------|-----|
| ID | SPEC-005 |
| 状態 | Draft |
| 作成日 | 2026-05-01 |
| 最終更新 | 2026-05-01 |
| 作者 | bearko + Claude Code |
| 想定リリース | β版（3 日後目標） |

## 1. 概要

α版までは 1 ヒーロー対 1 エネミーの 1v1 戦闘だったが、β版では **最大 3 ヒーロー対最大 3 エネミー** のパーティ戦に拡張する。

これに伴い、各エクステンション（カード）に **「誰が誰に効果を与えるか」のターゲット指定** を導入する。元の MyCryptoHeroes の各エクステの効果説明に準拠する語彙を用いる。

## 2. 背景と動機

- α版で実装した「node 間でのデッキ持ち越し」「レギュレーション」によりやり込み深度は増したが、戦術の幅は依然として 1v1 → カード選択のみに留まっている
- MCH 原作のような **パーティ構築 × シナジー × ターゲット選択** が β の目玉
- ヒーローパッシブが 3 体構成で **シナジー**（例: 1 体目のパッシブで全体デバフ → 2 体目が「デバフ中の敵にダメージ +X」）を生む設計余地が広がる
- 敵側にも **パッシブ** を付けて難易度の天井を上げる

## 3. 目標と非目標

### 目標（Goals）

- 自軍 1〜3 ヒーローのパーティ編成画面を新設し、戦闘で同時運用
- 章ごとに 1〜3 体のエネミーを配置可能とし、敵側もパーティ単位で意図表示・行動
- カードの効果に **ターゲット指定**（前衛/中衛/後衛/先頭/最後尾/全体/ランダム/最 PHY 高低 等）を導入
- カード上の旧「先頭」テキスト表示を、**そのカードの実ターゲット指定** を表す視覚要素に置換
- 既存エクステの効果定義を MCH 公式データに準拠する形で再整理（最低限既存全カードに target を付与）
- ヒーローパッシブをシナジー前提に再設計可能にする
- 敵にもパッシブを 1〜2 種付与（β v1 では 2〜3 ボスのみで OK）

### 非目標（Non-goals）

- ヒーロー編成のドラッグ&ドロップ並び替え（v1 はリスト + ボタンで OK）
- ヒーロー召喚・蘇生・退場時のドラマ演出（v2 以降）
- マルチプレイヤー / オンライン対戦（β は単独プレイ継続）
- シミュレータ（`prototype/sim/`）の 3v3 完全対応（β1 は単純化、または 1v1 のままでメトリクスを取らない）

## 4. スコープ

### 含む

- 戦闘エンジンの `combat.heroes` / `combat.enemies` を配列化
- ターゲット解決アルゴリズム
- カード `play()` への解決済みターゲット渡し
- パーティ編成画面（ヒーロー選択画面の発展形）
- 戦闘 UI 3v3 レイアウト
- 敵 AI の対象選択
- 既存エクステへの target 一括付与（自動移行 + 手動補正）
- ヒーロー / エネミーのパッシブシステム拡張

### 含まない

- 過去レギュレーションの再バランス（β1 は β 用に専用バランスから始める）
- 全エクステの効果再設計（既存効果を維持しつつ target だけ付与する移行を許容）
- セーブ / ロード機能（依然リロードでリセット）

## 5. 用語

| 用語 | 意味 |
|------|------|
| **ユニット (unit)** | 戦闘中の 1 体（ヒーローまたはエネミー） |
| **パーティ (party)** | 同陣営のユニット配列（最大 3）。`heroes[3]` / `enemies[3]` |
| **ポジション** | ユニット配置位置（前衛 / 中衛 / 後衛）。**画面中央に近い側を「前衛」**とする |
| **キャスター (caster)** | カードを使うヒーロー（プレイヤーが選択） |
| **ターゲット (target)** | カード効果が適用される対象ユニット |
| **ターゲット仕様 (TargetSpec)** | カード定義に書く「どんな対象を選ぶか」の宣言 |

## 6. ターゲット仕様の語彙

カード定義に書く `target` フィールドの値（文字列定数）。

| 仕様 | 識別子 | 意味 |
|------|--------|------|
| 自分 | `self` | カードを使うキャスター自身 |
| 味方 前衛 / 中衛 / 後衛 | `ally.front` / `ally.mid` / `ally.back` | 指定ポジションの味方（死亡時は `null` → 効果なし） |
| 敵 前衛 / 中衛 / 後衛 | `enemy.front` / `enemy.mid` / `enemy.back` | 同上 |
| 先頭 (敵 / 味方) | `enemy.foremost` / `ally.foremost` | 生存中で最も画面中央に近い 1 体 |
| 最後尾 (敵 / 味方) | `enemy.rearmost` / `ally.rearmost` | 生存中で最も外側の 1 体 |
| 全体 (敵 / 味方 / 全) | `enemy.all` / `ally.all` / `all` | 生存中の全ユニット |
| ランダム (敵 / 味方 / 全) | `enemy.random` / `ally.random` / `all.random` | 生存中からランダム 1 体 |
| 最も高い / 低い (PHY/INT/HP) | `enemy.highest_phy` ほか | 最大値 / 最小値を持つ 1 体 |

**「先頭」の解決ルール**: 前衛 → 中衛 → 後衛 の順で最初の生存ユニットを返す。「最後尾」は後衛 → 中衛 → 前衛。

## 7. データモデル

### 7.1 Unit 型（ヒーロー / エネミー共通）

```ts
type Unit = {
  side: 'hero' | 'enemy';
  position: 0 | 1 | 2;          // 0=前衛, 1=中衛, 2=後衛
  alive: boolean;
  // ステータス
  hp: number; hpMax: number;
  phy: number; int: number; agi: number;
  phyBase: number; intBase: number; agiBase: number;
  guard: number; shield: number;
  poison: number; bleed: number; vulnerable: number;
  // 識別
  defId: string;                // hero: heroId / enemy: enemyDefId
  name: string;
  imgId?: number;               // for ENEMY_IMG / HERO portrait
  // ヒーロー固有
  passiveKey?: string;
  passiveTriggered?: boolean;
  // エネミー固有
  intentRota?: Intent[];
  intentRotaIdx?: number;
  enemyIntent?: Intent;
  bossPhase?: number; bossDef?: any;
};
```

### 7.2 RunState の変更

```ts
runState = {
  chapterIdx, lastMapNodeId, pathNodeIds, runComplete,
  llExtSlots,
  // ▼ 変更
  party: HeroLoadout[],         // 配列。長さ 1〜3。各要素が選択ヒーロー＋HP状態
  // ヒーロー死亡時に runState のどれが死んでいるか保持
  // deck は party 全員で共有（v1 は共有方針、v2 で個別検討）
  deck: Card[],
  shopRemoveUsed?, unlockedRegulationOnClear?,
};

type HeroLoadout = {
  heroId: number;
  hpCurrent: number; hpMax: number;  // ノード間で持ち越し
};
```

### 7.3 Combat State

```ts
combat = {
  // ▼ 配列化（旧 playerXxx / enemyXxx を heroes[] / enemies[] へ）
  heroes: Unit[],     // length 1〜3
  enemies: Unit[],    // length 1〜3
  activeHeroIdx: number,    // カード使用時のキャスター（プレイヤーが切替）
  // 既存維持
  deck, drawPile, discardPile, exhaustPile, hand,
  energy, energyMax, bonusEnergyNext, phyPenaltyNext,
  damageReducedThisTurn,
  turn,
  isBoss, mapNodeId, isElite,
  // パッシブ管理は heroes[] / enemies[] の各 unit に持たせる
};
```

### 7.4 カード定義の拡張

```ts
ext1001: {
  libraryKey: 'ext1001',
  extId: 1001,
  extNameJa: 'ノービスブレード',
  skillNameJa: 'ノービススラッシュ',
  skillIcon: 'phy.png',
  cost: 1,
  type: 'atk',
  rarity: 'common',
  // ▼ 新規
  target: 'enemy.foremost',           // ターゲット仕様
  selfTarget?: 'self',                 // 自身に副次効果がある場合
  // 効果記述（カード上のサマリーに使う）
  // 既存 effectSummaryLines / previewLines は引き続き使用、
  // ただし「先頭」テキストはターゲット表示に置換
  effectSummaryLines(s, caster) { ... },
  previewLines(s, caster) { ... },
  // ▼ play は解決済みターゲット配列を受け取る
  play(s, ctx) {
    // ctx = { caster: Unit, primaryTargets: Unit[], selfTarget?: Unit, sides... }
    for (const t of ctx.primaryTargets) {
      api.dealPhySkillTo(s, ctx.caster, t, 65, 80);
    }
  },
}
```

複合効果（敵にダメ + 自分に PHY+）の場合は `target` (主) と `selfTarget` (副) を分ける。または `effects: [{...}]` 配列で完全宣言型に。後者のほうが将来的に柔軟だが β1 では前者で十分。

## 8. ターゲット解決アルゴリズム

```ts
function resolveTargets(spec, caster, combat) {
  const myParty = caster.side === 'hero' ? combat.heroes : combat.enemies;
  const enemyParty = caster.side === 'hero' ? combat.enemies : combat.heroes;

  switch (spec) {
    case 'self': return [caster];
    case 'ally.front': return [aliveAt(myParty, 0)].filter(Boolean);
    case 'ally.mid':   return [aliveAt(myParty, 1)].filter(Boolean);
    case 'ally.back':  return [aliveAt(myParty, 2)].filter(Boolean);
    case 'enemy.front': return [aliveAt(enemyParty, 0)].filter(Boolean);
    // ...
    case 'enemy.foremost': return [foremostAlive(enemyParty)].filter(Boolean);
    case 'enemy.rearmost': return [rearmostAlive(enemyParty)].filter(Boolean);
    case 'enemy.all': return enemyParty.filter(u => u.alive);
    case 'ally.all': return myParty.filter(u => u.alive);
    case 'all': return [...myParty, ...enemyParty].filter(u => u.alive);
    case 'enemy.random': return pickRandom(enemyParty.filter(u => u.alive));
    case 'enemy.highest_phy': return pickByMax(enemyParty.filter(u => u.alive), u => u.phy);
    case 'enemy.lowest_hp': return pickByMin(enemyParty.filter(u => u.alive), u => u.hp);
    // ...
  }
}

function aliveAt(party, pos) {
  return party.find(u => u.position === pos && u.alive);
}
function foremostAlive(party) {
  for (let p = 0; p < 3; p++) {
    const u = aliveAt(party, p);
    if (u) return u;
  }
  return null;
}
function rearmostAlive(party) {
  for (let p = 2; p >= 0; p--) {
    const u = aliveAt(party, p);
    if (u) return u;
  }
  return null;
}
```

ヒット 0 体（全員死亡 等）の場合は **効果スキップ**、エネルギーは消費する設計とする（プレイヤーへのフィードバックは「対象がいません」表示）。

## 9. 戦闘エンジンの変更

### 9.1 損傷適用ヘルパ

旧: `dealPhySkillFromEnemyToPlayer(combat, phyPct)`
新: `dealPhySkillFrom(caster, target, phyPct)` のように **caster, target 両方を引数に取る** 形へ統一。

### 9.2 ターン制御

- プレイヤーターン: 全ヒーロー共有のエネルギー (3) を使ってカードを切る。各カードのキャスターはプレイヤーが選択（v1 は **デフォルト = activeHeroIdx**、UI で切替可能）。
- 敵ターン: 各エネミーが順番に intent を実行。intent ごとに対象解決 → 効果適用。
- 状態異常（毒・出血）は各ユニットのターン開始時に処理。

### 9.3 プレイヤーキャスター切替 UI

カードを使う前に「どのヒーローが使うか」を選択する必要がある。
- v1 は **クリック方式**: ヒーローポートレートをタップ → activeHeroIdx 設定 → カードタップで使用
- v2 は ドラッグ&ドロップ
- 自動キャスター推定（カードの最適キャスターを推測）は v2 以降

## 10. UI / 表示

### 10.1 戦闘画面レイアウト

```
┌──────────────────────────────────────┐
│  [GUM] [LL] [Stage] [Reg] [⚙][?][📚] │
├────────────┬─────────────────────────┤
│ ヒーロー縦3 │  vs   │  エネミー縦3   │
│  [前]      │       │   [前]         │
│  [中]      │       │   [中]         │
│  [後]      │       │   [後]         │
├────────────┴─────────────────────────┤
│ ログ                                  │
│ ⚡3/3                          [End]  │
│ [card][card][card][card][card]       │
└──────────────────────────────────────┘
```

- ヒーロー / エネミー縦 3 段配置（モバイル縦持ち優先）
- アクティブキャスターはハイライト枠
- 死亡ユニットは半透明 + ✕ オーバーレイ
- ステータスバッジ（毒・出血・ガード）はユニット直上
- 敵 intent はユニット上にバルーン表示（既存のスタイル踏襲）

### 10.2 カード上のターゲット表示

旧: テキスト「先頭」バッジ
新: ターゲット仕様に応じた **小型アイコン / ヒーロー portrait**

| TargetSpec | 表示 |
|------------|------|
| `enemy.front/mid/back` | 該当エネミーの portrait（小） |
| `ally.front/mid/back` | 該当ヒーローの portrait（小） |
| `enemy.foremost` | 動的に変わる: 現在の先頭エネミーの portrait |
| `enemy.all` | 「全」バッジ + 敵側カラー |
| `ally.all` | 「全」バッジ + 味方側カラー |
| `all` | 「全」バッジ |
| `*.random` | 「?」バッジ + 該当陣営カラー |
| `enemy.highest_phy` 等 | 「PHY↑」「HP↓」等のミニアイコン |
| `self` | キャスター自身の portrait |

ユーザー添付画像 2 のように、**カード右下に円形ポートレート** で配置。ターゲット未確定（ランダム/動的）は陣営カラーの `?` チップ。

### 10.3 敵 Intent 表示

各エネミーの上に「→ 敵: 前衛 PHY 12」のバルーン。MCH 原作風の小型アイコン + 値で。

## 11. 敵 AI（v1）

シンプルに開始:

- 攻撃系 intent (`attack` 等) → デフォルト `target: 'enemy.foremost'` に解決（敵から見ると hero.foremost）
- 全体攻撃系 → `enemy.all`
- ランダム選択 intent はカード定義側で `target: 'enemy.random'` を持つ
- バフ / 自己回復 → `self`
- 将来: 「最も HP の低いヒーロー狙い」「PHY が高い敵を優先」等のロジックを intentDef に持たせる

## 12. ヒーロー / エネミーパッシブの拡張

### 12.1 ヒーローパッシブ
既存の 3 種（甲斐姫・ドイル・張遼）は **個人発動型**。β1 では既存動作を維持しつつ、効果対象を 3v3 に拡張:

- 甲斐姫「浪切」: スキル使用後 50% で **先頭の敵に PHY 50% ダメ** ← `enemy.foremost` 解釈
- 張遼「遼来遼来」: 被ダメ後 50% で **先頭の敵に PHY 20% ダメ** ← 同上
- ドイル「シャーロック・ホームズ」: HP<70% で INT+3 ← self

新パッシブ案（β1 で 1〜2 種追加）:
- **「庇う」**: 味方が攻撃される → 自分が代わりに被弾 + ガード+5 自己付与
- **「奮起」**: 味方が倒れた瞬間に PHY+5（永続）

### 12.2 エネミーパッシブ
β v1 では **2〜3 種** を限定ボス / elite に付与:

- **「再生」**: ターン終了時 HP+5
- **「咆哮」**: 戦闘開始時に味方全体 PHY+3
- **「断末魔」**: 死亡時に hero 全体に出血 +1

`enemyDef.passiveKey` と `enemyDef.passiveDesc` を追加し、戦闘時にトリガー判定。

## 13. マイグレーション計画

### Phase 0: 設計 + 足場（β-day 0）
- 本 SPEC レビュー
- branch `feat/beta-party-3v3` 作成（済）
- 既存コードへの影響範囲洗い出し

### Phase 1: ターゲット仕様の付与（β-day 1）
- 全 ext1xxx / ext2xxx / cdXxx に `target` を一括付与（既存挙動 = `enemy.foremost`）
- `target` フィールドは付くが、戦闘ロジックはまだ 1v1（旧 `playerHp / enemyHp` 構造のまま）
- カード上の「先頭」テキストを `target` 指定に応じた表示に置換（**この段階で UI 改善のみリリース可能**）

### Phase 2: データモデル配列化（β-day 1〜2）
- `combat.heroes / combat.enemies` を配列化
- 旧 `playerHp` 等を `combat.heroes[0].hp` への shim でつないで段階移行
- 既存 1v1 戦闘が新構造で動くことを確認

### Phase 3: 3v3 戦闘 + UI（β-day 2）
- パーティ編成画面
- 3v3 戦闘画面レイアウト
- アクティブキャスター切替
- 敵 AI 簡易実装（先頭ヒーロー優先 / 全体攻撃のみ全員）
- ターゲット解決アルゴリズム適用

### Phase 4: 敵パッシブ + 既存ヒーローパッシブ拡張（β-day 3）
- 既存 3 ヒーローのパッシブを 3v3 解釈に対応
- 2〜3 ボス / elite に passive 付与
- balance pass（β 用に新規）

### Phase 5: シミュレータ更新（post-β）
- v1 リリース時点では sim は 1v1 のまま、計測精度を諦める
- β 安定化後に 3v3 sim を別 Issue で対応

## 14. 影響範囲（既存コード）

| ファイル | 変更レベル | 内容 |
|----------|-----------|------|
| `prototype/js/main.js` | **大** | combat / runState の配列化、UI レンダリング、キャスター切替 |
| `prototype/js/cards.js` | **大** | 全カードに target 付与、play(s) → play(s, ctx) シグネチャ変更 |
| `prototype/js/battle-mch.js` | 小 | ダメージ計算自体は維持。ヘルパで caster/target を引数に |
| `prototype/js/enemies.js` / `bosses.js` | 中 | 各 enemyDef に passive を追加可能に |
| `prototype/js/constants.js` / `heroes.js` | 中 | hero passive メタ拡張 |
| `prototype/js/regulations.js` | 小 | β 専用係数を追加検討 |
| `prototype/index.html` | **大** | 戦闘画面 3 段レイアウト、パーティ編成画面、カードターゲット表示 CSS |
| `prototype/sim/*` | 後回し | β v1 では更新せず、別 Issue |
| `prototype/data/*.json` + `tools/sync_csv_json.js` | 中 | enemyDef.passive、ext.target を CSV 同期に追加 |

## 15. リスクと軽減策

| # | リスク | 影響 | 軽減策 |
|---|--------|------|--------|
| R1 | 3 日で 3v3 完全実装はタイトすぎる | スケジュール超過 | Phase 1 (target 表示) と Phase 2 (配列化) で **段階的にリリース可能** にする。3v3 が間に合わなくても α 改良としてリリース可 |
| R2 | バランスが完全に崩れる | プレイ感悪化 | β 専用レギュレーション「β-Common」を設けて Common とは独立に balance |
| R3 | カード一括移行で既存挙動が壊れる | リグレッション | Phase 1 で **target を加えるだけ・play() は不変** に保つ。挙動変化は意図的な箇所のみ |
| R4 | AI の対象選択がプレイヤーに不利 | 体験悪化 | v1 は単純に「ヒーロー先頭優先」、ランダム要素を抑制 |
| R5 | sim が 1v1 のまま β を出すとデータ駆動 balance ができない | 開発効率 | β v1 は手動 balance、sim 対応は v1.1 |
| R6 | UI が混雑（3v3 + ステータスバッジ + intent + ターゲット表示）| 視認性悪化 | レイアウトをモバイル縦持ち優先で設計、PC は横持ち最適化を後回し |
| R7 | 既存セーブ（無いが localStorage 上のレギュレーション解放状態）が破綻 | ユーザー混乱 | 解放状態キーは **β 専用キー** を新設（`mct.unlockedRegulations.beta`） |

## 16. 受け入れ基準

### β v1（最小ライン、3 日後）
- [ ] 全エクステに `target` フィールドが付与されている
- [ ] カード表示の旧「先頭」テキストが target に応じた表示に変わる（α でも有効）
- [ ] パーティ編成画面で 1〜3 ヒーローを選択できる
- [ ] 戦闘で 3 ヒーロー × 3 エネミー（章による）が表示・行動する
- [ ] アクティブキャスター切替 + ターゲット解決が動く
- [ ] 既存の単体エネミー戦が新構造で破綻なく動く
- [ ] β 用レギュレーションで一通りクリア可能

### β v1.x（リリース後 1〜2 週）
- [ ] エネミーパッシブ 2 種以上が稼働
- [ ] 新ヒーローパッシブ 1 種追加（シナジー誘発型）
- [ ] sim 3v3 対応 → balance ループ再開

## 17. 未決事項（要ディスカッション）

- [ ] **デッキ共有 vs ヒーロー個別**: β1 は全員共有想定。MCH 原作的にはヒーロー固有エクステがある。どこまで再現するか？
- [ ] **エネルギー (⚡) の所有**: 共有 (3) でよいか、ヒーローごとに 1 ずつ持つか
- [ ] **ヒーロー死亡 → 復活**: 復活手段は β v1 で実装するか
- [ ] **編成変更**: ラン中にパーティを入れ替えられるか（ショップ等で）
- [ ] **ボス戦の party 構成**: β でもボスは 1 体のままか、フェーズ違いの 3 体か

これらは設計レビュー時に確定。

## 18. 関連

- 既存 SPEC: SPEC-002（戦闘 UX）, SPEC-003（公開要件）, SPEC-004（章コンテンツ）
- 参照: [bearko/mycryptoheroes Data/Extensions](https://github.com/bearko/mycryptoheroes/tree/main/Data/Extensions)
- branch: `feat/beta-party-3v3`
