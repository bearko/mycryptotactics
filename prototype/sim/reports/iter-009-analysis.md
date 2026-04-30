# iter-009 Analysis

**Runs:** 500 per hero × 3 heroes = 1500 runs. Source: `prototype/sim/reports/iter-009.json`.

## 1. Per-chapter clear rates

| Chapter | Reached | Cleared | Rate | Target | Δ vs Target |
|--------:|--------:|--------:|-----:|-------:|------------:|
| ch1 アバカス       | 1500 | 1307 | **87.1%** | 85% ±5 | +2.1pp (in band) |
| ch2 ホレリス       | 1307 |  681 | **52.1%** | 60% ±5 | -7.9pp (OUT, low) |
| ch3 アンティキティラ |  681 |   70 | **10.3%** | 10% ±3 | +0.3pp (in band) |
| ch4 アタナソフ     |   70 |    7 | **10.0%** |  5% ±2 | +5.0pp (OUT, high) |
| ch5 トロイ         |    7 |    0 | **0.0%**  | 0.5% ±0.5 | -0.5pp (edge / sample=7) |

## 2. Single-spot death concentration (top spot share of chapter deaths)

| Chapter | Top spot | Deaths | Total deaths | top% | Target ≥40% |
|--------:|:---------|------:|-------------:|-----:|:--|
| ch1 | boss/ゴースト・上杉謙信        | 163 | 193 | **84.5%** | OK |
| ch2 | elite/ハートブリード フラペチーノ | 176 | 626 | **28.1%** | LOW (3-spot tie 28/27/25) |
| ch3 | boss/ゴースト・リンカーン      | 213 | 611 | **34.9%** | LOW (border) |
| ch4 | elite/カスケード フラペチーノ  |  21 |  63 | **33.3%** | LOW (3-spot tie 33/32/24) |
| ch5 | fight/ベーグル グランデ (tie)   |   3 |   7 | **42.9%** | OK (n=7, low signal) |

## 3. Per-hero per-chapter clear rate

| Hero | ch1 | ch2 | ch3 | ch4 | ch5 |
|:----|:----|:----|:----|:----|:----|
| kaihime | 98.8% (494/500) | 36.6% (181/494) | 0.6% (1/181) | 0.0% (0/1) | n/a |
| doyle   | 62.6% (313/500) | 22.4% (70/313) | 20.0% (14/70) | 21.4% (3/14) | 0.0% (0/3) |
| zhang   | 100.0% (500/500)| 86.0% (430/500) | 12.8% (55/430) | 7.3% (4/55) | 0.0% (0/4) |

**ch1 hero gap (max/min) = 100.0% / 62.6% = 1.60x** — boundary OUT (worsened from iter-008 1.51x).
**ch3 hero gap** — kaihime collapses to 0.6% (vs 12.8% / 20.0%), severe outlier.
**ch4** — doyle 21.4% but n=14 (small); kaihime 0% (n=1) is degenerate.

## 4. Diff vs iter-008 verify

| Metric | iter-008 | iter-009 | Δ |
|---|---|---|---|
| ch1 clear | 88.3% | 87.1% | -1.2pp |
| ch2 clear | 50.9% | 52.1% | +1.2pp (still OUT low) |
| ch3 clear | 11.7% | 10.3% | -1.4pp (in band) |
| ch4 clear | 20.3% | 10.0% | **-10.3pp (still OUT high, big improvement)** |
| ch5 clear | 0.0%  | 0.0%  | flat |
| ch1 top%  | 72%   | 84.5% | +12.5pp (very concentrated on Uesugi boss) |
| ch2 top%  | 29%   | 28.1% | flat (still dispersed) |
| ch3 top%  | 38%   | 34.9% | -3.1pp |
| ch4 top%  | 48%   | 33.3% | -14.7pp (Cascade-Ghost-Cascade triangle) |
| ch5 top%  | 38%   | 42.9% | +4.9pp (n=7, noise) |
| ch1 hero gap | 1.51x | **1.60x** | worsened |

## 5. Verdict

- ch4 vp-e01 hp 55→62 worked: clear rate 20.3% → 10.0%, but still +5pp over target. Concentration loosened from 48% → 33% (3 spots tie).
- ch2 still slightly soft and very dispersed (boss/elite/fight share equally ≈ 25–28%).
- ch1 Uesugi boss is now the single bottleneck (84.5%) but doyle's win rate at ch1 dropped further — hero-gap widened to 1.60x. doyle baseInt 23 did not close the gap.
- ch3 kaihime cliff (0.6%) is the dominant hero-balance issue.
- ch5 sample size too small (n=7) to evaluate — chapters 4/5 need ch3 to soften before ch5 can be measured.
