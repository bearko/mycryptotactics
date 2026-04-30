# iter-010 balance log

担当: game-balancer
基準: `prototype/sim/reports/iter-010-issues.json`

## 計測サマリ

| 章 | 全体 | 目標 | 状態 |
|----|------|------|------|
| 1 | 88.2% | 85% (±5pp) | OK |
| 2 | 52.0% | 60% (±5pp) | NG too_hard (-8pp) |
| 3 | 11.8% | 10% (±3pp) | OK 触らない |
| 4 | 27.2% | 5% (±2pp) | NG too_easy (+22pp) critical |
| 5 | 0.0% | 0.5% (±0.5pp) | n=22 触らない |

ch1 ヒーロー格差 1.50x (doyle 66.6% / kaihime 98.0% / zhang 100%)。

## 編集 3 件

### 1. ch4 強化 (critical, +22pp 目標)
- `enemies.json` `vp-e01 カスケード フラペチーノ`
  - hp 66 → 72 (+9%)
  - phy 27 → 29 (+7%)
- 狙い: ch4 elite カスケード フラペチーノが死亡集中 40.7% を占めるため、そこを直接強化して章クリア率を 27.2% → 5% 方向に押し戻す。iter-009 13.1% → iter-010 27.2% の分散誤差を踏まえ最小幅で。

### 2. ch2 緩和 (high, -8pp 目標)
- `enemies.json` `hl-001 ハートブリード ヴェンティ`
  - hp 27 → 24 (-11%)
- 狙い: ch2 fight/elite で死亡が分散 (28.5% / 28.0%) しており単点では効きにくい。fight 道中 hl-001 の hp を下げ、戦闘短縮で消耗の総量を減らし全体クリア率を 52% → 60% 方向に。

### 3. doyle 格差解消 (medium, 1.50x → 詰め)
- `prototype/sim/data.js` HEROES doyle starterDeck
  - ext1003 2 → 1
  - ext1004 2 → 3
- `prototype/js/constants.js` HERO_ROSTER doyle (starterDeck 定義なしのため stat は変更なし、本体側のみ)
- 狙い: doyle ch1 死亡の 79% が ch1 boss 上杉謙信。Guard カード ext1004 を 1 枚増やし、防御札を厚くして boss 戦生存性を上げる。hpMax 85/baseInt 23 はキープ、デッキ枠内入替のみ。

## 同期

`powershell -ExecutionPolicy Bypass -File prototype/tools/sync.ps1 json-to-csv` 実行済み。enemies.csv / enemies.js / bosses.csv / bosses.js 再生成。

## 次回確認すべき点

- ch4 vp-e01 強化で elite 死亡比率が下がりすぎないか (40% → 60% 程度に集中することは目標達成の指標として OK)。
- ch2 hl-001 hp 緩和で fight 死亡 (現 28.5%) が elite (28.0%) に流れて分散が固定化しないか。
- doyle ch1 クリア率が 66.6% → 80% 帯に上がり 1.50x → 1.30x 程度に詰まるか。kaihime/zhang は据え置き。
- ch5 n=22 はサンプル不足、分散誤差大。今回は触らず観察。
- ch4 は iter-009 13.1% / iter-010 27.2% と振れが大きい。今回の強化で過剰調整 (5% を下回り too_hard 化) しないか要確認。
