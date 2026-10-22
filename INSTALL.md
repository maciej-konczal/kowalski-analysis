# Install kowalski

Requires Claude Code and Node 22 or later.

```sh
claude plugin marketplace add maciej-konczal/kowalski-analysis
claude plugin install kowalski@kowalski
```

For development, from a checkout:

```sh
claude --plugin-dir ./plugins/kowalski
```

Then, in the product repo you work on, run `/kowalski:product-init` to create its `.product/` brain.
