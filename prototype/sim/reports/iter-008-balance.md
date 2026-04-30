# iter-008 balance adjustments

## Measurement (iter-008)

| 章 | 全体 | 目標 | 偏差 | 状態 |
|----|------|------|------|------|
| 1 | 88.3% | 85% | +3.3pp | IN ✓ doyle 67.2% で限界 |
| 2 | 46.3% | 60% | -13.7pp | critical 壁すぎ |
| 3 | 10.4% | 10% | +0.4pp | IN ✓ 触らない |
| 4 | 31.2% | 5% | +26.2pp | critical ぬるすぎ |
| 5 | 0.0% | 0.5% | -0.5pp | IN ✓ 触らない |

ヒーロー格差: ch1 1.49x (doyle 67.2%), ch3 9.6x (kaihime 1.9%), ch4 doyle 58.3% / kaihime 0.0%

## 調整 3 件（最小限・優先度順）

### 1. ch2 緩和: hl-e01 完全ロールバック
- `hl-e01 (ハートブリード フラペチーノ elite)`
  - hp **48 → 44** (-8%)
  - phy **21 → 19** (-9.5%)
- 根拠: iter-007 で hl-e01 を強化したが過修正。ch2 elite が死亡 30.8% で top スポット化。完全ロールバックで ch2 通過率を底上げ。
- 期待: ch2 全体 46.3% → 55-60% へ復帰、目標 60% に近づける。

### 2. ch4 強化: vp-e01 をタフに
- `vp-e01 (カスケード フラペチーノ elite)`
  - hp **55 → 62** (+13%)
  - phy **25 → 27** (+8%)
- 根拠: ch4 死亡分散 (boss 38.6% / elite 31.8% / fight 15.9%)。boss ナポレオンは正しく壁、elite/fight のぬるさで通過数が多すぎる。elite を fight 通過後の次の関門として機能させる。
- 期待: ch4 全体 31.2% → 15-20% に圧縮（目標 5% にはまだ遠いが急激な変化は避ける）。

### 3. doyle dominance 抑制: baseInt 25 → 23
- `doyle.baseInt 25 → 23` (-8%) を `prototype/sim/data.js` HEROES と `prototype/js/constants.js` HERO_ROSTER の両方に適用
- 根拠: doyle ch4 58.3% で過剰、ch3 でも 18.2% と最高。iter-004 で 19→22→25 と段階的に上げた終端を一段戻す中間値。
- 維持: hpMax 80 はキープ（ch1 boss 上杉戦の生存性は確保）。
- 期待: ch1 doyle 67.2% は微減で済むはず（hpMax + デッキで吸収）、ch4 doyle 58.3% は 35-45% に低下、ch4 全体ぬる解消に追加寄与。

## 編集ファイル
- `prototype/data/enemies.json` (hl-e01, vp-e01)
- `prototype/sim/data.js` (doyle baseInt)
- `prototype/js/constants.js` (doyle baseInt)
- `prototype/data/enemies.csv` / `prototype/js/enemies.js` は sync で再生成済み

## 触らなかったもの
- ch3 (10.4% ≒ target 10%) — within tolerance
- ch5 (0.0%) — 直前 ch4 の通過数次第
- boss 楊貴妃 (ch2)、ナポレオン (ch4) — 壁として機能中
- doyle starterDeck / hpMax — ch1 維持のため

## 確認すべき点（次イテレーション）
- ch2 全体が 60% ±5pp の窓に入るか（hl-e01 ロールバックの効き）
- ch4 全体が 5% に向けて圧縮されるか（vp-e01 強化 + doyle 減 INT の合算）
- doyle ch1 が 67.2% から大きく落ちないか（hpMax 80 で吸収できているか）
- ch3 hero gap 9.33x が悪化しないか（doyle INT 減で kaihime/zhang との差が縮むはず）
