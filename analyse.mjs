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
const ti = (r) => Math.round(r.ti);
const per100 = (dTi, cost) => cost ? Math.round(100 * dTi / cost) : null;
const cell = (r, base, cost) => `${ti(r)} (${per100(r.ti - base.ti, cost)})`;
const table = (headers, rows) =>
  ['| ' + headers.join(' | ') + ' |', '|' + headers.map(() => '---').join('|') + '|', ...rows.map(r => '| ' + r.join(' | ') + ' |')].join('\n');

const item = (id) => T.ITEMS.find(x => x.id === id);
const sections = {};

/* Van Saar fighters against their creation-list options. */
{
  const gear = ['hystrarShield', 'refractor', 'meshArmour', 'bioBooster'];
  const rows = T.GANGS.vanSaar.fighters.filter(f => ['Tek', 'Archeotek', 'Augmek', 'Prime'].includes(f.name)).map(f => {
    const base = rate(f, { cost: { base: f.cost } }, { gang: 'vanSaar' });
    return [`${f.name} (${f.cost})`, String(ti(base))].concat(gear.map(id =>
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
    return [`${name} (${f.cost})`, String(ti(base))].concat(cols.map(([id, kind]) => {
      const extra = kind === 'gene' ? { geneSmithing: [id] } : { wargear: [id] };
      const r = rate(f, Object.assign({ cost: { base: f.cost } }, extra), { gang });
      return item(id).cost > 0 ? cell(r, base, item(id).cost) : String(ti(r));
    }));
  });
  sections.goliath = table(['Fighter (credits)', 'No gear'].concat(cols.map(([id]) => {
    const it = item(id); return `+ ${it.name} (${it.cost > 0 ? it.cost : it.cost})`; })), rows);
}

/* The core fighter types against every Trading Post item. */
{
  const types = [['Ganger', { T: 3, W: 1, sv: 6 }], ['Champion', { T: 3, W: 2, sv: 5 }], ['Brute', { T: 4, W: 4, sv: 4 }]];
  const rows = [];
  for (const [name, p] of types) {
    const base = rate(p, {}, { gang: null });
    rows.push([`${name} (T${p.T} W${p.W} ${p.sv}+)`, String(ti(base)), '–', '–']);
    const r = base.gear.filter(g => g.cost > 0 && g.kind === 'wargear' && g.availability !== 'unavailable')
      .sort((a, b) => a.tiWith - b.tiWith);
    for (const g of r) rows.push([`${name} + ${g.name.toLowerCase()}`, String(Math.round(g.tiWith)), String(g.cost), String(Math.round(g.dTp100))]);
  }
  sections.prototype = table(['Target', 'TI', 'Gear cost (credits)', 'ΔTI per 100 credits'], rows);
}

/* Matchup matrix for the Augmek. */
{
  const r = rate({ T: 3, W: 2, sv: 5 }, {}, { gang: 'vanSaar', mode: 'campaign' });
  const roles = ['leaderKiller', 'special', 'template', 'throwaway', 'melee'];
  const pctOf = (x) => (x > 0 ? '+' : '') + Math.round(x * 100) + '%';
  const rows = r.gear.filter(g => g.cost > 0 && g.kind === 'wargear' && g.dTi > 0.05).sort((a, b) => a.breakEven - b.breakEven).map(g =>
    [`${g.name} (${g.cost})`].concat(roles.map(k => pctOf(g.byRole[k]))).concat([g.ratio.toFixed(2), String(Math.round(g.breakEven))]));
  sections.matchup = table(['Item (credits)', 'Melta', 'Plasma', 'Hand flamer', 'Las / stub', 'Melee', 'TI ×', 'Break-even C* (credits)'], rows);
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
  sections.cover = table(['Champion, ranged cover bonus'].concat(ids.map(id => `${item(id).name} (${item(id).cost}): TI × / C*`)), rows);
}

/* Hits to Down for the reference fighters. */
{
  const fighters = [['Ganger', { T: 3, W: 1, sv: 6 }], ['Champion', { T: 3, W: 2, sv: 5 }], ['Leader', { T: 3, W: 3, sv: 5 }],
    ['Goliath champion', { T: 4, W: 2, sv: 5 }], ['Brute', { T: 4, W: 4, sv: 4 }]];
  const first = rate(fighters[0][1], {}, { gang: null });
  const rows = first.perProfile.map((p, i) => [p.name, (p.weight * 100).toFixed(0) + '%'].concat(
    fighters.map(([, prof]) => rate(prof, {}, { gang: null }).perProfile[i].hits.toFixed(2))));
  sections.hits = table(['Weapon', 'Weight'].concat(fighters.map(([n]) => n)), rows);
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
