/* The engine and data blocks are copies of the N26 Attack Simulator's, pinned
   to one upstream commit in upstream.json. If either block drifts from that
   commit's copy, this fails, so a rules fix upstream cannot go unnoticed and
   a local edit cannot quietly fork the one-attack maths. */
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scriptSource } from './load.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pin = JSON.parse(fs.readFileSync(path.join(root, 'upstream.json'), 'utf8'));
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

test('upstream.json names the commit the copies are pinned to', () => {
  assert.match(pin.repo, /^https:\/\/github\.com\/Seewhy3160\/necromunda-n26-attack-simulator$/);
  assert.match(pin.commit, /^[0-9a-f]{40}$/);
  assert.deepEqual(Object.keys(pin.blocks).sort(), ['data', 'engine']);
});

for (const id of ['engine', 'data']) {
  test(`the <script id="${id}"> block matches upstream commit ${pin.commit.slice(0, 7)}`, () => {
    const src = scriptSource(id);
    assert.equal(sha256(src), pin.blocks[id],
      `${id} block differs from the pinned upstream copy. If upstream changed, re-copy the block ` +
      `and update upstream.json; if it was edited here, move the change upstream instead.`);
  });
}

test('the engine block still declares it has no DOM access', () => {
  const src = scriptSource('engine');
  assert.match(src, /Pure functions, no DOM access/);
  assert.doesNotMatch(src, /\bdocument\b/);
});

test('the tankiness block has no DOM access either, so the ranker can load it headless', () => {
  const src = scriptSource('tankiness');
  assert.doesNotMatch(src, /\bdocument\b|\bwindow\b|\blocalStorage\b/);
});
