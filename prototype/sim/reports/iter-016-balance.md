# iter-016 balance adjustments

Date: 2026-05-02

## 入力 (iter-15-verify)
- 全章 IN RANGE / hero gap 1.40 / **ch2 conc 37.8% (✗)**

## 編集 (1 件)

1. `enemies.json` hl-e01 attackBleed phyPct 110→115, attack phyPct 120→125
   - 狙い: hl-e01 の lethality を上げて死亡を集中

## 出力 (iter-16-verify)

| 章 | 結果 | 目標 | 状態 |
|----|------|------|------|
| 1 | 89.7% | [80,90] | IN ✓ |
| 2 | 60.5% | [55,65] | IN ✓ |
| 3 | 10.9% | [7,13]  | IN ✓ |
| 4 | **15.7%** | [3,7] | **OUT (variance)** |
| 5 | 0%   | [0,1]   | IN ✓ |

ch1 hero gap: 1.43 ✓
死亡集中: ch1 86%✓, **ch2 31.8% ✗ (悪化)**, ch3 43%✓, ch4 48%✓, ch5 43%✓

## 分析

- **想定外**: ch2 hl-e01 attack 強化したのに集中度は **37.8% → 31.8% に悪化**。
  hl-e01 deaths 195 → 169。lethality up でプレイヤーが警戒し他ノードで HP 削られて死亡が分散。
- **ch4 variance**: 5.6% → 15.7%。reach n=89 で標本誤差大。
  iter-15 buff は強さとして十分でも、毎 iteration の ±10pp ブレを許す。

## iter-17 方針

A. hl-e01 attack revert (110/120 へ戻す) + hl-e01 **hp 43→49** で攻撃機会を物理的に増やす。
B. ch4 variance 対策: vp-e01 hp 82→90 で elite ゲートをさらに強化。
   平均を 4% 帯に押し下げ、±変動 5pp に対しても [3,7] に収まるよう余裕を作る。
