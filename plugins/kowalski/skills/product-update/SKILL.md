---
name: product-update
description: Use when someone asks for a product update, what shipped today or yesterday, what is planned tomorrow, a daily or weekly update for the team or stakeholders, or to refresh the shared updates page. Writes the day's highlights in plain words from what actually changed, refreshes a day-by-day page with the vision and progress toward its end state, publishes it to the same link, and drafts the message for the team to approve before it is sent.
---

# Product update

You are the product manager and the engineer in one, writing for people who were not in the room: teammates, a sponsor, an investor. They read plain words about what a person can now do, not commit messages.

`P` below is shorthand in this file only: always type the full command `node "${CLAUDE_PLUGIN_ROOT}/scripts/product.mjs"` from the product repo. No `.product/`: say so, offer `/kowalski:product-init`, stop.

## 0. Check first

Run `P check` before writing anything. It prints three sections:

- **Past due**: a planned item on a past day with no outcome, or a picked or building bet whose `by` passed. Ask the person what happened, one question per item, before the new day. Record the answer: rewrite that day with `"outcome"` on the item (in our words), or move the bet on (`P append bets` with a new status, or a new `by` and what slipped in its evidence). "Unknown" is an answer; write it as the outcome rather than skipping it. Not answered: keep it in the draft's open questions, never drop it.
- **Commits with no update written**: write each of those days too (steps 1 and 2), oldest first, not only today.
- **Bets and their tracker issue**: if a tracker is connected, read each `ref` and list what disagrees: the issue is done but the bet is not shipped, the bet is shipped or killed but the issue is open, a picked or building bet has no ref, or a shipped change from step 1 has neither a bet nor an issue. Propose the tracker changes (close, comment, create, new date) and apply them only after a yes. A bet that gets an issue gets its `ref`: `P append bets '{"id":"<id>","status":"<same status>","ref":"<issue id>"}'`.

## 1. What changed (the day asked for, default today)

- `P changes <YYYY-MM-DD>` lists that day's commit subjects.
- If a tracker is connected (Linear, Jira, GitHub issues), read issues closed that day and issues due the next days.
- Read `.product/bets.jsonl` lines dated that day (shipped, killed, picked).

## 2. Write the day (plain words, one line each)

- **added**: what a person can now do that they could not yesterday, 1 to 6 lines. Merge commits that make one change into one line. Leave out internal refactors, tests and docs unless someone outside the team would notice.
- **Cover check, before writing**: go through every commit subject from step 1 and name the line that covers it, or say why it is left out. A user-facing change with no line is a miss (a new connection, a new command, a new place it posts). Never skip this check; a forgotten shipment is the most common failure.
- **planned**: what is due the next days, each with `details` (what done looks like, in 1 to 4 short lines) and `url` to the tracker issue when there is one. A milestone (a demo, a launch) gets details too: the plan, what to prepare, what not to claim.
- `tag` (optional) names the part of the vision a line serves, using the words in `.product/vision.md`.
- No exact quotes from customers; our words only. Only the regular hyphen (-), never a long dash.
- Record it: `P append updates '{"date":"YYYY-MM-DD","added":[{"text":"...","tag":"..."}],"planned":[{"text":"...","url":"...","details":["..."]}]}'`. The latest line for a date wins, so re-recording a day replaces it; write the whole day each time.

## 3. Vision and progress

- `.product/vision.md` holds the vision: `# Name`, a short plain paragraph a newcomer understands in 10 seconds, then `## End state` with one line per step: `- [done|partial|next] what the product does | where it stands today | ref`.
- If something shipped moves a step (next to partial, partial to done), propose the edit to the person, with the evidence. Never mark a step done on a plan or a promise, only on what runs today. A claim made elsewhere (a pitch, an application) that is ahead of a step is worth saying out loud.

## 4. Refresh the page

- `P updates` writes `.product/local/updates.html` (the vision, the progress bar, then day by day with yesterday, today and tomorrow, any day selectable).
- If an Artifact tool is available: publish it. `P page-url` prints the link it was published to before; pass that link as `url` so the address stays the same, and save a new one with `P page-url <url>`. Otherwise open the file locally and say where it is.

## 5. Draft the message, never send unasked

- Write the update for the channel the person names (or the team's product channel): the date, **Added** lines, **Next** lines with dates, one line of what was stopped and why if anything was, one line of what changed in the tracker if step 0 changed it, and the page link. Short; no internal jargon (no "bet", no ids without a title).
- Show the draft in chat and wait for a yes. Sending posts under the person's name; only send after they say so, and only to the channel they named.

## Output

```
Asked: N past-due items (answered A) · days backfilled D · tracker changes T
Day: YYYY-MM-DD · added N · planned M · covered K of K changes
Page: <link or path>
Draft for <channel>:
<the message>
```
