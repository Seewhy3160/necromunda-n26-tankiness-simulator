/* The tankiness maths, checked against hand-worked figures and against the
   pinned engine for the one-hit case. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAll } from './load.mjs';

const { Engine, Data, Tankiness: T } = loadAll();
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !== ${b}`);
const pool = T.POOL_V1;
const prof = (id) => { const p = pool.profiles.find(x => x.id === id); assert.ok(p, id); return p; };
const opts = (o = {}) => Object.assign({ endState: 'down', cover: 0 }, o);
const tgt = (profile, items = []) => T.effectiveTarget(Object.assign({ S: 3, I: 4, inv: 0 }, profile), items.map(id => T.ITEMS.find(x => x.id === id)));
const hits = (profile, weapon, items = [], o = {}) => T.hitsToDown(prof(weapon), tgt(profile, items), opts(o)).hits;
const rate = (profile, extra = {}, o = {}) => T.rate(Object.assign({ profile, cost: { base: 30 } }, extra), o);

const GANGER = { T: 3, W: 1, sv: 6 };
const CHAMPION = { T: 3, W: 2, sv: 5 };

/* ---- baseline and hand-worked chains ------------------------------------ */

test('a plain Ganger scores exactly 100 under every scenario', () => {
  for (const o of [{}, { cover: 1 }, { cover: 2 }, { endState: 'ooa' }, { opponent: 'meleeRush' }, { gang: 'goliath' }]) {
    near(rate(GANGER, {}, o).ti, 100, 1e-9);
  }
});

test('a Ganger needs 1.246 meltagun hits: wound on 2+, no save, 3 Injury dice', () => {
  // 1 / (5/6 x (1 - (2/6)^3))
  near(hits(GANGER, 'meltagun'), 1 / ((5 / 6) * (26 / 27)));
  near(rate(GANGER).perProfile.find(p => p.id === 'meltagun').pDownFirst, (5 / 6) * (26 / 27));
});

test('a Ganger needs 3.6 laspistol hits, and being Injured first changes nothing', () => {
  // Wound 4+, save 6+, one Injury dice: 3/6 x 5/6 = 5/12 unsaved per hit, of which
  // 4/6 go Down and 2/6 leave the fighter Injured at 0 wounds. From there every
  // unsaved wound rolls the dice again, so E(injured) = 1 / (5/12 x 4/6) = 3.6 and
  // E(fresh) = (1 + 5/36 x 3.6) / (5/12) = 3.6 as well.
  near(hits(GANGER, 'lasStub'), 3.6);
});

test('the pool weights sum to one for every opponent profile', () => {
  for (const name of Object.keys(pool.weights)) {
    const w = T.poolWeights(pool, name);
    near(w.reduce((a, b) => a + b, 0), 1);
    assert.equal(w.length, pool.profiles.length);
  }
  // The default mix is the design's role table: 1/10, 3/10, 1/5, 1/5 and 4 x 1/20.
  const d = T.poolWeights(pool, 'default');
  near(d[0], 0.1); near(d[1], 0.3); near(d[2], 0.2); near(d[3], 0.2);
  for (let i = 4; i < 8; i++) near(d[i], 0.05);
});

test('the pool is built from the pinned Trading Post tables, and merged profiles really match', () => {
  const same = (a, b) => {
    const A = Data.ranged.find(x => x.name === a), B = Data.ranged.find(x => x.name === b);
    assert.deepEqual([A.str, A.ap, A.lethality, A.traits.damage, A.traits.blaze, A.traits.toxin],
                     [B.str, B.ap, B.lethality, B.traits.damage, B.traits.blaze, B.traits.toxin], `${a} vs ${b}`);
  };
  same('Plasma gun', 'Plasma pistol');
  same('Laspistol', 'Stub gun');
  const m = prof('meltagun');
  assert.deepEqual([m.str, m.ap, m.lethality, m.damage], [8, -4, 3, 3]);
  const c = prof('cleaver');
  assert.deepEqual([c.str, c.ap, c.lethality, c.melee], [3, -1, 2, true]);   // House of Chains p54, at S3
  const s = prof('stiletto');
  assert.deepEqual([s.str, s.toxin, s.melee], [null, 3, true]);
  assert.equal(prof('handFlamer').template, true);
  assert.equal(prof('handFlamer').blaze, 5);
});

