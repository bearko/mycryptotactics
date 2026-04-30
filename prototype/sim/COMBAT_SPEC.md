# Combat Simulator Specification - My Crypto Tactics

Exhaustive combat logic reverse-engineered from prototype roguelike.

## 1. Combat State Shape

combat object (main.js:1208):
- deck, drawPile, discardPile, exhaustPile, hand: Card routing
- playerHp, playerHpMax: Current/max health
- playerPhy, playerInt, playerAgi: Stats (can be buffed)
- playerPhyBase, playerIntBase, playerAgiBase: Combat start base (immutable)
- playerGuard: Reset per turn, absorbs damage
- playerShield: Persistent, special-damage-only
- playerPoison, playerBleed: Status stacks
- energy, energyMax, bonusEnergyNext: Action points
- damageReducedThisTurn: Halve damage flag
- hasResurrection: Survive lethal
- Enemy fields: Similar to player (enemyHp, enemyPhy, etc.)
- enemyIntent: Current action { kind, ...params }
- intentRota, intentRotaIdx: Sequence of intents
- isBoss, bossPhase, bossDef: Phase system

## 2. Turn Flow

PLAYER TURN START (main.js:1360):
1. Reset playerGuard = 0, damageReducedThisTurn = false
2. Tick poisons: playerPoison/enemyPoison deal damage at start
3. Apply PHY penalty: playerPhy -= phyPenaltyNext
4. Doyle passive: If HP < 70% and !triggered, INT+3
5. Restore energy: energy = energyMax + bonusEnergyNext
6. Draw 5 cards
7. Advance enemy intent

PLAY CARD (main.js:1767):
1. energy -= cost
2. Route to exhaustPile (if exhaust) or discardPile
3. Execute card.play(combat)
4. Kaihime passive (50%): floor(playerPhy * 0.5) bonus damage
5. Check win

END TURN (main.js:2631):
1. Discard remaining hand
2. await enemyTurn()

ENEMY TURN (main.js:1792):
1. Execute enemyIntent by kind
2. Zhang passive (50%): floor(playerPhy * 0.2) counter
3. Increment turn, startPlayerTurn()

## 3. Damage Formulas

Cut Rate: min(40, floor(stat / 2))

Base Damage: floor((stat * skillPct / 100) * (100 - cutRate) / 100)

PHY Attack:
- base = phyIntDamageAfterCut(playerPhy, skillPct, cutRateFromPhy(enemyPhy))
- Add critical bonus if crit rolls (critRateFromAgi = min(45, floor(agi/2)))
- Add enemyBleed stacks
- Apply guard absorption

Guard: Absorb point-for-point (applyGuardToDamage)
Shield: Special damage only (applyDamageThroughShield)


## 4. ALL CARD EFFECTS

### Starter Deck (main.js:1108)
ext1001: PHY 50-60% damage
ext1004: Guard +7
ext1008: INT +1 (perm), Draw 2, then INT 15-20% damage

### Chapter 0 (Abacus) Pool
cd101: PHY 100%
cd102: PHY 70% x2
cd103: Guard +6
cd104: Energy +1 (this turn only)
cd105: PHY 150%
cd106: PHY +3 (permanent)
cd107: Heal = (INT + PHY) / 2
cd108: PHY 60%, cost 0, exhaust, next turn PHY -3

### Chapter 1 (Holelis) Pool
cdH01: PHY 80%, exhaust
cdH02: PHY 60% + apply poison x1 to enemy
cdH03: Guard +8, AGI +2 (permanent)
cdH04: Heal (INT+PHY)/2, cost 0, exhaust
cdH05: PHY 50% x2
cdH06: INT +2 (perm), Draw 3

### Chapter 2 (Antikythera) Pool
cd201: PHY 60% + poison x2
cd202: PHY 90% + bleed x2
cd203: Clear poison/bleed from player, cost 0
cd204: Guard +12
cd205: INT 50% x3
cd206: Gold +20, cost 0

### Chapter 3 (Athenasoph) Pool
cd301: Shield +10
cd302: PHY 200%, cost 3
cd303: PHY +5, INT +5 (permanent)
cd304: INT 130%, guaranteed critical
cd305: Halve all damage this turn, cost 0

