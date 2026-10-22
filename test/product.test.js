import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readLines, currentBets, validateBet, validateResource } from '../plugins/kowalski/scripts/product.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/kowalski/scripts/product.mjs', import.meta.url));

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'kowalski-'));
  mkdirSync(join(dir, '.product'));
  return dir;
}

function cli(cwd, ...args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

const candidate = { id: 'b-1', status: 'candidate', what: 'retry count on posts', for: 'client team' };

test('a valid candidate is appended and stamped with a date', () => {
  const dir = repo();
  const r = cli(dir, 'append', 'bets', JSON.stringify(candidate));
  assert.equal(r.code, 0, r.err);
  const stored = JSON.parse(readFileSync(join(dir, '.product/bets.jsonl'), 'utf8').trim());
  assert.equal(stored.id, 'b-1');
  assert.match(stored.at, /^\d{4}-\d{2}-\d{2}$/);
});

test('a later line carries the earlier fields forward', () => {
  const dir = repo();
  cli(dir, 'append', 'bets', JSON.stringify(candidate));
  const r = cli(dir, 'append', 'bets', JSON.stringify({ id: 'b-1', status: 'picked', owner: 'Ana', test: 't', drop_if: 'd' }));
  assert.equal(r.code, 0, r.err);
  const lines = readFileSync(join(dir, '.product/bets.jsonl'), 'utf8').trim().split('\n');
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[1]).what, 'retry count on posts');
});

test('a bet without id, what or status is rejected', () => {
  assert.match(validateBet({ status: 'candidate', what: 'x' }, null), /id/);
  assert.match(validateBet({ id: 'b-1', status: 'candidate' }, null), /what/);
  assert.match(validateBet({ id: 'b-1', what: 'x' }, null), /status/);
});

test('a new bet must start as a candidate', () => {
  assert.match(validateBet({ ...candidate, status: 'shipped', principles: 'all kept', proof: 'p', signal: 's' }, null), /candidate/);
});

test('candidate cannot jump to shipped', () => {
  assert.match(validateBet({ ...candidate, status: 'shipped', principles: 'all kept', proof: 'p', signal: 's' }, candidate), /candidate -> shipped/);
});

test('nothing follows killed', () => {
  const killed = { ...candidate, status: 'killed' };
  assert.match(validateBet({ ...candidate, status: 'kept' }, killed), /killed/);
});

test('picked needs an owner, said-no needs a principle, shipped needs proof and signal', () => {
  assert.match(validateBet({ ...candidate, status: 'picked' }, candidate), /owner/);
  assert.match(validateBet({ ...candidate, status: 'said-no' }, candidate), /principle/);
  const building = { ...candidate, status: 'building', owner: 'Ana' };
  assert.match(validateBet({ ...building, status: 'shipped', signal: 's' }, building), /proof/);
  assert.match(validateBet({ ...building, status: 'shipped', principles: 'all kept', proof: 'p' }, building), /signal/);
});

test('the full lifecycle is accepted', () => {
  let prev = null;
  const steps = [
    { ...candidate },
    { ...candidate, status: 'picked', owner: 'Ana', test: 't', drop_if: 'd' },
    { ...candidate, status: 'building', owner: 'Ana', test: 't', drop_if: 'd', brief: { who: 'w', today: 't', evidence: 'e', slice: 's', wrong_if: 'x' } },
    { ...candidate, status: 'shipped', owner: 'Ana', test: 't', drop_if: 'd', principles: 'all kept', proof: 'p', signal: 's' },
    { ...candidate, status: 'kept', owner: 'Ana', test: 't', drop_if: 'd', principles: 'all kept', proof: 'p', signal: 's', outcome: 'used 5 times in a week' },
  ];
  for (const s of steps) {
    assert.equal(validateBet(s, prev), null, s.status);
    prev = s;
  }
});

test('a pasted quote in says is rejected and points to local/', () => {
  const quoted = { ...candidate, evidence: [{ source: 's', date: '2026-10-01', mark: 'U', kind: 'words', says: '"we never see failed posts"' }] };
  assert.match(validateBet(quoted, null), /\.product\/local\//);
  const long = { ...candidate, evidence: [{ source: 's', date: '2026-10-01', mark: 'U', kind: 'words', says: 'x'.repeat(201) }] };
  assert.match(validateBet(long, null), /\.product\/local\//);
  const ok = { ...candidate, evidence: [{ source: 's', date: '2026-10-01', mark: 'U', kind: 'words', says: 'asked how often posts fail' }] };
  assert.equal(validateBet(ok, null), null);
});

test('a rejected append exits 1 and writes nothing', () => {
  const dir = repo();
  const r = cli(dir, 'append', 'bets', JSON.stringify({ id: 'b-1', status: 'shipped', what: 'x' }));
  assert.equal(r.code, 1);
  assert.match(r.err, /candidate/);
  assert.throws(() => readFileSync(join(dir, '.product/bets.jsonl')));
});

test('a malformed line is skipped and counted, not fatal', () => {
  const dir = repo();
  const file = join(dir, '.product/bets.jsonl');
  writeFileSync(file, JSON.stringify(candidate) + '\n{"id":"b-2","sta\n');
  const { lines, skipped } = readLines(file);
  assert.equal(lines.length, 1);
  assert.equal(skipped, 1);
  const r = cli(dir, 'current', 'bets');
  assert.equal(r.code, 0);
  assert.match(r.err, /skipped 1/);
});

test('current bets returns the last line per id', () => {
  const lines = [candidate, { ...candidate, status: 'picked', owner: 'Ana', test: 't', drop_if: 'd' }, { id: 'b-2', status: 'candidate', what: 'y' }];
  const current = currentBets(lines);
  assert.equal(current.length, 2);
  assert.equal(current.find((b) => b.id === 'b-1').status, 'picked');
});

test('history returns every line for one id', () => {
  const dir = repo();
  cli(dir, 'append', 'bets', JSON.stringify(candidate));
  cli(dir, 'append', 'bets', JSON.stringify({ id: 'b-1', status: 'picked', owner: 'Ana', test: 't', drop_if: 'd' }));
  const r = cli(dir, 'history', 'b-1');
  assert.equal(JSON.parse(r.out).length, 2);
});

test('resources need kind, source and why; a quote must be local', () => {
  const r = { id: 'r-1', kind: 'article', source: 'https://x', date: '2024-01-10', mark: 'S', why: 'method' };
  assert.equal(validateResource(r), null);
  assert.match(validateResource({ ...r, kind: 'tweet' }), /kind/);
  assert.match(validateResource({ ...r, why: undefined }), /why/);
  assert.match(validateResource({ ...r, kind: 'quote', local: false }), /local/);
});

test('without .product/ the script says how to start', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kowalski-'));
  const r = cli(dir, 'current', 'bets');
  assert.equal(r.code, 1);
  assert.match(r.err, /product-init/);
});

test('the .product/ folder is found from a subdirectory', () => {
  const dir = repo();
  mkdirSync(join(dir, 'src'));
  cli(join(dir, 'src'), 'append', 'bets', JSON.stringify(candidate));
  assert.equal(JSON.parse(readFileSync(join(dir, '.product/bets.jsonl'), 'utf8')).id, 'b-1');
});
