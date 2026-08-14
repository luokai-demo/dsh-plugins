# Publishing dsh-balance-plugin

Step-by-step release manual for the two official distribution channels (both are supported and can coexist).

## Prerequisites

- [npm](https://docs.npmjs.com/cli/) account, logged in: `npm whoami`
- A GitHub account; the repository will be public.

## 1. Create the GitHub repository

1. On GitHub, **New repository** → name `dsh-balance-plugin`, public.
2. **Do not** initialize with README/.gitignore (this repo already has them).
3. Add the local remote and push:

```sh
cd ~/Documents/dsh-balance-plugin
git remote add origin git@github.com:luokai-demo/dsh-plugins.git
git push -u origin main
```

4. On the repository page: **About → Topics → add `dsh-plugin`** (the official discovery topic from DeepSeek Harness's README). Also consider `deepseek-harness`.

## 2. Publish to npm

```sh
# from ~/Documents/dsh-balance-plugin
pnpm run build && pnpm test     # gates
npm version patch                # bumps to 0.1.1, creates the git tag
pnpm pack                        # inspect the tarball contents
npm publish                      # publishes prebuilt lib/ — users install with zero friction
git push && git push --tags
```

npm is the **recommended** channel: users run `dsh plugin --profile <name> add dsh-balance-plugin` and get prebuilt code with no install-time build or permission prompt.

## 3. GitHub installs (optional, automatic once the repo exists)

Users can also install directly from GitHub. Two official caveats (from `docs/user/develop/basic/publish.md`):

- Git installs fetch **source**, not build output — the package ships a self-contained `prepare` script (`node scripts/build.mjs`, no project references), which pnpm runs after install;
- pnpm ≥ 10 refuses to run git dependencies' `prepare` until the user opts in via `allowBuilds` in the profile's `pnpm-workspace.yaml`. Document this in your README (already present).

## 4. Versioning and release notes

- Keep npm version and GitHub tag in sync (both come from `npm version`).
- Create a GitHub Release per tag with the changelog; reference the npm version.
- Semantic versioning: `patch` for fixes, `minor` for features, `major` for breaking changes.

## 5. Verification checklist (official inspection points)

```sh
# fresh install from the tarball
dsh plugin --profile demo add ./dsh-balance-plugin-0.1.0.tgz
dsh --profile demo --dump-config     # expect "# == dsh-balance-plugin" layer
# then in the web profile with a real credential: the readout renders
```

## 6. Local development loop

```sh
pnpm install
pnpm run build     # lib/index.js (host) + lib/client.js (browser) + lib/balance-core.js
pnpm test          # node:test unit tests (no framework)
```

To test changes live in a profile: `dsh plugin --profile web add ./` (links the local checkout), restart `dsh web`, hard-refresh the browser.
