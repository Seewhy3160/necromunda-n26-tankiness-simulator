#!/usr/bin/env node
/* Regenerates the reference tables in README.md from the module in index.html.
   `node analyse.mjs` prints them; `node analyse.mjs --write` replaces the
   blocks between <!-- generated:NAME --> markers in README.md. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from './test/load.mjs';

const { Tankiness: T } = loadAll();
const root = path.dirname(fileURLToPath(import.meta.url));

const rate = (profile, extra = {}, opts = {}) => T.rate(Object.assign({ profile }, extra), opts);
const hits = (r) => r.hitsToDown.toFixed(2);
const per100 = (dHits, cost) => cost ? (100 * dHits / cost).toFixed(2) : null;
const cell = (r, base, cost) => `${hits(r)} (+${per100(r.hitsToDown - base.hitsToDown, cost)})`;
const table = (headers, rows) =>
  ['| ' + headers.join(' | ') + ' |', '|' + headers.map(() => '---').join('|') + '|', ...rows.map(r => '| ' + r.join(' | ') + ' |')].join('\n');

const item = (id) => T.ITEMS.find(x => x.id === id);
const sections = {};

/* Van Saar fighters against their creation-list options. */
{
  const gear = ['hystrarShield', 'refractor', 'meshArmour', 'bioBooster'];
  const rows = T.GANGS.vanSaar.fighters.filter(f => ['Tek', 'Archeotek', 'Augmek', 'Prime'].includes(f.name)).map(f => {
    const base = rate(f, { cost: { base: f.cost } }, { gang: 'vanSaar' });
    return [`${f.name} (${f.cost})`, hits(base)].concat(gear.map(id =>
      cell(rate(f, { wargear: [id], cost: { base: f.cost } }, { gang: 'vanSaar' }), base, item(id).cost)));
  });
  sections.vanSaar = table(['Fighter (credits)', 'No gear'].concat(gear.map(id => `+ ${item(id).name} (${item(id).cost})`)), rows);
}

/* Goliath fighters against gene-smithing and the Trading Post. */
{
  const cols = [['ironFlesh', 'gene'], ['scarTissue', 'gene'], ['refractor', 'wargear'], ['heavyCarapace', 'wargear'], ['reducedBoneDensity', 'gene']];
  const fighters = [
    ['Forge Breaker', T.GANGS.goliath.fighters.find(f => f.name === 'Forge Breaker'), 'goliath'],
    ['Malformed', T.GANGS.unborn.fighters.find(f => f.name === 'Malformed'), 'unborn'],
    ['Forge Master / Twice Born', T.GANGS.furnaceBrutes.fighters.find(f => f.name === 'Forge Master'), 'furnaceBrutes'],
    ['Forge Despot', T.GANGS.furnaceBrutes.fighters.find(f => f.name === 'Forge Despot'), 'furnaceBrutes']
  ];
  const rows = fighters.map(([name, f, gang]) => {
    const base = rate(f, { cost: { base: f.cost } }, { gang });
    return [`${name} (${f.cost})`, hits(base)].concat(cols.map(([id, kind]) => {
      const extra = kind === 'gene' ? { geneSmithing: [id] } : { wargear: [id] };
      const r = rate(f, Object.assign({ cost: { base: f.cost } }, extra), { gang });
      return item(id).cost > 0 ? cell(r, base, item(id).cost) : hits(r);
    }));
  });
  sections.goliath = table(['Fighter (credits)', 'No gear'].concat(cols.map(([id]) => {
    const it = item(id); return `+ ${it.name} (${it.cost})`; })), rows);
}

/* The core fighter types against every Trading Post item. */
{
  const types = [['Ganger', { T: 3, W: 1, sv: 6 }], ['Champion', { T: 3, W: 2, sv: 5 }], ['Brute', { T: 4, W: 4, sv: 4 }]];
  const rows = [];
  for (const [name, p] of types) {
    const base = rate(p, {}, { gang: null });
    rows.push([`${name} (T${p.T} W${p.W} ${p.sv}+)`, hits(base), '–', '–']);
    const r = base.gear.filter(g => g.cost > 0 && g.kind === 'wargear' && g.availability !== 'unavailable')
      .sort((a, b) => a.hitsWith - b.hitsWith);
    for (const g of r) rows.push([`${name} + ${g.name.toLowerCase()}`, g.hitsWith.toFixed(2), String(g.cost), g.dHitsPer100.toFixed(2)]);
  }
  sections.prototype = table(['Target', 'Hits to Down', 'Gear cost (credits)', 'ΔHits per 100 credits'], rows);
}

/* Matchup matrix for the Augmek. */
{
  const r = rate({ T: 3, W: 2, sv: 5 }, {}, { gang: 'vanSaar', mode: 'campaign' });
  const roles = ['leaderKiller', 'special', 'bolt', 'template', 'throwaway', 'melee'];
  const pctOf = (x) => (x > 0 ? '+' : '') + Math.round(x * 100) + '%';
  const rows = r.gear.filter(g => g.cost > 0 && g.kind === 'wargear' && g.dHits > 0.005)
    .sort((a, b) => (a.breakEven == null ? Infinity : a.breakEven) - (b.breakEven == null ? Infinity : b.breakEven)).map(g =>
    [`${g.name} (${g.cost})`].concat(roles.map(k => pctOf(g.byRole[k]))).concat([g.ratio.toFixed(2), g.breakEven == null ? '–' : String(Math.round(g.breakEven))]));
  sections.matchup = table(['Item (credits)', 'Melta', 'Plasma', 'Bolt', 'Hand flamer', 'Las / stub', 'Melee', 'Enemy credits ×', 'Break-even C* (credits)'], rows);
}

