# kowalski

> "Kowalski, analysis!"

Product engineering for Claude Code. kowalski makes the product decision part of the build:

1. **Decide** what to build next, against principles you agreed, with evidence for every candidate.
2. **Build** the smallest slice that would show whether it is worth having.
3. **Prove** it with what the person actually sees, not with green tests.
4. **Remember** bets, outcomes and vetted resources in a `.product/` folder in your own repo.

Status: early. Used every day on one real product since 2026-10-09; expect changes.

## Install

Requires Claude Code and Node 22 or later.

```sh
claude plugin marketplace add maciej-konczal/kowalski-analysis
claude plugin install kowalski@kowalski
```

Other ways: [INSTALL.md](INSTALL.md).

## How it works

- Skills: `what-to-build`, `product-engineer`, `product-init`, `remember-resource`, `roadmap`, `product-update`.
- Before new work, `roadmap`, `product-update` and `what-to-build` run `product.mjs check`: planned dates that passed with no outcome, days with commits but no update, and each bet next to its tracker issue.
- The brain: `.product/` in your product repo (`principles.md`, `users.md`, append-only `bets.jsonl` and `resources.jsonl`, git-ignored `local/` for exact quotes).
- Design: [docs/specs/2026-10-09-kowalski-design.md](docs/specs/2026-10-09-kowalski-design.md).

The method for deciding what to build is adapted from PostHog, ["How we decide what to build"](https://posthog.com/newsletter/how-we-decide-what-to-build) (2024-01-10).

## License

MIT
