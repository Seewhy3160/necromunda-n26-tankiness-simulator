# Necromunda (N26) Tankiness Simulator

One offline HTML file that answers one question: *how many hits from common
weapons does it take to put this fighter Down, and how much of that
survivability does each credit buy?*

Give it a fighter's Toughness, Wounds, Save and cost, tick the defensive gear
and skills it carries, and it returns:

* **Enemy credits to Down**: the slice of an enemy gang that has to spend a
  whole battle on this fighter to leave it Seriously Injured or Out of Action,
  using the enemy's cheapest tool for the job;
* **Enemy credits per 100 credits** of the fighter's total cost: above 100, the
  fighter costs the enemy more to remove than it cost you;
* **Hits to Down** against each pool weapon, and from the weapon mix, the
  target-side figure the loadout ranker consumes;
* for every piece of defensive wargear, skill and Goliath gene-smithing option,
  the enemy credits it would add, that gain per 100 credits spent on it, its
  break-even cost, and whether the fighter can actually buy it at this stage
  of the campaign.

**Use it here: <https://seewhy3160.github.io/necromunda-n26-tankiness-simulator/>**

Or open `index.html` in a browser. There is no build step, no server, no network
request and nothing written to storage. It recomputes on every change. The
site is published by `.github/workflows/pages.yml` on every push to the default
branch, once the fast test suite passes.

