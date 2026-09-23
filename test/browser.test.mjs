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
  assert.match(await out('ti'), /^\d+$/);
  assert.match(await out('tp100'), /^\d+\.\d$/);
});

t('the default is a Van Saar Augmek: T3 W2 Sv5+, 95 credits, TI about 152', async () => {
  assert.equal(await page.inputValue('[data-bind="pick.fighter"]'), 'vsAugmek');
  assert.equal(await page.inputValue('[data-bind="t.T"]'), '3');
  assert.equal(await page.inputValue('[data-bind="t.W"]'), '2');
  assert.equal(await page.inputValue('[data-bind="t.sv"]'), '5');
  assert.equal(await page.inputValue('[data-bind="c.base"]'), '95');
  assert.equal(await out('total'), '95');
  const ti = parseInt(await out('ti'), 10);
  assert.ok(ti >= 150 && ti <= 154, `TI ${ti}`);
  assert.match(await page.textContent('[data-profile]'), /Augmek.*Champion.*95 credits/);
});

t('picking the Tek gives the reference score of 100', async () => {
  await setSel('pick.fighter', 'vsTek');
  assert.equal(await out('ti'), '100');
  assert.equal(await page.inputValue('[data-bind="c.base"]'), '30');
  assert.equal(await out('tp100'), (100 * 100 / 30).toFixed(1));
});

t('every change recomputes on the spot, with no submit button', async () => {
  assert.equal(await page.$('button[type=submit]'), null);
  const before = await out('ti');
  await setSel('t.W', 3);
  const after = await out('ti');
  assert.notEqual(before, after);
  assert.equal(await page.inputValue('[data-bind="pick.fighter"]'), 'vsTek');   // the picker only seeds
  await setSel('t.W', 1);
  assert.equal(await out('ti'), before);
});

t('typed credits feed TI per 100 credits', async () => {
  await fill('c.weapons', 20);
  assert.equal(await out('total'), '50');
  assert.equal(await out('tp100'), (100 * 100 / 50).toFixed(1));
  await fill('c.weapons', 0);
});

t('toggling a wargear chip raises TI and adds its cost', async () => {
  const before = parseInt(await out('ti'), 10);
  await check('g.refractor', true);
  const after = parseInt(await out('ti'), 10);
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
  assert.match(first.cells[2], /^[+-]?\d+\.\d$/);
  const available = rows.filter(r => !/unavail/.test(r.cls)).map(r => parseFloat(r.cells[3]) || -Infinity);
  for (let i = 1; i < available.length; i++) assert.ok(available[i - 1] >= available[i], 'sorted by TI per 100c');
});

t('the per-weapon table is sorted weakest first and shows the meltagun on a Ganger at 1.25', async () => {
  const rows = await page.$$eval('[data-rows="weapons"] tr', trs => trs.map(tr => [...tr.children].map(td => td.textContent)));
  assert.equal(rows.length, 8);
  assert.equal(rows[0][0], 'Meltagun');
  assert.equal(rows[0][2], '1.25');
  assert.equal(rows[0][4], '×1.00');
  for (let i = 1; i < rows.length; i++) assert.ok(parseFloat(rows[i - 1][2]) <= parseFloat(rows[i][2]));
});

t('switching gang swaps the fighter list and seeds its first entry', async () => {
  await setSel('pick.gang', 'goliath');
  assert.equal(await page.inputValue('[data-bind="pick.fighter"]'), 'goBreaker');
  assert.equal(await page.inputValue('[data-bind="t.T"]'), '4');
  assert.equal(await page.inputValue('[data-bind="c.base"]'), '70');
  assert.equal(await out('ti'), '124');
  assert.doesNotMatch(await page.getAttribute('[data-gear="ironFlesh"]', 'class'), /unavail/);
  await check('g.ironFlesh', true);
  assert.equal(await out('total'), '100');
  assert.ok(parseInt(await out('ti'), 10) > 160);
  await check('g.ironFlesh', false);
});

t('cover and the opponent profile change the answer without breaking the Ganger baseline', async () => {
  await setSel('pick.gang', 'vanSaar');
  await setSel('pick.fighter', 'vsTek');
  await setSel('o.cover', 2);
  assert.equal(await out('ti'), '100');
  await setSel('pick.fighter', 'vsPrime');
  const cover2 = await out('ti');
  await setSel('o.cover', 0);
  assert.notEqual(await out('ti'), cover2);
  const dflt = await out('ti');
  await setSel('o.opponent', 'meleeRush');
  assert.notEqual(await out('ti'), dflt);
  await setSel('o.opponent', 'default');
  assert.match(await page.textContent('[data-pool]'), /Reference pool v1/);
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
