import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { groupRoadmap, renderRoadmap, shareBets, roadmapMarkdown } from '../plugins/kowalski/scripts/product.mjs';

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

const private_ = {
  for: 'Acme Corp buyers', ref: 'ENG-7', brief: { who: 'Jane' },
  evidence: [{ source: 'call with Acme', date: '2026-10-01', mark: 'S', kind: 'words', says: 'Acme wants it' }],
  proof: 'acme output', signal: 'Acme replies', outcome: 'Acme kept it',
};
const plan = { test: 'twenty known questions', drop_if: 'under ten points better' };

test('a shared bet keeps what the board and its details need, and drops customer context', () => {
  const [b] = shareBets([bet('a', 'picked', { impact: 'high', effort: 'low', owner: 'Ann', by: '2026-11-01', ...plan, ...private_ })]);
  assert.deepEqual(b, { id: 'a', what: 'bet a', status: 'picked', impact: 'high', effort: 'low', owner: 'Ann', by: '2026-11-01', ...plan });
});

test('the shared page carries the export date for its header', () => {
  const html = renderRoadmap([], '{{DATA}}', {}, 'demo', { exported: '2026-10-26' });
  assert.match(html, /"shared":true,"exported":"2026-10-26"/);
  assert.match(renderRoadmap([], '{{DATA}}'), /"shared":false,"exported":null/);
});

test('markdown has the lanes, a mermaid quadrant per scored bet, unscored and said-no', () => {
  const md = roadmapMarkdown([
    bet('a', 'building', { what: 'Retrieval eval: twenty questions with known answers', impact: 'high', effort: 'low', owner: 'Ann', ...plan }),
    bet('b', 'candidate', { impact: 'low', effort: 'high' }), bet('c', 'candidate'),
    bet('d', 'said-no', { principle: '2 serve the meeting loop first' }),
  ], 'Demo', '2026-10-26');
  assert.match(md, /^# Demo roadmap/);
  assert.match(md, /Exported 2026-10-26\. Now 1 · Next 0 · Later 2 · Done 0\./);
  assert.match(md, /- \*\*a\*\* Retrieval eval \(owner Ann, high impact, low effort\)\n  - How we'll know it works: twenty known questions\n  - We stop if: under ten points better/);
  assert.match(md, /```mermaid\nquadrantChart/);
  assert.match(md, /  a Retrieval eval: \[0\.25, 0\.75\]/, 'high impact, low effort sits top left (do first)');
  assert.match(md, /  b bet b: \[0\.75, 0\.25\]/, 'low impact, high effort sits bottom right (say no)');
  assert.match(md, /Not scored yet: c bet c\./);
  assert.match(md, /- \*\*d\*\* bet d: no, by 2 serve the meeting loop first/);
});

test('export writes a shared html and markdown with no customer context in either', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kowalski-'));
  mkdirSync(join(dir, '.product'));
  const line = (b) => JSON.stringify({ at: '2026-10-20', ...b }) + '\n';
  writeFileSync(join(dir, '.product', 'bets.jsonl'),
    line(bet('a', 'candidate', { impact: 'high', effort: 'low' })) + line(bet('a', 'picked', { impact: 'high', effort: 'low', owner: 'Ann', ...private_ })));
  const r = spawnSync(process.execPath, [SCRIPT, 'export'], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const [html, md] = r.stdout.trim().split('\n');
  assert.match(html, /\.product\/local\/share\/roadmap\.html$/);
  assert.match(md, /\.product\/local\/share\/roadmap\.md$/);
  for (const file of [html, md]) assert.doesNotMatch(readFileSync(file, 'utf8'), /Acme|Jane|ENG-7/, file);
  assert.match(readFileSync(html, 'utf8'), /"shared":true/);
  assert.match(readFileSync(md, 'utf8'), /\*\*a\*\* bet a \(owner Ann/);
});
