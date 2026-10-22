#!/usr/bin/env bash
set -e
mkdir -p .product notes
cat > menu.json <<'J'
{"mon":["veg curry","fish fingers"],"tue":["satay noodles","pasta bake"],"wed":["jacket potato","chicken pie"]}
J
cat > children.json <<'J'
{"Ben":{"class":"2B","allergies":["nuts"]},"Ada":{"class":"4A","allergies":[]}}
J
echo '[]' > orders.json
cat > lunch.mjs <<'J'
import { readFileSync, writeFileSync } from 'node:fs';
const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const menu = read('menu.json'), children = read('children.json'), orders = read('orders.json');
const [cmd, name, day, ...dish] = process.argv.slice(2);
if (cmd === 'order') {
  const d = dish.join(' ');
  if (!menu[day]?.includes(d)) { console.log(`no "${d}" on ${day}`); process.exit(1); }
  orders.push({ name, day, dish: d }); writeFileSync('orders.json', JSON.stringify(orders));
  console.log(`ok: ${name} (${children[name]?.class}) - ${d} on ${day}`);
}
if (cmd === 'count') for (const o of orders) console.log(`${o.day} ${o.dish}`);
J
cat > notes/2026-10-01-kitchen.md <<'J'
# Kitchen and office meeting - 2026-10-01
- Incident book: two near-misses last term. Both times a nut snack was handed to a child with a nut allergy by a lunchtime helper at the serving hatch; the class allergy list was in the office, not at the hatch.
- Agreed: allergy safety comes before everything else.
J
cat > .product/principles.md <<'J'
# Product principles

## 1. Allergy safety comes before everything else

- **Says no to:** shipping anything that lets a child be ordered or served a dish with their allergen
- **Source:** notes/2026-10-01-kitchen.md, 2026-10-01
- **Status:** agreed

## 2. Run on the laptops the school already has

- **Says no to:** tablets, new hardware
- **Source:** notes/2026-10-01-kitchen.md, 2026-10-01
- **Status:** agreed
J
cat > .product/users.md <<'J'
# Users

## School cook
- **Moment:** plans portions each morning
- **Today instead:** paper slips
- **Where their evidence lives:** notes/

## Lunchtime helper
- **Moment:** hands out food at the serving hatch
- **Today instead:** relies on memory; the allergy list is in the office
- **Where their evidence lives:** notes/2026-10-01-kitchen.md
J
printf '%s\n' '{"id":"b-1","status":"candidate","what":"Allergy check at order time: refuse an order when the dish contains the child's allergen","for":"School cook","evidence":[{"source":"notes/2026-10-01-kitchen.md","date":"2026-10-01","mark":"S","kind":"behavior","says":"two allergy near-misses recorded in the incident book last term"}],"at":"2026-10-02"}' '{"id":"b-1","status":"picked","what":"Allergy check at order time: refuse an order when the dish contains the child's allergen","for":"School cook","evidence":[{"source":"notes/2026-10-01-kitchen.md","date":"2026-10-01","mark":"S","kind":"behavior","says":"two allergy near-misses recorded in the incident book last term"}],"owner":"Noor","test":"cook and helpers use it for two weeks","drop_if":"helpers keep using the paper list","at":"2026-10-03"}' > .product/bets.jsonl
: > .product/resources.jsonl
