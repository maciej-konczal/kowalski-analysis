import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { groupRoadmap, renderRoadmap } from '../plugins/kowalski/scripts/product.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/kowalski/scripts/product.mjs', import.meta.url));
const bet = (id, status, extra = {}) => ({ id, status, what: `bet ${id}`, ...extra });

test('each status lands in its column', () => {
  const g = groupRoadmap([
    bet('a', 'building'), bet('b', 'picked'), bet('c', 'candidate'),
    bet('d', 'shipped'), bet('e', 'kept'), bet('f', 'killed'),
  ]);
  assert.deepEqual(g.columns.now.map((b) => b.id), ['a']);
  assert.deepEqual(g.columns.next.map((b) => b.id), ['b']);
  assert.deepEqual(g.columns.later.map((b) => b.id), ['c']);
  assert.deepEqual(g.columns.done.map((b) => b.id), ['d', 'e', 'f']);
});

test('open bets go to their impact and effort quadrant', () => {
  const g = groupRoadmap([
    bet('a', 'picked', { impact: 'high', effort: 'low' }),
    bet('b', 'candidate', { impact: 'low', effort: 'high' }),
  ]);
  assert.deepEqual(g.grid['high-low'].map((b) => b.id), ['a']);
  assert.deepEqual(g.grid['low-high'].map((b) => b.id), ['b']);
});

test('bets missing impact or effort are listed as unscored, not dropped', () => {
  const g = groupRoadmap([bet('a', 'candidate', { impact: 'high' }), bet('b', 'picked')]);
  assert.deepEqual(g.unscored.map((b) => b.id), ['a', 'b']);
});

test('said-no bets are listed with their principle, outside the board', () => {
  const g = groupRoadmap([bet('a', 'said-no', { principle: 'no one-customer features' })]);
  assert.equal(g.saidNo[0].principle, 'no one-customer features');
  assert.equal(Object.values(g.columns).flat().length, 0);
});

test('zero bets render the empty state', () => {
  const html = renderRoadmap([], '<main>{{DATA}}</main><p id="empty">No bets yet</p>');
  assert.match(html, /No bets yet/);
  assert.match(html, /"total":0/);
});

test('embedded data cannot close the script tag', () => {
  const html = renderRoadmap([bet('a', 'candidate', { what: '</script><b>x' })], '{{DATA}}');
  assert.doesNotMatch(html, /<\/script><b>/);
});

test('render writes the page into .product/local/ and prints its path', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kowalski-'));
  mkdirSync(join(dir, '.product'));
  const r = spawnSync(process.execPath, [SCRIPT, 'render'], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout.trim(), /\.product\/local\/roadmap\.html$/);
  assert.match(readFileSync(r.stdout.trim(), 'utf8'), /"total":0/);
});