/* ---- parity with the engine for one hit ---------------------------------- */

test('one hit on a fresh target matches the engine exactly, for every pool profile and several targets', () => {
  const targets = [GANGER, CHAMPION, { T: 4, W: 4, sv: 4 }, { T: 3, W: 2, sv: 4, inv: 5 }, { T: 5, W: 3, sv: 2 }, { T: 3, W: 1, sv: 0 }];
  for (const p of pool.profiles) {
    for (const tg of targets) {
      const t = tgt(tg);
      const start = T.enc(t.W, Engine.COND.NONE, false, false);
      const dist = T.resolveHit(start, p, t, opts(), true);
      const got = { fleshWound: 0, serious: 0, outOfAction: 0, wounded: 0, unharmed: 0 };
      for (const [id, q] of dist) {
        const s = T.dec(id);
        if (s.cond === Engine.COND.OOA) got.outOfAction += q;
        else if (s.cond === Engine.COND.SERIOUS) got.serious += q;
        else if (s.cond === Engine.COND.INJURED) got.fleshWound += q;
        else if (s.w < t.W) got.wounded += q;
        else got.unharmed += q;
      }
      const eng = Engine.computeRanged({
        skill: 4, hitMod: 0, faces: Engine.INJURY_DICE,
        weapon: { str: p.str, ap: p.ap, lethality: p.lethality, damage: p.damage, rapidFire: 0,
                  toxin: p.toxin, rending: p.rending, shred: p.shred, breaching: p.breaching, shock: 0, blaze: p.blaze,
                  gas: p.gas, web: p.web, flash: p.flash, graviton: p.graviton, autoHit: true, blast: false, unstable: false },
        target: { T: t.T, W: t.W, sv: t.sv, inv: t.inv, saveMods: 0, status: 'active', initiative: t.I, strength: t.S, respirator: false }
      });
      for (const k of Object.keys(got)) near(got[k], eng[k], 1e-12);
    }
  }
});

test('Sv 2+ saves no better than 3+ against AP -, and only buffers AP', () => {
  const noAp = Object.assign({}, prof('lasStub'));
  const ap1 = Object.assign({}, prof('lasStub'), { ap: -1 });
  const sv2 = tgt({ T: 3, W: 1, sv: 2 }), sv3 = tgt({ T: 3, W: 1, sv: 3 });
  near(T.hitsToDown(noAp, sv2, opts()).hits, T.hitsToDown(noAp, sv3, opts()).hits);
  near(T.hitsToDown(ap1, sv2, opts()).hits, T.hitsToDown(noAp, sv3, opts()).hits);
  assert.ok(T.hitsToDown(ap1, sv2, opts()).hits > T.hitsToDown(ap1, sv3, opts()).hits);
});

/* ---- defensive hooks, each hand-worked ----------------------------------- */

test('armour folds into the save, and a bare fighter in light carapace gets 6+', () => {
  assert.equal(tgt({ T: 3, W: 1, sv: 0 }, ['lightCarapace']).sv, 6);
  assert.equal(tgt({ T: 3, W: 1, sv: 6 }, ['lightCarapace']).sv, 5);
  assert.equal(tgt({ T: 3, W: 1, sv: 5 }, ['heavyCarapace']).sv, 3);
  assert.equal(tgt({ T: 4, W: 4, sv: 4 }, ['heavyCarapace']).sv, 2);
  assert.equal(tgt({ T: 3, W: 1, sv: 6 }, ['lightCarapace']).I, 3);
  near(hits(GANGER, 'lasStub', ['lightCarapace']), hits({ T: 3, W: 1, sv: 5 }, 'lasStub'));
});

