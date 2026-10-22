---
name: research
description: Use when the evidence has to come from outside the team - a new product with no users yet, "what are competitors missing", "what do people complain about on Reddit", "find the gap", "what could be a breakthrough or top feature", market or competitor research before deciding what to build. Searches public places where people show what they need (Reddit, Hacker News, reviews, GitHub issues, competitor changelogs and pricing), ranks the gaps by what people already do about them, not what they wish for, and hands 1-3 candidates to what-to-build.
---

# Research outward

A gap is worth building when people already spend money, time or code working around
it. A wish with many upvotes is words; a paid workaround, a hack, a fork or a switch is
behavior. Rank by behavior. The breakthrough is usually a workaround many people built
on their own.

`P` is shorthand in this file only: always type the full command
`node "${CLAUDE_PLUGIN_ROOT}/scripts/product.mjs"` from the product repo; never put it in
a shell variable or alias (permission checks block that). No `.product/`: run the steps
in chat and offer `/kowalski:product-init` once at the end.

## 1. Frame (before any search)

- **Question:** one line, about a person and a moment, not about a feature ("how do
  amateur football coaches pick the team each week", not "should we add an AI picker").
  Asked for a feature: write the question behind it and mark it [U].
- **Who:** a role from `.product/users.md` if there is one.
- **Known already:** read `P current bets`, `.product/resources.jsonl` and any research
  folder the repo names, and list in 3-6 lines what we already know or tried. The
  result is judged against this list: a gap already on it is not a finding.

## 2. Search (about 15 searches, 10 pages read)

Spread over the kinds of place, most behavior first:

- **Workarounds in the open:** GitHub issues and discussions on the tools people use
  (sort by reactions), scripts and templates people share, "how I" posts.
- **Switching and churn:** "switched from X", "alternative to X", "cancelled X because".
- **Forums:** Reddit (`site:reddit.com <topic> <pain>`), Hacker News
  (`site:news.ycombinator.com`), the niche community the person actually uses.
- **Reviews:** G2, Capterra, app store reviews; the 2 and 3 star ones say what is missing.
- **Competitors:** their changelog (what they ship, so what users push for), pricing
  page (what they charge extra for), docs pages with "not supported" or "workaround".

Open what you cite. A search snippet is not a source; read the page. Prefer the last 24
months and keep each item's own date.

## 3. Sort what you found

For each finding: who (role), what they did or said, URL, date, `kind`:

- **behavior:** they pay for a workaround or a second tool, built a script or fork,
  switched or cancelled and said why, or keep doing a manual step on a schedule.
- **words:** they asked, wished, upvoted, or said "would be nice".

Count distinct people, not posts. Mark everything you read online `S`, never `V`; a
claim you could not open is `U` and cannot carry a gap alone. Never invent a URL, a
number or a quote; exact words go in chat or `.product/local/`, never in a committed
file.

Then group findings into gaps: one gap is one unmet need in one moment. For each gap,
which competitor covers it, partly or not at all.

## 4. Output (in chat)

```
Question: <one line>        Known already: <n> items (listed above)
Searched: <n> searches, <n> pages read, places: <kinds>

| # | Gap (person, moment) | Behavior (people, what they do) | Words | Covered by | New? |
|---|---|---|---|---|---|
| 1 | ... | 4: pay for X plus a spreadsheet [S] | 6 [S] | nobody / X partly | yes |

Sources: #1 <url> (<date>), ...
Proposed candidates (1-3): <what> | for <role> | cheapest test | wrong if
Nothing found: <gap types searched with no behavior behind them>
```

Behavior first, then words. "New?" is checked against Known already; a table that
is all "no" is a result, say it plainly. Say what was searched and found nothing, so
the next run does not repeat it.

## 5. Record (only after the person agrees)

Each agreed candidate, without an id (the script assigns it), one evidence item per gap
source: `P append bets '{"status":"candidate","what":..,"for":..,"evidence":[{"source":"<url>",
"date":"YYYY-MM-DD","mark":"S","kind":"behavior|words","says":"<neutral paraphrase>"}]}'`.
Picking between them is the what-to-build skill.

Use only the regular hyphen (-) in anything you write.
