# iter-007 balance changes

## summary
3 件編集。critical (ch4 緩み +16.1pp)、high (ch2 壁 -8.8pp)、medium (doyle ch1 格差 1.61x) に対応。ch3/ch5 は範囲内のため不変。kaihime ch3 格差は次イテに先送り (kaihime 全体強化は ch1/ch2 を崩す危険)。

## changes

### 1. ch4 critical: vp-001 (カスケード ヴェンティ) 強化 — fight 圧力底上げ
- `prototype/data/enemies.json`
- `hp: 27 → 30` (+11%)
- `phy: 15 → 17` (+13%)
- 狙い: ch4 fight 死亡 12/60=20% を上昇させ、母数自体を絞る (vp-e01 elite 46.7% は単独で機能しているが通り抜け母数が多い)。

### 2. ch2 high: hl-e01 (ハートブリード フラペチーノ) 強化 — TOP スポット集中化
- `prototype/data/enemies.json`
- `hp: 44 → 48` (+9%)
- `phy: 19 → 21` (+10%)
- 狙い: ch2 死亡集中 TOP 29.4% (3 スポット拮抗) のうち最高位を一極化、-8.8pp 是正。

### 3. ch1 medium: doyle baseInt 強化 — ch1 boss 上杉戦 damage race
- `prototype/sim/data.js` HEROES + `prototype/js/constants.js` HERO_ROSTER (両方)
- `baseInt: 22 → 25` (+14%)
- 狙い: iter-006 で starter Guard 倍増→ +4.2pp は出たが、依然 boss 145/189 死亡。INT スケールで火力底上げし格差 1.61x を 1.3x 帯へ。

## next iteration で確認すべき点
- ch4 clearRate が 21.1% → 5-10% 帯へ降りるか (target 5%)
- ch4 fight 死亡比率 20% → 30%+ 帯へ上がるか (vp-001 強化が効いているか)
- ch2 clearRate が 51.2% → 60% 帯へ上がるか、TOP 集中度 29.4% → 35%+ になるか
- doyle ch1 が 62.2% → 75%+ へ、格差 1.61x → 1.3x 以下へ
- ch5 到達数 (ch4 強化により減る予定 — n が 16 から下がりすぎないか)
- kaihime ch3 7.52x 格差 (今回未対応、次イテで個別対応検討)
- doyle baseInt +3 が ch2/ch3/ch4 でも過剰火力にならないか (doyle ch4 41.7% → さらに上振れリスク)