test('mesh armour and a parry weapon help in melee only; a shield only against shooting', () => {
  for (const id of ['meshArmour', 'parryWeapon']) {
    near(hits(GANGER, 'lasStub', [id]), hits(GANGER, 'lasStub'));
    near(hits(GANGER, 'chainsword', [id]), hits({ T: 3, W: 1, sv: 5 }, 'chainsword'));
  }
  near(hits(GANGER, 'chainsword', ['shieldWeapon']), hits(GANGER, 'chainsword'));
  near(hits(GANGER, 'lasStub', ['shieldWeapon']), hits({ T: 3, W: 1, sv: 5 }, 'lasStub'));
  // The Hystrar shield is both.
  near(hits(GANGER, 'lasStub', ['hystrarShield']), hits({ T: 3, W: 1, sv: 5 }, 'lasStub'));
  near(hits(GANGER, 'chainsword', ['hystrarShield']), hits({ T: 3, W: 1, sv: 5 }, 'chainsword'));
});

test('several Parry or Shield weapons give no further benefit (p164), but mesh armour stacks with Parry', () => {
  near(hits(GANGER, 'chainsword', ['hystrarShield', 'parryWeapon']), hits(GANGER, 'chainsword', ['hystrarShield']));
  near(hits(GANGER, 'lasStub', ['hystrarShield', 'shieldWeapon']), hits(GANGER, 'lasStub', ['hystrarShield']));
  near(hits(GANGER, 'chainsword', ['meshArmour', 'parryWeapon']), hits({ T: 3, W: 1, sv: 4 }, 'chainsword'));
});

test('only one item of armour: the reflec shroud and hazard suit swap in for a carapace suit (p158)', () => {
  const heavy = rate(CHAMPION, { wargear: ['heavyCarapace'] }, { mode: 'campaign' });
  const g = heavy.gear.find(x => x.id === 'reflecShroud');
  near(g.tiWith, rate(CHAMPION, { wargear: ['reflecShroud'] }).ti);
  near(g.tiWithout, heavy.ti);
  assert.ok(g.dTi < 0, 'swapping heavy carapace for a reflec shroud loses TI');
  assert.ok(rate(CHAMPION, { wargear: ['heavyCarapace', 'hazardSuit'] }).problems.some(p => /one item of armour/.test(p)));
  // The refractor field combines with armour, so it raises no flag.
  assert.equal(rate(CHAMPION, { wargear: ['heavyCarapace', 'refractor'] }).problems.length, 0);
  assert.equal(tgt(CHAMPION, ['servoHarnessPartial']).I, 3);
});

test('the servo-harness folds into Strength and Toughness', () => {
  const t = tgt(CHAMPION, ['servoHarnessPartial']);
  assert.equal(t.T, 4); assert.equal(t.S, 5);
  near(hits(CHAMPION, 'lasStub', ['servoHarnessPartial']), hits({ T: 4, W: 2, sv: 5 }, 'lasStub'));
  near(hits(CHAMPION, 'stiletto', ['servoHarnessPartial']), hits(CHAMPION, 'stiletto'));   // Toxin ignores T
});

test('Dodge cancels a wound on a 6 before the save, only while the fighter has Wounds', () => {
  // Melta on a Ganger: no save, so every wound goes to Dodge while fresh. Once
  // Injured (0 Wounds) skills do nothing (p48), so from there no Dodge.
  const pW = 5 / 6, down = 26 / 27, inj = 1 / 27;
  const E_inj = 1 / (pW * down);
  const stay = 1 / 6 + pW / 6, toInj = pW * (5 / 6) * inj;
  const E_fresh = (1 + toInj * E_inj) / (1 - stay);
  near(hits(GANGER, 'meltagun', ['dodge']), E_fresh);
  near(rate(GANGER, { skills: ['dodge'] }).perProfile.find(p => p.id === 'meltagun').hits, E_fresh);
  // On a fresh fighter the first-hit chance of going Down is cut by exactly 1/6.
  const plain = T.hitsToDown(prof('plasma'), tgt(CHAMPION), opts()), dodged = T.hitsToDown(prof('plasma'), tgt(CHAMPION, ['dodge']), opts());
  near(dodged.pDownFirst, plain.pDownFirst * 5 / 6);
  // An Injured fighter gets no Dodge.
  const t = tgt(GANGER, ['dodge']);
  const injured = T.enc(0, Engine.COND.INJURED, false, false);
  const a = T.resolveHit(injured, prof('meltagun'), t, opts(), true), b = T.resolveHit(injured, prof('meltagun'), tgt(GANGER), opts(), true);
  for (const [k, v] of a) near(v, b.get(k));
});

