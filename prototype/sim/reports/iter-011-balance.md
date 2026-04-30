# iter-011 balance changes

入力: `prototype/sim/reports/iter-011-issues.json`

範囲外: ch2 (49.3% / 目標 60% ±5pp / -10.7pp, critical, 慢性)。
範囲内 (touch しない): ch1 87.7% / ch3 11.4% / ch4 6.8% (新規 IN) / ch5 n=5。
高優先度の派生: ch1 ヒーロー格差 1.53x (doyle 65.2%, 境界 OUT, +0.06x worsening)。

## 変更（2 件）

### 1. ch2 全体ソフト化（critical, clearRate）
ch2 死亡集中が top 30.1% と分散しており単一スポット狙撃では動かない。複数壁を「均等に少しずつ」緩める方針。

- `prototype/data/enemies.json` `hl-e01` (ハートブリード フラペチーノ・elite, ch2 死亡 201)
  - `hp`: 44 → **40** (-9%)
- `prototype/data/bosses.json` `boss-hl` (ゴースト・楊貴妃, ch2 boss 死亡 139)
  - `intentRota[0].phyPct`: 105 → **100** (-5pp、最大火力ローテの初手攻撃を 1 段下げ)

狙い: 上位 2 件（elite + boss）に -5〜10% の小幅緩和を分散投入し、ch2 全体クリア率を +5〜8pp 押し上げ目標 55〜57% 帯へ。fight 雑魚 hl-002 (PHY 21 / 死亡 181) には今回触れない（次回判断）。新カード/新スキル追加なし、`tools/sync.ps1 json-to-csv` で CSV/JS 反映済。

### 2. doyle ch1 格差解消（high, heroParity）
doyle ch1 65.2% / 格差 1.53x、上杉謙信 boss 集中 85.3%。引き続き「対 boss 防御札不足」型。stat（hpMax 85 / baseInt 23）はキープ、デッキ枠内入替のみで安全に詰める。

- `prototype/sim/data.js` HEROES doyle `starterDeck`
  - `ext1004` (Guard+7 / PHY+2): 3 → **4**
  - `ext1008` (Draw2 / INT+1): 2 → **1**
  - 旧: `{ ext1003:1, ext1008:2, ext1002:4, ext1004:3 }` (10 枚)
  - 新: `{ ext1003:1, ext1008:1, ext1002:4, ext1004:4 }` (10 枚)
- `prototype/js/constants.js` HERO_ROSTER doyle: `starterDeck` 定義なし（実機側はハードコード starter フォールバック未使用、stat 変更なしのため同期不要）

狙い: 防御札を +1 枚厚くして上杉謙信戦の生存性を直接上げ、ch1 doyle を 65% → 72〜78% 帯へ。格差 1.53x → 1.4x 圏入りを目標。INT 火力枠 ext1002×4 は維持し攻撃側は損なわない。

## 触っていない箇所（明示）

- ch3 (11.4%, IN ✓)
- ch4 (6.8%, IN ✓ 新規達成、絶対に触らない)
- ch5 (n=5 不足、判定不可、`runs` 増加待ち)
- ch1 全体スポット (doyle 改修のみで対応、ch1 全体は 87.7% で十分高い)
- AI / シミュレータコード
- 新カード / 新スキル

## 確認すべき点（次 iter measurement）

1. **ch2 全体**: 49.3% → 55〜58% 帯に入るか。hl-e01 / boss-hl の死亡件数が均等に下がっているか（片方だけ激減なら緩和過剰、片方据え置きなら hl-002 へ次手）。
2. **ch1 doyle**: 65.2% → 72%+ で格差 1.5x 以内に収まるか。ch1 全体が 90% を超えて逸脱しないか（kaihime/zhang 影響なしの想定）。
3. **ch1 上杉謙信集中**: 85.3% → 80% 前後への低下を確認（doyle 防御札追加効果）。
4. **ch4**: 5±2pp 範囲を逸脱していないか（無関係変更だが回帰確認）。
5. **ch5**: `runs` 1000+ で再測定し ch5 到達 n を確保。
