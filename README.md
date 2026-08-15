# dsh-plugins

English | [中文](README.zh.md)

Community plugin collection for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — every plugin is a standalone bundle with one-command install and its own version.

## Plugins

| Plugin | Looks like | What it does | Install |
|---|---|---|---|
| **dsh-balance-plugin** | ![balance readout](plugins/dsh-balance-plugin/docs/screenshot.png) | DeepSeek wallet balance at the sidebar foot: card icon + status-tinted amount (green ≥ 2, amber 0–2, red ≤ 0), refreshes on turn end and on click | `dsh plugin add dsh-balance-plugin` |

## Install

**Option 1 — npm (recommended, one command).** `<profile>` is your profile name, e.g. `web`:

```sh
dsh plugin --profile <profile> add dsh-balance-plugin
```

**Option 2 — GitHub Release.** Download `dsh-balance-plugin-0.1.0.tgz` from the [Releases](https://github.com/luokai-demo/dsh-plugins/releases) page, then:

```sh
dsh plugin --profile <profile> add ./dsh-balance-plugin-0.1.0.tgz
```

Restart `dsh web` and refresh the browser — the balance appears at the sidebar foot (beside Settings).

## Install with an AI assistant

Paste this prompt to any AI that can operate a terminal (replace `<profile>` with your profile name, e.g. `web`):

> Install the dsh-balance-plugin plugin for DeepSeek Harness: first run `dsh plugin --profile <profile> add dsh-balance-plugin`; if npm does not have it (E404 error), download the latest dsh-balance-plugin-*.tgz from https://github.com/luokai-demo/dsh-plugins/releases and run `dsh plugin --profile <profile> add ./dsh-balance-plugin-*.tgz`; after installing, confirm the dsh-balance-plugin layer appears with `dsh --profile <profile> --dump-config`, then restart `dsh web`, hard-refresh the browser (Cmd+Shift+R), and finally verify a card icon with the balance amount at the sidebar foot.

## Development and publishing

Full workflows for adding plugins, building, testing, and releasing through both channels live in [DEVELOPING.md](DEVELOPING.md). Each plugin directory carries its own README and publishing manual.

## License

[MIT](LICENSE)
