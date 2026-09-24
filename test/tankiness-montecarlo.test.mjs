/* An independent dice simulator, written from the rules text and sharing no
   code with the module: it rolls hit after hit until the fighter is Down and
   averages the count. Each expected-hits figure must agree to within 1%. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAll } from './load.mjs';

const { Tankiness: T } = loadAll();
const TRIALS = 300_000;
const TOL = 0.01;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function woundTarget(S, Tn) {
  if (S >= 2 * Tn) return 2;
  if (S > Tn) return 3;
  if (S === Tn) return 4;
  if (2 * S <= Tn) return 6;
  return 5;
}

/* One fighter, hit until Down. `pick` returns the weapon profile for each
   hit: a fixed one, or one drawn from the enemy mix. */
function simulate(pick, t, opts, trials, seed) {
  const rand = rng(seed);
  const d6 = () => 1 + Math.floor(rand() * 6);
  /* Injury dice: 1-2 Flesh Wound (1), 3-5 Seriously Injured (2), 6 Out of Action (3). */
  const injuryDie = () => { const f = d6(); return f === 6 ? 3 : (f <= 2 ? 1 : 2); };
  const isDown = () => opts.endState === 'ooa' ? cond === 3 : cond >= 2;
  let w, cond, burnt, bioUsed;

  function oneHit(allowBlaze, prof) {
    if (cond === 3) return;
    const skills = cond === 0;   // an Injured fighter gains no benefit from skills (p48)
    let Tn = t.T;
    if (t.ironJaw && skills && prof.melee && prof.ap === 0) Tn += 2;
    const need = prof.toxin ? prof.toxin : woundTarget(prof.str, Tn);
    let face = d6();
    let wounds = face >= need;
    if (wounds && prof.toxin && t.adaptiveBiology) { face = d6(); wounds = face >= need; }
    const blaze = prof.blaze && face >= prof.blaze && !t.hazardSuit;
    const canDodge = t.dodge && skills && !prof.template && !prof.blast;   // p151
    if (wounds && !(canDodge && d6() === 6)) {
      const rending = prof.rending && face >= prof.rending;
      const shred = prof.shred && face >= prof.shred;
      const breaching = prof.breaching && face >= prof.breaching;
      let ap = prof.ap;
      if (t.reflec && !prof.melee && ['las', 'plasma', 'melta'].includes(prof.family)) ap = 0;
      const mods = ap + (rending ? -1 : 0) + (prof.melee
        ? t.meleeSave + (t.parry ? 1 : 0)
        : t.rangedSave + (t.shield ? 1 : 0) + opts.cover);
      const armourNeed = (!breaching && !prof.gas && t.sv) ? Math.max(3, t.sv - mods) : 99;
      let inv = t.inv;
      if (prof.gas && t.respirator) inv = inv ? Math.min(inv, 5) : 5;
      const invNeed = inv ? Math.max(3, inv) : 99;
      const fieldNeed = (t.refractor && !burnt) ? 5 : 99;
      const other = Math.min(armourNeed, invNeed);
      let saved;
      if (fieldNeed < other) {
        const r = d6();
        saved = r >= fieldNeed;
        if (r === 1) burnt = true;
      } else {
        saved = other <= 6 && d6() >= other;
      }
      if (!saved) {
        w = Math.max(0, w - prof.damage);
        if (w === 0) {
          let L = prof.lethality + (shred ? 1 : 0);
          if (t.scarTissue && L > 1) L -= 1;
          let bearerPicks = false;
          if (t.bioBooster && !bioUsed && L >= 1) { bioUsed = true; L -= 1; bearerPicks = L === 0; }
          let result;
          if (bearerPicks) result = Math.min(injuryDie(), injuryDie());
          else if (L === 0) result = 1;
          else { result = 0; for (let i = 0; i < L; i++) result = Math.max(result, injuryDie()); }
          if (result === 3) cond = 3; else cond = Math.max(cond, result);
        }
      }
    }
    if (blaze && allowBlaze) oneHit(false, prof);
  }

  let total = 0;
  for (let i = 0; i < trials; i++) {
    w = t.W; cond = 0; burnt = false; bioUsed = false;
    let n = 0;
    while (!isDown()) { n++; oneHit(true, pick(rand)); }
    total += n;
  }
  return total / trials;
}

const prof = (id) => T.POOL_V1.profiles.find(x => x.id === id);
const fixed = (id) => () => prof(id);
/* Draw a weapon from the pool by its weight under a named opponent profile. */
function mixPicker(opponent) {
  const weights = T.poolWeights(T.POOL_V1, opponent);
  return (rand) => {
    let r = rand();
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return T.POOL_V1.profiles[i]; }
    return T.POOL_V1.profiles[weights.length - 1];
  };
}
const items = (ids) => ids.map(id => T.ITEMS.find(x => x.id === id));
const tgt = (profile, ids = []) => T.effectiveTarget(Object.assign({ S: 3, I: 4, inv: 0 }, profile), items(ids));