test('Dodge never cancels a Template hit (p151), so the hand flamer ignores it', () => {
  near(hits(CHAMPION, 'handFlamer', ['dodge']), hits(CHAMPION, 'handFlamer'));
  assert.ok(hits(CHAMPION, 'lasStub', ['dodge']) > hits(CHAMPION, 'lasStub'));
});

test('Iron Jaw adds 2 Toughness against close combat hits with AP - only', () => {
  const plain = rate(GANGER).perProfile, jaw = rate(GANGER, { skills: ['ironJaw'] }).perProfile;
  const h = (list, id) => list.find(p => p.id === id).hits;
  // A plain S3 AP - melee hit wounds T5 on 5+ instead of 4+, and for a W1
  // Lethality 1 chain hits scale by the inverse. (The chainsword's Shred keys
  // off the same wound roll, so its ratio is not this clean.)
  const handWeapon = Object.assign({}, prof('chainsword'), { shred: 0 });
  const t = tgt(GANGER), tj = tgt(GANGER, ['ironJaw']);
  near(T.hitsToDown(handWeapon, tj, opts()).pDownFirst / T.hitsToDown(handWeapon, t, opts()).pDownFirst, (2 / 6) / (3 / 6));
  // On a W2 fighter the first hit is at T5 but, once Injured, skills are off (p48).
  const w2 = tgt({ T: 3, W: 2, sv: 0 }, ['ironJaw']);
  const fresh = T.resolveHit(T.enc(2, Engine.COND.NONE, false, false), handWeapon, w2, opts(), true);
  near(fresh.get(T.enc(1, Engine.COND.NONE, false, false)), 2 / 6);
  const injured = T.resolveHit(T.enc(0, Engine.COND.INJURED, false, false), handWeapon, w2, opts(), true);
  near(injured.get(T.enc(0, Engine.COND.INJURED, false, false)), 3 / 6 + (3 / 6) * (2 / 6));   // wound on 4+ again
  assert.ok(h(jaw, 'chainsword') > h(plain, 'chainsword'));
  near(h(jaw, 'powerSword'), h(plain, 'powerSword'));   // AP -2
  near(h(jaw, 'cleaver'), h(plain, 'cleaver'));         // AP -1
  near(h(jaw, 'lasStub'), h(plain, 'lasStub'));         // shooting
  near(h(jaw, 'stiletto'), h(plain, 'stiletto'));       // Toxin ignores Toughness
});

test('the reflec shroud turns las, plasma and melta AP to - and nothing else', () => {
  const plain = rate(GANGER).perProfile, reflec = rate(GANGER, { wargear: ['reflecShroud'] }).perProfile;
  const h = (list, id) => list.find(p => p.id === id).hits;
  // Melta with a 6+ save now: 1 / (5/6 x 5/6 x 26/27)
  near(h(reflec, 'meltagun'), 1 / ((5 / 6) * (5 / 6) * (26 / 27)));
  assert.ok(h(reflec, 'plasma') > h(plain, 'plasma'));
  near(h(reflec, 'lasStub'), h(plain, 'lasStub'));       // already AP -
  near(h(reflec, 'handFlamer'), h(plain, 'handFlamer'));
  near(h(reflec, 'powerSword'), h(plain, 'powerSword'));  // melee, not a las weapon
});

test('a hazard suit removes the Blaze hit, so a hand flamer becomes a laspistol', () => {
  assert.ok(hits(GANGER, 'handFlamer') < hits(GANGER, 'lasStub'));
  near(hits(GANGER, 'handFlamer', ['hazardSuit']), hits(GANGER, 'lasStub'));
  near(hits(GANGER, 'lasStub', ['hazardSuit']), hits(GANGER, 'lasStub'));
});

