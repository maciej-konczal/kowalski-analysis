---
name: product-engineer
description: Use before building any feature or behavior change a person will see or use (a CLI message, Slack post, console row, API a client calls). Forces who/moment/evidence/smallest slice before code, and real rendered output plus a usage signal after. Applies even when asked to be quick or skip process (then the brief is 4 lines). Skip for bug fixes, refactors, test-only and docs work.
---

# Product engineer

Build the smallest thing that changes what a real person sees, and prove it with
what they see, not with green tests.

Runs before brainstorming or writing-plans and feeds them the brief. For a bounded
change, the brief is the design. Not sure which thing to build at all: use the
what-to-build skill first.

`P` below is shorthand in this file only: always type the full command
`node "${CLAUDE_PLUGIN_ROOT}/scripts/product.mjs"` from the product repo. Never put it in
a shell variable or alias; permission checks block that. It is the only way to
write `.product/*.jsonl`.

## 0. Order, always

1. **Say the brief to the user.** Your next message starts with the brief from
   section 1 as plain text, all of its lines, including Wrong if. A status line
   such as "Now the code" or "brief written" is not the brief.
2. **Record it.** In that same message, after the text, mark the bet building
   with a copy of what you just wrote:
   `P append bets '{"id":"<id>","status":"building","brief":{"who":"..","today":"..","evidence":"..","slice":"..","wrong_if":".."}}'`
   The script refuses `building` without all five.
3. **Only then code.**
4. **Show it again at the end.** Your final reply opens with the brief as text
   (Who, Today, Evidence, Slice, Wrong if), then the proof. If you wrote nothing
   before the tool calls, this is where the user first reads it.

"Go ahead", "just build it", "build b-1" or an existing bet never skip step 1: a
picked bet is the input to the brief, not a replacement for it. Read the bet with
`P current bets` (look for a `picked` bet that matches the request) and fill the
brief from its what, for, evidence, test and drop_if. Wrong if is not drop_if
(the script refuses a copy): name the strongest behavior item in the evidence,
read its source, and say whether this slice changes it. Where and when did it
happen, and who was there? If the slice works somewhere else (ordering when the
problem is serving), say so and propose a slice that reaches that moment before
coding.

No matching bet: write the brief, and after it offer to record the work as a
candidate (`P append bets` with status `candidate` and no id; the script assigns
it). No `.product/`: carry on without it; mention `/kowalski:product-init` once.

## 1. Brief (in chat, before any code, max 8 lines)

```
Who:      the person, by role and name if known (not "the user")
Moment:   when they hit this, what they are trying to do
Today:    what they do now instead, and what it costs them ("unknown" if unknown)
Evidence: each item tagged behavior (they paid, used a workaround, built on it,
          complained when it broke) or words (they said they want it), with
          source, date and a mark: V we ran, measured or reproduced it;
          S we read it (notes, transcripts, docs); U unverified. Reading an
          interview note is S, never V. Only words: say "words only".
          Nothing found: "none, our assumption [U]". Never invent a quote.
Slice:    the smallest change that would show if this is worth having
Skip:     what was asked or tempting but is not in this slice
Wrong if: what would show this is the wrong thing to build
```

All seven lines, these labels, this order. A line you cannot fill says "unknown"
or carries a [U] guess; it is never dropped. Moment and Skip are the ones most
often lost.

Asked to go fast or skip ceremony: still write the brief, cut to 4 lines (Who,
Evidence, Slice, Wrong if); the building record still needs all five fields. It takes seconds and is the cheapest check that this is the
right thing to build.

Write the brief even when you cannot build yet (the code is missing, a question is
open): it is the useful part of your reply then.

If the request is a solution with no stated problem, write the problem you infer
in Moment and mark it [U].

## 2. Evidence (time-boxed: about 3 lookups)

Where to look, in order: `.product/users.md` (its Sources list), then the repo's
CLAUDE.md `## Product evidence` section, then nothing ("Evidence: none [U]"). Query
the most likely source first (see `sources.md`). Skip an unavailable source
silently. Quote verbatim in chat; do not translate or clean up. Quotes never go into
a committed file: in `.product/` they go to `.product/local/<id>.md` only. When
recording evidence, give each item `"kind":"behavior"` or `"kind":"words"` and a
`mark` of V, S or U.

## 3. Build the slice

- Never invent the data the slice depends on (allergen tags, prices, rules). Use
  what exists, ask, or mark it as a draft; and when data is missing, fail closed:
  refuse or warn, never treat unknown as safe.
- No options, config keys, flags or abstractions the slice does not need.
- Empty, error and slow states the person will hit are part of the slice.
- Anything deferred goes in Skip, not in a TODO.

## 4. Proof (in chat, before saying done)

- Show the real output: the exact message text, CLI output, UI row or screenshot.
  Tests passing is not proof.
- Produce it without changing real data: copy the files with
  `P scratch <file> [file...]` (it prints a folder under `.product/local/scratch/`),
  then run inside it with `cd <that folder> && node <file>`, so relative data paths read
  the copies. Exercise the allowed path and
  the refused path.
- Read it as the person from the brief (the Who line). Would they understand it in
  5 seconds? Does it actually reach them, or only the person at the terminal?
- One line: "We'd know it worked if <observable signal>", naming where it would
  show up (analytics, support channel, a person's reply, a usage log).
- Before shipped, re-read `.product/principles.md` and say, for each agreed
  principle, whether the slice keeps or breaks it. If it breaks one, do not
  record shipped; say what is missing.
- If there is a bet: `P append bets '{"id":"<id>","status":"shipped","proof":"<the
  real output>","signal":"<signal and where>","principles":"<1 kept: ..; 2 kept: ..>"}'`. Shipped means the slice is live
  and its test is running, not that it worked. `kept` or `killed` comes later, on
  another day, with `"outcome"`: what the signal showed.

Use only the regular hyphen (-) in anything you write.