const CASES = [
  ['Ganger vs meltagun', 'meltagun', tgt({ T: 3, W: 1, sv: 6 }), {}],
  ['Champion vs plasma', 'plasma', tgt({ T: 3, W: 2, sv: 5 }), {}],
  ['Brute in heavy carapace (Sv 2+) vs laspistol', 'lasStub', tgt({ T: 4, W: 4, sv: 4 }, ['heavyCarapace']), {}],
  ['Ganger with a refractor field vs meltagun (burnout)', 'meltagun', tgt({ T: 3, W: 1, sv: 6 }, ['refractor']), {}],
  ['Champion with refractor and 4+ armour vs plasma', 'plasma', tgt({ T: 3, W: 2, sv: 4 }, ['refractor']), {}],
  ['Champion with a bio-booster vs plasma', 'plasma', tgt({ T: 3, W: 2, sv: 5 }, ['bioBooster']), {}],
  ['Champion with a bio-booster vs laspistol (bearer picks)', 'lasStub', tgt({ T: 3, W: 2, sv: 5 }, ['bioBooster']), {}],
  ['Forge Despot with Scar Tissue vs cleaver', 'cleaver', tgt({ T: 4, W: 3, sv: 5 }, ['scarTissue']), {}],
  ['Forge Master with Adaptive Biology vs stiletto', 'stiletto', tgt({ T: 4, W: 2, sv: 5 }, ['adaptiveBiology']), {}],
  ['Dodge and Iron Jaw vs chainsword (Shred)', 'chainsword', tgt({ T: 3, W: 2, sv: 5 }, ['dodge', 'ironJaw']), {}],
  ['Dodge vs a hand flamer (Template: no dodge)', 'handFlamer', tgt({ T: 3, W: 2, sv: 5 }, ['dodge']), {}],
  ['Hystrar shield plus a parry weapon vs chainsword (no stacking)', 'chainsword', tgt({ T: 3, W: 2, sv: 5 }, ['hystrarShield', 'parryWeapon']), {}],
  ['hand flamer with Blaze vs Ganger', 'handFlamer', tgt({ T: 3, W: 1, sv: 6 }), {}],
  ['hand flamer vs a hazard suit', 'handFlamer', tgt({ T: 3, W: 2, sv: 5 }, ['hazardSuit']), {}],
  ['reflec shroud vs plasma', 'plasma', tgt({ T: 3, W: 2, sv: 5 }, ['reflecShroud']), {}],
  ['Hystrar shield in +2 cover vs hand flamer', 'handFlamer', tgt({ T: 3, W: 2, sv: 5 }, ['hystrarShield']), { cover: 2 }],
  ['power sword (Breaching) vs mesh armour and a refractor', 'powerSword', tgt({ T: 3, W: 2, sv: 5 }, ['meshArmour', 'refractor']), {}],
  ['Out of Action only: Prime vs plasma', 'plasma', tgt({ T: 3, W: 3, sv: 5 }), { endState: 'ooa' }],
  ['everything on: heavy carapace, refractor, bio-booster, dodge, scar tissue vs meltagun', 'meltagun',
    tgt({ T: 4, W: 3, sv: 5 }, ['heavyCarapace', 'refractor', 'bioBooster', 'dodge', 'scarTissue']), {}]
];

let seed = 0x9e3779b9;
for (const [name, weapon, t, o] of CASES) {
  const opts = Object.assign({ endState: 'down', cover: 0 }, o);
  test(`monte carlo, hits to Down: ${name}`, () => {
    const exact = T.hitsToDown(prof(weapon), t, opts).hits;
    const sim = simulate(fixed(weapon), t, opts, TRIALS, seed += 0x85ebca6b);
    assert.ok(Math.abs(exact - sim) / exact < TOL,
      `${name}: exact ${exact.toFixed(4)} vs simulated ${sim.toFixed(4)}`);
  });
}

/* The headline: every hit drawn from the enemy weapon mix. */
const MIX_CASES = [
  ['Ganger, default mix', { T: 3, W: 1, sv: 6 }, [], 'default', {}],
  ['Champion with a refractor field, default mix', { T: 3, W: 2, sv: 5 }, ['refractor'], 'default', {}],
  ['Prime with a Hystrar shield and Dodge, melee rush', { T: 3, W: 3, sv: 5 }, ['hystrarShield', 'dodge'], 'meleeRush', {}],
  ['Forge Despot with heavy carapace and a bio-booster, plasma/melta heavy, +1 cover', { T: 4, W: 3, sv: 5 }, ['heavyCarapace', 'bioBooster'], 'plasmaMelta', { cover: 1 }],
  ['Brute, volume fire, Out of Action only', { T: 4, W: 4, sv: 4 }, [], 'volumeFire', { endState: 'ooa' }]
];
for (const [name, profile, ids, opponent, o] of MIX_CASES) {
  test(`monte carlo, hits to Down from the weapon mix: ${name}`, () => {
    const r = T.rate({ profile: Object.assign({ S: 3, I: 4, inv: 0 }, profile), wargear: ids.filter(id => T.WARGEAR.some(w => w.id === id)),
      skills: ids.filter(id => T.SKILLS.some(s => s.id === id)) }, Object.assign({ opponent, gang: null, cover: 0 }, o));
    const opts = Object.assign({ endState: 'down', cover: 0 }, o);
    const sim = simulate(mixPicker(opponent), tgt(profile, ids), opts, TRIALS, seed += 0x85ebca6b);
    assert.ok(Math.abs(r.hitsToDown - sim) / r.hitsToDown < TOL,
      `${name}: exact ${r.hitsToDown.toFixed(4)} vs simulated ${sim.toFixed(4)}`);
  });
}
