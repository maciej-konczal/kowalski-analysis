import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../plugins/kowalski/scripts/product.mjs', import.meta.url));
const repo = () => { const d = mkdtempSync(join(tmpdir(), 'kowalski-')); mkdirSync(join(d, '.product')); return d; };
const cli = (cwd, ...a) => { const r = spawnSync(process.execPath, [SCRIPT, ...a], { cwd, encoding: 'utf8' }); return { code: r.status, out: r.stdout, err: r.stderr }; };
const append = (d, o) => cli(d, 'append', 'bets', JSON.stringify(o));
const BRIEF = { who: 'rider', today: 'phones the shop', evidence: 'tags marked called x2 (behavior)', slice: 'ready list', wrong_if: 'riders still do not answer' };

function toBuilding(d) {
  append(d, { status: 'candidate', what: 'Ready list' });
  append(d, { id: 'b-1', status: 'picked', owner: 'Rosa', test: 't', drop_if: 'd' });
  return append(d, { id: 'b-1', status: 'building', brief: BRIEF });
}

test('the building brief needs today and wrong_if too', () => {
  const d = repo();
  append(d, { status: 'candidate', what: 'x' });
  append(d, { id: 'b-1', status: 'picked', owner: 'Rosa', test: 't', drop_if: 'd' });
  const r = append(d, { id: 'b-1', status: 'building', brief: { who: 'w', evidence: 'e', slice: 's' } });
  assert.equal(r.code, 1);
  assert.match(r.err, /today/);
  const r2 = append(d, { id: 'b-1', status: 'building', brief: { who: 'w', today: 't', evidence: 'e', slice: 's' } });
  assert.match(r2.err, /wrong_if/);
  assert.equal(toBuilding(repo()).code, 0);
});

test('proof and signal may carry the real output, quotes included', () => {
  const d = repo();
  toBuilding(d);
  const r = append(d, { id: 'b-1', status: 'shipped', principles: 'all kept', proof: 'done 99 now prints "#99 is not a ticket in the queue" and exits 1', signal: 'no "stack trace at done" reports in the channel' });
  assert.equal(r.code, 0, r.err);
});

test('a quote in a bet field names that field, not says', () => {
  const r = append(repo(), { status: 'candidate', what: 'Tracker', for: 'riders who said "I want a live pizza tracker"' });
  assert.equal(r.code, 1);
  assert.match(r.err, /"for" holds a quote/);
  assert.doesNotMatch(r.err, /in says/);
});

test('kept and killed need an outcome, read on a later day than shipped', () => {
  const d = repo();
  append(d, { status: 'candidate', what: 'Ready list', at: '2026-09-28' });
  append(d, { id: 'b-1', status: 'picked', owner: 'Rosa', test: 't', drop_if: 'd', at: '2026-09-29' });
  append(d, { id: 'b-1', status: 'building', brief: BRIEF, at: '2026-09-30' });
  append(d, { id: 'b-1', status: 'shipped', proof: 'p', signal: 's', principles: 'all kept', at: '2026-10-01' });
  const noOutcome = append(d, { id: 'b-1', status: 'kept', at: '2026-10-05' });
  assert.equal(noOutcome.code, 1);
  assert.match(noOutcome.err, /outcome/);
  const sameDay = append(d, { id: 'b-1', status: 'kept', outcome: 'looks fine', at: '2026-10-01' });
  assert.equal(sameDay.code, 1);
  assert.match(sameDay.err, /same day/);
  const ok = append(d, { id: 'b-1', status: 'killed', outcome: 'riders still missed 4 of 6 calls', at: '2026-10-08' });
  assert.equal(ok.code, 0, ok.err);
});

test('a near-duplicate of a said-no bet warns too', () => {
  const d = repo();
  append(d, { status: 'candidate', what: 'Booking calendar' });
  append(d, { id: 'b-1', status: 'said-no', principle: 'no new system' });
  const r = append(d, { status: 'candidate', what: 'Booking calendar for riders' });
  assert.equal(r.code, 0);
  assert.match(r.err, /b-1 was said-no/);
  const unrelated = append(d, { status: 'candidate', what: 'Phone at intake' });
  assert.doesNotMatch(unrelated.err, /said-no/);
});

test('a bad mark is echoed as typed', () => {
  const r = append(repo(), { status: 'candidate', what: 'x', evidence: [{ source: 's', date: '2026-10-01', mark: 'maybe', says: 'z' }] });
  assert.match(r.err, /"maybe"/);
});
