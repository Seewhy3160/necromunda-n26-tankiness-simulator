# Necromunda (N26) Tankiness Simulator

One offline HTML file that answers one question: *how many hits from common
weapons does it take to put this fighter Down, and how much of that
survivability does each credit buy?*

Give it a fighter's Toughness, Wounds, Save and cost, tick the defensive gear
and skills it carries, and it returns:

* a **Tankiness Index (TI)** — a plain Ganger (T3, W1, Sv 6+) scores 100;
* **TI per 100 credits (TP100)** for the fighter's total cost;
* for every piece of defensive wargear, skill and Goliath gene-smithing option,
  the TI it would add, the TI per 100 credits spent on it, its break-even cost,
  and whether the fighter can actually buy it at this stage of the campaign.

Open `index.html` in a browser. There is no build step, no server, no network
request and nothing written to storage. It recomputes on every change.

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

**Scenario options:** cover (+1 / +2 to armour saves against shooting only;
invulnerable saves ignore it), the end state, and a named opponent profile
that re-weights the pool (default mix, plasma/melta heavy, melee rush, volume
fire).

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

Gangs transcribed so far: House Van Saar (default, Gang List pp72–78) and
House Goliath with its Furnace Brutes and Unborn variants (*The House of
Chains*). The core rules fighter types (Ganger, Champion, Leader, Brute, Juve)
are there too, with no list, so everything counts as available for them.

## Reference attack pool

Version `v1`. The pool is measured per hit, so each weapon counts only for its
hit profile, and weapons that share one merge: the plasma gun and pistol are
one entry, as are the laspistol and stub gun. Profiles are read from the
pinned Trading Post tables by name; the cleaver comes from the Goliath list.
Melee attackers are Strength 3.

| Role | Weapon(s) | Str / AP / L | Wound-side traits | Default weight |
| --- | --- | --- | --- | --- |
| Leader killer | Meltagun | 8 / −4 / 3 | Damage (3) | 1/10 |
| Leader killer + special | Plasma gun, plasma pistol | 5 / −2 / 2 | Damage (2) | 3/10 |
| Common template | Hand flamer | 3 / − / 1 | Blaze (5+), Template | 1/5 |
| Common throwaway | Laspistol, stub gun | 3 / − / 1 | – | 1/5 |
| Melee | Stiletto knife | − / − / 1 | Toxin (3+) | 1/20 |
| Melee | Chainsword | 3 / − / 1 | Shred (5+) | 1/20 |
| Melee | Power sword | 3 / −2 / 1 | Breaching (6+) | 1/20 |
| Melee | Cleaver (Goliath list) | 3 / −1 / 2 | – | 1/20 |

A TI is only comparable with another TI from the same pool, weights and
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

For weapon *w* that gives H<sub>w</sub>, the expected hits to Down from a fresh
fighter. TI is the weighted geometric mean of H<sub>w</sub> relative to the
Ganger's, times 100; the geometric mean stops one outlier (a Brute in heavy
carapace needing dozens of laspistol hits) from swamping the rating, and makes
the ratio of two TIs independent of the baseline. TP100 is 100 × TI ÷ (base +
weapons + other + defensive gear).

For each item the page also reports ΔTI, ΔTI per 100 credits spent on the
item, the gain against each weapon class, and the **break-even cost**
C\* = g ÷ (TI<sub>with</sub> ÷ TI<sub>without</sub> − 1): the item raises TP100
only on a fighter whose other costs exceed C\*. That is why defensive gear is
worth more on an expensive fighter, and why a cheap Tek should usually buy
nothing.

Hand check: a Ganger needs 1.246 meltagun hits on average. Each hit wounds on
2+ with no save (5/6), and 3 Injury dice give Serious Injury or Out of Action
with chance 1 − (2/6)³ = 26/27, so 1 ÷ (5/6 × 26/27).

## Reference figures

<!-- generated:stamp -->

Generated by `node analyse.mjs` from the module in `index.html` (pool v1).

<!-- /generated:stamp -->

All tables below are regenerated with `node analyse.mjs --write`. Do not
hand-edit them.

### Hits to Down

<!-- generated:hits -->