test('the refractor field is only rolled when it beats the armour, and burns out on a natural 1', () => {
  // Armour 4+ beats a 5+ field against AP -, so the field is never used.
  near(hits({ T: 3, W: 1, sv: 4 }, 'lasStub', ['refractor']), hits({ T: 3, W: 1, sv: 4 }, 'lasStub'));

  // Ganger (6+) against a meltagun, hand-solved over four states:
  //   A fresh + field, C injured + field, D injured + burnt (B, W1 + burnt, is unreachable).
  const pW = 5 / 6, down = 26 / 27, inj = 1 / 27;
  const E_D = 1 / (pW * down);
  // From C the field (5+) is rolled: 2/6 save, 1/6 fail and burn out, 3/6 fail.
  const C_toD = pW * (1 / 6) * inj, C_down = pW * (4 / 6) * down;
  const E_C = (1 + C_toD * E_D) / (C_down + C_toD);
  const A_toC = pW * (3 / 6) * inj, A_toD = pW * (1 / 6) * inj, A_down = pW * (4 / 6) * down;
  const E_A = (1 + A_toC * E_C + A_toD * E_D) / (A_down + A_toC + A_toD);
  near(hits(GANGER, 'meltagun', ['refractor']), E_A);
  // and it is worth less than a field that never burns out
  near(1 / (pW * (4 / 6) * down) > E_A, true);
});

test('the bio-booster drops Lethality once, and at 0 the bearer picks from two dice', () => {
  near(T.BEARER_PICK_2.inj, 20 / 36); near(T.BEARER_PICK_2.si, 15 / 36); near(T.BEARER_PICK_2.ooa, 1 / 36);
  // Melta on a Ganger: first injury rolls 2 dice (Down on 32/36), then the booster is spent.
  const pW = 5 / 6;
  const E_used = 1 / (pW * (26 / 27));
  const E_fresh = (1 + pW * (4 / 36) * E_used) / (pW);
  near(hits(GANGER, 'meltagun', ['bioBooster']), E_fresh);
  // Laspistol: Lethality 1 -> 0, so the bearer picks from two dice: Down on 16/36.
  const pU = (3 / 6) * (5 / 6);
  const E_used2 = 1 / (pU * (4 / 6));
  const E_fresh2 = (1 + pU * (20 / 36) * E_used2) / pU;
  near(hits(GANGER, 'lasStub', ['bioBooster']), E_fresh2);
});

test('Scar Tissue takes one Injury dice off every hit, to a minimum of one', () => {
  const pW = 5 / 6;
  near(hits(GANGER, 'meltagun', ['scarTissue']), 1 / (pW * (1 - Math.pow(2 / 6, 2))));   // 3 dice -> 2
  near(hits(GANGER, 'lasStub', ['scarTissue']), hits(GANGER, 'lasStub'));               // 1 stays 1
  assert.ok(hits(GANGER, 'cleaver', ['scarTissue']) > hits(GANGER, 'cleaver'));           // 2 -> 1
});

test('Adaptive Biology makes a Toxin wound need two successes', () => {
  // Stiletto, Toxin (3+): 4/6 -> (4/6)^2, and for a W1 Lethality 1 chain hits scale by the inverse.
  near(hits(GANGER, 'stiletto', ['adaptiveBiology']) / hits(GANGER, 'stiletto'), (4 / 6) / Math.pow(4 / 6, 2));
  near(hits(GANGER, 'chainsword', ['adaptiveBiology']), hits(GANGER, 'chainsword'));   // not Toxin
});

test('Iron Flesh and Reduced Bone Density fold into Wounds and Toughness', () => {
  near(hits(GANGER, 'lasStub', ['ironFlesh']), hits({ T: 3, W: 2, sv: 6 }, 'lasStub'));
  near(hits({ T: 4, W: 1, sv: 6 }, 'lasStub', ['reducedBoneDensity']), hits(GANGER, 'lasStub'));
});

test('cover improves armour saves against shooting only, and never an invulnerable save', () => {
  near(hits(GANGER, 'lasStub', [], { cover: 1 }), hits({ T: 3, W: 1, sv: 5 }, 'lasStub'));
  near(hits(GANGER, 'lasStub', [], { cover: 2 }), hits({ T: 3, W: 1, sv: 4 }, 'lasStub'));
  near(hits(GANGER, 'chainsword', [], { cover: 2 }), hits(GANGER, 'chainsword'));
  near(hits(GANGER, 'meltagun', ['refractor'], { cover: 2 }), hits(GANGER, 'meltagun', ['refractor']));
  // A Champion's armour catches up on the refractor as cover rises.
  const gain = (c) => { const g = rate(CHAMPION, {}, { cover: c }).gear; return g.find(x => x.id === 'refractor').ratio; };
  assert.ok(gain(0) > gain(1) && gain(1) > gain(2));
});

