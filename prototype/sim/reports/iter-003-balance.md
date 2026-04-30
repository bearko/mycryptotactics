# iter-003 Balance Adjustments

調整担当: game-balancer
基準: `prototype/sim/reports/iter-003-issues.json`

## サマリ
3 件変更（critical 2 + high 1）。前回イテレーションでゼロ効果だった単独レバー（en-e01.phy のみ / doyle baseInt のみ）を踏まえ、**変更幅を倍 〜 同時複数レバー** に拡大。

---

## Critical I1: ch3 二段壁（elite + boss 同時調整）
**狙い**: ch3 clear 3.5%→10% 帯。前回 elite 単独緩和（phy 22→19）はほぼ無効だったため、elite 全方位 + boss も同時に削る。

### `prototype/data/enemies.json` en-e01 ベーグル フラペチーノ
- `hp` 62 → **52** (-16%)
- `phy` 19 → **17** (-11%、前回 22→19 を踏まえ追加で下げた累積 23%)
- `intentRota[0].phyPct` 80 → **70** (二段攻撃の合計火力削減)
- `intentRota[2].pct` 18 → **16**
- `intentRota[3].buffSelf.phyAdd` 4 → **3**

### `prototype/data/bosses.json` boss-ch3 ゴースト・リンカーン
- `hp` 200 → **170** (-15%)
- `phy` 24 → **21** (-12.5%)
- `int` 20 → **17** (-15%)
- `initialShield` 30 → **24** (-20%)
- `phases[0]` (50%閾値前): `phyPct` 105→**95** / `intPct` 105→**95** / `special.pct` 20→**18** / buffSelf phy/int +5→**+4**
- phase2 (50%以下) は据え置き（最終局面の威圧感は維持）

期待: ch3 elite+boss 死亡 72%占有 → 50%帯へ、ch3 clear 3.5%→8〜12%。

---

## Critical I2: doyle ヒーロー大改修
**狙い**: doyle ch1 16%→40〜55%、zhang/kaihime との 6.25倍格差を 2倍以下へ。前回 baseInt 14→16 + ext1002 追加が無効だったため、stat と starter を**根本から再構築**。

### `prototype/sim/data.js` HEROES[1] (doyle) + `prototype/js/constants.js` HERO_ROSTER (両方手動同期済み)
- `hpMax` 60 → **72** (+20%、生存性確保 + 序盤の被ダメ余力)
- `baseInt` 16 → **19** (+19%、INT スケール火力底上げ)
- `starterDeck` を再構築:
  - 旧: `{ ext1003: 3, ext1008: 4, ext1002: 2, ext1004: 1 }` (10枚)
  - 新: `{ ext1003: 2, ext1008: 4, ext1002: 4 }` (10枚)
  - 変更点: ext1004 (PHY バフ、doyle に寄与薄) を完全削除。ext1002 (INT atk) を 2→**4** に倍増。ext1003 を 3→2、ext1008 (ガード) は維持。

注: passive 「シャーロック・ホームズ」(HP<70%でINT+3) は engine ハードコード（`sim/engine.js:336`）のため触れない。代わりに hpMax 増で発動絶対値ライン（42→50.4）を実用域へ、無条件ベース INT 強化で序盤対応。

---

## High I3: ch2 fight 雑魚硬化
**狙い**: ch2 clear 69.1%→60% 帯。fight ノードでの摩耗を増やし、boss 楊貴妃まで強デッキ無傷で到達するのを阻止。

### `prototype/data/enemies.json`
| ID | name | 変更 |
|----|------|------|
| hl-001 | ハートブリード ヴェンティ | hp 24→**27** (+12.5%) / phy 12→**13** / 通常攻撃 phyPct 95→**100** / 出血 75→**80** |
| hl-002 | バイトバンディット ヴェンティ | hp 28→**32** (+14%) / phy 18→**20** (+11%) / 出血 phyPct 90→**95**, bleedStacks 1→**2** / 通常攻撃 115→**120** |
| hl-003 | クリーパー マキアート | hp 22→**25** (+13.6%) / phy 13→**14** / 通常攻撃 85→**90**, 90→**95** |

期待: ch2 fight ノードでの平均削り +15% 程度、ch2 全体クリア 69%→60〜65%。

---

## I4 / I5
据え置き。I1 解決後に ch4 / kaihime ch2 の母数が増えてから次イテで再評価（issues notes に従う）。

---

## 同期実行
```
powershell -ExecutionPolicy Bypass -File prototype/tools/sync.ps1 json-to-csv
```
=> 成功（enemies.csv / bosses.csv / js/enemies.js / js/bosses.js 再生成）。
ヒーロー側は `sim/data.js` と `js/constants.js` を手動で両方更新済み。

---

## 確認すべき点（次イテのシミュレータ担当へ）
1. **doyle ch1 clear-rate** が 40% 帯まで上がったか。上がらなければ baseInt のさらなる増・パッシブ閾値変更の engine 改修許可を起案。
2. **ch3 elite (en-e01) + boss (リンカーン) 死亡シェア**。elite 37% / boss 35% → 25-30% / 25-30% 程度に分散すれば適正。boss 側だけ詰まっていれば phase2 緩和が必要。
3. **ch2 全体クリア** が 60% 帯に落ち着いたか。落ちすぎたら fight 強化を一段戻す。kaihime ch2 50% も同時にチェック（過調整リスク）。
4. **ch4 / ch5** は I1 解決で母数が増え、ch4 23%→自然に低下する想定。15% 以下に落ちなければ次イテで I4 着手。
5. ヒーロー格差: zhang 100% vs doyle 16% の比 6.25x → 目標 1.5x 以内へ進捗確認。
