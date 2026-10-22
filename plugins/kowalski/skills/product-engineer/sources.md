# Evidence sources

The product repo says where its evidence lives: `.product/users.md` (Sources list),
or its CLAUDE.md `## Product evidence` section. Use at most about 3 lookups in
total. Skip any source that is not available, without failing.

How to query the common kinds cheaply:

- **Recorded decisions**: `.product/resources.jsonl` lines of kind `decision`,
  `meeting` and `outcome`; then the files they point to.
- **Meeting notes or a notes folder**: `grep -ril <term> <folder>`; read a summary
  before a transcript. Keep the date and a [V]/[S]/[U] mark.
- **A knowledge skill or MCP the repo names** (a team brain, a signals or support
  inbox): search by the feature's terms over the last 14 days. Quote the person's
  own words, never an AI summary of them.
- **Product analytics** (PostHog or similar): only if the project is connected.
  Look at the event closest to the feature (views, clicks, runs) over the last 14
  days.
- **Delivery ledgers** (tickets, PRs, a funnel such as triaged -> merged ->
  landed -> verified): shows whether shipped work got used.
- **Outside the team** (forums, reviews, competitors): too wide for 3 lookups; if
  nothing inside answers, say so and offer the research skill.
- **Past bets**: `node "${CLAUDE_PLUGIN_ROOT}/scripts/product.mjs" current bets` and `... history <id>`: was this tried, said no
  to, or killed before, and why.