test('endState ooa counts only Out of Action; Seriously Injured fighters keep taking hits', () => {
  // Melta on a Ganger: OOA needs a 6 on one of 3 dice, 91/216, hit after hit with no save.
  near(hits(GANGER, 'meltagun', [], { endState: 'ooa' }), 1 / ((5 / 6) * (91 / 216)));
  assert.ok(rate(CHAMPION, {}, { endState: 'ooa' }).hitsToDown > rate(CHAMPION).hitsToDown);
});

/* ---- rating, cost and marginals ------------------------------------------ */

test('TI is a weighted geometric mean of hits relative to the Ganger, times 100', () => {
  const r = rate(CHAMPION);
  const w = T.poolWeights(pool, 'default');
  let acc = 0;
  r.perProfile.forEach((p, i) => { acc += w[i] * Math.log(p.vsGanger); });
  near(r.ti, 100 * Math.exp(acc));
  assert.ok(r.ti > 140 && r.ti < 165, `Champion TI ${r.ti}`);   // design prototype: 151
});

test('more Wounds, Toughness or Save always means a higher TI', () => {
  const ti = (p) => rate(p).ti;
  assert.ok(ti({ T: 3, W: 2, sv: 6 }) > ti(GANGER));
  assert.ok(ti({ T: 4, W: 1, sv: 6 }) > ti(GANGER));
  assert.ok(ti({ T: 3, W: 1, sv: 5 }) > ti(GANGER));
  assert.ok(ti({ T: 4, W: 4, sv: 4 }) > ti({ T: 3, W: 3, sv: 5 }));
});

test('the cost lines add up, defensive gear is priced from the tables, and TP100 divides by the total', () => {
  const r = T.rate({ profile: CHAMPION, wargear: ['refractor', 'meshArmour'], skills: ['dodge'], cost: { base: 95, weapons: 140, other: 20 } });
  assert.deepEqual(r.cost, { base: 95, weapons: 140, other: 20, defensive: 90, total: 345 });
  near(r.tp100, 100 * r.ti / 345);
  assert.equal(T.rate({ profile: CHAMPION }).tp100, null);   // no cost given
  const g = T.rate({ profile: CHAMPION, geneSmithing: ['reducedBoneDensity'], cost: { base: 70 } }, { gang: 'goliath' });
  assert.equal(g.cost.defensive, -10);
  assert.equal(g.cost.total, 60);
});

test('each item reports its marginal TI whether it is on the fighter or not', () => {
  const off = rate(CHAMPION), on = rate(CHAMPION, { wargear: ['refractor'] });
  const gOff = off.gear.find(x => x.id === 'refractor'), gOn = on.gear.find(x => x.id === 'refractor');
  assert.equal(gOff.selected, false); assert.equal(gOn.selected, true);
  near(gOff.dTi, on.ti - off.ti);
  near(gOn.dTi, on.ti - off.ti);
  near(gOff.dTp100, 100 * gOff.dTi / 50);
  assert.ok(gOn.byRole.leaderKiller > 0.4 && gOn.byRole.template === 0, JSON.stringify(gOn.byRole));
});

test('an armour item swaps in for the suit already worn rather than stacking', () => {
  const light = rate(CHAMPION, { wargear: ['lightCarapace'] });
  const heavyOnly = rate(CHAMPION, { wargear: ['heavyCarapace'] }).ti;
  const g = light.gear.find(x => x.id === 'heavyCarapace');
  near(g.tiWith, heavyOnly);
  near(g.tiWithout, light.ti);
  assert.ok(rate(CHAMPION, { wargear: ['lightCarapace', 'heavyCarapace'] }).problems.some(p => /one item of armour/.test(p)));
});

