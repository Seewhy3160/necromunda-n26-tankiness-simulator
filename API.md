# Tankiness Simulator API

Reference for programs that call the tankiness module: the loadout ranker,
the attack simulator, the list builder. The README explains what the numbers
mean; this file is the contract.

Everything here comes from one source, the `<script id="tankiness">` block in
`index.html`. The bundles in `dist/` are generated from it (`npm run build`),
the page's URL parameters and messages drive the same function, and the test
suite fails if any of them drifts.

## Getting the module

| Route | How |
| --- | --- |
| Browser, classic script | `<script src="https://seewhy3160.github.io/necromunda-n26-tankiness-simulator/dist/tankiness.js"></script>` then `Tankiness`, `Engine`, `Data` are globals |
| Browser, ES module | `import Tankiness, { Engine, Data } from 'https://seewhy3160.github.io/necromunda-n26-tankiness-simulator/dist/tankiness.mjs'` |
| Node, from GitHub | `npm install github:Seewhy3160/necromunda-n26-tankiness-simulator` then `require('necromunda-n26-tankiness-simulator')` or `import Tankiness from '...'` |
| Node, from a checkout | `require('./dist/tankiness.js')` or `import Tankiness from './dist/tankiness.mjs'`; or `loadAll()` from `test/load.mjs` to evaluate the page blocks directly |
| The page itself | URL parameters or `postMessage`, below |

No network, no storage, no dependencies. The bundles are about 78 KB each.

## Versioning

- `Tankiness.VERSION`: the package version (`package.json`), currently `1.0.0`.
  The public contract below changes only with a version bump.
- `Tankiness.POOL_VERSION` and `result.poolVersion`: the reference pool
  version, currently `v1`. Figures are only comparable within one pool
  version, one opponent profile and one scenario (`result.options`). A
  caller should refuse to compare or combine results whose `poolVersion` or
  `options` differ.
- `upstream.json`: the attack simulator commit the `Engine` and `Data`
  blocks are pinned to.

## `Tankiness.rate(fighter, options) → result`

Pure and synchronous. About 2 ms per call. Throws only on an unknown gang or
opponent profile; unknown item ids are reported in `result.problems`.

### `fighter`

```js
{
  profile: { T: 3, W: 2, sv: 5, inv: 0, S: 3, I: 3, vehicle: false },
  wargear: ['refractor', 'hystrarShield'],   // ids from Tankiness.WARGEAR
  skills: ['dodge'],                          // ids from Tankiness.SKILLS
  geneSmithing: ['ironFlesh'],                // ids from Tankiness.GENE_SMITHING
  cost: { base: 95, weapons: 140, other: 0 }  // credits; defensive gear is added from the tables
}
```

| Field | Meaning | Default |
| --- | --- | --- |
| `profile.T`, `W` | Toughness, Wounds (1–10; W up to 20 after items) | 3, 1 |
| `profile.sv` | Save target, `0` for none (`6` means 6+) | 6 |
| `profile.inv` | Invulnerable save target, `0` for none | 0 |
| `profile.S`, `I` | Strength, Initiative (only Graviton Pulse and Flash use them; neither is in pool v1) | 3, 4 |
| `profile.vehicle` | Vehicle: hits resolve as for a fighter, Toxin wounds only on a natural 6 | false |
| `wargear`, `skills`, `geneSmithing` | Item ids (below). Duplicates ignored; unknown ids reported | `[]` |
| `cost.base`, `weapons`, `other` | Credits; `defensive` is computed from the selected items | 0 |

A fighter entry from `Tankiness.GANGS[gang].fighters` can be passed as
`profile` directly (it carries `T`, `W`, `sv`, `S`, `I`, `vehicle`).

### `options`