| Weapon | Weight | Ganger | Champion | Leader | Goliath champion | Brute |
|---|---|---|---|---|---|---|
| Meltagun | 10% | 1.25 | 1.25 | 1.25 | 1.25 | 2.45 |
| Plasma gun / pistol | 30% | 1.69 | 1.69 | 3.19 | 1.69 | 3.82 |
| Hand flamer | 20% | 3.14 | 5.99 | 8.25 | 8.99 | 20.81 |
| Laspistol / stub gun | 20% | 3.60 | 7.50 | 10.50 | 11.25 | 27.00 |
| Stiletto knife (S3) | 5% | 2.70 | 5.63 | 7.88 | 5.63 | 13.50 |
| Chainsword (S3) | 5% | 2.95 | 6.68 | 9.68 | 9.56 | 24.75 |
| Power sword (S3) | 5% | 3.00 | 5.00 | 7.00 | 7.50 | 14.73 |
| Cleaver (S3, Goliath) | 5% | 2.25 | 5.10 | 7.50 | 7.65 | 18.56 |

<!-- /generated:hits -->

### House Van Saar, creation-list options

Each cell is TI, then ΔTI per 100 credits spent on the item in brackets. Base
costs exclude weapons.

<!-- generated:vanSaar -->

| Fighter (credits) | No gear | + 'Hystrar' pattern energy shield (35) | + Refractor field (50) | + Mesh armour (40) | + Bio-booster (25) |
|---|---|---|---|---|---|
| Prime (115) | 226 | 279 (153) | 268 (84) | 236 (26) | 248 (88) |
| Augmek (95) | 152 | 188 (103) | 183 (62) | 159 (18) | 175 (91) |
| Archeotek (85) | 188 | 251 (179) | 212 (47) | 200 (30) | 217 (113) |
| Tek (30) | 100 | 112 (35) | 134 (68) | 103 (8) | 120 (79) |

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
| Forge Breaker (70) | 124 | 169 (148) | 141 (109) | 167 (84) | 172 (34) | 100 |
| Malformed (80) | 169 | 250 (272) | 188 (131) | 224 (110) | 234 (47) | 135 |
| Forge Master / Twice Born (105) | 190 | 282 (306) | 212 (148) | 229 (77) | 312 (87) | 152 |
| Forge Despot (140) | 282 | 350 (230) | 301 (132) | 334 (105) | 463 (130) | 226 |

<!-- /generated:goliath -->

Iron Flesh is the best buy in the tables: on a 2-wound fighter it adds almost
half again as much TI for 30 credits. Reduced Bone Density gives up about 20%
of TI to save 10 credits, which only improves TP100 on a fighter under about
50 credits.

### Core fighter types and every Trading Post item

<!-- generated:prototype -->

| Target | TI | Gear cost (credits) | ΔTI per 100 credits |
|---|---|---|---|
| Ganger (T3 W1 6+) | 100 | – | – |
| Ganger + refraction cloak | 100 | 40 | 0 |
| Ganger + respirator | 100 | 15 | 0 |
| Ganger + hazard suit | 103 | 10 | 28 |
| Ganger + mesh armour | 103 | 40 | 8 |
| Ganger + reflec shroud | 108 | 25 | 30 |
| Ganger + light carapace | 112 | 100 | 12 |
| Ganger + 'hystrar' pattern energy shield | 112 | 35 | 35 |
| Ganger + bio-booster | 120 | 25 | 79 |
| Ganger + servo-harness (partial) | 124 | 100 | 24 |
| Ganger + servo-harness (full) | 124 | 130 | 19 |
| Ganger + refractor field | 134 | 50 | 68 |
| Ganger + heavy carapace | 138 | 140 | 27 |
| Champion (T3 W2 5+) | 152 | – | – |
| Champion + refraction cloak | 152 | 40 | 0 |
| Champion + respirator | 152 | 15 | 0 |
| Champion + hazard suit | 159 | 10 | 70 |
| Champion + mesh armour | 159 | 40 | 18 |
| Champion + bio-booster | 175 | 25 | 91 |
| Champion + reflec shroud | 179 | 25 | 107 |
| Champion + refractor field | 183 | 50 | 62 |
| Champion + light carapace | 188 | 100 | 36 |
| Champion + 'hystrar' pattern energy shield | 188 | 35 | 103 |
| Champion + servo-harness (partial) | 190 | 100 | 38 |
| Champion + servo-harness (full) | 190 | 130 | 29 |
| Champion + heavy carapace | 251 | 140 | 71 |
| Brute (T4 W4 4+) | 433 | – | – |
| Brute + refraction cloak | 433 | 40 | 0 |
| Brute + respirator | 433 | 15 | 0 |
| Brute + hazard suit | 457 | 10 | 232 |
| Brute + mesh armour | 460 | 40 | 67 |
| Brute + bio-booster | 469 | 25 | 141 |
| Brute + refractor field | 481 | 50 | 96 |
| Brute + servo-harness (partial) | 483 | 100 | 50 |
| Brute + servo-harness (full) | 483 | 130 | 38 |
| Brute + reflec shroud | 541 | 25 | 432 |
| Brute + light carapace | 577 | 100 | 144 |
| Brute + 'hystrar' pattern energy shield | 577 | 35 | 412 |
| Brute + heavy carapace | 658 | 140 | 160 |