test('the break-even cost is where the item stops lowering TI per credit', () => {
  const r = rate(CHAMPION);
  const g = r.gear.find(x => x.id === 'heavyCarapace');
  near(g.breakEven, 140 / (g.ratio - 1));
  const tp = (base, wargear) => T.rate({ profile: CHAMPION, wargear, cost: { base } }).tp100;
  const c = g.breakEven;
  assert.ok(tp(c + 1, ['heavyCarapace']) > tp(c + 1, []));
  assert.ok(tp(c - 1, ['heavyCarapace']) < tp(c - 1, []));
  // Reduced Bone Density pays off only on fighters cheaper than its break-even.
  const b = T.rate({ profile: { T: 4, W: 1, sv: 6 }, cost: { base: 70 } }, { gang: 'goliath' }).gear.find(x => x.id === 'reducedBoneDensity');
  assert.equal(b.breakEvenDirection, 'below');
  assert.ok(b.breakEven > 0 && b.breakEven < 70, `C* ${b.breakEven}`);
  assert.ok(b.dTi < 0);
  assert.equal(b.dTp100, null);
});

test('the refraction cloak is reported as evasion, not TI', () => {
  const r = rate(CHAMPION, { wargear: ['refractionCloak'] });
  near(r.ti, rate(CHAMPION).ti);
  near(r.evasion.ranged, 0.75);
  assert.deepEqual(r.unmodelled, ['Refraction cloak']);
  near(rate(CHAMPION).evasion.ranged, 1);
});

/* ---- availability ---------------------------------------------------------- */

test('creation mode rates only the gang Equipment List as available; campaign adds the Trading Post', () => {
  const av = (id, o) => { const g = rate(CHAMPION, {}, o).gear.find(x => x.id === id); return [g.availability, g.available]; };
  assert.deepEqual(av('refractor', { gang: 'vanSaar' }), ['list', true]);
  assert.deepEqual(av('hystrarShield', { gang: 'vanSaar' }), ['list', true]);
  assert.deepEqual(av('heavyCarapace', { gang: 'vanSaar' }), ['unavailable', false]);
  assert.deepEqual(av('heavyCarapace', { gang: 'vanSaar', mode: 'campaign' }), ['tradingPost', true]);
  assert.deepEqual(av('hystrarShield', { gang: 'goliath', mode: 'campaign' }), ['unavailable', false]);   // exclusive
  assert.deepEqual(av('heavyCarapace', { gang: 'goliath' }), ['unavailable', false]);
  assert.deepEqual(av('heavyCarapace', { gang: 'furnaceBrutes' }), ['tradingPost', true]);   // Fires of the Forge
  assert.deepEqual(av('ironFlesh', { gang: 'goliath' }), ['recruitment', true]);
  assert.deepEqual(av('ironFlesh', { gang: 'vanSaar' }), ['unavailable', false]);
  assert.deepEqual(av('dodge', { gang: 'vanSaar' }), ['skill', true]);
  assert.deepEqual(av('heavyCarapace', { gang: 'generic' }), ['unknown', true]);
  assert.deepEqual(av('heavyCarapace', { gang: null }), ['unknown', true]);
  // The list follows the fighter's entry, not the gang.
  assert.deepEqual(av('hystrarShield', { gang: 'goliath', equipmentList: 'vanSaar' }), ['list', true]);
});

test('off-list gear on the fighter is still rated, and flagged', () => {
  const r = rate(CHAMPION, { wargear: ['heavyCarapace'] }, { gang: 'vanSaar' });
  const g = r.gear.find(x => x.id === 'heavyCarapace');
  assert.equal(g.selected, true);
  assert.equal(g.available, false);
  assert.ok(r.ti > rate(CHAMPION).ti);
});

