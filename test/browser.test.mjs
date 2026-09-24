/* Loads the single file in a real browser over file:// — the way it will
   actually be used — and drives the real controls: pickers seed the fields,
   every change recomputes, chips show what is on the gang's list. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

/* These tests need Playwright and a Chromium build. Where neither is present
   they skip rather than fail, so `npm test` still works on a bare checkout. */
let chromium = null, skip = false;
try {
  ({ chromium } = await import('playwright'));
} catch {
  skip = 'playwright is not installed - run `npm install`';
}

/* Fall back to a Chromium already on the machine when the build Playwright
   expects is not the one that is installed. */
const PREINSTALLED = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium']
  .find(p => fs.existsSync(p));
const launchOpts = PREINSTALLED ? { executablePath: PREINSTALLED } : {};

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const url = 'file://' + path.join(root, 'index.html');

let browser, page, errors;
test.before(async () => {
  if (skip) return;
  try {
    browser = await chromium.launch(launchOpts);
  } catch (e) {
    skip = 'no Chromium available - run `npx playwright install chromium`';
    return;
  }
  page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
});
test.after(async () => { if (browser) await browser.close(); });

const t = (name, fn) => test(name, async (ctx) => {
  if (skip) { ctx.skip(skip); return; }
  await fn(ctx);
});

const out = async (key) => page.textContent(`[data-out="${key}"]`);
const setSel = (bind, value) => page.selectOption(`[data-bind="${bind}"]`, String(value));
const check = (bind, on) => page.setChecked(`[data-bind="${bind}"]`, on);
const fill = (bind, value) => page.fill(`[data-bind="${bind}"]`, String(value));

t('the page loads and rates the default fighter without errors', async () => {
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(await page.title(), 'Necromunda (N26) Tankiness Simulator');
  assert.match(await out('ecd'), /^\d+$/);
  assert.match(await out('ecdPer100'), /^\d+$/);
});

t('the default is a Van Saar Augmek: T3 W2 Sv5+, 95 credits, cheapest to remove with plasma', async () => {
  assert.equal(await page.inputValue('[data-bind="pick.fighter"]'), 'vsAugmek');
  assert.equal(await page.inputValue('[data-bind="t.T"]'), '3');
  assert.equal(await page.inputValue('[data-bind="t.W"]'), '2');
  assert.equal(await page.inputValue('[data-bind="t.sv"]'), '5');
  assert.equal(await page.inputValue('[data-bind="c.base"]'), '95');
  assert.equal(await out('total'), '95');
  const ecd = parseInt(await out('ecd'), 10);
  assert.ok(ecd > 100 && ecd < 300, `enemy credits ${ecd}`);
  assert.match(await page.textContent('[data-profile]'), /Augmek.*Champion.*95 credits/);
  const minor = await page.textContent('[data-minor]');
  assert.match(minor, /cheapest plan\s*Plasma gun/);
  assert.match(minor, /Hits to Down from the mix\s*\d\.\d\d/);
  assert.match(minor, /Down on the first hit\s*\d+\.\d%/);
});

t('picking the Tek gives the plain-Ganger reference, and lasguns are the cheap answer to it', async () => {
  await setSel('pick.fighter', 'vsTek');
  assert.match(await page.textContent('[data-minor]'), /vs a plain Ganger\s*×1\.00/);
  assert.match(await page.textContent('[data-minor]'), /cheapest plan\s*Boltgun/);
  assert.equal(await page.inputValue('[data-bind="c.base"]'), '30');
  const ecd = parseInt(await out('ecd'), 10);
  assert.ok(Math.abs(parseInt(await out('ecdPer100'), 10) - 100 * ecd / 30) <= 2);
});

t('every change recomputes on the spot, with no submit button', async () => {
  assert.equal(await page.$('button[type=submit]'), null);
  const before = await out('ecd');
  await setSel('t.W', 3);
  const after = await out('ecd');
  assert.notEqual(before, after);
  assert.equal(await page.inputValue('[data-bind="pick.fighter"]'), 'vsTek');   // the picker only seeds
  await setSel('t.W', 1);
  assert.equal(await out('ecd'), before);
});

t('typed credits feed enemy credits per 100 credits', async () => {
  await fill('c.weapons', 20);
  assert.equal(await out('total'), '50');
  const ecd = parseInt(await out('ecd'), 10);
  assert.ok(Math.abs(parseInt(await out('ecdPer100'), 10) - 100 * ecd / 50) <= 2);
  await fill('c.weapons', 0);
});

t('toggling a wargear chip raises the enemy cost and adds its own', async () => {
  const before = parseInt(await out('ecd'), 10);
  await check('g.refractor', true);
  const after = parseInt(await out('ecd'), 10);
  assert.ok(after > before, `${before} -> ${after}`);
  assert.equal(await out('total'), '80');
  assert.match(await page.textContent('[data-notes]'), /Refractor field/);
  await check('g.refractor', false);
  assert.equal(await out('total'), '30');
});

t('chips say when an item is not on the fighter list, and campaign mode opens the Trading Post', async () => {
  const cls = () => page.getAttribute('[data-gear="heavyCarapace"]', 'class');
  assert.match(await cls(), /unavail/);
  assert.equal(await page.textContent('[data-avail="heavyCarapace"]'), 'not available');
  assert.doesNotMatch(await page.getAttribute('[data-gear="refractor"]', 'class'), /unavail/);
  await setSel('o.mode', 'campaign');
  assert.doesNotMatch(await cls(), /unavail/);
  assert.equal(await page.textContent('[data-avail="heavyCarapace"]'), 'Trading Post');
  await setSel('o.mode', 'creation');
});

