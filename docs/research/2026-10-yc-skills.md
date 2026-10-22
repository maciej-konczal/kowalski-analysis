# YC skills against kowalski

"YC skills" means three different things: Garry Tan's personal gstack skills (MIT, worth mining), skills published by Y Combinator itself (none exist), and the YC Startup Library's prioritization advice (short, sharp, and close to what kowalski already does). kowalski already has the core moves gstack and YC push hardest: a named person, evidence over opinion, the smallest slice, a test that can fail. The worthwhile borrowings are narrower: rank evidence by behavior over interest, name today's workaround, pick a prioritization mode by stage with at most three numbers, refuse category-level users, and score follow-through on past bets.

As of 2026-10-10

Marks: [V] I ran or reproduced it, [S] read from the source, [U] unverified.

## 01 Sources read

| Source | Where | Version / date |
|---|---|---|
| gstack (Garry Tan) | `~/.claude/skills/gstack/`, per-skill dirs in `~/.claude/skills/<name>/` are symlinks into it [V] | VERSION 1.91.68.0, commit 20eb6202 of 2026-10-09 [V] |
| gstack license | `~/.claude/skills/gstack/LICENSE` | MIT, "Copyright (c) 2026 Garry Tan" [V] |
| YC-published skills | web search (3 queries), GitHub API | none found, see 03 |
| Emmett Shear, "How to prioritize features" | ycombinator.com/library/8p-how-to-prioritize-features | library entry created 2020-11-23 [S] |
| YC, "YC's essential startup advice" | ycombinator.com/library/4D-yc-s-essential-startup-advice | library entry created 2020-06-09 [S] |
| kowalski | `~/.claude/skills/product-engineer/SKILL.md`, `~/.claude/skills/what-to-build/SKILL.md`, `docs/specs/2026-10-09-kowalski-design.md` 01, 04, 05 | 2026-10-09 |

WebFetch returned only the page title for the YC library pages; the article text was read from the page's embedded JSON (`data-page` props, `content` field) fetched with curl [V].

## 02 gstack

gstack is a personal toolkit, not a YC product: the README opens with Garry Tan introducing himself as YC's President and CEO and calls the toolkit "my answer" [S]. It ships 76 top-level dirs and about 38,400 lines of SKILL.md across skills [V]. Each skill is generated from a `.tmpl`, and roughly the first 400 lines of each big skill are a shared preamble (question format, voice, telemetry, learnings, browser egress) [V: office-hours lines 65-463]. Telemetry is opt-in and goes to Supabase [S: README "Privacy & Telemetry"].

### office-hours (1,359 lines + 3 sections, about 900 more) [V]

- **Problem:** people jump to solutions before the problem is understood. The skill is a hard gate that writes a design doc and forbids code [S].
- **Trigger:** "brainstorm this", "is this worth building", "office hours", or anyone describing a new idea. The skill tells the model to invoke it proactively rather than answer [S].
- **Steps** [S]: read CLAUDE.md, TODOS, git log, prior design docs; ask the goal, which picks startup mode (startup, intrapreneurship) or builder mode (hackathon, open source, learning, fun); for startup mode, ask the product stage (pre-product, has users, has paying customers). Startup mode runs six forcing questions, one at a time: demand reality, status quo, desperate specificity, narrowest wedge, observation and surprise, future-fit. Stage routing picks 2-3 of the six (pre-product Q1-Q3, has users Q2/Q4/Q5, paying Q4-Q6, pure infra Q2/Q4). Then: optional landscape search with a privacy gate; premise challenge (right problem? cost of doing nothing? what code already solves part? how will users get it?) as numbered premises the user must agree to; optional cold-read second opinion from Codex or a fresh subagent; 2-3 alternatives, one "minimal viable", one "ideal architecture"; a stop for the user to pick; a design doc with a mandatory "Assignment"; an adversarial spec review loop of up to 3 rounds.
- **What it forces:** specificity (a name, a role, a consequence, never "enterprises in healthcare"); interest is not demand (waitlists and "that's interesting" do not count; paying, building a workflow on it, or being upset when it breaks do); the status quo workaround as the real competitor; a wedge someone would pay for this week; watching a user rather than demoing. Anti-sycophancy rules ban hedges and require a position plus the evidence that would change it. An escape hatch asks two more questions on the first "just do it" and stops on the second [S].
- **How it fails:** it needs a live human answering one question at a time, so it does not fit a headless or eval run. The closing is tiered by how many sessions you have had and pushes "founder signal" praise plus a pool of YC and Garry Tan videos [S], which is flattery and marketing, not method. Context cost is large: a run reads well over 2,000 lines of instructions before the user's problem [V by line count]. Design docs land in `~/.gstack/projects/` first, with a repo copy after a redaction scan [S], so the record lives outside the repo by default. Forcing questions framed for founders ("would someone pay this week") need translating for client work; the skill's own intrapreneurship variant only rewrites Q4 and Q6 [S].

