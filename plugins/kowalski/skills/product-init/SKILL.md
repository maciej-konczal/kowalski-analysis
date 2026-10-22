---
name: product-init
description: Use when setting up kowalski in a repo, creating or initializing the product brain (.product/), or when another kowalski skill finds no .product/. Creates principles.md, users.md, bets.jsonl and resources.jsonl, keeps .product/local/ out of git, and drafts users and principles from the repo for the user to confirm.
---

# Product init

Creates the product brain in the current repo. The brain is plain files the team
reviews in git; exact customer words only ever go to `.product/local/`.

1. **Check.** `.product/` exists: say what is in it and stop, unless the user asks
   to add missing files (never overwrite one).
2. **Create** with one command from anywhere in the repo:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/product.mjs" init`. It creates `.product/` at the repo
   root from the templates, never overwrites a file, creates `.product/local/` and
   adds it to `.gitignore`. Do not copy the templates by hand.
3. **Check committed quotes.** If the repo already commits notes, transcripts or
   tickets with people's exact words (a `notes/` folder, interview files), say so
   once: kowalski keeps quotes out of `.product/`, but those files are in git.
4. **Draft users.md** from the README, CLAUDE.md (and any `## Product evidence`
   section), docs, and any notes folder or team brain the user points to. One
   section per user, each a single role or a named person at a named client, never
   a category ("users", "the team", "SMBs"). Give each: their moment, what they do
   today instead, and where their evidence lives. Mark anything nobody heard from
   them directly [U]. Fill the Sources list with the places evidence lives, most
   likely first.
5. **Draft 3 principles** in principles.md, each traced to a dated decision,
   meeting or doc, with what it says no to. All start `Status: proposed`. Ask the
   user to confirm, change or drop them one at a time; mark confirmed ones
   `Status: agreed`. what-to-build will not rank against proposed principles.
6. **Never** write a quote into principles.md or users.md. Paraphrase in neutral
   words; if a quote matters, put it in `.product/local/<topic>.md`.
7. **Report** in chat: files created, users found, which principles are agreed and
   which are still proposed, and the next step (`/kowalski:what-to-build`).

Do not commit; the user decides when `.product/` goes into git.

Use only the regular hyphen (-) in anything you write.
