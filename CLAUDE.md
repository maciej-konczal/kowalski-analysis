# CLAUDE.md

kowalski: a Claude Code plugin for product engineering. Skills in `plugins/kowalski/skills/`, one dependency-free Node script (`plugins/kowalski/scripts/product.mjs`) that is the only writer of a product repo's `.product/*.jsonl`, a static roadmap page, evals.

## Commands

Node 22+, ESM, no dependencies, no build step.

```sh
npm test                                         # node --test test/*.test.js
claude plugin validate ./plugins/kowalski --strict
claude plugin validate .                         # marketplace
claude --plugin-dir ./plugins/kowalski           # try the skills
claude plugin eval ./plugins/kowalski --scaffold --allow-tools Edit Write "Bash(node:*)"
                                                 # evals (real model calls); without these flags
                                                 # the case.yaml cases run in an empty folder
```

## Rules

- Name is lowercase everywhere: kowalski.
- Only the regular hyphen (-): no em or en dashes in code, docs or skill text; skill prompts whose output reaches users say so.
- Exact customer quotes never land in git. Only `.product/local/` (git-ignored) holds them.
- `.product/*.jsonl` is append-only and only `product.mjs` writes it.
- The plugin works with no `.product/` and with no Cognee.
- Nothing company-specific inside `plugins/kowalski/`: it is meant to be open-sourced.
- Dates are absolute (YYYY-MM-DD).
- Commit subjects: lowercase, area prefix (`brain: ...`, `skills: ...`), describe behavior.
- Design: `docs/specs/`. Plan and progress are local in `work/` (git-ignored).