This is a standalone sibling of the
[N26 Attack Simulator](https://github.com/Seewhy3160/necromunda-n26-attack-simulator)
and reuses its exact-probability engine (see [Sharing the engine](#sharing-the-engine)).
It is one of the two inputs to a planned loadout ranker: the other is a
damage-output rating, and the ranker combines both with cost.

## What it rates

**Hits, not attacks.** The hit roll is left out on purpose. Weapon Skill,
Ballistic Skill, Attacks and Rapid Fire belong to the attacker, so they sit in
the damage side of the ranker. This module rates only what the target
controls: the wound roll, the save and the Injury dice. The ranker multiplies
the attacker's hits per activation by this module's hits to Down.

**Down** means Seriously Injured or Out of Action by default, since either
takes the fighter out of the fight. *Out of Action only* is an option.

### Target inputs

| Input | Effect on the maths |
| --- | --- |
| T, W, Sv, invulnerable save, S, I | Wound roll, wounds to chew through, save |
| Base cost, weapons cost, other wargear cost | Denominator of TP100 |
| Light carapace (100) / heavy carapace (140) | +1 / +2 Sv, −1 / −2 I |
| *One item of armour* (p158) | Carapace, mesh, reflec shroud and hazard suit share one slot; only the refractor field combines with them. The gear table swaps armour in and out accordingly |
| Mesh armour (40) | +1 Sv in close combat only |
| Refractor field (50) | 5+ invulnerable, rolled only when it beats the armour; burns out on a natural 1 for the rest of the chain |
| Reflec shroud (25) | AP of las, plasma and melta counts as − |
| Hazard suit (10) | No Blaze extra hit |
| Respirator (15) | 5+ invulnerable vs Gas (nothing in the v1 pool has Gas) |
| Bio-booster (25) | First time reduced to 0 Wounds: Lethality −1; at 0, two Injury dice and the bearer picks |
| Servo-harness partial (100) / full (130) | +2 S, +1 T (partial: −1 M, −1 I) |
| 'Hystrar' energy shield (35, Van Saar) | +1 Sv vs shooting and +1 Sv in combat; takes a weapon slot |
| Refraction cloak (40, Van Saar) | −1 to hit by shooting. It changes the hit roll, so it is reported as an **evasion factor** (0.75 of ranged hits kept at a reference BS 3+), not in TI |
| Parry weapon / shield weapon carried | +1 Sv in combat / vs shooting, once however many are carried (p164); the weapon's own cost goes under weapons |
| Dodge (skill) | A wound from shooting or close combat is cancelled on a 6, rolled before the save; never against a Template or Blast (p151) |
| Iron Jaw (skill) | +2 T against close combat hits with AP − |
| *Injured fighters have no skills* (p48) | Dodge and Iron Jaw only count while the fighter still has Wounds |
| Iron Flesh (+30, Goliath) | +1 W |
| Scar Tissue (+15, Goliath) | Lethality of every hit −1, minimum 1 |
| Adaptive Biology (+15, Goliath) | Toxin wounds must re-roll the wound dice |
| Reduced Bone Density (−10, Goliath) | −1 T, and 10 credits back |

**Scenario options:** cover (p76: +1 to armour saves against shooting within
the weapon's short range, which is the **default**, +2 within long range, or
none for open ground; invulnerable saves ignore it), the end state, and a
named opponent profile that re-weights the pool (default mix, plasma/melta
heavy, melee rush, volume fire). Every figure in this README is at the
default +1 cover unless it says otherwise.

**Deliberately left out:** stimm-slug stash, Unstoppable, Medicate,
Juggernaut and Nerves of Steel act between hits rather than on one, so they do
not fit a "repeated hits, nothing in between" model. Suppression, Nerve and
Recovery tests, return fire and hit-roll traits (Shock, Knockback) are out for
the same reason there is no hit roll.

### Availability: gang lists at creation

At gang creation a fighter buys only from its own entry's Equipment List; the
Trading Post opens in the campaign's Post-cycle Sequence. So the page has a
**stage** setting:

* **Gang creation** — only items on the fighter's list count as available.
* **Campaign** — the list plus Trading Post items. Exclusive items (the
  Hystrar shield, the refraction cloak) stay list-only.

Off-list gear on the fighter is still rated; it is just marked *not
available*, so a roster that picked gear up later can still be checked.
Furnace Brutes can always buy from the Trading Post (*Fires of the Forge*), so
their creation stage includes it. Gene-smithing is a Goliath option at
recruitment only.

Gangs transcribed so far: House Van Saar (default, Gang List pp72–78,
including the Cyberachnid pet, which can take no wargear; the Arachni-Rig is a
vehicle and out of scope), House Goliath with its Furnace Brutes and Unborn
variants (*The House of Chains*), House Delaque (pp24–30) and House Escher
(pp36–42), each with their Beasts and Pets, which can take no wargear. The
Khimerix's Regeneration acts between hits and is not rated. The core rules fighter types (Ganger,
Champion, Leader, Brute, Juve) are there too, with no list, so everything
counts as available for them; their Strength and Initiative are the attack
simulator's rounded values, since the core rules print only one full profile.

## Reference attack pool

Version `v1`. The pool is measured per hit, so each weapon counts only for its
hit profile, and weapons that share one merge: the plasma gun and pistol are
one entry, the boltgun and bolt pistol another, and the lasgun, laspistol,
autogun and stub gun a third. Profiles are read from the
pinned Trading Post tables by name; the cleaver comes from the Goliath list.
Melee attackers are Strength 3.

| Role | Weapon(s) | Str / AP / L | Wound-side traits | Default weight |
| --- | --- | --- | --- | --- |
| Leader killer | Meltagun | 8 / −4 / 3 | Damage (3) | 8% |
| Leader killer + special | Plasma gun, plasma pistol | 5 / −2 / 2 | Damage (2) | 22% |
| Common bolt | Boltgun, bolt pistol | 4 / −1 / 2 | – | 15% |
| Common template | Hand flamer | 3 / − / 1 | Blaze (5+), Template | 15% |
| Common throwaway | Lasgun, laspistol, autogun, stub gun | 3 / − / 1 | – | 20% |
| Melee | Stiletto knife | − / − / 1 | Toxin (3+) | 5% |
| Melee | Chainsword | 3 / − / 1 | Shred (5+) | 5% |
| Melee | Power sword | 3 / −2 / 1 | Breaching (6+) | 5% |
| Melee | Cleaver (Goliath list) | 3 / −1 / 2 | – | 5% |

A hits figure is only comparable with another from the same pool, weights and
scenario, so the result carries `poolVersion` and the options used.

## How the maths works

Repeated hits form an absorbing chain over the target's states: wounds left,
condition (none, Injured, Seriously Injured, Out of Action), refractor burnt
out, bio-booster used. Each hit is pushed through the wound roll, the save and
the Injury dice exactly as the attack simulator does it, starting from a
confirmed hit. Wounds only fall, condition only worsens and flags only switch
on, so every state's expected hits solves in one pass from the most damaged
state back:

    E(s) = (1 + Σ P(s→s') E(s')) / (1 − P(s→s))   over s' ≠ s, s' not Down

Against one weapon *w* that gives H<sub>w</sub>, the expected hits to Down from
a fresh fighter. Hits alone cannot say what the fighter is worth, because a
meltagun hit and a lasgun hit are not equal effort for the enemy, nobody
points a 140-credit meltagun at a 30-credit fighter, and a hit that Downs a
1-Wound fighter with three Wounds to spare has still cost the attacker a
meltagun shot. So each pool weapon carries an **attacker package**: a typical
carrier plus the weapon, and how many hits it lands on one target over a
battle at its range, ammo included (the table below). Then

    enemy credits to Down (w) = package cost × H_w ÷ hits per battle

is the slice of an enemy gang that must spend a whole battle on this fighter
with weapon *w*. The headline is the **minimum over the pool**: the enemy's
cheapest tool for this particular fighter. On a Tek that is a lasgun ganger
(113 credits); on a Champion, a plasma champion; on a Brute in carapace,
plasma again but at nearly four times the price. Overflow is priced in by
construction: the meltagun costs the same to fire at a W1 or a W3 fighter, so
the W3 fighter earns its value against the cheaper tools instead. **Enemy
credits per 100 credits** divides by base + weapons + other + defensive gear.

Two consequences worth knowing. The rule is deliberately harsh on gear: an
item that does not touch the enemy's current cheapest tool shows no gain
(mesh armour on a Champion whom plasma removes cheapest), and an item that
does can only push the cost up until the next tool takes over, which the
gear table shows as "then best". And the packages are assumptions, not
rules: 40-credit gangers and 100-credit champions, Ammo (6+) uptime of 0.55,
activations in range by weapon range. They are printed on the page and can be
replaced through a custom pool.

**Hits to Down from the mix** (every hit drawn at random from the pool by its
weight) is still reported: it is the target-side figure the loadout ranker
multiplies by an attacker's hits per activation, and a **Tankiness Index**
(the same relative to a plain Ganger, times 100) rides along as a footnote.

For each item the page reports ΔEnemy credits, that gain per 100 credits
spent on the item, the gain in hits against each weapon class, and the
**break-even cost** C\* = g ÷ (cost<sub>with</sub> ÷ cost<sub>without</sub> − 1):
the item raises enemy credits per credit only on a fighter whose other costs
exceed C\*.

Hand check: a Ganger needs 1.246 meltagun hits on average. Each hit wounds on
2+ with no save (5/6), and 3 Injury dice give Serious Injury or Out of Action
with chance 1 − (2/6)³ = 26/27, so 1 ÷ (5/6 × 26/27).

## Reference figures

<!-- generated:stamp -->

Generated by `node analyse.mjs` from the module in `index.html` (pool v1).

<!-- /generated:stamp -->

All tables below are regenerated with `node analyse.mjs --write`. Do not
hand-edit them.

### Enemy credits to Down

<!-- generated:enemyCredits -->

| Fighter | Cost | Enemy credits to Down | Per 100 credits | Enemy’s cheapest tool | Hits to Down (mix) |
|---|---|---|---|---|---|
| Van Saar Tek | 30 | 103 | 342 | Boltgun / bolt pistol on a Ganger (BS 4+) | 2.34 |
| Van Saar Augmek | 95 | 204 | 215 | Plasma gun / pistol on a Champion (BS 3+) | 3.95 |
| Van Saar Prime | 115 | 356 | 310 | Boltgun / bolt pistol on a Ganger (BS 4+) | 5.32 |
| Forge Despot | 140 | 386 | 276 | Plasma gun / pistol on a Champion (BS 3+) | 5.97 |
| Brute (T4 W4 4+) | 150 | 482 | 322 | Plasma gun / pistol on a Champion (BS 3+) | 9.16 |
| Augmek + refractor field | 145 | 242 | 124 | Boltgun / bolt pistol on a Ganger (BS 4+) | 4.74 |
| Augmek + Hystrar shield | 130 | 255 | 155 | Plasma gun / pistol on a Champion (BS 3+) | 4.81 |
| Augmek + heavy carapace | 235 | 341 | 91 | Plasma gun / pistol on a Champion (BS 3+) | 6.07 |
| Prime + heavy carapace | 255 | 630 | 159 | Power sword (S3) on a Champion (WS 3+) | 8.02 |

<!-- /generated:enemyCredits -->

The attacker packages behind those figures:

<!-- generated:attackers -->

| Weapon | Carrier | Weapon (credits) | Package (credits) | Hits per battle | Basis |
|---|---|---|---|---|---|
| Meltagun | Champion (BS 3+) | 140 | 240 | 0.55 | 6"/12": in range on 1.5 of 4 shooting activations; Ammo (6+) |
| Plasma gun / pistol | Champion (BS 3+) | 85 | 185 | 1.83 | 12"/24": in range on 3 of 4 activations; Rapid Fire (1); Ammo (6+) |
| Boltgun / bolt pistol | Ganger (BS 4+) | 55 | 95 | 1.88 | 12"/24": in range on 3 of 4 activations; Rapid Fire (1); Ammo (3+) |
| Hand flamer | Ganger (BS 4+) | 45 | 85 | 0.83 | template: auto-hit on 1.5 of 4 activations; Ammo (6+) |
| Lasgun / laspistol / autogun / stub gun | Ganger (BS 4+) | 15 | 55 | 1.75 | lasgun 16"/24": in range on 3.5 of 4 activations; no ammo roll |
| Stiletto knife (S3) | Ganger (WS 4+) | 25 | 65 | 1.00 | one charge a battle, 2 Attack dice |
| Chainsword (S3) | Champion (WS 3+) | 20 | 120 | 2.00 | one charge a battle, 3 Attack dice |
| Power sword (S3) | Champion (WS 3+) | 40 | 140 | 2.00 | one charge a battle, 3 Attack dice |
| Cleaver (S3, Goliath) | Ganger (WS 4+) | 25 | 65 | 1.00 | one charge a battle, 2 Attack dice |

<!-- /generated:attackers -->

### Hits to Down, per weapon and from the mix

<!-- generated:hits -->

| Weapon | Cost | Share of hits | Ganger | Champion | Leader | Goliath champion | Brute |
|---|---|---|---|---|---|---|---|
| Meltagun | 140 | 8% | 1.25 | 1.25 | 1.25 | 1.25 | 2.45 |
| Plasma gun / pistol | 85 / 70 | 22% | 1.69 | 2.02 | 3.82 | 2.02 | 4.78 |
| Boltgun / bolt pistol | 55 / 45 | 15% | 2.02 | 4.78 | 7.03 | 6.38 | 16.50 |
| Hand flamer | 45 | 15% | 3.80 | 7.87 | 10.88 | 11.81 | 30.94 |
| Lasgun / laspistol / autogun / stub gun | 15 / 5 | 20% | 4.50 | 10.00 | 14.00 | 15.00 | 40.50 |
| Stiletto knife (S3) | 25 | 5% | 2.70 | 5.63 | 7.88 | 5.63 | 13.50 |
| Chainsword (S3) | 20 | 5% | 2.95 | 6.68 | 9.68 | 9.56 | 24.75 |
| Power sword (S3) | 40 | 5% | 3.00 | 5.00 | 7.00 | 7.50 | 14.73 |
| Cleaver (S3, Goliath) | 25 | 5% | 2.25 | 5.10 | 7.50 | 7.65 | 18.56 |
| **Enemy mix (headline)** |  | 100% | **2.34** | **3.95** | **5.32** | **4.42** | **9.16** |

<!-- /generated:hits -->

### House Van Saar, creation-list options

Each cell is hits to Down from the enemy mix, then the extra hits per 100
credits spent on the item in brackets. Base costs exclude weapons.

<!-- generated:vanSaar -->

| Fighter (credits) | No gear | + 'Hystrar' pattern energy shield (35) | + Refractor field (50) | + Mesh armour (40) | + Bio-booster (25) |
|---|---|---|---|---|---|
| Prime (115) | 5.32 | 6.40 (+3.10) | 6.40 (+2.16) | 5.46 (+0.36) | 5.80 (+1.91) |
| Augmek (95) | 3.95 | 4.81 (+2.47) | 4.74 (+1.58) | 4.06 (+0.26) | 4.47 (+2.07) |
| Archeotek (85) | 4.81 | 6.07 (+3.57) | 5.35 (+1.07) | 4.97 (+0.38) | 5.43 (+2.46) |
| Tek (30) | 2.34 | 2.78 (+1.25) | 3.04 (+1.39) | 2.40 (+0.15) | 2.81 (+1.87) |

<!-- /generated:vanSaar -->

The Hystrar shield is Van Saar's best defensive buy on every multi-wound
fighter: +1 Sv against both shooting and melee for 35 credits, and it stacks
with a refractor field. On a 30-credit Tek nothing pays for itself until
weapons raise the fighter's cost.

### House Goliath, gene-smithing and the Trading Post

Heavy carapace reaches a Goliath fighter only through the Trading Post
(Furnace Brutes at creation, the others in campaign).

<!-- generated:goliath -->

| Fighter (credits) | No gear | + Iron Flesh (30) | + Scar Tissue (15) | + Refractor field (50) | + Heavy carapace (140) | + Reduced Bone Density (-10) |
|---|---|---|---|---|---|---|
| Forge Breaker (70) | 2.76 | 3.80 (+3.47) | 3.28 (+3.51) | 3.65 (+1.79) | 3.97 (+0.87) | 2.34 |
| Malformed (80) | 3.80 | 5.17 (+4.57) | 4.37 (+3.79) | 5.11 (+2.63) | 5.31 (+1.08) | 3.36 |
| Forge Master / Twice Born (105) | 4.42 | 5.97 (+5.15) | 5.08 (+4.37) | 5.41 (+1.98) | 6.72 (+1.64) | 3.95 |
| Forge Despot (140) | 5.97 | 7.67 (+5.69) | 6.55 (+3.85) | 7.30 (+2.67) | 8.89 (+2.08) | 5.32 |

<!-- /generated:goliath -->

Iron Flesh is the best buy in the tables: on a 2-wound fighter it adds almost
half again as many hits for 30 credits. Reduced Bone Density gives up about
20% of the hits to save 10 credits, which only improves hits per credit on a
fighter under about 50 credits.

### Core fighter types and every Trading Post item

<!-- generated:prototype -->

| Target | Hits to Down | Gear cost (credits) | ΔHits per 100 credits |
|---|---|---|---|
| Ganger (T3 W1 6+) | 2.34 | – | – |
| Ganger + refraction cloak | 2.34 | 40 | 0.00 |
| Ganger + respirator | 2.34 | 15 | 0.00 |
| Ganger + hazard suit | 2.38 | 10 | 0.34 |
| Ganger + mesh armour | 2.40 | 40 | 0.15 |
| Ganger + servo-harness (partial) | 2.76 | 100 | 0.41 |
| Ganger + servo-harness (full) | 2.76 | 130 | 0.32 |
| Ganger + reflec shroud | 2.76 | 25 | 1.68 |
| Ganger + light carapace | 2.78 | 100 | 0.44 |
| Ganger + 'hystrar' pattern energy shield | 2.78 | 35 | 1.25 |
| Ganger + bio-booster | 2.81 | 25 | 1.87 |
| Ganger + refractor field | 3.04 | 50 | 1.39 |
| Ganger + heavy carapace | 3.45 | 140 | 0.79 |
| Champion (T3 W2 5+) | 3.95 | – | – |
| Champion + refraction cloak | 3.95 | 40 | 0.00 |
| Champion + respirator | 3.95 | 15 | 0.00 |
| Champion + hazard suit | 4.02 | 10 | 0.70 |
| Champion + mesh armour | 4.06 | 40 | 0.26 |
| Champion + servo-harness (partial) | 4.42 | 100 | 0.47 |
| Champion + servo-harness (full) | 4.42 | 130 | 0.36 |
| Champion + bio-booster | 4.47 | 25 | 2.07 |
| Champion + refractor field | 4.74 | 50 | 1.58 |
| Champion + light carapace | 4.81 | 100 | 0.86 |
| Champion + 'hystrar' pattern energy shield | 4.81 | 35 | 2.47 |
| Champion + reflec shroud | 5.35 | 25 | 5.59 |
| Champion + heavy carapace | 6.07 | 140 | 1.51 |
| Brute (T4 W4 4+) | 9.16 | – | – |
| Brute + refraction cloak | 9.16 | 40 | 0.00 |
| Brute + respirator | 9.16 | 15 | 0.00 |
| Brute + hazard suit | 9.26 | 10 | 0.98 |
| Brute + mesh armour | 9.41 | 40 | 0.63 |
| Brute + bio-booster | 9.83 | 25 | 2.69 |
| Brute + refractor field | 10.39 | 50 | 2.47 |
| Brute + servo-harness (partial) | 11.31 | 100 | 2.15 |
| Brute + servo-harness (full) | 11.31 | 130 | 1.65 |
| Brute + light carapace | 11.53 | 100 | 2.37 |
| Brute + 'hystrar' pattern energy shield | 11.53 | 35 | 6.78 |
| Brute + heavy carapace | 14.42 | 140 | 3.76 |
| Brute + reflec shroud | 15.68 | 25 | 26.10 |

<!-- /generated:prototype -->

### Matchups on a Champion (T3 W2 5+), campaign stage

The gain in hits to Down against each weapon class, the overall multiplier on
hits from the mix, and the break-even cost.

<!-- generated:matchup -->

| Item (credits) | Melta | Plasma | Bolt | Hand flamer | Las / stub | Melee | Enemy credits × | Break-even C* (credits) |
|---|---|---|---|---|---|---|---|---|
| Bio-booster (25) | +7% | +22% | +12% | +13% | +13% | +13% | 1.22 | 112 |
| Reflec shroud (25) | +100% | +67% | 0% | 0% | 0% | 0% | 1.19 | 135 |
| 'Hystrar' pattern energy shield (35) | 0% | +25% | +33% | +48% | +50% | +26% | 1.25 | 140 |
| Heavy carapace (140) | +20% | +67% | +100% | +48% | +50% | +71% | 1.67 | 210 |
| Refractor field (50) | +50% | +24% | 0% | 0% | 0% | +14% | 1.19 | 270 |
| Light carapace (100) | 0% | +25% | +33% | +48% | +50% | +26% | 1.25 | 400 |
| Mesh armour (40) | 0% | 0% | 0% | 0% | 0% | +26% | 1.00 | – |
| Hazard suit (10) | 0% | 0% | 0% | +27% | 0% | 0% | 1.00 | – |
| Servo-harness (partial) (100) | 0% | 0% | +33% | +50% | +50% | +34% | 1.00 | – |
| Servo-harness (full) (130) | 0% | 0% | +33% | +50% | +50% | +34% | 1.00 | – |

<!-- /generated:matchup -->

Armour, the shield and the servo-harness protect against no-AP weapons; the
refractor and reflec protect against plasma and melta. Only a better save
works against the stiletto, because Toxin ignores Toughness.

### Cover changes the ranking

Cover never affects an invulnerable save, so open ground flatters the
refractor field. The more of the game a fighter spends in cover, the more
carapace catches up. The page defaults to +1.

<!-- generated:cover -->

| Champion, ranged cover bonus | Refractor field (50): hits × / C* | 'Hystrar' pattern energy shield (35): hits × / C* | Light carapace (100): hits × / C* | Heavy carapace (140): hits × / C* |
|---|---|---|---|---|
| None (default) | 1.38 / 131 | 1.20 / 175 | 1.20 / 500 | 1.50 / 280 |
| +1 | 1.19 / 270 | 1.25 / 140 | 1.25 / 400 | 1.67 / 210 |
| +2 | 1.00 / – | 1.33 / 105 | 1.33 / 300 | 1.76 / 184 |

<!-- /generated:cover -->

## Interface for the loadout ranker

The module lives in the page's `<script id="tankiness">` block and exports
`Tankiness.rate(fighter, options)`. It is pure and has no DOM access, so the
ranker and the Node tests load it headless (see `test/load.mjs`, which
evaluates the `engine`, `data` and `tankiness` blocks in order).

```js
Tankiness.rate({
  profile: { T: 3, W: 2, sv: 5, inv: 0, S: 3, I: 4 },
  wargear: ['lightCarapace', 'refractor'],   // ids from Tankiness.WARGEAR
  skills:  ['dodge'],                         // ids from Tankiness.SKILLS
  geneSmithing: [],                           // ids from Tankiness.GENE_SMITHING
  cost:    { base: 95, weapons: 140, other: 0 } // defensive gear cost is added from the tables
}, {
  pool: Tankiness.POOL_V1,       // or a custom pool with its own version tag
  endState: 'down',              // or 'ooa'
  opponent: 'default',           // 'plasmaMelta' | 'meleeRush' | 'volumeFire', or a {role: weight} object
  mode: 'creation',              // or 'campaign' (adds the Trading Post)
  cover: 0,                      // 0 | 1 | 2 on armour saves vs shooting
  gang: 'vanSaar',               // 'goliath' | 'furnaceBrutes' | 'unborn' | 'generic' | null
  equipmentList: 'vanSaar'       // the fighter entry's own list; defaults to the gang's
})
// => {
//   enemyCredits: ECD, enemyCreditsPer100: ECD100,          // the headline: the enemy's cheapest tool
//   bestTool: { id: 'plasma', name, attacker: { carrier, cost, hitsPerBattle, basis }, hits },
//   hitsToDown: 5.20, pDownFirst: 0.149, hitsPer100: 1.35,   // hits from the enemy mix
//   ti: 234.8, tp100: 61.0, gangerHits: 2.21,                   // the same, relative to a plain Ganger
//   cost: { base: 95, weapons: 140, other: 0, defensive: 150, total: 385 },
//   perProfile: [{ id: 'meltagun', name, role, cost, weight, attacker, hits, pDownFirst, vsGanger,
//                   enemyCredits, cheapest }, ...],
//   evasion: { ranged: 1 },
//   gear: [{ id: 'refractor', name, cost, kind, selected, available, availability, availabilityNote,
//            enemyCreditsWith, enemyCreditsWithout, dEnemyCredits, dEnemyCreditsPer100, bestToolWith,
//            hitsWith, hitsWithout, dHits, dHitsPer100, tiWith, tiWithout, dTi, dTp100,
//            ratio, breakEven, breakEvenDirection,
//            byRole: { leaderKiller, special, template, throwaway, melee } }, ...],
//   problems: [], notes: [...], unmodelled: [],
//   poolVersion: 'v1', options: { endState, opponent, mode, cover, gang, equipmentList }
// }
```

`enemyCredits` is the headline; `hitsToDown` is the figure to combine with
the damage module's hits per activation. `gear` covers every rateable item whether or not it is on the
fighter, so the ranker can ask what adding or dropping each one would do. An item in an
exclusive group (one suit of armour, one servo-harness) swaps in for the one
worn. `available` is false for items the fighter cannot buy at this stage;
the ranker should only recommend available items. The ranker should refuse
to mix `poolVersion`s.

Also exported: `hitsToDown(profile, target, options)`, `expectedHits(mix,
target, options)` for a custom weapon mix, `effectiveTarget`,
`resolveHit`, `poolWeights`, `availability`, and the tables `WARGEAR`,
`SKILLS`, `GENE_SMITHING`, `POOL_V1`, `OPPONENTS`, `GANGS`, `EQUIPMENT_LISTS`.

## Sharing the engine

The page carries a verbatim copy of the attack simulator's `engine` and `data`
script blocks, pinned to the upstream commit named in `upstream.json`.
`test/sync.test.mjs` hashes both blocks and fails if either drifts from that
commit, so a rules fix upstream cannot go unnoticed and a local edit cannot
quietly fork the one-attack maths. The upstream engine, data and Monte Carlo
suites run here too, unchanged.

The tankiness module builds its per-hit resolver from the engine's exported
pieces (the wound table, the save rule with its natural 1–2 auto-fail, and the
Injury dice pick) and adds only the target-side hooks the attack simulator has
no use for. `test/tankiness.test.mjs` checks that, with no hooks switched on,
one hit from this resolver matches the engine's own result to 1e-12 for every
pool profile against six targets.

## Tests

```
npm install         # only needed for the browser test
npm test            # everything
npm run test:fast   # sync, engine, data and tankiness, no dependencies
```

* `test/sync.test.mjs` — the engine and data blocks match the pinned upstream commit.
* `test/engine.test.mjs`, `test/data.test.mjs`, `test/montecarlo.test.mjs` — the upstream suites, unchanged.
* `test/tankiness.test.mjs` — hand-worked chains (the 1.246 meltagun hits, the 3.6 laspistol hits, refractor burnout over four states, the bio-booster's two-dice pick, Scar Tissue, Adaptive Biology, Dodge, Iron Jaw, cover, Sv 2+), one-hit parity with the engine, the cost lines, the marginals, break-even, and availability under every gang and stage.
* `test/tankiness-montecarlo.test.mjs` — an independent dice simulator, sharing no code with the module, rolls hit after hit until Down and checks each H<sub>w</sub>, and the headline figure with each hit drawn from the mix, to within 1%.
* `test/browser.test.mjs` — loads the file over `file://` in Chromium and drives the real controls. Skips itself if Playwright is not installed.

The tests read the `<script>` blocks straight out of `index.html`, so the
single file stays the only source of truth.

---

Unofficial fan-made tool. Necromunda is a trademark of Games Workshop Ltd.
Page references are to the N26 core rules and *The House of Chains*; no rules
text is reproduced here.
