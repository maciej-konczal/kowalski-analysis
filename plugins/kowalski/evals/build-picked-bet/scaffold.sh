#!/usr/bin/env bash
set -e
mkdir -p .product notes
printf '%s\n' '{"shifts":[{"id":"sat-am","people":["Ben"]}]}' > data.json
cat > app.mjs <<'APP'
import { readFileSync, writeFileSync } from 'node:fs';
const d = JSON.parse(readFileSync('data.json', 'utf8'));
const [cmd, shift, name] = process.argv.slice(2);
const s = d.shifts.find((x) => x.id === shift);
if (cmd === 'signup') { s.people.push(name); writeFileSync('data.json', JSON.stringify(d)); console.log(`${name} signed up for ${shift}`); }
if (cmd === 'roster') console.log(`${shift}: ${s.people.join(', ')}`);
APP
printf '%s\n' '{"id":"b-1","status":"candidate","what":"Cancel a signup","for":"regular volunteers","evidence":[{"source":"notes/north.md","date":"2026-09-24","mark":"V","kind":"behavior","says":"coordinator keeps a hand-made cancelled column, 11 entries"}],"at":"2026-10-10"}' '{"id":"b-1","status":"picked","what":"Cancel a signup","for":"regular volunteers","evidence":[{"source":"notes/north.md","date":"2026-09-24","mark":"V","kind":"behavior","says":"coordinator keeps a hand-made cancelled column, 11 entries"}],"owner":"Dan","test":"coordinators use it for a week next to the spreadsheet","drop_if":"they keep the spreadsheet","at":"2026-10-10"}' > .product/bets.jsonl
: > .product/resources.jsonl
