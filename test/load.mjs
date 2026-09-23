import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** The raw source of a named <script id="..."> block in the single-file app. */
export function scriptSource(id) {
  const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const re = new RegExp(`<script id="${id}">([\\s\\S]*?)<\\/script>`);
  const m = src.match(re);
  if (!m) throw new Error(`no <script id="${id}"> in index.html`);
  return m[1];
}

/** Pull a named block out of the single-file app and evaluate it. Blocks that
    lean on earlier blocks (the tankiness module uses Engine and Data) take
    them as named dependencies, standing in for the page's globals. */
export function loadScript(id, deps = {}) {
  const names = Object.keys(deps);
  const mod = { exports: {} };
  new Function('module', ...names, scriptSource(id))(mod, ...names.map(n => deps[n]));
  return mod.exports;
}

/** Engine, Data and Tankiness, loaded in order. */
export function loadAll() {
  const Engine = loadScript('engine');
  const Data = loadScript('data');
  const Tankiness = loadScript('tankiness', { Engine, Data });
  return { Engine, Data, Tankiness };
}