t('the gear table lists every item with a marginal, best value first', async () => {
  const rows = await page.$$eval('[data-rows="gear"] tr', trs => trs.map(tr => ({
    cls: tr.className, cells: [...tr.children].map(td => td.textContent) })));
  assert.equal(rows.length, 20);
  const first = rows.find(r => !/unavail/.test(r.cls));
  assert.ok(first, 'an available row');
  assert.match(first.cells[1], /^[+-]?\d+$/);
  const available = rows.filter(r => !/unavail/.test(r.cls)).map(r => parseFloat(r.cells[2]) || -Infinity);
  for (let i = 1; i < available.length; i++) assert.ok(available[i - 1] >= available[i], 'sorted by enemy credits per 100c');
});

t('the per-weapon table is sorted cheapest-for-the-enemy first, with the attacker package and hits to Down', async () => {
  const rows = await page.$$eval('[data-rows="weapons"] tr', trs => trs.map(tr => ({ cls: tr.className, cells: [...tr.children].map(td => td.textContent) })));
  assert.equal(rows.length, 9);
  // On a Tek in cover the bolter ganger is the cheapest answer: 95c, 1.88 hits a battle.
  assert.match(rows[0].cells[0], /^Boltgun/);
  assert.match(rows[0].cells[1], /Ganger \(BS 4\+\) · 95c/);
  assert.equal(rows[0].cells[2], '1.88');
  assert.ok(parseInt(rows[0].cells[4], 10) <= parseInt(await out('ecd'), 10) + 1);   // the plan may spill into a second tool
  assert.match(rows[0].cls, /on/);
  assert.match(rows[0].cells[0], /of the plan/);
  for (let i = 1; i < rows.length; i++) assert.ok(parseFloat(rows[i - 1].cells[4]) <= parseFloat(rows[i].cells[4]));
  // The lasgun row: 55c, 1.75 hits a battle; in +1 cover the Tek saves on 5+, so 4.5 hits to Down.
  const las = rows.find(r => /^Lasgun/.test(r.cells[0]));
  assert.match(las.cells[1], /4 × Ganger \(BS 4\+\) · 55c/);
  assert.equal(las.cells[2], '1.75');
  assert.equal(las.cells[3], '4.50');
  assert.equal(las.cells[4], String(Math.round(55 * 4.5 / 1.75)));
  const melta = rows.find(r => /^Meltagun/.test(r.cells[0]));
  assert.equal(melta.cells[3], '1.25');   // cover cannot help against AP -4
  assert.equal(melta.cells[6], '×1.00');
  assert.match(await page.textContent('[data-attackers]'), /Attacker packages/);
});

t('switching gang swaps the fighter list and seeds its first entry', async () => {
  const tek = parseInt(await out('ecd'), 10);
  await setSel('pick.gang', 'goliath');
  assert.equal(await page.inputValue('[data-bind="pick.fighter"]'), 'goTyrant');
  assert.equal(await page.inputValue('[data-bind="t.T"]'), '4');
  assert.equal(await page.inputValue('[data-bind="c.base"]'), '140');
  const tyrant = parseInt(await out('ecd'), 10);
  assert.ok(tyrant > tek, `Forge Tyrant ${tyrant} vs Tek ${tek}`);
  assert.doesNotMatch(await page.getAttribute('[data-gear="ironFlesh"]', 'class'), /unavail/);
  await check('g.ironFlesh', true);
  assert.equal(await out('total'), '170');
  assert.ok(parseInt(await out('ecd'), 10) > tyrant);
  await check('g.ironFlesh', false);
  // The Forge-Born comes with Iron Jaw; the Sumpkroc is a Beast and gets no gene-smithing.
  await setSel('pick.fighter', 'goForgeBorn');
  assert.equal(await page.isChecked('[data-bind="g.ironJaw"]'), true);
  await setSel('pick.fighter', 'goSumpkroc');
  assert.equal(await page.isChecked('[data-bind="g.ironJaw"]'), false);
  assert.match(await page.getAttribute('[data-gear="ironFlesh"]', 'class'), /unavail/);
  assert.match(await page.getAttribute('[data-gear="refractor"]', 'class'), /unavail/);
});

t('cover and the opponent profile change the answer without breaking the Ganger baseline', async () => {
  await setSel('pick.gang', 'vanSaar');
  await setSel('pick.fighter', 'vsTek');
  await setSel('o.cover', 2);
  assert.match(await page.textContent('[data-minor]'), /vs a plain Ganger\s*×1\.00/);
  await setSel('pick.fighter', 'vsPrime');
  const cover2 = await out('ecd');
  await setSel('o.cover', 0);
  assert.notEqual(await out('ecd'), cover2);
  const minor = () => page.textContent('[data-minor]');
  const dflt = (await minor()).match(/from the mix\s*(\d\.\d\d)/)[1];
  await setSel('o.opponent', 'meleeRush');
  assert.notEqual((await minor()).match(/from the mix\s*(\d\.\d\d)/)[1], dflt);
  await setSel('o.opponent', 'default');
  assert.match(await page.textContent('[data-pool]'), /Enemy weapon mix, pool v1/);
});

t('nothing on the page reaches the network or storage', async () => {
  const src = await page.content();
  assert.equal(/<script[^>]+src=/.test(src), false);
  assert.equal(/<link[^>]+href="http/.test(src), false);
  const used = await page.evaluate(() => {
    try { return localStorage.length + sessionStorage.length; } catch (e) { return -1; }
  });
  assert.ok(used <= 0);
});

t('it lays out on a phone without sideways scrolling', async () => {
  await page.setViewportSize({ width: 320, height: 640 });
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 0, `overflows by ${overflow}px`);
  await page.setViewportSize({ width: 390, height: 780 });
});

t('no console or page errors were raised throughout', () => {
  assert.equal(errors.length, 0, errors.join('\n'));
});
