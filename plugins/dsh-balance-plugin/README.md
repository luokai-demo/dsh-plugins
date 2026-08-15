# dsh-balance-plugin

DeepSeek wallet balance at the sidebar foot — a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin.

English | [中文](README.zh.md)

Shows your DeepSeek account balance as a **card icon + amount** in the sidebar footer (beside Settings), tinted by how much is left. Refreshes when a conversation turn ends, on click, and on mount — no polling. When the amount changes, a signed delta (`+¥3.14` / `-¥1.97`) floats up and fades next to it — every spend (or top-up) is visible at a glance.

![screenshot placeholder: sidebar foot showing `💳 ¥12.34` in green](docs/screenshot.png)

## Features

- **Status-tinted amount**: only the amount carries the color, the icon stays neutral —
  - ≥ `lowBalanceThreshold` (default **2**): green
  - above zero: amber
  - zero or below: red
- **Refresh on turn end**: the host pushes an SSE `refresh` event when any conversation turn ends — wallet spend settles with the turn.
- **Click to refresh**; in-flight refreshes are deduped (a click or turn-end tick during a pending query is a no-op).
- **Float delta**: on a visible amount change, a signed delta floats up and fades out — green when the balance rises, red when it falls. Zero or sub-cent changes are silent, the first load never floats, and the animation is suppressed under `prefers-reduced-motion`.
- **Silent failure**: unconfigured credentials or a failed fetch render nothing — the readout is advisory and never surfaces an error.
- **Original currencies**: balances are displayed as the provider reports them; no conversion, no summing.

## Install

Requires a DeepSeek account credential. The plugin resolves `DEEPSEEK_API_KEY` through the harness credential seam (`~/.dsh/.credentials.yaml` or the environment), exactly like the official DeepSeek adapter.

### From npm (recommended)

```sh
dsh plugin --profile <name> add dsh-balance-plugin
```

### From the GitHub Release (no npm account needed)

Download `dsh-balance-plugin-<version>.tgz` from the [releases page](https://github.com/luokai-demo/dsh-plugins/releases), then:

```sh
dsh plugin --profile <name> add ./dsh-balance-plugin-<version>.tgz
```

Note: the plugin lives in the `plugins/` subdirectory of the `dsh-plugins` monorepo, so `dsh plugin add github:...` cannot target it — use the tarball (or npm).

## Configuration

The plugin ships with sensible defaults; override via the bundle's plugin row:

```yaml
# profile's cordis.patch.yml (or your home-level one)
- id: balance
  name: dsh-balance-plugin
  config:
    apiKeyEnv: DEEPSEEK_API_KEY      # credential reference, then the environment
    baseURL: https://api.deepseek.com # provider base URL
    timeoutMs: 12000                 # per-request timeout; abort maps to balance-timeout
    lowBalanceThreshold: 2           # amount at or above which the tint reads healthy
```

## How it works

| Half | What it does |
|---|---|
| **Host** (Node) | Registers `GET /dsh-balance` (the wallet readout as JSON) and `GET /dsh-balance/events` (an SSE stream). Listens on the harness's `session/event` broadcast and emits a `refresh` SSE event per `turn/end`. Resolves the credential **per request** through `ctx.credentials`, falling back to the environment — a changed key applies without a restart. |
| **Client** (browser) | Registers the `sidebar.footer.action` slot entry (the shell's reserved seat beside Settings; on the collapsed rail it stacks above the settings icon). Fetches the readout on mount, on `refresh` SSE events, and on click, with an in-flight guard. The card icon is self-contained (no dependency on the shell's icon library). |

Position and interaction follow the shell's own design: the `sidebar.footer.action` hole is the official extension point for "optional actions beside Settings".

## Frequently asked questions

**The balance looks stale right after a conversation ends.** Provider settlement lags the turn by tens of seconds. The turn-end refresh may briefly show the pre-settlement amount; clicking later shows the settled value. This matches the official DeepSeek client behavior — the readout is advisory.

**Nothing renders.** No credential resolves (`unconfigured`) or the fetch failed — by design. Check `dsh --profile <name> --dump-config` for the plugin row, and that `DEEPSEEK_API_KEY` resolves through the credential seam or the environment.

**How do I remove it?**

```sh
dsh plugin --profile <name> remove dsh-balance-plugin
```

This removes the dependency and the bundle layer together.

## Development

```
src/
  balance-core.ts   # pure query logic (credential resolution, HTTP, normalization)
  index.ts          # host plugin: routes + SSE + turn-end listener
  client.tsx        # browser plugin: the sidebar-foot action
scripts/build.mjs   # esbuild: host ESM + browser __ModuleLoader__ bundle
tests/              # node:test unit tests for balance-core
```

```sh
pnpm install
pnpm run build    # emits lib/index.js + lib/client.js
pnpm test         # balance-core unit tests
```

Local install check (official verification points):

```sh
dsh plugin --profile demo add ./
dsh --profile demo --dump-config   # expect a "# == dsh-balance-plugin" layer
```

## Release checklist

Before publishing a new version:

1. `pnpm run build` and `pnpm test` pass.
2. Local install check above passes (`--dump-config` shows the layer; the web profile renders the readout with a real credential).
3. Version bumped (`npm version patch/minor/major`); git tag matches.
4. `pnpm pack` — inspect the tarball: it must contain `lib/`, `cordis.patch.yml`, `README.md` (and nothing else heavy).
5. `npm publish` — publishes prebuilt code, so users install with zero friction.
6. Push the tag; keep the GitHub release notes in sync with the npm version.

## License

[MIT](LICENSE)
