import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateUpdate, changesByDay, readVision, renderUpdates } from '../plugins/kowalski/scripts/product.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/kowalski/scripts/product.mjs', import.meta.url));
const TEMPLATE = readFileSync(fileURLToPath(new URL('../plugins/kowalski/updates/updates.html', import.meta.url)), 'utf8');

test('an update needs a date and added or planned items with text', () => {
  assert.equal(validateUpdate({ date: '2026-10-19', added: [{ text: 'Connect Gmail from Slack' }] }), null);
  assert.match(validateUpdate({ added: [] }), /date/);
  assert.match(validateUpdate({ date: '2026-10-19' }), /added.*planned/);
  assert.match(validateUpdate({ date: '2026-10-19', added: [{ tag: 'reads' }] }), /needs "text"/);
  assert.match(validateUpdate({ date: '2026-10-19', planned: [{ text: 'Demo', details: 'one line' }] }), /details/);
  assert.match(validateUpdate({ date: '2026-10-19', planned: [{ text: 'Demo', url: 'linear.app/x' }] }), /url/);
});

test('updates refuse quotes and long dashes', () => {
  assert.match(validateUpdate({ date: '2026-10-19', added: [{ text: 'The client said "please make this much faster now"' }] }), /quote/);
  assert.match(validateUpdate({ date: '2026-10-19', added: [{ text: 'Pings — now live' }] }), /hyphen/);
});

test('changes group commit subjects by day and drop merges and repeats', () => {
  const log = '2026-10-19\tinbox: connect Gmail\n2026-10-19\tMerge pull request #32 from x\n2026-10-19\tinbox: connect Gmail\n2026-10-18\tsignals: fix\n';
  assert.deepEqual(changesByDay(log), { '2026-10-19': ['inbox: connect Gmail'], '2026-10-18': ['signals: fix'] });
});

test('vision reads the title, the plain paragraph and the end-state steps with progress', () => {
  const v = readVision('# Acme\n\nTurns tools people build\ninto company software.\n\n## End state\n- [done] Lives in the team chat | Slack today\n- [partial] Runs on the customer cloud | our cloud today | ENG-1\n- [next] Checks answers daily\n');
  assert.equal(v.title, 'Acme');
  assert.deepEqual(v.paragraphs, ['Turns tools people build into company software.']);
  assert.deepEqual(v.steps.map((s) => s.status), ['done', 'partial', 'next']);
  assert.equal(v.steps[1].now, 'our cloud today');
  assert.equal(v.steps[1].ref, 'ENG-1');
  assert.equal(v.progress, 50);
  assert.equal(readVision('').progress, null);
});

test('the page carries the data, the title and the product css, and closes no script early', () => {
  const html = renderUpdates({ changes: { '2026-10-19': ['a</script>b'] }, updates: {}, vision: readVision('# Acme'), css: '.x{color:red}', today: '2026-10-19' }, TEMPLATE);
  assert.match(html, /<title>Acme<\/title>/);
  assert.match(html, /\.x\{color:red\}/);
  assert.ok(!html.includes('a</script>b'));
  assert.ok(!html.includes('{{DATA}}'));
});

test('append updates, then updates renders the page from git and the log', () => {
  const repo = mkdtempSync(join(tmpdir(), 'kowalski-updates-'));
  const git = (...args) => spawnSync('git', args, { cwd: repo, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_DATE: '2026-10-19T10:00:00', GIT_COMMITTER_DATE: '2026-10-19T10:00:00' } });
  git('init', '-q'); git('config', 'user.email', 't@example.invalid'); git('config', 'user.name', 't');
  mkdirSync(join(repo, '.product'));
  writeFileSync(join(repo, '.product', 'vision.md'), '# Demo product\n\nDoes one thing well.\n');
  writeFileSync(join(repo, 'a.txt'), 'a'); git('add', '.'); git('commit', '-qm', 'app: connect Gmail from Slack');
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: repo, encoding: 'utf8' });
  assert.equal(run('append', 'updates', JSON.stringify({ date: '2026-10-19', added: [{ text: 'Connect Gmail from Slack' }] })).status, 0);
  assert.equal(run('append', 'updates', '{"date":"bad"}').status, 1);
  assert.deepEqual(JSON.parse(run('changes', '2026-10-19').stdout), ['app: connect Gmail from Slack']);
  const out = run('updates').stdout.trim();
  const html = readFileSync(out, 'utf8');
  assert.match(html, /Connect Gmail from Slack/);
  assert.match(html, /<title>Demo product<\/title>/);
  assert.equal(run('page-url', 'https://claude.ai/artifact/abc').status, 0);
  assert.equal(run('page-url').stdout.trim(), 'https://claude.ai/artifact/abc');
});
