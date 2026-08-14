# dsh-plugins

Community plugin collection for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

Every plugin here is a standalone bundle: installable with `dsh plugin add`, published independently to npm, and discoverable through the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic. Each plugin lives in its own directory under `plugins/` with its own version and release cycle.

## Plugins

| Plugin | What it does | Install |
|---|---|---|
| [dsh-balance-plugin](plugins/dsh-balance-plugin/README.md) | DeepSeek wallet balance at the sidebar foot: card icon + status-tinted amount, refreshed on turn end | `dsh plugin --profile <name> add dsh-balance-plugin` |

## Installing a plugin

```sh
dsh plugin --profile <name> add <plugin-name>          # from npm (recommended)
dsh plugin --profile <name> add github:luokai-demo/dsh-plugins#<sha> -- # git-direct (needs allowBuilds)
```

See each plugin's README for its credential requirements and configuration.

## Developing a plugin

```
plugins/
  <plugin-name>/
    package.json       # dsh.bundle manifest + dsh.client (for UI plugins)
    cordis.patch.yml   # the configuration layer the bundle contributes
    src/               # host half (index.ts) + browser half (client.tsx)
    scripts/build.mjs  # esbuild: host ESM + browser __ModuleLoader__ bundle
    tests/             # node:test unit tests (no framework)
    README.md          # bilingual: features, install, config, FAQ, release checklist
```

```sh
pnpm install          # workspace-wide
pnpm run build        # build every plugin
pnpm test             # test every plugin
```

To add a new plugin: copy `plugins/dsh-balance-plugin` as a template, keep the bundle manifest shape (`dsh.bundle` + `cordis.patch.yml`), and verify locally before publishing:

```sh
dsh plugin --profile demo add ./plugins/<plugin-name>
dsh --profile demo --dump-config     # expect a "# == <plugin-name>" layer
```

## Publishing

Each plugin publishes independently (see its `PUBLISHING.md`):

1. `pnpm run build && pnpm test` inside the plugin;
2. `npm version <patch|minor|major>` (bumps and tags);
3. `pnpm pack` and inspect the tarball;
4. `npm publish` (prebuilt code — zero-friction installs);
5. Push the tag; keep the GitHub release in sync.

## License

[MIT](LICENSE)
