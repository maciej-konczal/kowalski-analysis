import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBet, validateUpdate, checkProduct, formatCheck } from '../plugins/kowalski/scripts/product.mjs';

const picked = { id: 'b-1', status: 'picked', what: 'Weekly usage digest', owner: 'Ana', test: 'send it to 3 teams', drop_if: 'no reporter answers' };

test('a bet takes a by date and a tracker ref', () => {
  assert.equal(validateBet({ ...picked, by: '2026-10-15', ref: 'ENG-12' }, { ...picked, status: 'candidate' }), null);
  assert.equal(validateBet({ ...picked, ref: 'https://tracker.example.com/issue/ENG-12' }, { ...picked, status: 'candidate' }), null);
  assert.match(validateBet({ ...picked, by: '15 Oct' }, { ...picked, status: 'candidate' }), /by "15 Oct" must be YYYY-MM-DD/);
  assert.match(validateBet({ ...picked, ref: 'the verify issue' }, { ...picked, status: 'candidate' }), /ref .* tracker id/);
});

test('a planned item takes an outcome in our words', () => {
  assert.equal(validateUpdate({ date: '2026-10-21', planned: [{ text: 'Launch demo', outcome: 'Shown live, two of three steps worked' }] }), null);
  assert.match(validateUpdate({ date: '2026-10-21', planned: [{ text: 'Launch demo', outcome: ' ' }] }), /outcome must say what happened/);
  assert.match(validateUpdate({ date: '2026-10-21', planned: [{ text: 'Launch demo', outcome: 'Went well — mostly' }] }), /hyphen/);
});

test('check asks about passed dates first and leaves future and answered ones alone', () => {
  const r = checkProduct({
    today: '2026-10-22',
    bets: [
      { ...picked, by: '2026-10-15', ref: 'ENG-12' },
      { id: 'b-2', status: 'picked', what: 'Export to CSV', by: '2026-10-25' },
      { id: 'b-3', status: 'shipped', what: 'Dark mode', by: '2026-10-10' },
      { id: 'b-4', status: 'candidate', what: 'Mobile app' },
    ],
    updates: {
      '2026-10-19': { date: '2026-10-19', added: [{ text: 'Usage digest' }] },
      '2026-10-20': { date: '2026-10-20', planned: [{ text: 'Write down the pilot result', outcome: 'Pilot slipped a week' }] },
      '2026-10-21': { date: '2026-10-21', planned: [{ text: 'Launch demo' }] },
      '2026-10-22': { date: '2026-10-22', planned: [{ text: 'Install the digest' }] },
    },
    changes: { '2026-10-18': ['a'], '2026-10-19': ['b'], '2026-10-20': ['c', 'd'], '2026-10-22': ['e'] },
  });
  assert.deepEqual(r.due.map((d) => d.id ?? d.date), ['b-1', '2026-10-21']);
  // Before updates began (18th) and today (22nd) are not unwritten.
  assert.deepEqual(r.unwritten, [{ date: '2026-10-20', changes: 2 }]);
  assert.deepEqual(r.tracker.map((t) => `${t.id}:${t.ref}`), ['b-1:ENG-12', 'b-2:null', 'b-3:null']);
  const text = formatCheck(r);
  assert.match(text, /b-1 picked, by 2026-10-15: Weekly usage digest \[ENG-12\]/);
  assert.match(text, /2026-10-21 planned: Launch demo/);
  assert.match(text, /b-2 picked: Export to CSV \[no ref\]/);
});

test('check says nothing when nothing is due', () => {
  const text = formatCheck(checkProduct({ today: '2026-10-22', bets: [], updates: {}, changes: {} }));
  assert.equal(text.match(/  nothing/g).length, 3);
});