| Option | Values | Default |
| --- | --- | --- |
| `gang` | `'vanSaar'`, `'goliath'`, `'furnaceBrutes'`, `'unborn'`, `'delaque'`, `'escher'`, `'generic'`, or `null` for none | `'vanSaar'` |
| `equipmentList` | id from `Tankiness.EQUIPMENT_LISTS` (`'vanSaar'`, `'goliath'`, `'furnaceBrutes'`, `'unborn'`, `'delaque'`, `'escher'`, `'none'`), or `null` for unknown | the gang's list |
| `mode` | `'creation'` (Equipment List only) or `'campaign'` (list + Trading Post) | `'creation'` |
| `cover` | `'mix'`: each hit drawn from open ground, short-range cover and long-range cover, a third each; `0`, `1`, `2`: every hit in that state (the bonus to armour saves against shooting, p76; invulnerable saves ignore it); or `{ open, short, long }` weights | `'mix'` |
| `endState` | `'down'` (Seriously Injured or Out of Action) or `'ooa'` | `'down'` |
| `opponent` | `'referenceGang'`, `'default'`, `'plasmaMelta'`, `'meleeRush'`, `'volumeFire'`, or a `{ role: weight }` object | `'referenceGang'` |
| `geneSmithing` | `true`/`false` override; Beasts take none | the gang's setting |
| `pool` | a custom pool object (see Custom pools) | `Tankiness.POOL_V1` |

The list follows the fighter entry, not the gang: pass
`equipmentList: fighter.equipmentList` when rating a picked fighter (Furnace
Brutes and Unborn fighters buy from their variant list; Beasts, Pets and the
Arachni-Rig use `'none'`).

### `result`

```js
{
  // headline: the enemy's cheapest plan
  enemyCredits: 208,            // credit-battles of the reference enemy gang needed to put the fighter Down
  enemyCreditsPer100: 219,      // 100 x enemyCredits / cost.total, or null when cost.total is 0
  plan: { steps: [{ id: 'plasma', name, share: 0.91, credits: 168 }, ...], battles: 1 },
  bestTool: { id: 'plasma', name, attacker: { carrier, carrierCost, weaponCost, cost, hitsPerBattle, count, basis }, hits: 2.02 },

  // target-side figures for the ranker
  hitsToDown: 5.37,             // expected hits to Down, every hit drawn from the opponent mix
  pDownFirst: 0.18,             // chance a single mixed hit Downs a fresh fighter
  hitsPer100: 5.65,             // 100 x hitsToDown / cost.total, or null
  ti: 193.1, tp100: 203.3,      // hitsToDown relative to a plain Ganger x 100, and per 100 credits
  gangerHits: 2.78,             // the plain Ganger's hitsToDown under the same options

  cost: { base: 95, weapons: 0, other: 0, defensive: 0, total: 95 },

  perProfile: [{                // one per pool weapon, in pool order
    id: 'meltagun', name, role, family, cost: '140', weight: 0.03,
    attacker: { ... },          // the package behind the weapon
    hits: 1.25,                 // hits to Down with this weapon alone
    pDownFirst: 0.80,
    vsGanger: 1.00, gangerHits: 1.25,
    enemyCredits: 544,          // attacker.cost x hits / attacker.hitsPerBattle
    cheapest: false,            // first step of the plan
    planShare: 0                // share of the plan carried by this weapon
  }, ...],

  byCover: [{                   // the whole rating with every hit in one cover state, for 0, 1 and 2
    cover: 0, weight: 0.333,    // weight: that state's share of hits under the cover option in use
    enemyCredits: 310, enemyCreditsPer100: 270,
    plan: { steps, battles }, bestTool: { id, name },
    hitsToDown: 6.46, pDownFirst: 0
  }, ...],

  gear: [{                      // one per rateable item, whether or not it is on the fighter
    id: 'refractor', name, kind: 'wargear'|'skill'|'gene', group, cost: 50, text,
    selected: false,
    available: true, availability: 'list'|'tradingPost'|'unavailable'|'unknown'|'skill'|'weapon'|'recruitment', availabilityNote,
    enemyCreditsWith: 249, enemyCreditsWithout: 208, dEnemyCredits: 41, dEnemyCreditsPer100: 82,
    bestToolWith: 'boltgun',    // the plan's first tool once the item is on
    hitsWith, hitsWithout, dHits, dHitsPer100,
    tiWith, tiWithout, dTi, dTp100,
    ratio: 1.20,                // enemyCreditsWith / enemyCreditsWithout
    breakEven: 250, breakEvenDirection: 'above'|'below'|null,   // C* in credits; null when the item never pays
    byRole: { leaderKiller: 0.5, special: 0.48, bolt: 0, template: 0, throwaway: 0, melee: 0.14 }   // gain in hits per class
  }, ...],

  target: { ... },              // the effective target after items (T, W, sv, inv, flags)
  evasion: { ranged: 1 },       // share of ranged, non-Template hits kept (refraction cloak: 0.75)
  problems: [],                 // things that make the result unreliable (unknown ids, two suits of armour)
  notes: [],                    // things the caller should know (skills off when Injured, vehicle rule)
  unmodelled: [],               // selected items the engine does not rate (refraction cloak)
  poolVersion: 'v1',
  options: { endState, opponent, mode, cover, coverMix, gang, equipmentList, geneSmithing }   // coverMix: the { open, short, long } weights in use
}
```

