## Iteration 2 — Balance Patch

調整対象: iter-002-issues.json topPriorities = [I1, I2, I3]
編集件数: 3 件 (critical x2, high x1)

### Critical I1: ch3 elite ベーグル フラペチーノ (en-e01) の壁化緩和
- `prototype/data/enemies.json`:
  - `en-e01.phy`: 22 → 19 (-13.6%)
  - `en-e01.intentRota[0].phyPct` (attackDouble): 90 → 80 (-11.1%)
  - HP は据え置き (62)。代替案だった HP 削減は採らず、火力側を抑制。
- 同期: `tools/sync.ps1 json-to-csv` で `data/enemies.csv` および `js/enemies.js` 反映済み。
- 理由: ch3 死亡の 46% が単体ノードに集中している壁。issues.json が示す数値 (PHY25/phyDouble105) はやや古かったため、現値 (PHY22/phyDouble90) からの 10〜15% 緩和に補正。HP を残すことで「ぬるい elite」化は防ぎ、starter+α デッキの突破口を開く。
- 期待: ch3 clear-rate 2.2% → 6〜10% 帯。同時に I4 (ボス・リンカーン詰み) も自然緩和を見込む。

### Critical I2: doyle ヒーローの ch1 14% 偏重格差是正
- `prototype/sim/data.js` HEROES[doyle]:
  - `baseInt`: 14 → 16 (+14%)
  - `starterDeck`: `{ ext1003: 3, ext1008: 4, ext1004: 3 }` → `{ ext1003: 3, ext1008: 4, ext1002: 2, ext1004: 1 }`
- `prototype/js/constants.js` HERO_ROSTER[1001]:
  - `baseInt`: 14 → 16 (実機側ミラー)
- 理由: passive 「HP<70% で INT+3, 1回」は engine 側ハードコードのため発動条件は触れない。代わりに baseInt をベースから底上げ + INT スケール攻撃カード (ext1002: INT 25-30% atk + 敵 INT-2) 2 枚を starter に追加。ext1004 を 3→1 に削るが PHY バフ自体は doyle に寄与薄く、実害なし。デッキ枚数は 10 枚維持。
- 新規カードは追加しておらず既存ライブラリの ext1002 を流用 (cards.js / sim/cards.js 双方に既存)。
- 期待: doyle ch1 14% → 35〜50% 帯、kaihime/zhang との格差 7倍 → 2〜3倍へ。

### High I3: ch2 fight 雑魚の摩耗不足解消
- `prototype/data/enemies.json`:
  - `hl-002` (バイトバンディット ヴェンティ): hp 26→28, phy 16→18 (+12.5%)
  - `hl-003` (クリーパー マキアート):     hp 20→22, phy 11→13 (+18%)
- 同期: `tools/sync.ps1 json-to-csv` 実行済み。
- 理由: ch2 clear-rate 75.7% (target 60%, +15.7pp)。boss 楊貴妃が壁化しているのに章はぬるい = 雑魚 fight 段階で HP が削れていない。map 構造 (fight ノード数) は触らず、雑魚側 phy/hp を 1〜2 ずつ持ち上げて自然な摩耗を加える。状態異常頻度や新スキルは追加せず、最小介入。
- 期待: ch2 clear-rate 75.7% → 65〜70% 帯。

### 同期実行ログ
```
> powershell -ExecutionPolicy Bypass -File prototype/tools/sync.ps1 json-to-csv
node sync.js json-to-csv ...
[sync] JSON -> CSV + JS ...
   data/enemies.csv 更新
   js/enemies.js 再生成
   data/bosses.csv 更新
   js/bosses.js 再生成
[sync] 完了
```

### 保留 (今 iteration では未調整)
- I4 (ch3 boss リンカーン): I1 緩和で連鎖改善を見込むため iter-003 で再測定。
- I5 (ch4 アタナソフ +22.8pp): n=18 と統計が薄く selection bias の可能性。ch3 緩和後の母数増を待つ。

### 次の確認ポイント (iter-003 で見たいもの)
1. ch3 clear-rate と en-e01 ノード死亡率 (target: 死亡集中 46% → 30% 台)。
2. doyle ch1 clear-rate と ext1002/ext1003 の使用回数分布。
3. ch2 clear-rate が target 60% に近づいているか、boss 楊貴妃の死亡集中率変化。
4. ヒーロー間格差が 1.5 倍以内に収まるかは未達想定。次 iteration で kaihime ch2 / zhang ch3 への追加調整候補を準備。
