---
name: roadmap
description: Use when someone asks to see the roadmap, what is in flight, what is next, the bets board, or the impact vs effort grid. Renders the product brain's bets (.product/bets.jsonl) into a local page with a Now / Next / Later / Done board and an impact vs effort grid, and opens it.
---

# Roadmap

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/product.mjs" render` from the product repo.
   - It prints the path of `.product/local/roadmap.html`. The page lives in `local/` because it is derived and may hold paraphrased customer context; never commit it.
   - "no .product/ found": say so and offer `/kowalski:product-init`. Stop.
2. Open the page: `open <path>` on macOS, `xdg-open <path>` on Linux.
3. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/product.mjs" check`. If anything is past due, open the chat reply with it: each item by id or date with its title, and the question "what happened?". A roadmap with passed dates and no outcome shows a plan, not where things stand.
4. In chat, one line per column with counts (Now = building, Next = picked, Later = candidate, Done = shipped, kept, killed), then:
   - bets in Next with no owner or no test, by id (they are not really picked);
   - open bets with no impact or effort (listed as unscored on the page);
   - picked or building bets with no tracker ref, from the check's last section;
   - shipped bets older than 14 days that are not yet kept or killed: their signal is due a look.

Do not edit `.product/*.jsonl` here. Status changes go through what-to-build, product-engineer, or `product.mjs append`.

Use only the regular hyphen (-) in anything you write.
