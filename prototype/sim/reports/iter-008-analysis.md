# iter-008 simulation analysis

## Summary
- 500 runs x 3 heroes = 1500 runs

## Per-chapter clear rate (overall + per hero)

| ch | target | overall | kaihime | doyle | zhang | judge |
|----|--------|---------|---------|-------|-------|-------|
| 1 | 85% (+/-5) | 88.3% | 98.0% | 67.2% | 99.8% | OK |
| 2 | 60% (+/-5) | 46.3% | 31.4% | 19.6% | 78.8% | -13.7pp |
| 3 | 10% (+/-3) | 10.4% | 1.9% | 18.2% | 12.5% | OK |
| 4 | 5% (+/-2) | 31.2% | 0.0% | 58.3% | 26.5% | +26.2pp |
| 5 | 0.5% (+/-0.5) | 0.0% | 0.0% | 0.0% | 0.0% | OK |

## Death concentration (single top spot)

| ch | top% | spot | count | judge |
|----|------|------|-------|-------|
| 1 | 86.9% | boss/ゴースト・上杉謙信 | 152/175 | OK concentrated |
| 2 | 30.8% | elite/ハートブリード フラペチーノ | 219/712 | scattered |
| 3 | 34.2% | boss/ゴースト・リンカーン | 188/549 | scattered |
| 4 | 38.6% | boss/ゴースト・ナポレオン | 17/44 | scattered |
| 5 | 30.0% | boss/ディープ・ヨシュカ | 6/20 | scattered |

## Hero gap

| ch | lowest | highest | gap | judge |
|----|--------|---------|-----|-------|
| 1 | doyle 67.2% | zhang 99.8% | 1.49x | OK |
| 2 | doyle 19.6% | zhang 78.8% | 4.01x | gap |
| 3 | kaihime 1.9% | doyle 18.2% | 9.33x | gap |
| 4 | kaihime 0.0% | doyle 58.3% | INF | gap |
| 5 | kaihime 0.0% | zhang 0.0% | INF | gap |

## Death top3 detail

### ch1 (total deaths=175)
-  86.9% boss/ゴースト・上杉謙信 (152)
-   6.3% fight/メリッサ ヴェンティ (11)
-   5.1% elite/クリーパー フラペチーノ (9)
-   1.7% fight/クリーパー ヴェンティ (3)

### ch2 (total deaths=712)
-  30.8% elite/ハートブリード フラペチーノ (219)
-  26.3% fight/バイトバンディット ヴェンティ (187)
-  23.6% boss/ゴースト・楊貴妃 (168)
-  11.5% fight/ハートブリード ヴェンティ (82)
-   7.9% fight/クリーパー マキアート (56)

### ch3 (total deaths=549)
-  34.2% boss/ゴースト・リンカーン (188)
-  31.1% elite/ベーグル フラペチーノ (171)
-  15.7% fight/ベーグル ヴェンティ (86)
-   9.5% fight/ラブレター マキアート (52)
-   9.5% fight/ラビット マキアート ドッピオ (52)

### ch4 (total deaths=44)
-  38.6% boss/ゴースト・ナポレオン (17)
-  31.8% elite/カスケード フラペチーノ (14)
-  15.9% fight/カスケード ヴェンティ (7)
-  13.6% fight/バイトバンディット グランデ (6)

### ch5 (total deaths=20)
-  30.0% boss/ディープ・ヨシュカ (6)
-  30.0% elite/カメレオン フラペチーノ ドッピオ (6)
-  20.0% fight/ベーグル グランデ (4)
-  20.0% fight/ラブレター グランデ (4)

## vs iter-007

| ch | iter-007 | iter-008 | diff |
|----|----------|----------|------|
| 1 | 89.6% | 88.3% | -1.3pp |
| 2 | 47.4% | 46.3% | -1.1pp |
| 3 | 11.3% | 10.4% | -0.9pp |
| 4 | 25.0% | 31.2% | +6.2pp |
| 5 | 0.0% | 0.0% | +0.0pp |

## Top issues
1. ch3 hero gap 9.33x (kaihime 1.9% / doyle 18.2%) - worsened from iter-007 7.5x. kaihime nearly unable to clear ch3.
2. ch1 doyle clear 67.2% with 86.9% death concentration on boss Uesugi Kenshin. doyle alone drags overall ch1 below target band.
3. ch2 overall 46.3% (target 60%, -13.7pp). Deaths scattered (top 30.8%). Heartbleed Frappe + Bytebandit Venti both lethal.