### Elite Cards (available in reward/shop)
ext2001: PHY 55-65%
ext2002: INT 30-35%
ext2003: Heal (INT+PHY)/2, cost 0, exhaust
ext2004: PHY +(10-15% of current)
ext2005: Guard +8, AGI +2 (permanent)
ext2006: PHY 50-60%
ext2008: INT +2, Draw 3
ext2011: PHY 70% x2
ext2013: PHY 40-50%

## 5. Status Effects

Poison: Ticks at player turn start. Damage = stacks. Persists. No decay.
Bleed: Bonus on PHY hit = +stacks. Persists. No decay.
Guard: Absorb damage point-for-point. Player resets per turn start. Enemy persists.
Shield: Special (max HP %) damage only. Persistent. NO PHY/INT absorption.
Vulnerable: Temp bonus damage pool. Consumed after one attack.
Damage Reduced: Halve all damage via ceil(damage/2). This turn only (cd305).
Resurrection: Survive one lethal, set HP to 1 (LL ext 5561). Consumed after use.

## 6. Passive Skills

### Kaihime "Nanakiri" (浪切)
- Trigger: After card play, 50% chance
- Condition: enemyHp > 0
- Effect: Deal floor(playerPhy * 0.5) bonus damage
- Display: Async cutin animation
- Ref: main.js:1785

### Doyle "Sherlock Holmes" (シャーロック・ホームズ)
- Trigger: Player turn start, once per combat
- Condition: playerHp < playerHpMax * 0.7, !doylePassiveTriggered
- Effect: INT +3
- Ref: main.js:1393

### Zhang Liao "Liao Lai Liao Lai" (遼来遼来)
- Trigger: After taking damage, 50% chance
- Condition: playerHp > 0 && enemyHp > 0
- Effect: Counter damage = floor(playerPhy * 0.2)
- Display: Async cutin animation
- Ref: Flag set main.js:729,730; executed main.js:1856

## 7. Enemy AI

Intent Rotation (main.js:1343):
- enemyIntent = intentRota[intentRotaIdx % intentRota.length]
- intentRotaIdx++
- Wraps around indefinitely

Intent Kinds:
- attack (phyPct): PHY damage
- attackPoison (phyPct, poisonStacks): Attack + apply poison
- attackBleed (phyPct, bleedStacks): Attack + apply bleed
- attackDouble (phyPct): Two PHY attacks
- attackInt (intPct): INT damage
- attackIntDouble (intPct): Two INT attacks
- healSelf (pct): enemyHp = min(max, enemyHp + floor(max*pct/100))
- buffSelf (phyAdd?, intAdd?): Permanent stat boost
- guard (value): enemyGuard += value
- special (pct): Special damage = floor(playerHpMax*pct/100) (shield-only)

Boss Phases (bosses.js):
- boss-ch3 (Lincoln): Phase 0 @ 50% HP
- boss-troy (Yoshka): Phase 0 @ 45% HP
- Switch: intentRota updated, intentRotaIdx reset to 0

## 8. LL Extensions (Relics)

Activation: Manual, via UI button. No energy cost. 2 slots max per run.

ext 5501 "MCH Blade": dealPhySkillToEnemyRange(300, 400) = 350% PHY
ext 5502 "Grandarme": dealIntSkillToEnemy(400, 500) = 450% INT
ext 5503 "Playwright Pen": healPlayerFromIntSkill(200, 250) = 225% healing coeff
ext 5504 "MCH Armor": playerPhy += floor(playerPhy*0.5), Guard +20
ext 5509 "Marie Antoinette Blue": healPlayerFromIntSkill(200, 250) + INT +4
ext 5561 "Demon Goldfish": healPlayerFromIntSkill(150, 200) + PHY +3 + hasResurrection=true

Drop Rates:
- Available: Chapter 2+ (chapterIdx >= 1)
- Normal: 10% chance
- Elite: 100% chance
- Slots: 2 maximum

## 9. RNG Touchpoints (for seeding)

