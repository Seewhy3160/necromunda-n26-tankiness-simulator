/* The library bundles in dist/ are generated from index.html; they must match
   what build.mjs produces now, load in both module systems, and give the same
   numbers as the page's own blocks. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bundles } from '../build.mjs';
import { loadAll } from './load.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('dist/ matches a fresh build of index.html', () => {
  for (const [rel, body] of Object.entries(bundles())) {
    const file = path.join(root, rel);
    assert.ok(fs.existsSync(file), `${rel} is missing; run \`npm run build\``);
    assert.equal(fs.readFileSync(file, 'utf8'), body, `${rel} is out of date; run \`npm run build\``);
  }
});

test('the ES module bundle imports and rates like the page', async () => {
  const mod = await import(pathToFileURL(path.join(root, 'dist/tankiness.mjs')).href);
  assert.equal(typeof mod.default.rate, 'function');
  assert.equal(mod.Tankiness, mod.default);
  assert.equal(typeof mod.Engine.computeRanged, 'function');
  assert.ok(mod.Data.ranged.length > 0);
  const { Tankiness } = loadAll();
  const input = [{ profile: { T: 3, W: 2, sv: 5 }, wargear: ['refractor'], cost: { base: 95, weapons: 140 } }, { gang: 'vanSaar' }];
  assert.deepEqual(mod.default.rate(...input), Tankiness.rate(...input));
  assert.equal(mod.default.VERSION, pkg.version);
});

test('the classic bundle loads with require() and sets the globals a <script> tag would', () => {
  const require = createRequire(import.meta.url);
  const T = require(path.join(root, 'dist/tankiness.js'));
  assert.equal(typeof T.rate, 'function');
  assert.equal(typeof T.Engine.saveProb, 'function');
  assert.ok(T.Data.melee.length > 0);
  assert.equal(globalThis.Tankiness, T);
  assert.equal(T.VERSION, pkg.version);
  const r = T.rate({ profile: { T: 3, W: 1, sv: 6 }, cost: { base: 30 } });
  assert.ok(r.enemyCredits > 0 && r.hitsToDown > 1);
  assert.equal(r.poolVersion, T.POOL_VERSION);
});

test('package.json points at the bundles', () => {
  assert.equal(pkg.main, 'dist/tankiness.js');
  assert.equal(pkg.exports['.'].import, './dist/tankiness.mjs');
  assert.equal(pkg.exports['.'].require, './dist/tankiness.js');
});
