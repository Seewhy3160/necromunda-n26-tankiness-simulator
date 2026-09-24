# Handover: Necromunda (N26) Tankiness Simulator

State of the project as of 24 September 2026, for whoever picks it up next.

## What it is

One offline HTML file that rates how hard a Necromunda fighter is to remove,
in credits of enemy gang, and what each piece of defensive gear is worth. It
is the defensive half of a planned loadout ranker; the attack simulator
(sibling repo) is the offensive half. The design started from the
"Tankiness Simulator, Design" document and moved on from it in three places,
listed under Decisions.

- Repo: https://github.com/Seewhy3160/necromunda-n26-tankiness-simulator, default branch `claude/fervent-euler-3i41he`
- Live page (once Pages is enabled, see Open items): https://seewhy3160.github.io/necromunda-n26-tankiness-simulator/
- Private preview that is live now: https://claude.ai/artifact/JjzUTmYfyweRX81SL4MYqS
- Sibling: https://github.com/Seewhy3160/necromunda-n26-attack-simulator (engine pinned at the commit in `upstream.json`)

## Layout

| Path | What |
| --- | --- |
| `index.html` | The whole app: CSS, `<script id="engine">` and `<script id="data">` (verbatim copies from the attack simulator), `<script id="tankiness">` (the module), `<script id="ui">` (the page) |
| `dist/tankiness.js`, `dist/tankiness.mjs` | Library bundles generated from the three non-UI blocks by `build.mjs`; committed so Pages and npm can serve them |
| `build.mjs` | `npm run build` regenerates `dist/`; `--check` reports drift |
| `analyse.mjs` | `node analyse.mjs --write` regenerates the tables between `<!-- generated:… -->` markers in the README |
| `upstream.json` | The attack simulator commit and block hashes the copies are pinned to |
| `test/` | `load.mjs` (evaluates page blocks headless), `sync`, `dist`, `engine`, `data`, `montecarlo` (the last three copied unchanged from upstream), `tankiness`, `tankiness-montecarlo`, `browser` |
| `.github/workflows/pages.yml` | Runs `npm run test:fast`, then deploys `index.html`, `.nojekyll` and `dist/` to GitHub Pages on every push to the default branch |
| `README.md` | User-facing explanation, generated reference tables, API summary |
| `API.md` | The contract for other programs |

Edit `index.html` only; then `npm run build`, `node analyse.mjs --write`,
`npm test`. The dist and sync tests exist precisely so nobody edits a copy.

## How to work on it

```sh
npm install          # Playwright, only for the browser test
npm run test:fast    # ~1 s: sync, dist, engine, data, tankiness
npm test             # ~5 s: adds both Monte Carlo suites and the browser test (Chromium)
npm run build        # after any change to the engine/data/tankiness blocks
node analyse.mjs --write   # after any change that moves the numbers
```

Commits so far all ran the full suite green before pushing (142 tests at
handover). The upstream engine and data blocks must never be edited here: a
rules fix belongs upstream, then re-copy the block and update `upstream.json`
(the sync test tells you the hash).

## How the rating works, briefly

1. **One hit** on a target state (wounds, condition, refractor burnt out,
   bio-booster used) is resolved exactly: wound roll, Dodge, one save (best of
   armour with cover and AP, other invulnerable, refractor 5+ with burnout on
   a natural 1), Damage (X), Injury dice with Scar Tissue and bio-booster,
   Blaze extra hit unless a hazard suit. Skills stop at 0 Wounds (p48).
   Vehicles differ only in Toxin needing a 6.
2. **Hits to Down** with one weapon is the expected number of such hits until
   Seriously Injured or Out of Action, solved as an absorbing chain (states
   only move forward, so one pass). Mixed hits (each drawn from the opponent
   profile) use the same solve with a mixed transition, and so does cover: by
   default each hit arrives on open ground, in cover at short range or in
   cover at long range, a third each, and `byCover` carries the rating at
   each fixed state beside the headline.
