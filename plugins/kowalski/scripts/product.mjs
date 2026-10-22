#!/usr/bin/env node
// The only writer of a product repo's .product/*.jsonl. Append-only.
//
//   node product.mjs init                       create .product/ at the repo root (never overwrites), ignore local/
//   node product.mjs append bets '<json>'       validate, merge onto the bet's last line, append
//   node product.mjs append resources '<json>'
//   node product.mjs current bets               latest line per id, as a JSON array
//   node product.mjs history <id>               every line for one bet
//   node product.mjs render                     write .product/local/roadmap.html, print its path
//   node product.mjs scratch <files...>         copy repo files into .product/local/scratch/<time>/ for a safe proof run
//   node product.mjs append updates '<json>'    one day's update: { date, added: [...], planned: [...] }, the latest line per date wins
//   node product.mjs changes <YYYY-MM-DD>       that day's commit subjects from git, as a JSON array
//   node product.mjs updates [--since YYYY-MM-DD]  write .product/local/updates.html (day by day), print its path
//   node product.mjs page-url <url>             remember where the updates page is published (.product/page.json)
//   node product.mjs check                      what needs a person first: passed dates with no outcome, days with commits but no update, open bets and their tracker issue
import { existsSync, readFileSync, appendFileSync, mkdirSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const NEXT = {
  candidate: ['picked', 'said-no'],
  picked: ['building', 'said-no'],
  building: ['shipped'],
  shipped: ['kept', 'killed'],
  kept: [],
  killed: [],
  'said-no': [],
};
const KINDS = ['article', 'decision', 'meeting', 'outcome', 'quote'];
const QUOTE_HINT = 'put exact words in .product/local/<id>.md and keep a neutral paraphrase in says';
const QUOTE_HINT_HERE = 'put exact words in .product/local/<id>.md and keep a neutral paraphrase here';
const MARKS = ['V', 'S', 'U'];
const LEVELS = ['high', 'low'];
const EVIDENCE_KINDS = ['behavior', 'words'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
// A tracker issue: an id like ENG-12, or a link to it.
const REF = /^([A-Za-z][A-Za-z0-9]*-\d+|https?:\/\/\S+)$/;

// Accept "[s]" or "s" for a mark and "HIGH" for a level; store the canonical form.
function normaliseMark(mark) {
  if (typeof mark !== 'string') return mark;
  const clean = mark.replace(/[\[\]\s]/g, '').toUpperCase();
  return MARKS.includes(clean) ? clean : mark; // a bad mark is reported as typed
}

export function normalise(line) {
  const out = { ...line };
  for (const key of ['impact', 'effort']) if (typeof out[key] === 'string') out[key] = out[key].trim().toLowerCase();
  if (out.mark !== undefined) out.mark = normaliseMark(out.mark);
  if (Array.isArray(out.evidence)) {
    out.evidence = out.evidence.map((e) => (isRecord(e) && e.mark !== undefined ? { ...e, mark: normaliseMark(e.mark) } : e));
  }
  return out;
}

const EVIDENCE_FIELDS = ['source', 'date', 'mark', 'kind', 'says'];
const MANY_OWNERS = /,|&|\/|\+|\band\b/i;
const plain = (t) => String(t ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function today() {
  return new Date().toISOString().slice(0, 10);
}

function checkAt(line, previous, now) {
  if (line.at === undefined) return null;
  if (!DATE.test(String(line.at))) return `at "${line.at}" must be YYYY-MM-DD`;
  if (line.at > now) return `at "${line.at}" is in the future`;
  if (previous?.at && DATE.test(String(previous.at)) && line.at < previous.at) {
    return `at "${line.at}" is before the bet's last line (${previous.at})`;
  }
  return null;
}

function checkMarkAndDate(record, where) {
  if (record.mark !== undefined && !MARKS.includes(record.mark)) return `${where} mark "${record.mark}" must be V, S or U`;
  if (record.date !== undefined && !DATE.test(String(record.date))) return `${where} date "${record.date}" must be YYYY-MM-DD`;
  return null;
}

export function readLines(file) {
  if (!existsSync(file)) return { lines: [], skipped: 0 };
  const lines = [];
  let skipped = 0;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    if (!raw.trim()) continue;
    let line;
    try {
      line = JSON.parse(raw);
    } catch {
      line = null;
    }
    if (isRecord(line) && typeof line.id === 'string') lines.push(line);
    else skipped++;
  }
  return { lines, skipped };
}

export function currentBets(lines) {
  const byId = new Map();
  for (const line of lines) byId.set(line.id, line);
  return [...byId.values()];
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// A quoted span of 4 or more words is someone's exact words, wherever it sits.
const QUOTED = [/["“„«]([^"“”„«»]+)["”»]/g, /(?:^|\s)['‘]([^'‘’]+)['’](?=$|[\s.,;:!?])/g];
// proof and signal hold real output (a CLI message, a metric), which may be quoted; spec 04.
const NOT_PROSE = new Set(['id', 'at', 'status', 'source', 'date', 'mark', 'kind', 'local', 'impact', 'effort', 'proof', 'signal', 'by', 'ref']);
const BRIEF_KEYS = ['who', 'today', 'evidence', 'slice', 'wrong_if'];

function holdsQuote(text) {
  return QUOTED.some((re) => [...String(text).matchAll(re)].some((m) => m[1].trim().split(/\s+/).length >= 4));
}

function quoteIn(record) {
  for (const [key, value] of Object.entries(record)) {
    if (NOT_PROSE.has(key)) continue;
    if (typeof value === 'string' && holdsQuote(value)) return key;
  }
  return null;
}

// ctx: { principles: [numbers of the principles in principles.md] | null, today: 'YYYY-MM-DD' }
export function validateBet(line, previous, ctx = {}) {
  if (previous && !NEXT[previous.status].length) {
    return `${previous.id} is ${previous.status}; nothing can change after ${previous.status}`;
  }
  if (!line.status) return 'bet needs "status"';
  if (!(line.status in NEXT)) return `unknown status "${line.status}"; use ${Object.keys(NEXT).join(', ')}`;
  if (!previous && line.status !== 'candidate') return `a new bet must start as candidate, not ${line.status}`;
  for (const field of ['id', 'what']) {
    if (!line[field]) return `bet needs "${field}"`;
  }
  const badAt = checkAt(line, previous, ctx.today ?? today());
  if (badAt) return badAt;
  if (previous && line.status !== previous.status && !NEXT[previous.status].includes(line.status)) {
    const allowed = NEXT[previous.status];
    return `${previous.status} -> ${line.status} is not allowed` +
      (allowed.length ? `; next can be ${allowed.join(' or ')}` : `; nothing follows ${previous.status}`);
  }
  if (previous) {
    for (const [key, value] of Object.entries(previous)) {
      if (value && key in line && (line[key] === '' || line[key] == null)) return `"${key}" had a value and cannot be blanked`;
    }
  }
  if (line.status === 'picked') {
    if (!line.owner) return 'picked needs one "owner"';
    if (MANY_OWNERS.test(String(line.owner))) return `picked needs one owner, not "${line.owner}"; pick the one who answers for it`;
    for (const key of ['test', 'drop_if']) {
      if (typeof line[key] !== 'string' || !line[key].trim()) return `picked needs "${key}": ${key === 'test' ? 'the cheapest test' : 'the result that drops the pick'}`;
    }
  }
  if (line.status === 'said-no' && line.principle && Array.isArray(ctx.principles) && ctx.principles.length) {
    const n = String(line.principle).match(/^\s*(\d+)/);
    if (!n) return `said-no "principle" must start with the principle's number from principles.md (1-${Math.max(...ctx.principles)})`;
    if (!ctx.principles.includes(Number(n[1]))) return `there is no principle ${n[1]} in principles.md`;
  }
  if (line.status === 'building' && previous?.status !== 'building') {
    if (!isRecord(line.brief)) {
      return `building needs the "brief" you showed in chat: {${BRIEF_KEYS.map((k) => `"${k}":..`).join(',')}}`;
    }
    for (const key of BRIEF_KEYS) {
      if (typeof line.brief[key] !== 'string' || !line.brief[key].trim()) return `the brief needs "${key}"`;
    }
    if (line.drop_if && plain(line.brief.wrong_if) === plain(line.drop_if)) {
      return 'the brief\'s wrong_if repeats drop_if; say what would show this slice is wrong, against the strongest evidence';
    }
  }
  if (isRecord(line.brief) && quoteIn(line.brief)) return `the brief holds a quote: ${QUOTE_HINT_HERE}`;
  if (line.status === 'said-no' && !line.principle) return 'said-no needs the "principle" that said no';
  if (line.status === 'shipped' && !line.proof) return 'shipped needs "proof" (the real output)';
  if (line.status === 'shipped' && !line.signal) return 'shipped needs "signal" (what we watch, and where)';
  if (line.status === 'shipped' && previous?.status !== 'shipped' && (typeof line.principles !== 'string' || !line.principles.trim())) {
    return 'shipped needs "principles": for each agreed principle, whether this slice keeps or breaks it';
  }
  if ((line.status === 'kept' || line.status === 'killed') && previous?.status === 'shipped') {
    if (!line.outcome) return `${line.status} needs "outcome": what the signal showed, and how you read it`;
    if (previous.at && previous.at === line.at) {
      return `${line.status} on the same day as shipped: the signal cannot be read yet; record it once the test has run`;
    }
  }
  if (line.evidence !== undefined && (!Array.isArray(line.evidence) || !line.evidence.every(isRecord))) {
    return 'evidence must be a list of objects: {source, date, mark, says}';
  }
  for (const key of ['impact', 'effort']) {
    if (line[key] !== undefined && !LEVELS.includes(line[key])) return `${key} "${line[key]}" must be high or low`;
  }
  if (line.by !== undefined && !DATE.test(String(line.by))) return `by "${line.by}" must be YYYY-MM-DD`;
  if (line.ref !== undefined && !REF.test(String(line.ref))) return `ref "${line.ref}" must be a tracker id like ENG-12 or a link to the issue`;
  for (const e of line.evidence ?? []) {
    const bad = checkMarkAndDate(e, 'evidence');
    if (bad) return bad;
    if (e.kind !== undefined && !EVIDENCE_KINDS.includes(e.kind)) return `evidence kind "${e.kind}" must be behavior or words`;
    if (String(e.says ?? '').length > 200 || quoteIn(e)) return `evidence "says" looks like a quote: ${QUOTE_HINT}`;
    const missing = EVIDENCE_FIELDS.find((k) => e[k] === undefined || e[k] === '');
    if (missing) return `evidence needs "${missing}" (each item: ${EVIDENCE_FIELDS.join(', ')})`;
  }
  const field = quoteIn(line);
  if (field) return `"${field}" holds a quote: put exact words in .product/local/<id>.md and keep a neutral paraphrase in "${field}"`;
  return null;
}

export function validateResource(line) {
  for (const field of ['id', 'kind', 'source', 'why']) {
    if (!line[field]) return `resource needs "${field}"`;
  }
  if (!KINDS.includes(line.kind)) return `unknown kind "${line.kind}"; use ${KINDS.join(', ')}`;
  if (line.kind === 'quote' && line.local !== true) return `a quote must be local: true; ${QUOTE_HINT_HERE}`;
  const bad = checkMarkAndDate(line, 'resource');
  if (bad) return bad;
  const field = quoteIn(line);
  if (field) return `"${field}" holds a quote: ${QUOTE_HINT_HERE}`;
  return null;
}

const COLUMN = { building: 'now', picked: 'next', candidate: 'later', shipped: 'done', kept: 'done', killed: 'done' };
const OPEN = ['candidate', 'picked', 'building'];

export function groupRoadmap(bets) {
  const columns = { now: [], next: [], later: [], done: [] };
  const grid = { 'high-low': [], 'high-high': [], 'low-low': [], 'low-high': [] };
  const unscored = [];
  const saidNo = [];
  for (const b of bets) {
    if (b.status === 'said-no') {
      saidNo.push(b);
      continue;
    }
    if (COLUMN[b.status]) columns[COLUMN[b.status]].push(b);
    if (!OPEN.includes(b.status)) continue;
    const key = `${b.impact}-${b.effort}`;
    if (grid[key]) grid[key].push(b);
    else unscored.push(b);
  }
  return { total: bets.length, columns, grid, unscored, saidNo };
}

export function renderRoadmap(bets, template, history = {}) {
  const data = JSON.stringify({ ...groupRoadmap(bets), history }).replace(/</g, '\\u003c');
  return template.replace('{{DATA}}', () => data);
}

// Daily updates: one line per day in .product/updates.jsonl, the latest line for a date wins.
const LONG_DASH = /[–—―−]/;

function checkItems(items, where) {
  if (items === undefined) return null;
  if (!Array.isArray(items)) return `${where} must be a list`;
  for (const [i, item] of items.entries()) {
    const at = `${where}[${i}]`;
    if (!isRecord(item) || typeof item.text !== 'string' || !item.text.trim()) return `${at} needs "text"`;
    if (item.details !== undefined && !(Array.isArray(item.details) && item.details.every((d) => typeof d === 'string'))) {
      return `${at}.details must be a list of strings`;
    }
    if (item.url !== undefined && !/^https?:\/\//.test(String(item.url))) return `${at}.url must start with http(s)://`;
    if (item.outcome !== undefined && (typeof item.outcome !== 'string' || !item.outcome.trim())) return `${at}.outcome must say what happened`;
    for (const text of [item.text, item.tag, item.ref, item.outcome, ...(item.details ?? [])]) {
      if (typeof text !== 'string') continue;
      if (holdsQuote(text)) return `${at} holds a quote: write it in our words; exact words go in .product/local/`;
      if (LONG_DASH.test(text)) return `${at} uses a long dash; use the regular hyphen (-)`;
    }
  }
  return null;
}

export function validateUpdate(line) {
  if (!isRecord(line)) return 'an update is one JSON object';
  if (!DATE.test(String(line.date ?? ''))) return 'update needs "date" as YYYY-MM-DD';
  if (line.added === undefined && line.planned === undefined) return 'update needs "added" or "planned"';
  return checkItems(line.added, 'added') ?? checkItems(line.planned, 'planned');
}

export function readUpdates(file) {
  const byDate = {};
  if (!existsSync(file)) return byDate;
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    if (!raw.trim()) continue;
    try {
      const line = JSON.parse(raw);
      if (isRecord(line) && DATE.test(String(line.date))) byDate[line.date] = line;
    } catch { /* a malformed line is skipped */ }
  }
  return byDate;
}

// What needs a person before new work. A picked or building bet whose "by" passed, and a planned item on a past day
// with no "outcome", are due: ask what happened. A day with commits but no "added" since updates began is unwritten.
// Open and shipped bets are listed with their tracker ref, so the tracker can be compared without matching titles.
export function checkProduct({ bets, updates, changes, today: day }) {
  const due = [];
  for (const b of bets) {
    if ((b.status === 'picked' || b.status === 'building') && b.by && b.by < day) {
      due.push({ id: b.id, status: b.status, by: b.by, what: b.what, ref: b.ref ?? null });
    }
  }
  for (const date of Object.keys(updates).sort()) {
    if (date >= day) continue;
    for (const p of updates[date].planned ?? []) if (!p.outcome) due.push({ date, what: p.text, ref: p.ref ?? null });
  }
  const begun = Object.keys(updates).filter((d) => updates[d].added?.length).sort()[0];
  const unwritten = begun
    ? Object.keys(changes).filter((d) => d > begun && d < day && !updates[d]?.added?.length).sort()
      .map((date) => ({ date, changes: changes[date].length }))
    : [];
  const tracker = bets.filter((b) => ['picked', 'building', 'shipped'].includes(b.status))
    .map((b) => ({ id: b.id, status: b.status, what: b.what, ref: b.ref ?? null }));
  return { due, unwritten, tracker };
}

export function formatCheck({ due, unwritten, tracker }) {
  const short = (t) => (String(t).length > 90 ? String(t).slice(0, 89).trimEnd() + '...' : String(t));
  const ref = (r) => (r ? ` [${r}]` : '');
  const section = (title, rows) => [title, ...(rows.length ? rows.map((r) => '  ' + r) : ['  nothing'])].join('\n');
  return [
    section('Past due, ask what happened before new work:', due.map((d) => (d.id
      ? `${d.id} ${d.status}, by ${d.by}: ${short(d.what)}${ref(d.ref)}`
      : `${d.date} planned: ${short(d.what)}${ref(d.ref)}`))),
    section('Commits with no update written:', unwritten.map((u) => `${u.date}: ${u.changes} change${u.changes === 1 ? '' : 's'}`)),
    section('Bets and their tracker issue (compare with the tracker):', tracker.map((t) => `${t.id} ${t.status}: ${short(t.what)}${t.ref ? ref(t.ref) : ' [no ref]'}`)),
  ].join('\n\n') + '\n';
}

// Commit subjects per day from git, merges left out: { 'YYYY-MM-DD': [subject, ...] }.
export function changesByDay(log) {
  const out = {};
  for (const row of log.split('\n')) {
    const [date, subject] = row.split('\t');
    if (!DATE.test(date ?? '') || !subject?.trim() || /^Merge (pull request|branch|remote-tracking)/.test(subject)) continue;
    const day = (out[date] ??= []);
    if (!day.includes(subject.trim())) day.push(subject.trim());
  }
  return out;
}

function gitLog(root, since) {
  // A bare date means that date at the current time of day to git; start at midnight so a day's morning counts.
  const args = ['log', '--date=short', '--pretty=%ad%x09%s', ...(since ? [`--since=${since} 00:00`] : [])];
  const run = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return run.status === 0 ? run.stdout : '';
}

// vision.md: "# Title", the vision in plain words, then "## End state" with one step per line:
//   - [done|partial|next] what the product does | where it stands today | ref
// Progress counts done as 1 and partial as a half.
const STEP = /^-\s*\[(done|partial|next)\]\s*([^|]+?)\s*(?:\|\s*([^|]*?)\s*)?(?:\|\s*(\S+)\s*)?$/;

export function readVision(text) {
  const lines = String(text ?? '').split('\n');
  const heading = lines.find((l) => /^#\s+/.test(l));
  const endAt = lines.findIndex((l) => /^##\s+end state\b/i.test(l));
  const intro = (endAt === -1 ? lines : lines.slice(0, endAt)).filter((l) => !/^#\s+/.test(l)).join('\n').trim();
  const steps = endAt === -1 ? [] : lines.slice(endAt + 1).map((l) => l.match(STEP)).filter(Boolean)
    .map(([, status, what, now, ref]) => ({ status, what, now: now || '', ref: ref || '' }));
  const score = steps.reduce((sum, s) => sum + (s.status === 'done' ? 1 : s.status === 'partial' ? 0.5 : 0), 0);
  return {
    title: heading ? heading.replace(/^#\s+/, '').trim() : '',
    paragraphs: intro ? intro.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()) : [],
    steps,
    progress: steps.length ? Math.round((score / steps.length) * 100) : null,
  };
}

export function renderUpdates({ changes, updates, vision, css, refUrl, today: day }, template) {
  const data = JSON.stringify({ changes, updates, vision, refUrl: refUrl || '', today: day }).replace(/</g, '\\u003c');
  const title = (vision.title || 'Product updates').replace(/[<&]/g, '');
  return template
    .replace('{{TITLE}}', () => title)
    .replace('{{CSS}}', () => String(css ?? '').replace(/<\//g, '<\\/'))
    .replace('{{DATA}}', () => data);
}

// .product/page.json: { updates_url: where the page is published, ref_url: prefix that turns a ref like ENG-12 into a link }
function readPage(product) {
  try {
    const page = JSON.parse(readFileSync(join(product, 'page.json'), 'utf8'));
    return isRecord(page) ? page : {};
  } catch {
    return {};
  }
}

function findProductDir(start) {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, '.product'))) return join(dir, '.product');
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

function findRepoRoot(start) {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir;
    const up = dirname(dir);
    if (up === dir) return resolve(start);
    dir = up;
  }
}

function init(cwd) {
  const root = findRepoRoot(cwd);
  const product = join(root, '.product');
  const templates = fileURLToPath(new URL('../templates/product/', import.meta.url));
  mkdirSync(join(product, 'local'), { recursive: true });
  const created = [];
  for (const name of readdirSync(templates)) {
    const target = join(product, name);
    if (existsSync(target)) continue;
    copyFileSync(join(templates, name), target);
    created.push(name);
  }
  const ignore = join(root, '.gitignore');
  const text = existsSync(ignore) ? readFileSync(ignore, 'utf8') : '';
  if (!/^\.product\/local\/?$/m.test(text)) {
    writeFileSync(ignore, text + (text && !text.endsWith('\n') ? '\n' : '') + '.product/local/\n');
    created.push('.gitignore entry .product/local/');
  }
  return { product, created };
}

// Same idea in other words: one title's words contain the other's, or they share half their words.
function sameWhat(a, b) {
  const words = (s) => new Set(String(s ?? '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return false;
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared === Math.min(x.size, y.size) || shared / new Set([...x, ...y]).size >= 0.5;
}

function nextId(lines, prefix) {
  const numbers = lines.map((l) => Number(String(l.id).slice(prefix.length + 1))).filter(Number.isInteger);
  return `${prefix}-${Math.max(0, ...numbers) + 1}`;
}

function normSource(source) {
  return String(source ?? '').trim().replace(/^\.\//, '').replace(/\/+$/, '');
}

// Numbers of the principles in principles.md ("## 2. ..."), or null when there is none to check against.
function principleNumbers(product) {
  const file = join(product, 'principles.md');
  if (!existsSync(file)) return null;
  const numbers = [...readFileSync(file, 'utf8').matchAll(/^##\s+(\d+)\./gm)].map((m) => Number(m[1]));
  return numbers.length ? numbers : null;
}

// Names are read from cwd, and the printed folder mirrors cwd, so `node <folder>/<name>` runs the copy.
function scratch(cwd, files) {
  const product = findProductDir(cwd);
  const root = product ? dirname(product) : findRepoRoot(cwd);
  const dir = join(root, '.product', 'local', 'scratch', new Date().toISOString().replace(/[:.]/g, '-'));
  for (const name of files) {
    const from = resolve(cwd, name);
    if (!from.startsWith(root + sep)) fail(`${name} is outside the repo; scratch only copies repo files`);
    if (!existsSync(from)) fail(`${name} does not exist`);
    const to = join(dir, relative(root, from));
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
  }
  const here = join(dir, relative(root, resolve(cwd)));
  mkdirSync(here, { recursive: true });
  return here;
}

function sameEvidence(a, b) {
  return a.source === b.source && a.date === b.date && a.says === b.says;
}

function appendLine(file, line) {
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const lead = text && !text.endsWith('\n') ? '\n' : '';
  appendFileSync(file, lead + JSON.stringify(line) + '\n');
}

function load(file) {
  const { lines, skipped } = readLines(file);
  if (skipped) process.stderr.write(`warning: skipped ${skipped} malformed line(s) in ${file}\n`);
  return lines;
}

function fail(message) {
  process.stderr.write(message + '\n');
  process.exit(1);
}

function main(argv) {
  const [command, arg, json] = argv;
  if (command === 'scratch') {
    if (!argv.length || argv.length < 2) fail('usage: product.mjs scratch <file> [file...]');
    process.stdout.write(scratch(process.cwd(), argv.slice(1)) + '\n');
    return;
  }
  if (command === 'init') {
    const { product, created } = init(process.cwd());
    process.stdout.write(`${product}\n${created.length ? 'created: ' + created.join(', ') : 'nothing to create; existing files kept'}\n`);
    return;
  }
  const product = findProductDir(process.cwd());
  if (!product) fail('no .product/ found here or above; run /kowalski:product-init first');
  const bets = join(product, 'bets.jsonl');

  if (command === 'append' && (arg === 'bets' || arg === 'resources')) {
    let input;
    try {
      input = JSON.parse(json ?? '');
    } catch {
      input = null;
    }
    if (!isRecord(input)) fail('append needs one JSON object as the last argument');
    const file = join(product, `${arg}.jsonl`);
    const lines = load(file);
    let line;
    let error;
    if (arg === 'bets') {
      input = normalise(input);
      if (!input.id && input.status === 'candidate') input.id = nextId(lines, 'b');
      const current = currentBets(lines);
      const previous = current.find((b) => b.id === input.id) ?? null;
      if (!previous && input.status === 'candidate') {
        for (const old of current.filter((b) => (b.status === 'said-no' || b.status === 'killed') && sameWhat(b.what, input.what))) {
          process.stderr.write(`warning: ${old.id} was ${old.status}` + (old.principle ? ` by "${old.principle}"` : '') +
            `; record what is new in evidence, or drop this candidate\n`);
        }
      }
      if (previous && input.what && input.what !== previous.what) {
        fail(`${input.id} already exists as "${previous.what}"; omit "id" to record a new candidate`);
      }
      line = { ...previous, ...input, at: input.at ?? today() };
      if (previous && Array.isArray(previous.evidence) && Array.isArray(input.evidence)) {
        line.evidence = [...previous.evidence, ...input.evidence.filter((e) => !previous.evidence.some((p) => sameEvidence(p, e)))];
      }
      error = validateBet(line, previous, { principles: principleNumbers(product), today: today() });
    } else {
      if (input.id && lines.some((r) => r.id === input.id)) fail(`${input.id} already exists; omit "id" to get the next one`);
      const dup = lines.find((r) => normSource(r.source) === normSource(input.source));
      if (dup) fail(`${input.source} is already recorded as ${dup.id}`);
      line = { ...normalise(input), id: input.id || nextId(lines, 'r'), at: input.at ?? today() };
      error = validateResource(line);
    }
    if (error) fail(error);
    appendLine(file, line);
    process.stdout.write(JSON.stringify(line) + '\n');
    return;
  }
  if (command === 'append' && arg === 'updates') {
    let input;
    try {
      input = JSON.parse(json ?? '');
    } catch {
      input = null;
    }
    const error = validateUpdate(input);
    if (error) fail(error);
    const line = { ...input, at: input.at ?? today() };
    appendLine(join(product, 'updates.jsonl'), line);
    process.stdout.write(JSON.stringify(line) + '\n');
    return;
  }
  if (command === 'changes') {
    if (!DATE.test(arg ?? '')) fail('usage: product.mjs changes <YYYY-MM-DD>');
    const root = dirname(product);
    process.stdout.write(JSON.stringify(changesByDay(gitLog(root, arg))[arg] ?? [], null, 2) + '\n');
    return;
  }
  if (command === 'updates') {
    const since = argv[1] === '--since' ? argv[2] : undefined;
    if (since !== undefined && !DATE.test(since)) fail('usage: product.mjs updates [--since YYYY-MM-DD]');
    const root = dirname(product);
    const read = (name) => (existsSync(join(product, name)) ? readFileSync(join(product, name), 'utf8') : '');
    const template = readFileSync(fileURLToPath(new URL('../updates/updates.html', import.meta.url)), 'utf8');
    const out = join(product, 'local', 'updates.html');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, renderUpdates({
      changes: changesByDay(gitLog(root, since)),
      updates: readUpdates(join(product, 'updates.jsonl')),
      vision: readVision(read('vision.md')),
      css: read('page.css'),
      refUrl: readPage(product).ref_url,
      today: today(),
    }, template));
    process.stdout.write(out + '\n');
    return;
  }
  if (command === 'page-url') {
    if (!/^https:\/\//.test(arg ?? '')) {
      process.stdout.write((readPage(product).updates_url ?? '') + '\n');
      return;
    }
    writeFileSync(join(product, 'page.json'), JSON.stringify({ ...readPage(product), updates_url: arg }, null, 2) + '\n');
    process.stdout.write(arg + '\n');
    return;
  }
  if (command === 'check') {
    const updates = readUpdates(join(product, 'updates.jsonl'));
    const begun = Object.keys(updates).sort()[0];
    process.stdout.write(formatCheck(checkProduct({
      bets: currentBets(load(bets)),
      updates,
      changes: begun ? changesByDay(gitLog(dirname(product), begun)) : {},
      today: today(),
    })));
    return;
  }
  if (command === 'current' && arg === 'bets') {
    process.stdout.write(JSON.stringify(currentBets(load(bets)), null, 2) + '\n');
    return;
  }
  if (command === 'history' && arg) {
    process.stdout.write(JSON.stringify(load(bets).filter((b) => b.id === arg), null, 2) + '\n');
    return;
  }
  if (command === 'render') {
    const lines = load(bets);
    const history = Object.create(null);
    for (const line of lines) (history[line.id] ??= []).push(line);
    const template = readFileSync(fileURLToPath(new URL('../roadmap/roadmap.html', import.meta.url)), 'utf8');
    const out = join(product, 'local', 'roadmap.html');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, renderRoadmap(currentBets(lines), template, history));
    process.stdout.write(out + '\n');
    return;
  }
  fail('usage: product.mjs init | scratch <files> | append bets|resources|updates <json> | current bets | history <id> | render | changes <date> | updates [--since date] | page-url [url] | check');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
