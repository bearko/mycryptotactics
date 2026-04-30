# iter-009 balance adjustments

Source: `prototype/sim/reports/iter-009-issues.json`

## measured state (iter-009, n=1500)

| ch | clear | target | band | note |
|----|-------|--------|------|------|
| 1  | 87.1% | 85% ±5pp | IN | doyle 62.6% / 格差 1.60x (regression from 1.51x) |
| 2  | 52.1% | 60% ±5pp | **-7.9pp** | dispersed: elite 28% / boss 27% / fight 25% |
| 3  | 10.3% | 10% ±3pp | IN | **untouched** |
| 4  | 10.0% | 5% ±2pp  | **+5.0pp** | improved 20.3→10.0% via vp-e01 55→62; still soft |
| 5  | 0%    | 0.5% ±0.5pp | n=7 insufficient | **untouched** |

## changes (3 件)

### 1. ch2 緩和 — boss-hl (楊貴妃) hp 90→81 (-10%)
- file: `prototype/data/bosses.json`
- rationale: ch2 死亡分散 28%/27%/25% で「壁」がない。ハートブリード フラペチーノ (hl-e01) は iter-008 でロールバック済 (44/19) なので触らず、boss を 1 段階 (-10%) 緩めて全体クリア率を底上げ。fight/elite はそのまま残し、bottleneck 分散を保ったまま全体 +pp を狙う。
- 期待: ch2 52.1% → 56〜58% (boss death share 27% → ~22%)

### 2. ch4 微強化 — vp-e01 (カスケード フラペチーノ) hp 62→66 (+6%)
- file: `prototype/data/enemies.json`
- rationale: iter-008 で 55→62 が ch4 を 20.3→10.0% に大幅改善。**同方向小刻み** で vp-e01 をもう一押し (+6%)。boss-ch2 (ナポレオン) と vp-001 fight は触らずに分散を維持。
- 期待: ch4 10.0% → 7〜8% (cascade-elite death share 33% 維持か微増)

### 3. ch1 doyle 格差解消 — doyle hpMax 80→85 (+6%)
- files: `prototype/sim/data.js` HEROES, `prototype/js/constants.js` HERO_ROSTER（両方手動）
- rationale: 上杉謙信戦が ch1 死亡 84.5% を占め doyle 187 死/zhang 0 死/kaihime 6 死。iter-006 までの starterDeck 改修と iter-007 の baseInt 23 では格差が 1.51x→1.60x へ悪化。**baseInt は据え置き**（ch4 を再悪化させないため）し、HP +5 で boss 上杉戦の生存率を直接押し上げる。zhang (85) と同等になり、PHY/INT のキャラ差は維持。
- 期待: doyle ch1 62.6% → 70〜75% (格差 1.60x → 1.40x), ch1 全体 87.1% → 89%

## 編集差分まとめ

| 対象 | 旧 | 新 | Δ |
|------|----|----|---|
| boss-hl.hp | 90 | 81 | -10% |
| vp-e01.hp  | 62 | 66 | +6%  |
| doyle.hpMax| 80 | 85 | +6%  |

## sync
`tools/sync.ps1 json-to-csv` 実行済（enemies.csv/js, bosses.csv/js 再生成）。

## 確認ポイント (next iter)
1. **ch2 死亡分散**: boss share 27% → 20%前後に下がるか（過度に偏らないか）
2. **ch4 リバウンド**: vp-e01 +4hp で 7〜8% に収束するか、まだ 9%超か
3. **ch1 格差**: doyle ch1 70%以上に上がるか、kaihime/zhang はほぼ天井のままか
4. **ch3 不変**: 触っていないが clear rate が 10±3pp 内に留まるか
5. **ch5 計測**: ch3/ch4 throughput up により n が 7 → 30+ に上がるか