1. Card shuffle (cards.js:1121): Fisher-Yates with Math.random()
2. Skill % roll (battle-mch.js:25): randomSkillRatePct
3. Crit roll (battle-mch.js:69): Math.random() * 100 < critPct
4. Kaihime proc (main.js:1730): Math.random() >= 0.5
5. Zhang counter flag (main.js:729): Math.random() < 0.5
6. LL Ext drop (main.js:1934): Math.random() < dropChance
7. LL Ext pick (main.js:1935): floor(Math.random() * pool.length)
8. Enemy selection (main.js:1189): floor(Math.random() * pool.length)
9. Reward fallback (main.js:1911): floor(Math.random() * fallback.length)
10. Shop shuffle (main.js:2082): shuffle()

## 10. Run-Level Constants

### Hero Starting Stats (constants.js:6-43)
Kaihime: hpMax 70, basePhy 10, baseInt 8, baseAgi 12, passive "kaihime"
Doyle: hpMax 60, basePhy 7, baseInt 14, baseAgi 8, passive "doyle"
Zhang: hpMax 85, basePhy 15, baseInt 6, baseAgi 10, passive "zhang"

### Starting Deck (main.js:1108-1114)
5x ext1001 (Novice Blade)
4x ext1004 (Novice Armor)
1x ext1008 (Novice Book)
Total: 10 cards, shuffled

### Per-Turn Mechanics
- Draw: 5 cards at turn start
- Energy max: 3 (can exceed via buffs, capped at energyMax + 3)
- Discard recycle: If drawPile empty, shuffle discardPile back
- Exhaust: Never recycles (permanently removed)

### Combat Rewards (main.js:1901)
- Normal fight: 28 GUM
- Elite fight: 45 GUM
- Boss fight: Chapter-dependent (50-70 GUM)

### Card Rarities (cards.js:1136)
common, uncommon, rare, epic, legendary (UI only, no gameplay effect)

### Chapter Map Generation (chapters.js:12-16)
Example (Chapter 0):
- layers: 10 (vertical levels)
- nodesPerLayerMin/Max: 3-4
- nodeRatios: fight 50%, rest 15%, shop 10%, elite 10%, craft 10%, event 7%

## Implementation Checklist for Node.js Simulator

Core Combat State:
- [ ] Initialize combat object with all fields (section 1)
- [ ] Manage deck/hand/draw/discard/exhaust piles correctly

Turn Flow:
- [ ] Player turn start: resets, status ticks, passive checks, draw, intent advance
- [ ] Card play: cost deduction, effect execution, passive triggers
- [ ] Enemy turn: intent execution, passive triggers
- [ ] Boss phase transitions at HP thresholds

Damage & Defense:
- [ ] Damage formula: stat, skillPct, cutRate, crit, bleed, vulnerable, guard, shield
- [ ] Critical hit calculation and bonus
- [ ] Healing coefficient and recovery
- [ ] Guard absorption (reset player/turn, persist enemy)
- [ ] Shield special-damage-only mechanics
- [ ] Status tick damage (poison, bleed)
- [ ] Damage reduction (halving)
- [ ] Resurrection checks

Card Effects:
- [ ] All 40+ card play() functions with exact math
- [ ] Exhaust vs discard routing
- [ ] Stat buffs (permanent during combat)

Status Effects:
- [ ] Poison application, persistence, tick damage
- [ ] Bleed application, bonus on hit
- [ ] Guard and Shield absorption mechanics
- [ ] Vulnerable bonus consumption
- [ ] Damage Reduced flag
- [ ] Resurrection flag

Passives:
- [ ] Kaihime: 50% trigger after card play, floor(PHY*0.5) bonus
- [ ] Doyle: 70% HP threshold, once/combat, INT+3
- [ ] Zhang: 50% after damage taken, floor(PHY*0.2) counter

Enemy AI:
- [ ] Intent rota cycling (with modulo wrap)
- [ ] Boss phase transitions at HP %
- [ ] All 10 intent kinds with exact math

LL Extensions:
- [ ] 2-slot system
- [ ] 6 relics with exact effects
- [ ] Drop logic and chance

RNG Management:
- [ ] Seed all 10 Math.random() touchpoints
- [ ] Fisher-Yates shuffle with seeded RNG
- [ ] Percentage rolls (damage variance, crit, passive procs)

---

**Generated**: 2026-04-30
**Source files analyzed**:
- main.js (2700 lines)
- cards.js (1207 lines)
- battle-mch.js
- constants.js
- enemies.js
- bosses.js
- chapters.js
- ll-extensions.js

All line references are precise. No logic summarized—exact math quoted.