### plan-ceo-review (1,273 lines + 1,204-line section) [V]

- **Problem:** a plan is either too timid or unbounded; review it as a founder would [S].
- **Trigger:** "think bigger", "expand scope", "strategy review", "is this ambitious enough" [S].
- **Steps** [S]: system audit (git log, TODOs, recently touched files, design doc); Step 0 premise challenge (real problem, target outcome, do-nothing cost, direct pain or proxy); existing code leverage; a 12-month "dream state" diagram; alternatives with S/M/L/XL effort and risk; one of four modes (expansion, selective expansion, hold, reduction), recommended by file count (over 15 changed files recommends reduction); per-item add/defer/skip questions; a decision ledger with exact approvals; then 11 review sections (architecture, error map, security, data flow, quality, tests, performance, observability, deploy, trajectory, UX) and mandatory "NOT in scope" and "What already exists" sections.
- **What it forces:** every scope change is approved one at a time; a recommendation is never treated as approval; deferrals are written down; reversibility is rated 1-5 [S].
- **How it fails:** the philosophy "completeness is cheap, boil the ocean" [S] pulls against a smallest-slice method and invites scope creep that the user then has to say no to item by item. The 10x and "platonic ideal" prompts generate ambition, not evidence. Its depth (11 sections, six diagram types) is engineering review, not product judgment.

### retro (1,201 lines + 127-line report format) [V]

- **Problem:** a team does not see its own shipping patterns week to week [S].
- **Trigger:** `/retro` with a window (24h, 7d, 14d, 30d), `compare`, or `global` [S].
- **Steps** [S]: one metrics script over git; features shipped from CHANGELOG plus merged PRs, listed first; commits, logical SLOC, test ratio; commit-hour histogram; session detection by 45-minute gaps; feat/fix mix (flag above 50% fixes); hotspots; focus score; per-person praise and one growth item; streaks; a shortcut-debt ledger; a JSON snapshot in `.context/retros/` with up to three recommendations, which the next retro scores as addressed, partial or open against new commits.
- **What it forces:** praise and criticism anchored in specific commits; recommendations concrete enough (a file, a check) to be scored later [S].
- **How it fails:** almost everything it measures is output (commits, LOC, sessions, streaks), not whether a person got value. The README's headline claim is a code-volume multiple (about 810x a 2013 pace) [S], which shows where the incentive points. It does not ask whether any shipped feature was used.

### Skimmed: plan-eng-review, autoplan [S]

