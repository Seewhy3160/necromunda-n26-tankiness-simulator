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
| Vehicle (flag) | Hits resolve as for a fighter (Wounds, Injury dice, p77); Toxin wounds it only on a natural 6 (p165). Lasting Damage and vehicle-only rules are not rated |

**Scenario options:** cover (p76: +1 to armour saves against shooting within
the weapon's short range, which is the **default**, +2 within long range, or
none for open ground; invulnerable saves ignore it), the end state, and a
named opponent profile that re-weights the pool (the reference gang's own mix
by default, an even role mix, plasma/melta heavy, melee rush, volume fire). Every figure in this README is at the
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
including the Cyberachnid pet and the Ash Wastes 'Arachni-Rig', neither of
which can take wargear), House Goliath (pp48–54: Forge Tyrant to Sumpkroc)
with its Furnace Brutes and Unborn variants and the extra fighters from *The
House of Chains*, House Delaque (pp24–30) and House Escher (pp36–42), each
with their Beasts and Pets, which can take no wargear. A fighter that comes
with a skill (the Forge-Born's Iron Jaw) has it ticked when picked; Beasts
take no gene-smithing. The
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
with weapon *w* alone. The headline is the **enemy's cheapest plan**: the
reference gang fields a set number of each package (one plasma champion, four
lasgun gangers, and so on), so each tool can land only so many hits in a
battle. Tools are taken in order of cost until the hits add up to a Down,
progress counted in each tool's own hits to Down. A tool that is not needed
is not used, so the meltagun never counts against a fighter a bolter ganger
removes first; a tool that is used up hands over to the next, so a Forge
Despot with Iron Flesh, whom plasma Downs in two hits with or without the
extra Wound, still earns its value once the one plasma champion has fired
for the battle. If every tool together falls short, the whole gang needs more
than one battle and the cost scales. Overflow is priced in by construction:
the meltagun costs the same to fire at a W1 or a W3 fighter, so the W3
fighter earns its value against the cheaper tools instead. **Enemy credits
per 100 credits** divides by base + weapons + other + defensive gear.

The packages and their counts are assumptions, not rules: 40-credit gangers
and 100-credit champions, Ammo (6+) uptime of 0.55, activations in range by
weapon range. They are printed on the page and can be replaced through a
custom pool. The same counts give the default weapon mix ("reference gang")
used for hits to Down from the mix.

**Hits to Down from the mix** (every hit drawn at random from the pool by its
weight, by default the reference gang's own share of hits) is still reported: it is the target-side figure the loadout ranker
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

| Fighter | Cost | Enemy credits to Down | Per 100 credits | Enemy’s cheapest plan | Hits to Down (mix) |
|---|---|---|---|---|---|
| Van Saar Tek | 30 | 105 | 352 | Boltgun 93%, Lasgun 7% | 2.79 |
| Van Saar Augmek | 95 | 208 | 219 | Plasma gun 91%, Boltgun 9% | 5.37 |
| Van Saar Prime | 115 | 392 | 341 | Boltgun 27%, Plasma gun 48%, Lasgun 25% | 7.38 |
| Forge Despot | 140 | 446 | 319 | Plasma gun 48%, Boltgun 20%, Stiletto knife 25%, Meltagun 7% | 9.02 |
| Brute (T4 W4 4+) | 150 | 784 | 522 | Plasma gun 38%, Boltgun 11%, Stiletto knife 15%, Power sword 14%, Meltagun 22% | 14.38 |
| Augmek + refractor field | 145 | 249 | 128 | Boltgun 39%, Plasma gun 61% | 6.13 |
| Augmek + Hystrar shield | 130 | 274 | 166 | Plasma gun 72%, Boltgun 28% | 6.83 |
| Augmek + heavy carapace | 235 | 394 | 105 | Plasma gun 54%, Power sword 31%, Lasgun 15% | 8.53 |
| Prime + heavy carapace | 255 | 646 | 163 | Power sword 22%, Plasma gun 29%, Meltagun 37%, Lasgun 12% | 11.60 |

<!-- /generated:enemyCredits -->

The attacker packages behind those figures:

<!-- generated:attackers -->

| Weapon | Carrier | Weapon (credits) | Package (credits) | Hits per battle | In the reference gang | Basis |
|---|---|---|---|---|---|---|
| Meltagun | Champion (BS 3+) | 140 | 240 | 0.55 | 1 | 6"/12": in range on 1.5 of 4 shooting activations; Ammo (6+) |
| Plasma gun / pistol | Champion (BS 3+) | 85 | 185 | 1.83 | 1 | 12"/24": in range on 3 of 4 activations; Rapid Fire (1); Ammo (6+) |
| Boltgun / bolt pistol | Ganger (BS 4+) | 55 | 95 | 1.88 | 1 | 12"/24": in range on 3 of 4 activations; Rapid Fire (1); Ammo (3+) |
| Hand flamer | Ganger (BS 4+) | 45 | 85 | 0.83 | 1 | template: auto-hit on 1.5 of 4 activations; Ammo (6+) |
| Lasgun / laspistol / autogun / stub gun | Ganger (BS 4+) | 15 | 55 | 1.75 | 4 | lasgun 16"/24": in range on 3.5 of 4 activations; no ammo roll |
| Stiletto knife (S3) | Ganger (WS 4+) | 25 | 65 | 1.00 | 2 | one charge a battle, 2 Attack dice |
| Chainsword (S3) | Champion (WS 3+) | 20 | 120 | 2.00 | 1 | one charge a battle, 3 Attack dice |
| Power sword (S3) | Champion (WS 3+) | 40 | 140 | 2.00 | 1 | one charge a battle, 3 Attack dice |
| Cleaver (S3, Goliath) | Ganger (WS 4+) | 25 | 65 | 1.00 | 1 | one charge a battle, 2 Attack dice |

<!-- /generated:attackers -->

### Hits to Down, per weapon and from the mix

<!-- generated:hits -->

| Weapon | Cost | Share of hits | Ganger | Champion | Leader | Goliath champion | Brute |
|---|---|---|---|---|---|---|---|
| Meltagun | 140 | 3% | 1.25 | 1.25 | 1.25 | 1.25 | 2.45 |
| Plasma gun / pistol | 85 / 70 | 10% | 1.69 | 2.02 | 3.82 | 2.02 | 4.78 |
| Boltgun / bolt pistol | 55 / 45 | 10% | 2.02 | 4.78 | 7.03 | 6.38 | 16.50 |
| Hand flamer | 45 | 4% | 3.80 | 7.87 | 10.88 | 11.81 | 30.94 |
| Lasgun / laspistol / autogun / stub gun | 15 / 5 | 37% | 4.50 | 10.00 | 14.00 | 15.00 | 40.50 |
| Stiletto knife (S3) | 25 | 9% | 2.70 | 5.63 | 7.88 | 5.63 | 13.50 |
| Chainsword (S3) | 20 | 9% | 2.95 | 6.68 | 9.68 | 9.56 | 24.75 |
| Power sword (S3) | 40 | 9% | 3.00 | 5.00 | 7.00 | 7.50 | 14.73 |
| Cleaver (S3, Goliath) | 25 | 9% | 2.25 | 5.10 | 7.50 | 7.65 | 18.56 |
| **Enemy mix (headline)** |  | 100% | **2.79** | **5.37** | **7.38** | **6.61** | **14.38** |

<!-- /generated:hits -->

### House Van Saar, creation-list options

Each cell is hits to Down from the enemy mix, then the extra hits per 100
credits spent on the item in brackets. Base costs exclude weapons.

<!-- generated:vanSaar -->

| Fighter (credits) | No gear | + 'Hystrar' pattern energy shield (35) | + Refractor field (50) | + Mesh armour (40) | + Bio-booster (25) |
|---|---|---|---|---|---|
| Prime (115) | 7.38 | 9.32 (+5.54) | 8.44 (+2.13) | 7.91 (+1.33) | 8.04 (+2.67) |
| Augmek (95) | 5.37 | 6.83 (+4.18) | 6.13 (+1.52) | 5.77 (+1.01) | 6.06 (+2.77) |
| Archeotek (85) | 6.83 | 8.53 (+4.86) | 7.34 (+1.02) | 7.49 (+1.65) | 7.70 (+3.48) |
| Tek (30) | 2.79 | 3.38 (+1.67) | 3.49 (+1.38) | 2.96 (+0.41) | 3.39 (+2.39) |

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
| Forge Breaker (70) | 3.54 | 5.52 (+6.61) | 4.08 (+3.62) | 4.48 (+1.88) | 5.41 (+1.34) | 2.79 |
| Malformed (80) | 5.52 | 7.58 (+6.87) | 6.12 (+4.01) | 7.01 (+2.97) | 8.28 (+1.97) | 4.46 |
| Forge Master / Twice Born (105) | 6.61 | 9.02 (+8.05) | 7.33 (+4.80) | 7.62 (+2.03) | 10.42 (+2.73) | 5.37 |
| Forge Despot (140) | 9.02 | 11.56 (+8.46) | 9.70 (+4.54) | 10.45 (+2.85) | 14.07 (+3.60) | 7.38 |

<!-- /generated:goliath -->

Iron Flesh is the best buy in the tables: on a 2-wound fighter it adds almost
half again as many hits for 30 credits. Reduced Bone Density gives up about
20% of the hits to save 10 credits, which only improves hits per credit on a
fighter under about 50 credits.

### Core fighter types and every Trading Post item

<!-- generated:prototype -->

| Target | Hits to Down | Gear cost (credits) | ΔHits per 100 credits |
|---|---|---|---|
| Ganger (T3 W1 6+) | 2.79 | – | – |
| Ganger + refraction cloak | 2.79 | 40 | 0.00 |
| Ganger + respirator | 2.79 | 15 | 0.00 |
| Ganger + hazard suit | 2.81 | 10 | 0.14 |
| Ganger + mesh armour | 2.96 | 40 | 0.41 |
| Ganger + reflec shroud | 3.02 | 25 | 0.90 |
| Ganger + light carapace | 3.38 | 100 | 0.59 |
| Ganger + 'hystrar' pattern energy shield | 3.38 | 35 | 1.67 |
| Ganger + bio-booster | 3.39 | 25 | 2.39 |
| Ganger + refractor field | 3.49 | 50 | 1.38 |
| Ganger + servo-harness (partial) | 3.54 | 100 | 0.75 |
| Ganger + servo-harness (full) | 3.54 | 130 | 0.57 |
| Ganger + heavy carapace | 4.34 | 140 | 1.10 |
| Champion (T3 W2 5+) | 5.37 | – | – |
| Champion + refraction cloak | 5.37 | 40 | 0.00 |
| Champion + respirator | 5.37 | 15 | 0.00 |
| Champion + hazard suit | 5.40 | 10 | 0.35 |
| Champion + mesh armour | 5.77 | 40 | 1.01 |
| Champion + bio-booster | 6.06 | 25 | 2.77 |
| Champion + refractor field | 6.13 | 50 | 1.52 |
| Champion + reflec shroud | 6.20 | 25 | 3.32 |
| Champion + servo-harness (partial) | 6.61 | 100 | 1.24 |
| Champion + servo-harness (full) | 6.61 | 130 | 0.95 |
| Champion + light carapace | 6.83 | 100 | 1.46 |
| Champion + 'hystrar' pattern energy shield | 6.83 | 35 | 4.18 |
| Champion + heavy carapace | 8.53 | 140 | 2.26 |
| Brute (T4 W4 4+) | 14.38 | – | – |
| Brute + refraction cloak | 14.38 | 40 | 0.00 |
| Brute + respirator | 14.38 | 15 | 0.00 |
| Brute + hazard suit | 14.45 | 10 | 0.69 |
| Brute + bio-booster | 15.40 | 25 | 4.10 |
| Brute + mesh armour | 15.57 | 40 | 2.97 |
| Brute + refractor field | 15.74 | 50 | 2.72 |
| Brute + servo-harness (partial) | 16.57 | 100 | 2.19 |
| Brute + servo-harness (full) | 16.57 | 130 | 1.68 |
| Brute + light carapace | 18.02 | 100 | 3.64 |
| Brute + 'hystrar' pattern energy shield | 18.02 | 35 | 10.39 |
| Brute + reflec shroud | 19.39 | 25 | 20.05 |
| Brute + heavy carapace | 21.29 | 140 | 4.94 |

<!-- /generated:prototype -->

### Matchups on a Champion (T3 W2 5+), campaign stage

The gain in hits to Down against each weapon class, the overall multiplier on
hits from the mix, and the break-even cost.

<!-- generated:matchup -->

| Item (credits) | Melta | Plasma | Bolt | Hand flamer | Las / stub | Melee | Enemy credits × | Break-even C* (credits) |
|---|---|---|---|---|---|---|---|---|
| Reflec shroud (25) | +100% | +67% | 0% | 0% | 0% | 0% | 1.38 | 67 |
| Bio-booster (25) | +7% | +22% | +12% | +13% | +13% | +13% | 1.23 | 110 |
| 'Hystrar' pattern energy shield (35) | 0% | +25% | +33% | +48% | +50% | +26% | 1.32 | 110 |
| Heavy carapace (140) | +20% | +67% | +100% | +48% | +50% | +71% | 1.89 | 157 |
| Refractor field (50) | +50% | +24% | 0% | 0% | 0% | +14% | 1.20 | 251 |
| Light carapace (100) | 0% | +25% | +33% | +48% | +50% | +26% | 1.32 | 314 |
| Servo-harness (partial) (100) | 0% | 0% | +33% | +50% | +50% | +34% | 1.04 | 2721 |
| Servo-harness (full) (130) | 0% | 0% | +33% | +50% | +50% | +34% | 1.04 | 3537 |
| Mesh armour (40) | 0% | 0% | 0% | 0% | 0% | +26% | 1.00 | – |
| Hazard suit (10) | 0% | 0% | 0% | +27% | 0% | 0% | 1.00 | – |

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
| None (default) | 1.38 / 130 | 1.22 / 158 | 1.22 / 452 | 1.61 / 230 |
| +1 | 1.20 / 251 | 1.32 / 110 | 1.32 / 314 | 1.89 / 157 |
| +2 | 1.00 / – | 1.34 / 103 | 1.34 / 295 | 1.71 / 197 |

<!-- /generated:cover -->

## API

The full contract, with every id and result field, is in [API.md](API.md);
[HANDOVER.md](HANDOVER.md) describes the project's state, decisions and open
items for whoever works on it next.

The module lives in the page's `<script id="tankiness">` block and exports
`Tankiness.rate(fighter, options)`. It is pure and has no DOM access. Other
programs (the attack simulator, the list builder) can reach it three ways;
all three are generated from, or served by, the same `index.html`, and the
test suite fails if any of them drifts from it.

### 1. Library bundle

`npm run build` writes two bundles from the page's `engine`, `data` and
`tankiness` blocks, and the Pages site serves them:

| File | For | Live URL |
| --- | --- | --- |
| `dist/tankiness.js` | `<script src>` (sets `window.Tankiness`, `Engine`, `Data`) and Node `require()` | `https://seewhy3160.github.io/necromunda-n26-tankiness-simulator/dist/tankiness.js` |
| `dist/tankiness.mjs` | `import` in a browser or Node | `https://seewhy3160.github.io/necromunda-n26-tankiness-simulator/dist/tankiness.mjs` |

```html
<script src="https://seewhy3160.github.io/necromunda-n26-tankiness-simulator/dist/tankiness.js"></script>
<script>
  const r = Tankiness.rate({ profile: { T: 3, W: 2, sv: 5 }, wargear: ['refractor'], cost: { base: 95 } }, { gang: 'vanSaar' });
  console.log(r.enemyCredits, r.hitsToDown, r.gear.find(g => g.id === 'hystrarShield').dEnemyCredits);
</script>
```

```js
import Tankiness, { Engine, Data } from 'https://seewhy3160.github.io/necromunda-n26-tankiness-simulator/dist/tankiness.mjs';
```

```sh
npm install github:Seewhy3160/necromunda-n26-tankiness-simulator
```

```js
const Tankiness = require('necromunda-n26-tankiness-simulator');      // CommonJS
import Tankiness from 'necromunda-n26-tankiness-simulator';           // ES modules
```

`Tankiness.VERSION` is the package version and every result carries
`poolVersion`; a caller should refuse to compare results across different
values of either. `Engine` and `Data` are the attack simulator's own blocks,
pinned to the commit in `upstream.json`, so the attack simulator can also use
`Tankiness.hitsToDown(profile, target, options)` and `expectedHits` on the
same engine it already runs.

### 2. URL parameters

The page loads a set-up from its query string, and the "Link to this set-up"
field (and the address bar, when served over HTTP) always holds the current
one. A list builder can open or embed the page with a fighter already filled
in:

```
index.html?gang=goliath&fighter=goTyrant&wargear=refractor,meshArmour&skills=dodge&gene=ironFlesh&weapons=80&cover=1
```

| Parameter | Values |
| --- | --- |
| `gang` | `vanSaar`, `goliath`, `furnaceBrutes`, `unborn`, `delaque`, `escher`, `generic` |
| `fighter` | a fighter id from `Tankiness.GANGS[gang].fighters` (seeds the profile, cost and any skill it comes with) |
| `T`, `W`, `sv`, `inv`, `S`, `I`, `vehicle` | profile fields; explicit values win over the fighter's seed (`sv`/`inv`: 0 for none, else the target number; `vehicle`: 1) |
| `base`, `weapons`, `other` | credits |
| `wargear`, `skills`, `gene` | comma-separated item ids from `Tankiness.WARGEAR`, `SKILLS`, `GENE_SMITHING` |
| `mode` | `creation` or `campaign` |
| `opponent` | `referenceGang`, `default`, `plasmaMelta`, `meleeRush`, `volumeFire` |
| `cover` | `0`, `1`, `2` |
| `end` | `down` or `ooa` |

The gang is applied first, then the fighter, then everything else, so a
parameter never gets overwritten by the fighter's seed.

### 3. Embedding with postMessage

An embedding page (an `<iframe>` of `index.html`) can drive it by message.
Every reply carries the request's `id` and `Tankiness.VERSION`.

| Send | Reply |
| --- | --- |
| `{ type: 'tankiness:rate', id, fighter, options }` | `{ type: 'tankiness:result', id, result }`, the same object `Tankiness.rate` returns |
| `{ type: 'tankiness:load', id, params }` | `{ type: 'tankiness:loaded', id, result }` after the page shows that set-up (`params` uses the URL parameter names; lists may be arrays) |
| `{ type: 'tankiness:ping', id }` | `{ type: 'tankiness:pong', id, version, poolVersion }` |
| anything that throws | `{ type: 'tankiness:error', id, error }` |

```js
const frame = document.querySelector('iframe').contentWindow;
window.addEventListener('message', e => { if (e.data.type === 'tankiness:result') console.log(e.data.result.enemyCredits); });
frame.postMessage({ type: 'tankiness:rate', id: 1, fighter: { profile: { T: 4, W: 2, sv: 5 }, cost: { base: 100 } }, options: { gang: 'goliath' } }, '*');
```

The page holds no secrets and stores nothing, so it answers any origin.

### The `rate` contract

The Node tests load the blocks headless through `test/load.mjs`, which
evaluates `engine`, `data` and `tankiness` in order; the bundles do the same
in one file.

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
//   enemyCredits: ECD, enemyCreditsPer100: ECD100,          // the headline: the enemy's cheapest plan
//   plan: { steps: [{ id, name, share, credits }, ...], battles },
//   bestTool: { id: 'plasma', name, attacker: { carrier, cost, hitsPerBattle, count, basis }, hits },
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
npm run test:fast   # sync, dist, engine, data and tankiness, no dependencies
npm run build       # regenerate dist/ after editing index.html
```

* `test/sync.test.mjs` — the engine and data blocks match the pinned upstream commit.
* `test/dist.test.mjs` — the library bundles in `dist/` match a fresh build of `index.html`, load with `import` and `require`, and rate exactly like the page.
* `test/engine.test.mjs`, `test/data.test.mjs`, `test/montecarlo.test.mjs` — the upstream suites, unchanged.
* `test/tankiness.test.mjs` — hand-worked chains (the 1.246 meltagun hits, the 3.6 laspistol hits, refractor burnout over four states, the bio-booster's two-dice pick, Scar Tissue, Adaptive Biology, Dodge, Iron Jaw, cover, Sv 2+), one-hit parity with the engine, the cost lines, the marginals, break-even, and availability under every gang and stage.
* `test/tankiness-montecarlo.test.mjs` — an independent dice simulator, sharing no code with the module, rolls hit after hit until Down and checks each H<sub>w</sub>, and the headline figure with each hit drawn from the mix, to within 1%.
* `test/browser.test.mjs` — loads the file over `file://` in Chromium and drives the real controls, including the URL parameters and the postMessage API. Skips itself if Playwright is not installed.

The tests read the `<script>` blocks straight out of `index.html`, so the
single file stays the only source of truth.

---

Unofficial fan-made tool. Necromunda is a trademark of Games Workshop Ltd.
Page references are to the N26 core rules and *The House of Chains*; no rules
text is reproduced here.