3. **Enemy credits to Down**: every pool weapon has an attacker package (a
   typical carrier plus the weapon, its cost, how many hits it lands per
   battle at its range with ammo uptime, and how many the reference gang
   fields). Credits for one tool = package cost × hits to Down ÷ hits per
   battle. The headline is the **cheapest plan**: tools in cost order, each
   capped at what its packages land in one battle, until the hits add up to
   a Down (progress counted linearly in each tool's own hits to Down). If the
   whole gang falls short, the cost scales by the battles needed.
4. **Gear marginals**: every item, selected or not, is rated with and without
   (armour and harness items swap within their group), in enemy credits, per
   100 credits of the item, with the break-even cost C\* = g ÷ (ratio − 1) and
   the gain per weapon class.

Hand-checks that anchor the maths: a Ganger takes 1.246 meltagun hits
(2+ to wound, no save, 3 dice → 26/27), 3.6 laspistol hits on open ground,
4.5 in +1 cover; a lasgun ganger (55c, 1.75 hits a battle) therefore costs
141 credit-battles to remove a Tek in cover.

## Decisions and why

1. **Enemy credits, not a Ganger-relative index.** The design doc's TI
   (×Ganger) was abstract, and plain hit counts treated a melta hit like a
   lasgun hit, which made 1-Wound chaff look good against weapons nobody
   would fire at it and gave no credit for soaking overflow damage. Pricing
   each hit by its attacker package and letting the enemy choose fixed both.
   The "cheapest tool" version was too blunt (Iron Flesh on a Forge Despot
   scored zero because plasma removes W3 and W4 alike), hence the
   capacity-limited plan.
2. **Cover is a mix by default.** The first cut fixed +1 (short-range
   cover) for every hit, which assumed the fighter is always in cover and
   every shooter is close; a fixed 0 or +2 assumes the opposite. Now each hit
   is drawn from open ground, short-range cover and long-range cover, a third
   each, in the same chain (not an average of three ratings); the fixed
   states stay selectable, and the page shows the whole rating under each
   state so it is plain how much of a fighter's worth rests on cover. The
   thirds are a judgement call, not a rule; `cover: { open, short, long }`
   sets other weights. All hand-worked tests pin cover 0.
3. **Reference gang as the default mix and the plan's capacities.** The
   per-role equal weighting from the design doc made 40% of hits plasma or
   melta. The package counts (one melta, one plasma, one bolter, one flamer,
   four lasguns, two stilettos, one each of chainsword, power sword, cleaver)
   give ~3% melta, 10% plasma, 10% bolt, 37% cheap guns, 37% melee.
4. **Rules readings taken from the core rules file, not memory**, with page
   references in the code: one item of armour with only the refractor
   combinable (p158, so reflec shroud and hazard suit share the armour slot),
   Parry and Shield do not stack (p164), Dodge not against Templates (p151),
   no skills when Injured (p48), partial harness −1 I (p159), Toxin vs
   vehicles (p165). The one judgement call: on a tie between armour and the
   refractor the fighter rolls the armour and keeps the field.
5. **Everything from one file.** Bundles and README tables are generated,
   never hand-edited, and tests enforce it.

## Assumptions to revisit

These are stated on the page's assumptions block and in the README; they are
the numbers most likely to be wrong for a given meta, and they move the
results more than any rules detail.

- Attacker packages: 40-credit gangers, 100-credit champions; Ammo (6+)
  uptime 0.55 and Ammo (3+) 0.75 (from the attack simulator's analysis);
  activations in range per battle by weapon range (melta 1.5 of 4, plasma
  and bolters 3, lasguns 3.5, templates 1.5, one charge for melee).
- Reference gang counts (above). A per-house reference gang would be more
  faithful now that Van Saar, Goliath, Delaque and Escher lists are in.
- The cover mix: a third of hits each on open ground, in short-range cover
  and in long-range cover. A per-weapon split by range band (a 6"/12" melta
  rarely fires from long range, a lasgun mostly does) would be more faithful,
  and the packages already carry the ranges.
- The plan counts progress linearly across tools; per-weapon hits to Down
  are exact but the mixing is first order.
- Core-type fighters (Ganger, Champion, Leader, Brute, Juve) carry the attack
  simulator's rounded S and I; all house fighters are transcribed.

## Data coverage

| Gang | Source | Fighters | Defensive list |
| --- | --- | --- | --- |
| House Van Saar | pp72–78 + Sept 2026 errata | 6 fighters, Cyberachnid, Arachni-Rig (vehicle) | mesh, refractor, Hystrar shield, bio-booster, respirator; light carapace (Gunner), refraction cloak (Sniper) |
| House Goliath | pp48–54 + House of Chains | Tyrant, Boss, Stimmer, Bruiser, Forge-Born (Iron Jaw), Bully, 'Zerker, Sumpkroc, Breaker, Gunner, Hauler, Patcher | mesh, refractor, respirator; gene-smithing |
| Furnace Brutes / Unborn | House of Chains | their leaders and champions plus the shared core fighters | as Goliath; Furnace Brutes have the Trading Post at creation |
| House Delaque | pp24–30 | 6 fighters, 3 Beasts/Pets | mesh, refractor, respirator |
| House Escher | pp36–42 | 6 fighters, Khimerix, 2 Pets | mesh, refractor, respirator |

Not rated, by design: anything acting between hits (stimm-slug stash,
Unstoppable, Medicate, Regeneration, Combat Chems, Counter-charge),
Suppression and Nerve, Lasting Injury and Lasting Damage, hit-roll traits.
The refraction cloak is reported as an evasion factor instead of in TI.

## Open items

1. **GitHub Pages is not enabled.** The workflow is in place and green through
   the tests, but the built-in token cannot create the Pages site. A repo
   admin must set Settings → Pages → Source: GitHub Actions once; then re-run
   the workflow (or push). Until then the private preview link above is the
   live page and the bundle URLs on github.io do not resolve.
2. **Per-house reference gangs.** The plan and mix use one generic reference
   gang. With four house lists transcribed, an opponent profile per house
   (and matching package counts) is the natural next step; the pool object
   already carries everything needed.
3. **The damage side.** `hitsToDown` per weapon and from the mix are the
   inputs the ranker needs; the attack simulator has the attacker's hits per
   activation. Combining them is the ranker's job and is not started.
4. **Arachni-Rig options footnote.** The transcription flags that the
   errata's flamer and harpoon options may or may not carry the "−1 Attacks"
   footnote; it does not affect this page.
5. **Default branch name.** The repo's default branch is
   `claude/fervent-euler-3i41he` because it was the first pushed. Renaming it
   to `main` is a one-line change in the workflow (it deploys the default
   branch) and nothing else.
6. **Ammo uptime.** The packages multiply hits per battle by a flat uptime
   (0.55 for Ammo (6+), 0.75 for Ammo (3+)) that came from the attack
   simulator's analysis text, not from the rules. It is the figure that
   decides the meltagun's rank: at 0.55 a melta champion costs 544 credits
   to Down a Van Saar Prime, behind a bolter ganger at 356 in +1 cover; at
   an uptime near 0.85 the two tie. Ammo only bites on the shots after a
   failed check, so a weapon that Downs in one hit suffers less than a flat
   factor says. The fix is to transcribe the N26 ammo-check trigger and
   reload rule (which dice call for the check) and replace the flat factor
   with the expected live shots at this target over a battle, per package.

## How to extend

- **A gang**: add an `EQUIPMENT_LISTS` entry (defensive item ids, `only`
  restrictions, `locked` for no-wargear fighters) and a `GANGS` entry with
  `GO(id, name, type, cost, T, W, sv, S, I, listId, extra)` per fighter
  (`extra`: `vehicle`, `beast`, `skills`, `note`). Pin the profiles in the
  "gang tables" test.
- **A defensive item**: add to `WARGEAR`/`SKILLS`/`GENE_SMITHING` with an
  `effects` object; numeric effects fold into the target, booleans switch a
  hook in `resolveHit`. Add the same rule to the Monte Carlo simulator in
  `test/tankiness-montecarlo.test.mjs` (it must not share code) and a
  hand-worked test.
- **A pool weapon**: add a `profileOf(...)` with its attacker package and
  count, give its role a weight in every named opponent profile, and add a
  column label in `ROLE_LABEL` / `ROLE_ORDER` (UI) and in `analyse.mjs`.
- **A rules change**: change `resolveHit` or the item effects, the simulator,
  and the tests together; cite the page in the code comment.