- plan-eng-review: a scope gate (diff, plan, or path), then architecture, data flow, edge cases, tests, performance. Carries a list of 15 "how great eng managers think" patterns (Larson, McKinley's innovation tokens, Brooks, Beck). Engineering, not product.
- autoplan: runs CEO, design, DX and eng reviews in a row and auto-decides with six principles (completeness, boil lakes, pragmatic, DRY, explicit over clever, bias to action). Useful idea: classify each decision as mechanical (auto), taste (decide, surface at the end) or user challenge (both models want to change the user's stated direction; never auto-decide).

## 03 Skills published by Y Combinator itself

None found. Three web searches (2026-10-10, standard mode) returned only listicles and community registries; each search summary said no official YC skill repository came up [U, third-party pages]. The only YC-adjacent hit was gstack, described secondhand as Garry Tan's personal setup [U]. A GitHub search for repos mentioning SKILL.md and ycombinator returned `garrytan/gstack` first and community repos after it (e.g. a Startup School transcript archive), none owned by YC [V]. The GitHub account `github.com/ycombinator` is a personal user account whose repos are Elastic forks and tennis tools, not Y Combinator [V]. Y Combinator has published no Claude or agent skills that I could find; gstack is the closest thing, and it is personal.

## 04 YC Startup Library

### Emmett Shear, "How to prioritize features" [S]

- **Problem:** a product team cannot decide what to build next.
- **Trigger:** any roadmap decision; the framework changes as the company's challenge changes.
- **Steps:** three frameworks, usually in order. *Built for me*: you are the most enthusiastic user; introspect and build what you wish it did. Works for small teams and people who really love the product. *Switch to us*: people already do the behavior elsewhere; interview 5-6 dedicated users of your product, each competitor and adjacent products (about 50 interviews), categorize and score responses in a spreadsheet, target one competitor at a time, prefer what is fast to build. *Three numbers matter*: pick the three qualities that most drive the product (Amazon: price, selection, shipping; Twitch: audience size, positive interactions, money), attach a metric to each, split effort by intuition, revisit every few months; a fourth bucket, "Stuff You Have To Do" (compliance, uptime), is done but never ranked.
- **What it forces:** naming which mode you are in; interviewing to understand the problem, not to confirm an idea (validating an idea you already have is called "an anti-goal"); at most three focus areas. It ends with a list of interview questions about the current solution, why it was chosen, what is annoying, what would make them switch, always followed by "tell me more".
- **How it fails:** the article says so itself: no framework fits a new category, sold for hard-to-measure reasons, to users who are not you. Three-numbers suits utilitarian products, not delight. Switch-to-us needs an existing behavior to steal.

### YC, "YC's essential startup advice" [S]

- **Problem:** founders spend time on the wrong things.
- **Steps / claims:** launch a mediocre product fast, then talk to customers and iterate; do things that don't scale (citing Paul Graham; Airbnb photographing listings themselves); look for Paul Buchheit's "90/10 solution"; 10 customers with a burning problem beat 1,000 with a passing annoyance; choose one or two key metrics early and pick work almost only by its effect on them; beware "fake work" (Sam Altman); do less, really well; competitors rarely matter in year one.
- **What it forces:** every task justified by a metric or a user conversation.
- **How it fails:** it is advice, not a procedure; "talk to users" without question technique produces polite interest, which is exactly what office-hours Q1 rejects.

## 05 Ideas against kowalski

| Idea | Source | Verdict | Why |
|---|---|---|---|
| Interest is not demand; rank evidence by behavior (paid, built a workflow on it, upset when it broke) over words | office-hours Q1 | borrow | kowalski marks evidence [V]/[S]/[U] by how we know it, not by how strong it is. A [V] "sounds nice" outranks nothing. |
| Status quo: what they do today and what it costs | office-hours Q2, Shear interview questions | borrow | The brief has Moment but not the workaround; the workaround is the real competitor and the cheapest test often reuses it. |
| Name the human, never a category | office-hours Q3 | already have / borrow for product-init | product-engineer asks "by role and name"; `users.md` (product-init) has no rule against "the team" or "SMBs". |
| Narrowest wedge someone would pay for this week | office-hours Q4 | already have | Slice and cheapest test. |
| Watch, don't demo; what surprised you | office-hours Q5 | already have | Proof step: real output read as the person. Surprise could be a signal line, not a new step. |
| Future-fit (3 years) | office-hours Q6 | reject | Investor question; our bets are weeks long. |
| Questions one at a time, routed by stage, two-more escape hatch | office-hours | borrow lightly | Fits what-to-build when principles are missing; product-engineer is time-boxed and should not interview. |
| Premises the user must agree to before going on | office-hours Ph3 | already have | what-to-build refuses to rank against `proposed` principles. |
| Forced alternatives incl. "minimal viable" | office-hours Ph4, ceo-review 0D | already have | Slice plus Skip covers it; a second "ideal" option invites scope. |
| Cold-read second opinion (fresh subagent) | office-hours Ph3.5 | reject for v1 | Cost and latency; evals are the better check on skill drift. |
| Founder signals, tiered closing, video resource pool | office-hours Ph4.5-6 | reject | Flattery and marketing; nothing a product decision needs. |
| Completeness is cheap, boil the ocean, 10x and platonic ideal | ETHOS, ceo-review, autoplan | reject | Directly against "smallest thing that changes what a person sees". |
| "NOT in scope" and "What already exists" sections | ceo-review | already have | Skip line and `reuses` field in `bets.jsonl`. |
| Mechanical / taste / user-challenge decision classes | autoplan | reject for v1 | Useful once kowalski auto-decides anything; today a human picks. |
| Recommendations scored next time as addressed / partial / open | retro Step 12 | borrow | Matches `signal` and `kept/killed`, which v1 sets by hand and nothing reminds you to set. |
| Output metrics: commits, LOC, streaks, sessions | retro | reject | Measures typing, not value; kowalski proves with what the person sees. |
| Three frameworks by stage (built for me, switch to us, three numbers) | Shear | borrow | what-to-build applies one method (PostHog) regardless of stage; naming the mode changes where candidates come from. |
| At most three numbers, plus an unranked must-do lane | Shear, YC "one or two key metrics" | borrow | Gives impact scoring something measurable next to principles, and stops uptime and compliance work from crowding the ranking. |
| Interview to understand the problem, not validate the idea; past behavior questions | Shear | borrow | The cheapest test today can be "ask if they'd use it", which yields interest, not demand. |
| 90/10 solution; do things that don't scale | YC essential advice | already have | Cheapest test prefers a workaround or manual run. |
| Design doc outside the repo, redaction scan before repo copy | office-hours Ph5 | already have | `.product/local/` and the no-quotes-in-git rule do this more simply. |
| 400-line shared preamble, telemetry, learnings JSONL | gstack | reject | kowalski skills stay short and dependency-free; `.product/` is the memory. |

## 06 Proposed changes

1. **product-engineer:** add a `Today:` line to the brief (what the person does now instead and what it costs them), and tag each Evidence item as `behavior` (paid, used, built on it, complained when it broke) or `words` (said they want it, said it is interesting), so a brief backed only by words says so.
2. **what-to-build:** in step 1, name the stage mode before mapping (built for me, switch to us, or three numbers, per Emmett Shear) and, in three-numbers mode, read up to three numbers from `principles.md` and score Impact against them; operational must-dos go in a separate unranked "must do" list instead of the impact table.
3. **what-to-build:** in step 5, the cheapest test may not be asking whether someone would use the thing; it must observe or ask about past behavior ("the last time you did X, what happened") or ship a manual or workaround version, and a pick whose only evidence is `words` gets that kind of test first.
4. **product-init:** when drafting `users.md`, reject category entries ("the team", "SMBs", "users"); each user is a named person or a single role at a named client with their moment, their current workaround, and what goes wrong for them if it is not solved, marked [U] until someone heard it from them.
5. **roadmap:** flag each `shipped` bet with no `kept` or `killed` line 14 days after its ship date as "signal unchecked" and list those first under Done, showing its `signal` field, as a manual stand-in for the out-of-v1 product-review (borrowed from retro's recommendation follow-through).
