import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../plugins/kowalski/scripts/product.mjs', import.meta.url));
const TODAY = new Date().toISOString().slice(0, 10);
const repo = () => {
  const d = mkdtempSync(join(tmpdir(), 'kowalski-'));
  mkdirSync(join(d, '.git'));
  mkdirSync(join(d, '.product'));
  writeFileSync(join(d, '.product/principles.md'), '# Product principles\n\n## 1. Allergy safety first\n\n- **Status:** agreed\n\n## 2. Run on the laptops we have\n\n- **Status:** agreed\n');
  return d;
};
const cli = (cwd, ...a) => { const r = spawnSync(process.execPath, [SCRIPT, ...a], { cwd, encoding: 'utf8' }); return { code: r.status, out: r.stdout, err: r.stderr }; };
const append = (d, o) => cli(d, 'append', 'bets', JSON.stringify(o));
const EV = { source: 'notes/a.md', date: '2026-10-01', mark: 'S', kind: 'behavior', says: 'two near-misses at serving' };
const BRIEF = { who: 'cook', today: 'paper list', evidence: 'near-misses at serving (behavior)', slice: 'check at serving', wrong_if: 'near-misses keep happening at serving' };
const toPicked = (d) => { append(d, { status: 'candidate', what: 'Allergy check', evidence: [EV] }); return append(d, { id: 'b-1', status: 'picked', owner: 'Noor', test: 'cook uses it for a week', drop_if: 'cook keeps the paper list' }); };

test('at must be a real date, not in the future, not before the previous line', () => {
  const d = repo();
  assert.match(append(d, { status: 'candidate', what: 'x', at: 'yesterday' }).err, /at "yesterday" must be YYYY-MM-DD/);
  assert.match(append(d, { status: 'candidate', what: 'x', at: '2999-01-01' }).err, /future/);
  assert.equal(append(d, { status: 'candidate', what: 'y', at: '2026-10-05' }).code, 0);
  assert.match(append(d, { id: 'b-1', status: 'picked', owner: 'A', test: 't', drop_if: 'd', at: '2026-10-01' }).err, /before/);
});

test('picked needs exactly one owner, a test and a drop_if', () => {
  const d = repo();
  append(d, { status: 'candidate', what: 'x', evidence: [EV] });
  assert.match(append(d, { id: 'b-1', status: 'picked', owner: 'Noor, Tomas', test: 't', drop_if: 'd' }).err, /one owner/);
  assert.match(append(d, { id: 'b-1', status: 'picked', owner: 'Noor and Tomas', test: 't', drop_if: 'd' }).err, /one owner/);
  assert.match(append(d, { id: 'b-1', status: 'picked', owner: 'Noor', drop_if: 'd' }).err, /"test"/);
  assert.match(append(d, { id: 'b-1', status: 'picked', owner: 'Noor', test: 't' }).err, /"drop_if"/);
  assert.equal(toPicked(repo()).code, 0);
});

test('said-no must name an agreed principle by its number', () => {
  const d = repo();
  append(d, { status: 'candidate', what: 'Parent app' });
  assert.match(append(d, { id: 'b-1', status: 'said-no', principle: '9. Made up principle' }).err, /principle 9/);
  assert.match(append(d, { id: 'b-1', status: 'said-no', principle: 'thin evidence' }).err, /number/);
  assert.equal(append(d, { id: 'b-1', status: 'said-no', principle: '2. Run on the laptops we have' }).code, 0);
});

test('evidence items need source, date, mark, kind and says', () => {
  const r = append(repo(), { status: 'candidate', what: 'x', evidence: [{ source: 'notes/x.md', says: 'y' }] });
  assert.equal(r.code, 1);
  assert.match(r.err, /evidence needs "date"/);
});

test('wrong_if cannot just repeat drop_if', () => {
  const d = repo();
  toPicked(d);
  const r = append(d, { id: 'b-1', status: 'building', brief: { ...BRIEF, wrong_if: 'Cook keeps the paper list.' } });
  assert.equal(r.code, 1);
  assert.match(r.err, /wrong_if/);
  assert.equal(append(d, { id: 'b-1', status: 'building', brief: BRIEF }).code, 0);
});

test('shipped needs a principles check', () => {
  const d = repo();
  toPicked(d);
  append(d, { id: 'b-1', status: 'building', brief: BRIEF });
  const r = append(d, { id: 'b-1', status: 'shipped', proof: 'p', signal: 's' });
  assert.equal(r.code, 1);
  assert.match(r.err, /principles/);
  assert.equal(append(d, { id: 'b-1', status: 'shipped', principles: 'all kept', proof: 'p', signal: 's', principles: '1 kept: unknown dishes are refused; 2 kept: runs on the office laptop' }).code, 0);
});

test('a resource source is compared after normalising ./ and trailing slashes', () => {
  const d = repo();
  cli(d, 'append', 'resources', JSON.stringify({ kind: 'meeting', source: 'notes/t.md', why: 'w' }));
  const r = cli(d, 'append', 'resources', JSON.stringify({ kind: 'meeting', source: './notes/t.md', why: 'w' }));
  assert.equal(r.code, 1);
  assert.match(r.err, /already recorded as r-1/);
});

test('scratch copies named repo files into .product/local/scratch and prints the folder', () => {
  const d = repo();
  mkdirSync(join(d, 'data'));
  writeFileSync(join(d, 'app.mjs'), 'console.log(1)');
  writeFileSync(join(d, 'data/menu.json'), '{}');
  const r = cli(d, 'scratch', 'app.mjs', 'data/menu.json');
  assert.equal(r.code, 0, r.err);
  const dir = r.out.trim();
  assert.ok(dir.startsWith(join(realpathSync(d), '.product/local/scratch')), dir);
  assert.equal(readFileSync(join(dir, 'data/menu.json'), 'utf8'), '{}');
  assert.ok(existsSync(join(dir, 'app.mjs')));
});

test('scratch in a product folder below the git root uses that folder and prints where the copy runs', () => {
  const outer = mkdtempSync(join(tmpdir(), 'kowalski-'));
  mkdirSync(join(outer, '.git'));
  const d = join(outer, 'app');
  mkdirSync(join(d, '.product'), { recursive: true });
  writeFileSync(join(d, 'app.mjs'), 'console.log(1)');
  const r = cli(d, 'scratch', 'app.mjs');
  assert.equal(r.code, 0, r.err);
  const dir = r.out.trim();
  assert.ok(dir.startsWith(join(realpathSync(d), '.product/local/scratch')), dir);
  assert.ok(existsSync(join(dir, 'app.mjs')));
  assert.ok(!existsSync(join(outer, '.product')));
});

test('scratch from a subfolder takes names from there', () => {
  const d = repo();
  mkdirSync(join(d, 'src'));
  writeFileSync(join(d, 'src/app.mjs'), 'console.log(1)');
  const r = cli(join(d, 'src'), 'scratch', 'app.mjs');
  assert.equal(r.code, 0, r.err);
  assert.ok(existsSync(join(r.out.trim(), 'app.mjs')));
  assert.ok(r.out.trim().endsWith('/src'));
});

test('scratch refuses paths outside the repo', () => {
  const r = cli(repo(), 'scratch', '../../etc/passwd');
  assert.equal(r.code, 1);
  assert.match(r.err, /outside/);
});
