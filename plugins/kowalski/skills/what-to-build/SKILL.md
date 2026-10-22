---
name: what-to-build
description: Use when deciding what to build next, picking between features, prioritizing a backlog or roadmap, or when the answer to "what now?" is unclear. Maps every candidate with its evidence, scores impact vs effort against agreed product principles, names one owner per pick and the cheapest test that shows if anyone cares. Ends with 1-3 picks, not a long list. Building the chosen pick is the product-engineer skill.
---

# What to build next

"Kowalski, analysis!" Method adapted from PostHog, "How we decide what to build"
(Ian Vanagas, 2024-01-10, posthog.com/newsletter/how-we-decide-what-to-build), for
a small team. Five steps, in order. Output goes in chat.

`P` below is shorthand in this file only: always type the full command
`node "${CLAUDE_PLUGIN_ROOT}/scripts/product.mjs"` from the product repo. Never put it in
a shell variable or alias; permission checks block that. It is the only way to
write `.product/*.jsonl`. No `.product/`: run
the steps in chat only and offer `/kowalski:product-init` at the end.

## 1. Principles first

You cannot rank without shared principles, and their main job is saying no.

- Read `.product/principles.md`. None there: read the repo's CLAUDE.md and any
  decisions folder or team brain it names.
- Ranking needs principles with `Status: agreed`. If they are `proposed` or
  missing: propose 3, each traced to a dated decision or meeting, and ask the user
  to confirm them one by one before ranking. Picking some principles matters more
  than which framework.
- Name the anti-patterns you will reject: feature factory, building for one loud
  customer, chasing competitors, picking what is easy, picking what bills most.

## 2. Map everything, wide

Run `P check` first. Anything past due is asked about before ranking: a pick whose
date passed with no outcome is either evidence (it worked, it slipped, nobody knows)
or a pick to drop, and new picks on top of it repeat the miss.

Collect candidates before judging any. Read `P current bets` first: open candidates
are already on the map, and said-no or killed bets are not re-proposed without new
evidence. Then look for new ones (sources as in product-engineer's `sources.md`;
no 3-lookup cap here, this is the research step):

- what users asked for or worked around
- where the funnel leaks: work that shipped but nobody verified or used
- open items and open design sections in the repo
- what the team keeps doing by hand (a repeated manual step is a candidate)
- outside the team, when the product is new or the map is all `none [U]`: run the
  research skill and take its proposed candidates

One line per candidate: what it is, who it is for, evidence with source, date and
a mark (V we ran or measured it, S we read it in notes or docs, U unverified;
reading an interview note is S). A candidate with no evidence stays, marked
`none [U]`. Record each new
one, without an id (the script assigns the next `b-<n>` and prints it):
Every evidence item needs source, date, mark, kind and says; `for` is a role
from `.product/users.md`.
`P append bets '{"status":"candidate","what":...,"for":...,
"evidence":[{"source":...,"date":"YYYY-MM-DD","mark":"V|S|U","kind":"behavior|words",
"says":"<neutral paraphrase>"}]}'`. If the script warns that an earlier bet was
said-no or killed, record only if there is new evidence, and name it.
Exact words go to `.product/local/<id>.md`, never into `says`.

## 3. Impact vs effort

Score each candidate high or low on both, in a table:

| Candidate | Impact (why, against which principle) | Effort (why) | Quadrant |

- Impact is judged against the principles and the users in `.product/users.md`,
  not against revenue or how loud the asker was.
- Effort drops when it builds on what already exists (PostHog built surveys on
  site apps, events and flags). Say what it reuses.
- High impact, low effort first. High impact, high effort only with a cheap test
  in front of it. Low impact: say no and say which principle says no.

Record the scores on each candidate (`impact`, `effort`, `reuses`).

## 4. One owner per pick

Pick 1-3. Each gets exactly one owner, who validates, builds, fixes and watches it
after launch. Use the team split if one is recorded; ask if not. No owner means it
is not picked.

## 5. Cheapest test

For each pick, the smallest thing that answers both:

1. Does anyone care? (who, what they would do, where we would see it)
2. How much will the real build cost?

Prefer a workaround, a manual run, or a slice on existing code over a new system.
A test that cannot fail is not a test: write what result would drop the pick.

Record, after the user agrees: picks as `{"id":..,"status":"picked","owner":"<one
name>","test":..,"drop_if":..,"by":"YYYY-MM-DD","ref":"<tracker issue>"}` (the script
refuses two owners or an empty test; `by` is when the test reads, so a passed date
is asked about; `ref` once the pick has an issue)
and refusals as `{"id":..,"status":"said-no","principle":"<n>. <title>"}`, where n
is the number of the principle in principles.md that says no. "Thin evidence" is
not a principle: leave such a candidate open instead.

## Output

```
Principles: <3 lines, agreed or proposed>
Map: <n> candidates (table in step 3)
Picks:
1. <what> | owner <name> | quadrant | test: <cheapest test> | drop if: <result>
Said no to: <candidate - principle>, ...
```

Then hand the first pick to the product-engineer skill when the user says build.
`/kowalski:roadmap` shows the result as a board.

Use only the regular hyphen (-) in anything you write.
