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

## Adding a new plugin

1. Copy `plugins/dsh-balance-plugin` as a template (`cp -R plugins/dsh-balance-plugin plugins/<plugin-name>`).
2. Rename in `plugins/<plugin-name>/package.json`: `name`, `description`, `version` (start at `0.1.0`), `repository` URL, `keywords`. Keep the bundle manifest shape (`dsh.bundle` + `cordis.patch.yml`) and the `dsh.client` block for UI plugins.
3. Write your host half (`src/index.ts`), browser half (`src/client.tsx` if any), and pure logic (`src/balance-core.ts` equivalent); keep the per-request pattern for optional services.
4. Write `tests/` (node:test, no framework) and the bilingual README (features, install, config, FAQ, release checklist).
5. Verify locally before publishing:

```sh
pnpm install
pnpm run build && pnpm test
dsh plugin --profile demo add ./plugins/<plugin-name>
dsh --profile demo --dump-config     # expect a "# == <plugin-name>" layer
```

6. Add a row to the [Plugins](#plugins) table in this README.
7. Commit and push.

## Publishing a plugin

Each plugin publishes independently, with its own version and release. Two channels are supported (see the plugin's `PUBLISHING.md` for the manual):

### Channel A: GitHub Release tarball (no npm account needed)

```sh
cd plugins/<plugin-name>
pnpm pack                                    # produces <plugin-name>-<version>.tgz
cd ../..
gh release create v<version> \
  --title "<plugin-name> <version>" \
  --notes "..." \
  plugins/<plugin-name>/<plugin-name>-<version>.tgz
git push --tags
```

Users install from the Release page:

```sh
dsh plugin --profile <name> add ./<plugin-name>-<version>.tgz
```

### Channel B: npm (optional; requires an npm account)

```sh
cd plugins/<plugin-name>
pnpm run build && pnpm test
npm version <patch|minor|major>   # bumps and tags
pnpm pack                          # inspect the tarball (lib/, cordis.patch.yml, README, LICENSE only)
npm publish                        # prebuilt code — users install with `dsh plugin add <name>`
git push && git push --tags
```

Keep the npm version and the GitHub tag in sync. Note: because plugins live in subdirectories, `dsh plugin add github:<owner>/<repo>#<sha>` cannot target them — use Channel A or B.

## License

[MIT](LICENSE)
