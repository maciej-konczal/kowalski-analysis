import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readLines, validateBet, validateResource } from '../plugins/kowalski/scripts/product.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/kowalski/scripts/product.mjs', import.meta.url));
const repo = () => { const d = mkdtempSync(join(tmpdir(), 'kowalski-')); mkdirSync(join(d, '.product')); return d; };
const cli = (cwd, ...a) => { const r = spawnSync(process.execPath, [SCRIPT, ...a], { cwd, encoding: 'utf8' }); return { code: r.status, out: r.stdout, err: r.stderr }; };
const current = (d) => JSON.parse(cli(d, 'current', 'bets').out);
const cand = (extra = {}) => JSON.stringify({ status: 'candidate', what: 'w', ...extra });

test('append onto a file with no trailing newline keeps both records', () => {
  const d = repo();
  writeFileSync(join(d, '.product/bets.jsonl'), JSON.stringify({ id: 'b-1', status: 'candidate', what: 'a' }));
  assert.equal(cli(d, 'append', 'bets', cand()).code, 0);
  assert.equal(current(d).length, 2);
});

test('a JSON line that is not an object is skipped, not fatal', () => {
  const d = repo();
  writeFileSync(join(d, '.product/bets.jsonl'), 'null\n[]\n42\n' + JSON.stringify({ id: 'b-1', status: 'candidate', what: 'a' }) + '\n');
  const { lines, skipped } = readLines(join(d, '.product/bets.jsonl'));
  assert.equal(lines.length, 1);
  assert.equal(skipped, 3);
  assert.equal(cli(d, 'render').code, 0);
});

test('appending a non-object is rejected, not a crash', () => {
  const r = cli(repo(), 'append', 'bets', 'null');
  assert.equal(r.code, 1);
  assert.match(r.err, /JSON object/);
});

test('a bet in a terminal state cannot change', () => {
  const prev = { id: 'b-1', status: 'said-no', what: 'w', principle: 'p' };
  assert.match(validateBet({ ...prev, what: 'rewritten', principle: 'other' }, prev), /said-no/);
  const kept = { id: 'b-1', status: 'kept', what: 'w', proof: 'p', signal: 's', owner: 'A' };
  assert.match(validateBet({ ...kept, signal: 'other' }, kept), /kept/);
});

test('a later append adds evidence instead of replacing it', () => {
  const d = repo();
  cli(d, 'append', 'bets', cand({ evidence: [{ source: 's1', date: '2026-10-01', mark: 'U', kind: 'words', says: 'one' }] }));
  cli(d, 'append', 'bets', JSON.stringify({ id: 'b-1', status: 'candidate', evidence: [{ source: 's2', date: '2026-10-02', mark: 'S', kind: 'words', says: 'two' }] }));
  assert.equal(current(d)[0].evidence.length, 2);
});

test('a later append cannot blank a field that had a value', () => {
  const prev = { id: 'b-1', status: 'picked', what: 'w', owner: 'Ana', test: 't' };
  assert.match(validateBet({ ...prev, status: 'building', owner: '' }, prev), /owner/);
  assert.match(validateBet({ ...prev, status: 'building', test: null }, prev), /test/);
});

test('a new candidate without an id gets the next id', () => {
  const d = repo();
  cli(d, 'append', 'bets', cand());
  cli(d, 'append', 'bets', cand());
  assert.deepEqual(current(d).map((b) => b.id), ['b-1', 'b-2']);
});

test('a candidate line cannot reuse an existing id', () => {
  const d = repo();
  cli(d, 'append', 'bets', cand());
  const r = cli(d, 'append', 'bets', JSON.stringify({ id: 'b-1', status: 'candidate', what: 'other' }));
  assert.equal(r.code, 1);
  assert.match(r.err, /b-1 already exists/);
});

test('a resource without an id gets the next id; a duplicate source is refused', () => {
  const d = repo();
  const res = { kind: 'article', source: 'https://x', why: 'y' };
  assert.equal(JSON.parse(cli(d, 'append', 'resources', JSON.stringify(res)).out).id, 'r-1');
  const dup = cli(d, 'append', 'resources', JSON.stringify(res));
  assert.equal(dup.code, 1);
  assert.match(dup.err, /already recorded as r-1/);
});

test('a quote inside a sentence or in another field is rejected', () => {
  const base = { id: 'b-1', status: 'candidate', what: 'w' };
  const ev = (says) => ({ ...base, evidence: [{ source: 's', date: '2026-10-01', mark: 'U', kind: 'words', says }] });
  assert.match(validateBet(ev('Anna said "this export is useless garbage" in the call'), null), /\.product\/local\//);
  assert.match(validateBet({ ...base, what: '„nie widzę tego wcale tutaj” fix' }, null), /\.product\/local\//);
  assert.match(validateResource({ id: 'r-1', kind: 'meeting', source: 's', why: 'she said “we never use this report”' }), /\.product\/local\//);
  assert.equal(validateBet(ev("asked how often posts fail, didn't know"), null), null);
  assert.equal(validateBet({ ...base, what: 'add a "retry" label' }, null), null);
});

test('an id like __proto__ does not crash render', () => {
  const d = repo();
  writeFileSync(join(d, '.product/bets.jsonl'), JSON.stringify({ id: '__proto__', status: 'candidate', what: 'a' }) + '\n');
  assert.equal(cli(d, 'render').code, 0);
});

test('evidence must be a list of objects', () => {
  const base = { id: 'b-1', status: 'candidate', what: 'w' };
  assert.match(validateBet({ ...base, evidence: { source: 's' } }, null), /evidence/);
  assert.match(validateBet({ ...base, evidence: ['text'] }, null), /evidence/);
});