/* Cover. */
{
  const ids = ['refractor', 'hystrarShield', 'lightCarapace', 'heavyCarapace'];
  const rows = [0, 1, 2].map(cover => {
    const r = rate({ T: 3, W: 2, sv: 5 }, {}, { gang: 'vanSaar', mode: 'campaign', cover });
    return [cover === 0 ? 'None (default)' : `+${cover}`].concat(ids.map(id => {
      const g = r.gear.find(x => x.id === id);
      return `${g.ratio.toFixed(2)} / ${g.breakEven == null ? '–' : Math.round(g.breakEven)}`;
    }));
  });
  sections.cover = table(['Champion, ranged cover bonus'].concat(ids.map(id => `${item(id).name} (${item(id).cost}): hits × / C*`)), rows);
}

/* Hits to Down for the reference fighters, per weapon and from the mix. */
{
  const fighters = [['Ganger', { T: 3, W: 1, sv: 6 }], ['Champion', { T: 3, W: 2, sv: 5 }], ['Leader', { T: 3, W: 3, sv: 5 }],
    ['Goliath champion', { T: 4, W: 2, sv: 5 }], ['Brute', { T: 4, W: 4, sv: 4 }]];
  const results = fighters.map(([, prof]) => rate(prof, {}, { gang: null }));
  const rows = results[0].perProfile.map((p, i) => [p.name, p.cost, (p.weight * 100).toFixed(0) + '%'].concat(
    results.map(r => r.perProfile[i].hits.toFixed(2))));
  rows.push(['**Enemy mix (headline)**', '', '100%'].concat(results.map(r => `**${hits(r)}**`)));
  sections.hits = table(['Weapon', 'Cost', 'Share of hits'].concat(fighters.map(([n]) => n)), rows);
}

/* Enemy credits to Down for the reference fighters: the enemy's cheapest tool. */
{
  const fighters = [['Van Saar Tek', { T: 3, W: 1, sv: 6 }, [], 30], ['Van Saar Augmek', { T: 3, W: 2, sv: 5 }, [], 95],
    ['Van Saar Prime', { T: 3, W: 3, sv: 5 }, [], 115], ['Forge Despot', { T: 4, W: 3, sv: 5 }, [], 140],
    ['Brute (T4 W4 4+)', { T: 4, W: 4, sv: 4 }, [], 150],
    ['Augmek + refractor field', { T: 3, W: 2, sv: 5 }, ['refractor'], 145],
    ['Augmek + Hystrar shield', { T: 3, W: 2, sv: 5 }, ['hystrarShield'], 130],
    ['Augmek + heavy carapace', { T: 3, W: 2, sv: 5 }, ['heavyCarapace'], 235],
    ['Prime + heavy carapace', { T: 3, W: 3, sv: 5 }, ['heavyCarapace'], 255]];
  const rows = fighters.map(([name, p, w, c]) => {
    const r = rate(p, { wargear: w, cost: { base: c } }, { gang: null });
    return [name, String(c), String(Math.round(r.enemyCredits)), String(Math.round(r.enemyCreditsPer100)),
      `${r.bestTool.name} on a ${r.bestTool.attacker.carrier}`, r.hitsToDown.toFixed(2)];
  });
  sections.enemyCredits = table(['Fighter', 'Cost', 'Enemy credits to Down', 'Per 100 credits', 'Enemy’s cheapest tool', 'Hits to Down (mix)'], rows);
}

/* The attacker packages behind the figures. */
{
  const rows = T.POOL_V1.profiles.map(p => [p.name, p.attacker.carrier, String(p.attacker.weaponCost), String(p.attacker.cost),
    p.attacker.hitsPerBattle.toFixed(2), p.attacker.basis]);
  sections.attackers = table(['Weapon', 'Carrier', 'Weapon (credits)', 'Package (credits)', 'Hits per battle', 'Basis'], rows);
}

const stamp = `Generated by \`node analyse.mjs\` from the module in \`index.html\` (pool ${T.POOL_VERSION}).`;
sections.stamp = stamp;

if (process.argv.includes('--write')) {
  const file = path.join(root, 'README.md');
  let md = fs.readFileSync(file, 'utf8');
  for (const [key, body] of Object.entries(sections)) {
    const re = new RegExp(`(<!-- generated:${key} -->)[\\s\\S]*?(<!-- /generated:${key} -->)`);
    if (!re.test(md)) { console.error(`README.md has no generated:${key} block`); continue; }
    md = md.replace(re, `$1\n\n${body}\n\n$2`);
  }
  fs.writeFileSync(file, md);
  console.log('README.md updated');
} else {
  for (const [key, body] of Object.entries(sections)) console.log(`## ${key}\n\n${body}\n`);
}