Semantics the ranker should rely on:

- `enemyCredits` is the headline. `hitsToDown` is the figure to multiply by
  an attacker's hits per activation. Both are exact for the chain; the plan's
  mixing of tools counts progress linearly in each tool's own hits to Down.
- Gear marginals are "with minus without" whether or not the item is
  selected. An item in an exclusive group (armour: light and heavy carapace,
  mesh, reflec shroud, hazard suit; harness: partial and full) swaps in for
  the one worn.
- `available` is what the fighter may buy at this stage; an off-list item on
  the fighter is still rated. The ranker should only recommend available
  items.
- Selected skills stop working once the fighter is Injured (0 Wounds); Dodge
  never cancels a Template or Blast hit. Both are inside the numbers.

## Other exports

| Export | Purpose |
| --- | --- |
| `hitsToDown(profile, target, options)` | `{ hits, pDownFirst }` for one pool profile against an effective target (from `effectiveTarget`) |
| `expectedHits(mix, target, options)` | the same for a weighted mix `[{ prof, weight }, ...]` |
| `effectiveTarget(profile, items)` | folds item objects into a target |
| `resolveHit(stateId, prof, target, options, allowBlaze)` | one hit as a `Map<stateId, probability>`; `enc`/`dec` pack and unpack states |
| `poolWeights(pool, opponent)` | per-profile weights for a named or custom opponent |
| `availability(item, normalisedOptions)` | the availability rule on its own |
| `WARGEAR`, `SKILLS`, `GENE_SMITHING`, `ITEMS` | item tables (id, name, cost, kind, group, effects, text) |
| `POOL_V1`, `OPPONENTS`, `GANGS`, `EQUIPMENT_LISTS`, `GANGER` | data tables |

## Item ids

| Wargear | Cost | Group |
| --- | --- | --- |
| `lightCarapace` | 100 | armour |
| `heavyCarapace` | 140 | armour |
| `meshArmour` | 40 | armour |
| `reflecShroud` | 25 | armour |
| `hazardSuit` | 10 | armour |
| `refractor` | 50 | field (combines with armour) |
| `refractionCloak` | 40 | field (Van Saar; evasion only) |
| `respirator` | 15 | other |
| `bioBooster` | 25 | other |
| `servoHarnessPartial` | 100 | other (harness) |
| `servoHarnessFull` | 130 | other (harness) |
| `hystrarShield` | 35 | weapon (Van Saar) |
| `parryWeapon` | 0 | weapon carried |
| `shieldWeapon` | 0 | weapon carried |

| Skills | | Gene-smithing (Goliath) | Cost |
| --- | --- | --- | --- |
| `dodge` | Agility | `ironFlesh` | 30 |
| `ironJaw` | Brawn | `scarTissue` | 15 |
| | | `adaptiveBiology` | 15 |
| | | `reducedBoneDensity` | −10 |

## Gangs and fighter ids

`Tankiness.GANGS[gang].fighters[]` entries carry `id`, `name`, `type`, `cost`,
`T`, `W`, `sv`, `S`, `I`, `equipmentList`, and optionally `vehicle`, `beast`,
`skills` (skills the fighter comes with) and `note`.

