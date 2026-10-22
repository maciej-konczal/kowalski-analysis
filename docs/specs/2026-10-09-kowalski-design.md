# kowalski

A Claude Code plugin that makes product decisions part of the build: decide what to build against agreed principles, build the smallest slice, prove it with what the person sees, and remember what worked. Built for our own product work first, open-sourced once it had proven itself (bar in section 09).

- **Owner** Maciej Kończal
- **Code home** kowalski, main
- **Status** draft for review
- **As of** 2026-10-09

## 01 Summary [open]

kowalski, a product engineer OS (plugin `kowalski`), is to product engineering what GTM OS is to a revenue team: a small set of skills over a file-based brain kept in the user's own repo. The seed is two skills written on 2026-10-08 and 2026-10-09: `product-engineer` (brief, slice, proof) and `what-to-build` (principles, map, impact vs effort, owner, cheapest test; method from PostHog, "How we decide what to build", 2024-01-10).

v1 adds: a `.product/` brain per product repo, a `product-init` skill to create it, a `remember-resource` skill, a `roadmap` view, optional Cognee as a recall layer, and evals. No server, no hooks, no hosted dashboard.

## 02 Decisions [decided]

| Decision | Chosen | Rejected, and why |
|---|---|---|
| Audience | Our own product work first, open source once it is proven | Course packaging: no distribution moment yet. Bundled into a client product: would ship it before it is proven |
| Visibility | Private while dogfooding, MIT and stranger-ready README from day one, public at the bar in 09 | Public from day one: first impression would be a two-skill repo |
| v1 scope | Skills + `.product/` brain | Skills only: nothing remembers bets or outcomes. GTM OS parity (hooks, lib, dashboard): weeks before the method is proven |
| Evidence storage | Pointer and neutral paraphrase in git, exact quotes in git-ignored `.product/local/` | Quotes in git: breaks the "raw customer text never lands in git" rule. Pointers only: sources move or expire |
| Cognee | Optional recall layer; files in git are the record | Cognee as the store: unreviewable record, every user must run it |
| Fork Cognee | No. Product-engineer specifics are a graph model and ingest config inside `kowalski`. Fork only if a ledger of walls shows a real blocker | Fork now: same drift risk as measured for opencode forks (3,997-7,996 commits behind within 5-8 months [V], our own research 2026-09-20) |
| Skills location | Move from `~/.claude/skills` into the plugin; company-specific sources move to each repo's `.product/` | Keep global copies: the skill would load twice |

## 03 Repository layout [contract]

```
kowalski/
  README.md  INSTALL.md  LICENSE (MIT)  CLAUDE.md
  .claude-plugin/marketplace.json
  plugins/kowalski/
    .claude-plugin/plugin.json
    skills/
      product-engineer/SKILL.md  sources.md
      what-to-build/SKILL.md
      product-init/SKILL.md
      remember-resource/SKILL.md
      roadmap/SKILL.md
    templates/product/          skeleton copied by product-init
    roadmap/roadmap.html        single static file, no dependencies
    cognee/                     graph model + ingest script (optional)
    evals/<case>/prompt.md, graders/*.md, mocks/
  docs/specs/
```

Install: `claude plugin marketplace add <repo>`, then `claude plugin install kowalski`. After install, delete `~/.claude/skills/product-engineer` and `~/.claude/skills/what-to-build`. The two lines in `~/.claude/CLAUDE.md` stay.

## 04 The .product/ brain [contract]

```
.product/
  principles.md     3-5 principles: the principle, what it says no to,
                    source + date, status agreed | proposed
  users.md          users by role, their moment, where their evidence lives
  bets.jsonl        append-only, one line per change, last line per id wins
  resources.jsonl   append-only, vetted resources
  cognee.json       optional: Cognee settings (section 07)
  local/            git-ignored: exact quotes, local/<id>.md
```

A `bets.jsonl` line:

```json
{"id":"b-007","at":"2026-10-09","status":"picked",
 "what":"...","for":"<user role from users.md>",
 "evidence":[{"source":"<path or url>","date":"2026-09-29","mark":"U","says":"<neutral paraphrase>"}],
 "impact":"high","effort":"low","reuses":"<existing thing it builds on>",
 "owner":"<one name>","test":"<cheapest test>","drop_if":"<result that drops it>",
 "signal":"<what we watch after shipping, and where>","by":"what-to-build"}
```

Status lifecycle: `candidate -> picked -> building -> shipped -> kept | killed`, plus `said-no` (with the principle that said no). A `shipped` line adds `proof` (the real output, paraphrased if it holds customer text).

A `resources.jsonl` line:

```json
{"id":"r-003","at":"2026-10-09","kind":"article | decision | meeting | outcome | quote",
 "source":"<url or path>","date":"2024-01-10","mark":"S","why":"<one line>","local":false}
```

`kind: quote` always has `local: true`; its text lives in `local/<id>.md`.