test('gang tables carry the transcribed profiles and costs', () => {
  const f = (gang, name) => T.GANGS[gang].fighters.find(x => x.name === name);
  assert.deepEqual([f('vanSaar', 'Tek').cost, f('vanSaar', 'Tek').T, f('vanSaar', 'Tek').W, f('vanSaar', 'Tek').sv], [30, 3, 1, 6]);
  assert.deepEqual([f('vanSaar', 'Prime').cost, f('vanSaar', 'Prime').W, f('vanSaar', 'Prime').sv], [115, 3, 5]);
  assert.deepEqual([f('vanSaar', 'Archeotek').cost, f('vanSaar', 'Archeotek').sv], [85, 4]);
  assert.deepEqual([f('goliath', 'Forge Breaker').cost, f('goliath', 'Forge Breaker').T, f('goliath', 'Forge Breaker').W], [70, 4, 1]);
  assert.deepEqual([f('furnaceBrutes', 'Forge Despot').cost, f('furnaceBrutes', 'Forge Despot').T, f('furnaceBrutes', 'Forge Despot').W, f('furnaceBrutes', 'Forge Despot').sv], [140, 4, 3, 5]);
  assert.deepEqual([f('unborn', 'Malformed').cost, f('unborn', 'Malformed').S, f('unborn', 'Malformed').W, f('unborn', 'Malformed').sv], [80, 4, 2, 6]);
  assert.equal(f('unborn', 'Twice Born').equipmentList, 'unborn');
  assert.equal(T.GANGS.furnaceBrutes.tradingPostAtCreation, true);
  // The Van Saar Tek is the reference Ganger.
  const tek = f('vanSaar', 'Tek');
  near(rate({ T: tek.T, W: tek.W, sv: tek.sv }).ti, 100);
});

test('the design prototype figures are reproduced to within a couple of TI', () => {
  const ti = (p, wargear = [], gene = [], gang = 'vanSaar') => rate(p, { wargear, geneSmithing: gene }, { gang }).ti;
  const close = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
  close(ti(GANGER, ['refractor']), 135, 3);
  close(ti(CHAMPION, ['heavyCarapace']), 250, 3);
  close(ti(CHAMPION, ['reflecShroud']), 178, 3);
  close(ti({ T: 3, W: 3, sv: 5 }), 224, 3);
  close(ti({ T: 4, W: 1, sv: 6 }), 124, 2);
  close(ti({ T: 4, W: 3, sv: 5 }), 282, 2);
  close(ti({ T: 4, W: 3, sv: 5 }, [], ['ironFlesh'], 'furnaceBrutes'), 350, 3);
  close(ti({ T: 4, W: 3, sv: 5 }, [], ['scarTissue'], 'furnaceBrutes'), 300, 3);
  close(ti({ T: 4, W: 3, sv: 5 }, [], ['reducedBoneDensity'], 'furnaceBrutes'), 226, 2);
});

/* ---- interface -------------------------------------------------------------- */

test('rate is pure: same input, same output, and unknown ids are reported not thrown', () => {
  const a = T.rate({ profile: CHAMPION, wargear: ['refractor', 'bogus'], cost: { base: 95 } });
  const b = T.rate({ profile: CHAMPION, wargear: ['refractor', 'bogus'], cost: { base: 95 } });
  assert.deepEqual(a, b);
  assert.ok(a.problems.some(p => /bogus/.test(p)));
  assert.equal(a.poolVersion, 'v1');
  assert.deepEqual(a.options, { endState: 'down', opponent: 'default', mode: 'creation', cover: 0, gang: 'vanSaar', equipmentList: 'vanSaar' });
});

test('a custom pool can be rated, and carries its own version tag', () => {
  const custom = { version: 'test', meleeStrength: 3, roles: [{ id: 'x', name: 'x' }],
    profiles: [Object.assign({}, prof('lasStub'), { role: 'x' })], weights: { default: { x: 1 } } };
  const r = T.rate({ profile: CHAMPION, cost: { base: 95 } }, { pool: custom });
  assert.equal(r.poolVersion, 'test');
  assert.equal(r.perProfile.length, 1);
  near(r.ti, 100 * hits(CHAMPION, 'lasStub') / 3.6);
});

test('opponent profiles change the answer', () => {
  const mesh = (o) => rate(CHAMPION, {}, { opponent: o }).gear.find(x => x.id === 'meshArmour').dTi;
  assert.ok(mesh('meleeRush') > mesh('default'));
  assert.ok(mesh('volumeFire') < mesh('default'));
  assert.throws(() => rate(CHAMPION, {}, { opponent: 'nope' }));
});
