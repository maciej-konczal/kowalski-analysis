import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../plugins/kowalski/scripts/product.mjs', import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), 'kowalski-'));
const repo = () => { const d = tmp(); mkdirSync(join(d, '.product')); return d; };
const cli = (cwd, ...a) => { const r = spawnSync(process.execPath, [SCRIPT, ...a], { cwd, encoding: 'utf8' }); return { code: r.status, out: r.stdout, err: r.stderr }; };
const bets = (d) => readFileSync(join(d, '.product/bets.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));

test('init creates the brain, ignores local/, and never overwrites', () => {
  const d = tmp();
  mkdirSync(join(d, '.git'));
  writeFileSync(join(d, '.gitignore'), 'node_modules/\n');
  const r = cli(d, 'init');
  assert.equal(r.code, 0, r.err);
  for (const f of ['principles.md', 'users.md', 'bets.jsonl', 'resources.jsonl']) assert.ok(existsSync(join(d, '.product', f)), f);
  assert.ok(existsSync(join(d, '.product/local')));
  assert.match(readFileSync(join(d, '.gitignore'), 'utf8'), /^\.product\/local\/$/m);
  writeFileSync(join(d, '.product/principles.md'), 'mine');
  assert.equal(cli(d, 'init').code, 0);
  assert.equal(readFileSync(join(d, '.product/principles.md'), 'utf8'), 'mine');
  assert.equal(readFileSync(join(d, '.gitignore'), 'utf8').match(/\.product\/local\//g).length, 1);
});

test('init works from a subdirectory and creates .product at the repo root', () => {
  const d = tmp();
  mkdirSync(join(d, '.git'));
  mkdirSync(join(d, 'src'));
  assert.equal(cli(join(d, 'src'), 'init').code, 0);
  assert.ok(existsSync(join(d, '.product/bets.jsonl')));
});

test('the users template asks what people do today', () => {
  const d = tmp();
  cli(d, 'init');
  assert.match(readFileSync(join(d, '.product/users.md'), 'utf8'), /Today instead/);
});

test('a typo in a new bet status names the typo, not the id', () => {
  const r = cli(repo(), 'append', 'bets', JSON.stringify({ status: 'canddiate', what: 'x' }));
  assert.equal(r.code, 1);
  assert.match(r.err, /unknown status "canddiate"/);
});

test('a new bet without an id that is not a candidate says it must start as candidate', () => {
  const r = cli(repo(), 'append', 'bets', JSON.stringify({ status: 'picked', what: 'x', owner: 'A' }));
  assert.equal(r.code, 1);
  assert.match(r.err, /must start as candidate/);
});

test('marks are V, S or U; brackets and case are normalised', () => {
  const d = repo();
  const ok = cli(d, 'append', 'bets', JSON.stringify({ status: 'candidate', what: 'x', evidence: [{ source: 's', date: '2026-10-01', mark: '[s]', kind: 'words', says: 'asked for it' }] }));
  assert.equal(ok.code, 0, ok.err);
  assert.equal(bets(d)[0].evidence[0].mark, 'S');
  const bad = cli(d, 'append', 'bets', JSON.stringify({ status: 'candidate', what: 'y', evidence: [{ source: 's', date: '2026-10-01', mark: 'maybe', says: 'z' }] }));
  assert.equal(bad.code, 1);
  assert.match(bad.err, /mark/);
});

test('resource marks are normalised too', () => {
  const d = repo();
  const r = cli(d, 'append', 'resources', JSON.stringify({ kind: 'article', source: 'u', date: '2024-01-10', mark: '[S]', why: 'method' }));
  assert.equal(r.code, 0, r.err);
  assert.equal(JSON.parse(r.out).mark, 'S');
});

test('dates must be YYYY-MM-DD', () => {
  const r = cli(repo(), 'append', 'bets', JSON.stringify({ status: 'candidate', what: 'x', evidence: [{ source: 's', date: 'next tuesday', mark: 'U', kind: 'words', says: 'z' }] }));
  assert.equal(r.code, 1);
  assert.match(r.err, /YYYY-MM-DD/);
  const res = cli(repo(), 'append', 'resources', JSON.stringify({ kind: 'article', source: 'u', date: '10/01/2024', why: 'w' }));
  assert.equal(res.code, 1);
  assert.match(res.err, /YYYY-MM-DD/);
});

test('impact and effort are high or low, case-insensitive', () => {
  const d = repo();
  assert.equal(cli(d, 'append', 'bets', JSON.stringify({ status: 'candidate', what: 'x', impact: 'HIGH', effort: 'Low' })).code, 0);
  assert.deepEqual([bets(d)[0].impact, bets(d)[0].effort], ['high', 'low']);
  const bad = cli(d, 'append', 'bets', JSON.stringify({ status: 'candidate', what: 'y', impact: 'medium' }));
  assert.equal(bad.code, 1);
  assert.match(bad.err, /impact/);
});

test('evidence kind is behavior or words', () => {
  const r = cli(repo(), 'append', 'bets', JSON.stringify({ status: 'candidate', what: 'x', evidence: [{ source: 's', date: '2026-10-01', mark: 'U', kind: 'vibes', says: 'z' }] }));
  assert.equal(r.code, 1);
  assert.match(r.err, /behavior or words/);
});

test('a quote in a resource points to a neutral paraphrase, not to says', () => {
  const r = cli(repo(), 'append', 'resources', JSON.stringify({ kind: 'meeting', source: 's', why: 'she said "I would definitely use a mobile app"' }));
  assert.equal(r.code, 1);
  assert.doesNotMatch(r.err, /in says/);
  assert.match(r.err, /\.product\/local\//);
});

test('re-proposing a said-no or killed bet warns and links the old one', () => {
  const d = repo();
  cli(d, 'append', 'bets', JSON.stringify({ status: 'candidate', what: 'Badges and leaderboard' }));
  cli(d, 'append', 'bets', JSON.stringify({ id: 'b-1', status: 'said-no', principle: 'behavior over words' }));
  const r = cli(d, 'append', 'bets', JSON.stringify({ status: 'candidate', what: 'badges and leaderboard' }));
  assert.equal(r.code, 0);
  assert.match(r.err, /b-1 was said-no/);
});

test('building requires the brief', () => {
  const d = repo();
  cli(d, 'append', 'bets', JSON.stringify({ status: 'candidate', what: 'Cancel a signup' }));
  cli(d, 'append', 'bets', JSON.stringify({ id: 'b-1', status: 'picked', owner: 'Dan', test: 't', drop_if: 'd' }));
  const none = cli(d, 'append', 'bets', JSON.stringify({ id: 'b-1', status: 'building' }));
  assert.equal(none.code, 1);
  assert.match(none.err, /brief/);
  const partial = cli(d, 'append', 'bets', JSON.stringify({ id: 'b-1', status: 'building', brief: { who: 'regular volunteer', evidence: 'cancelled column (behavior)' } }));
  assert.equal(partial.code, 1);
  assert.match(partial.err, /today/);
  const ok = cli(d, 'append', 'bets', JSON.stringify({ id: 'b-1', status: 'building', brief: { who: 'regular volunteer', today: 'spreadsheet column', evidence: 'coordinator keeps a cancelled column (behavior)', slice: 'cancel command', wrong_if: 'they keep the spreadsheet' } }));
  assert.equal(ok.code, 0, ok.err);
});

test('a quote inside the brief is refused', () => {
  const d = repo();
  cli(d, 'append', 'bets', JSON.stringify({ status: 'candidate', what: 'x' }));
  cli(d, 'append', 'bets', JSON.stringify({ id: 'b-1', status: 'picked', owner: 'Dan', test: 't', drop_if: 'd' }));
  const r = cli(d, 'append', 'bets', JSON.stringify({ id: 'b-1', status: 'building', brief: { who: 'v', today: 't', evidence: 'she said "I never know who is coming"', slice: 's', wrong_if: 'w' } }));
  assert.equal(r.code, 1);
  assert.match(r.err, /\.product\/local\//);
});