Validation (added 2026-10-10 after the first e2e run): a `building` line must carry `brief: {who, today, evidence, slice, wrong_if}`, so no bet is built without a brief (and product-engineer shows it in its final reply); `kept` and `killed` need an `outcome` and cannot be set on the day the bet shipped; `proof` and `signal` may quote real output; a candidate close to a said-no or killed bet (shared words) gets a warning; `at` is YYYY-MM-DD, not in the future and not before the bet's last line; `picked` needs one owner plus non-empty `test` and `drop_if`; `said-no` names a principle by its number in principles.md; every evidence item has source, date, mark, kind and says; the brief's `wrong_if` cannot repeat `drop_if`; `shipped` carries `principles`, a keep-or-break check against each agreed principle; `product.mjs scratch <files>` copies repo files under `.product/local/scratch/` so a proof never touches live data; resource sources are compared after normalising `./` and trailing slashes. evidence items carry `kind: behavior | words`; `mark` is V, S or U (brackets and case are normalised); `impact` and `effort` are high or low; dates are YYYY-MM-DD; a new candidate whose `what` matches a said-no or killed bet gets a warning. `product.mjs init` creates the brain at the repo root without overwriting anything and adds `.product/local/` to `.gitignore`.

Rules: skills only append, never rewrite a line. Each append is checked by a short inline JSON parse before writing. No `.product/` means the skills still run, reading the repo's CLAUDE.md as today.

## 05 Skills [open]

| Skill | Reads | Writes | Notes |
|---|---|---|---|
| `product-init` | repo, CLAUDE.md, a brain the user points to | `.product/` skeleton, draft `users.md`, `principles.md` (all `proposed`), `.gitignore` entry for `local/` | Asks the user to confirm principles before marking them `agreed` |
| `what-to-build` | principles, users, bets, resources, Cognee if present | `candidate`, `picked`, `said-no` lines | Refuses to rank against `proposed` principles |
| `product-engineer` | the matching `picked` bet, users, sources | `building`, `shipped` lines | No matching bet: runs as today, brief only |
| `remember-resource` | a URL or path the user gives | one `resources.jsonl` line, quote text to `local/` | Then ingests into Cognee if configured |
| `roadmap` | `bets.jsonl` | `.product/local/roadmap.html` (derived, not committed) | Section 06 |

`kept` and `killed` are set by hand in v1. A scheduled `product-review` (did the signal move?) is out of v1.

## 06 Roadmap view [open]

`roadmap` copies `plugins/kowalski/roadmap/roadmap.html` and the current bets (latest line per id) into `.product/local/` and opens it. One static file, no dependencies, light and dark.

- **Board:** Now (`building`), Next (`picked`), Later (`candidate`), Done (`shipped`, `kept`, `killed`). Each card: what, for whom, owner, evidence count and strongest mark, the test and drop-if.
- **Grid:** impact vs effort, every open bet placed in its quadrant, `said-no` bets listed under it with the principle.
- Click a card: its full history from `bets.jsonl`.

It lives in `local/` because it is derived and may hold paraphrased customer context. A shareable version (for a teammate or a customer) is out of v1.

## 07 Cognee recall layer [open]

Optional. The plugin works without it; with it, `what-to-build` and `product-engineer` query Cognee first, then fall back to the files.

- `plugins/kowalski/cognee/`: a graph model (Principle, User, Bet, Evidence, Resource, Outcome) and an `ingest` script that loads `.product/` and resources with each item's `id` and `source`, so every answer can be traced to a file.
- The record is always the files. Cognee is rebuildable from them at any time.
- `.product/cognee.json`: `{"enabled": true, "provider_cleared_for_client_data": false}`. Quotes from `local/` are ingested only when that flag is `true`, which means a local model or a provider already cleared for client data.

Facts about Cognee here are unverified [U] as of 2026-10-09: that it supports a custom graph model, that cognee-mcp exposes add/cognify/search, and which model provider it uses by default. Step 1 of the plan is a throwaway spike that checks these.

## 08 Evals [open]

`claude plugin eval ./plugins/kowalski`, in Claude Code's plugin eval format.

| Case | Pass if |
|---|---|
| fires on a feature | product-engineer fires, a brief comes before any edit |
| skips a bug fix | product-engineer does not fire |
| no invented evidence | empty sources: Evidence says "none [U]", no made-up quote |
| proof, not tests | the reply shows the real output text |
| under pressure ("just do it fast") | the brief still appears |
| principles gate | `proposed` principles: what-to-build asks before ranking |
| what-to-build output | 1-3 picks, one owner each, test with drop-if, said-no list |
| traceable recall | answers from Cognee cite a resource or bet id |
| quote gate | flag `false`: no `local/` text is ingested |

## 09 Dogfooding and the public bar [open]

Run `product-init` on our own product repo and use the skills for real work from 2026-10-09 to about 2026-10-30.

Bar for going public: at least 10 bets through the lifecycle, at least 3 reaching `kept` or `killed` on a real signal, all evals passing.

Went public on 2026-10-22, after the evals passed. At that point the dogfooding repo had 41 bets: 7 shipped, 3 killed, none kept yet.

## 10 Risks and open questions [open]

- **A side project.** This stays a tool for our own work first, not a new product thread.
- **Cognee fit.** If the spike shows no custom graph model or no traceable answers, v1 ships without Cognee and the files alone carry recall.
- **Skill triggering.** If product-engineer is skipped in real use, add a Stop hook that checks for a proof block.
- **Open question:** does a second person on the team use it on their own work, or only the owner?
- **Name:** kowalski, lowercase everywhere ("Kowalski, analysis!"). The repo is `kowalski-analysis`, because GitHub search for kowalski plus Claude skills is dominated by Emil Kowalski animation skills; the plugin and skills stay `kowalski`.

## 11 Sources [open]

- PostHog, "How we decide what to build", Ian Vanagas, 2024-01-10, posthog.com/newsletter/how-we-decide-what-to-build [S]
- GTM OS repo, README, read 2026-10-09 [S]
