# Developing plugins for dsh-plugins

English | [中文](DEVELOPING.zh.md)

## Repository layout

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
3. Write your host half (`src/index.ts`), browser half (`src/client.tsx` if any), and pure logic module; keep the per-request pattern for optional services.
4. Write `tests/` (node:test, no framework) and the bilingual README (features, install, config, FAQ, release checklist).
5. Verify locally before publishing:

```sh
pnpm install
pnpm run build && pnpm test
dsh plugin --profile demo add ./plugins/<plugin-name>
dsh --profile demo --dump-config     # expect a "# == <plugin-name>" layer
```

6. Add a row to the plugins table in the root README (both languages).
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