<!-- /generated:prototype -->

### Matchups on a Champion (T3 W2 5+), campaign stage

The gain in hits to Down against each weapon class, the overall TI multiplier,
and the break-even cost.

<!-- generated:matchup -->

| Item (credits) | Melta | Plasma | Hand flamer | Las / stub | Melee | TI × | Break-even C* (credits) |
|---|---|---|---|---|---|---|---|
| Reflec shroud (25) | +50% | +50% | 0% | 0% | 0% | 1.18 | 142 |
| 'Hystrar' pattern energy shield (35) | 0% | +20% | +31% | +33% | +26% | 1.24 | 148 |
| Bio-booster (25) | +7% | +22% | +13% | +13% | +13% | 1.15 | 166 |
| Heavy carapace (140) | 0% | +50% | +94% | +100% | +71% | 1.65 | 216 |
| Hazard suit (10) | 0% | 0% | +25% | 0% | 0% | 1.05 | 218 |
| Refractor field (50) | +50% | +48% | 0% | 0% | +14% | 1.20 | 246 |
| Servo-harness (partial) (100) | 0% | 0% | +50% | +50% | +34% | 1.25 | 405 |
| Light carapace (100) | 0% | +20% | +31% | +33% | +26% | 1.24 | 422 |
| Servo-harness (full) (130) | 0% | 0% | +50% | +50% | +34% | 1.25 | 527 |
| Mesh armour (40) | 0% | 0% | 0% | 0% | +26% | 1.05 | 853 |

<!-- /generated:matchup -->

Armour, the shield and the servo-harness protect against no-AP weapons; the
refractor and reflec protect against plasma and melta. Only a better save
works against the stiletto, because Toxin ignores Toughness.

### Cover changes the ranking

Cover never affects an invulnerable save, so the no-cover default flatters the
refractor field. The more of the game a fighter spends in cover, the more
carapace catches up.

<!-- generated:cover -->

| Champion, ranged cover bonus | Refractor field (50): TI × / C* | 'Hystrar' pattern energy shield (35): TI × / C* | Light carapace (100): TI × / C* | Heavy carapace (140): TI × / C* |
|---|---|---|---|---|
| None (default) | 1.20 / 246 | 1.24 / 148 | 1.24 / 422 | 1.65 / 216 |
| +1 | 1.14 / 355 | 1.31 / 112 | 1.31 / 320 | 1.55 / 255 |
| +2 | 1.07 / 724 | 1.16 / 216 | 1.16 / 616 | 1.43 / 327 |

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
//   ti: 253.7, tp100: 65.9, hitsToDown: 6.01,
//   cost: { base: 95, weapons: 140, other: 0, defensive: 150, total: 385 },
//   perProfile: [{ id: 'meltagun', name, role, weight, hits, pDownFirst, vsGanger }, ...],
//   evasion: { ranged: 1 },
//   gear: [{ id: 'refractor', name, cost, kind, selected, available, availability, availabilityNote,
//            tiWith, tiWithout, dTi, ratio, dTp100, breakEven, breakEvenDirection,
//            byRole: { leaderKiller, special, template, throwaway, melee } }, ...],
//   problems: [], notes: [...], unmodelled: [],
//   poolVersion: 'v1', options: { endState, opponent, mode, cover, gang, equipmentList }
// }
```

`gear` covers every rateable item whether or not it is on the fighter, so the
ranker can ask what adding or dropping each one would do. An item in an
exclusive group (one suit of armour, one servo-harness) swaps in for the one
worn. `available` is false for items the fighter cannot buy at this stage;
the ranker should only recommend available items. The ranker should refuse
to mix `poolVersion`s.

Also exported: `hitsToDown(profile, target, options)`, `effectiveTarget`,
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
* `test/tankiness-montecarlo.test.mjs` — an independent dice simulator, sharing no code with the module, rolls hit after hit until Down and checks each H<sub>w</sub> to within 1%.
* `test/browser.test.mjs` — loads the file over `file://` in Chromium and drives the real controls. Skips itself if Playwright is not installed.

The tests read the `<script>` blocks straight out of `index.html`, so the
single file stays the only source of truth.

---

Unofficial fan-made tool. Necromunda is a trademark of Games Workshop Ltd.
Page references are to the N26 core rules and *The House of Chains*; no rules
text is reproduced here.
