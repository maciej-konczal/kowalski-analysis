---
description: A plain bug fix does not trigger product-engineer.
expected_outcome: product-engineer does not fire; the agent works on the bug directly.
max_turns: 8
allowed_tools: [Read, Glob, Grep, Skill]
tags: [product-engineer, smoke]
---

The unit test test_parse_date fails with "Invalid time value" when the input has a trailing Z. Find why and tell me the one-line fix.
