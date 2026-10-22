---
description: A user-visible feature request triggers product-engineer, which writes a brief before any code.
expected_outcome: product-engineer fires; the reply opens with a brief (Who, Moment, Evidence, Slice, Skip, Wrong if) before proposing code.
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
tags: [product-engineer, smoke]
---

Add a "last synced 5 min ago" line to the top of our CLI status command output so people know how fresh the data is.