| Gang | Fighter ids |
| --- | --- |
| `vanSaar` | `vsPrime`, `vsAugmek`, `vsArcheotek`, `vsTek`, `vsNeotek`, `vsSubtek`, `vsCyberachnid`, `vsArachniRig` |
| `goliath` | `goTyrant`, `goBoss`, `goStimmer`, `goBruiser`, `goBreaker`, `goGunner`, `goHauler`, `goPatcher`, `goForgeBorn`, `goBully`, `goZerker`, `goSumpkroc` |
| `furnaceBrutes` | `fbDespot`, `fbBoss`, `fbMaster`, `fbStimmer`, `fbBreaker`, `fbHauler`, `fbPatcher`, `fbBruiser`, `fbForgeBorn`, `fbBully`, `fbZerker`, `fbSumpkroc` |
| `unborn` | `ubDoc`, `ubTwiceBorn`, `ubBoss`, `ubStimmer`, `ubMalformed`, `ubGunner`, `ubPatcher`, `ubBruiser`, `ubForgeBorn`, `ubBully`, `ubZerker`, `ubSumpkroc` |
| `delaque` | `dqMaster`, `dqPhantom`, `dqNachtGhul`, `dqGhost`, `dqPsyGheist`, `dqShadow`, `dqPiscean`, `dqCephalopod`, `dqWyrm` |
| `escher` | `esQueen`, `esMatriarch`, `esDeathMaiden`, `esSister`, `esWyldRunner`, `esLittleSister`, `esKhimerix`, `esPhyrrCat`, `esPhelynx` |
| `generic` | `genGanger`, `genChampion`, `genLeader`, `genJuve`, `genBrute` (no costs, no list) |

## Pool v1

`Tankiness.POOL_V1.profiles[]`: `meltagun`, `plasma`, `boltgun`, `handFlamer`,
`lasStub`, `stiletto`, `chainsword`, `powerSword`, `cleaver`. Each has the hit
profile (`str`, `ap`, `lethality`, `damage`, wound-side traits, `template`,
`melee`), a `role`, a `family` (for the reflec shroud), a display `cost`, and
an `attacker` package `{ carrier, carrierCost, weaponCost, cost, hitsPerBattle,
count, basis }`. `POOL_V1.weights` holds the named opponent profiles by role;
`referenceGang` is derived from the packages' counts.

Roles: `leaderKiller`, `special`, `bolt`, `template`, `throwaway`, `melee`.

### Custom pools

Pass `options.pool` as `{ version, meleeStrength, roles: [{ id, name }],
profiles: [...], weights: { name: { role: weight } } }`. Profiles need the
fields above; `attacker` may be omitted, in which case `enemyCredits`,
`plan` and `bestTool` are `null` and only the hits figures are returned. A
custom pool's first weight set is the default opponent. The result's
`poolVersion` is the custom version string.

## URL parameters

`index.html?…` loads a set-up; the page's "Link to this set-up" field shows
the current one and the address bar follows it over HTTP.

| Parameter | Values |
| --- | --- |
| `gang` | gang id |
| `fighter` | fighter id (seeds profile, cost and the skills it comes with) |
| `T`, `W`, `sv`, `inv`, `S`, `I`, `vehicle` | profile fields; explicit values win over the seed (`vehicle=1`) |
| `base`, `weapons`, `other` | credits |
| `wargear`, `skills`, `gene` | comma-separated item ids |
| `mode` | `creation`, `campaign` |
| `opponent` | opponent id |
| `cover` | `mix`, `0`, `1`, `2` |
| `end` | `down`, `ooa` |

Order of application: gang, then fighter, then everything else.

## postMessage

For an embedded `index.html`. Every reply carries the request's `id` and
`version`.

| Request | Reply |
| --- | --- |
| `{ type: 'tankiness:rate', id, fighter, options }` | `{ type: 'tankiness:result', id, result, version }` |
| `{ type: 'tankiness:load', id, params }` | `{ type: 'tankiness:loaded', id, result, version }`; `params` uses the URL names, lists may be arrays |
| `{ type: 'tankiness:ping', id }` | `{ type: 'tankiness:pong', id, version, poolVersion }` |
| a request that throws | `{ type: 'tankiness:error', id, error }` |

The page answers any origin; it holds no secrets and stores nothing.

## Guarantees and tests

- `test/dist.test.mjs`: the bundles equal a fresh build of `index.html`, load
  under `import` and `require`, and return the same result object as the page.
- `test/sync.test.mjs`: `Engine` and `Data` equal the pinned upstream commit.
- `test/tankiness.test.mjs`: hand-worked chains, one-hit parity with the
  engine to 1e-12, the plan recomputed independently, availability under
  every gang and stage, every transcribed profile pinned.
- `test/tankiness-montecarlo.test.mjs`: an independent dice simulator agrees
  with every hits figure, single weapon and mixed, to within 1%.
- `test/browser.test.mjs`: the page, the URL parameters and the messages,
  driven in Chromium.
