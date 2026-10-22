---
name: remember-resource
description: Use when someone shares a link, article, playbook, decision, meeting note or customer quote and wants it kept ("remember this", "save this resource", "add to the brain"), or when a vetted source should inform future product decisions. Records it in .product/resources.jsonl with why it matters and how verified it is; exact quotes stay in the git-ignored .product/local/.
---

# Remember a resource

`P` is shorthand in this file only: always type the full command
`node "${CLAUDE_PLUGIN_ROOT}/scripts/product.mjs"` from the product repo; never put it
in a shell variable or alias (permission checks block that). No `.product/`: offer `/kowalski:product-init` and stop.

1. **Read it** (fetch the URL or open the file). Do not record what you have not read.
2. **Ask why it matters** if the user did not say: one line on what decision it
   should inform. A resource with no why is not worth keeping.
3. **Classify:** `kind` is one of article, decision, meeting, outcome, quote.
   `mark` is V (we ran or reproduced it), S (read from the source) or U
   (unverified), without brackets.
   `date` is the resource's own date (publication, meeting, decision), not today.
4. **Append it without an id**; the script assigns the next `r-<n>`, refuses a
   source that is already recorded, and prints the stored line:
   `P append resources '{"kind":..,"source":"<url or path>","date":..,"mark":..,"why":..}'`
5. **Quotes:** for kind `quote`, or any exact customer words, include `"local":true`
   in the line you append, then write the text to `.product/local/r-<n>.md` with the
   id the script printed: who said it, where, the date, and the words verbatim. The
   words never go into resources.jsonl; the script refuses a quoted span there.
6. **Report** the stored line in one sentence.

Use only the regular hyphen (-) in anything you write.
