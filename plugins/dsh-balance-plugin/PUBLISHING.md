# Publishing dsh-balance-plugin

Release manual for the supported npm and GitHub Release tarball channels.

## Prerequisites

- [npm](https://docs.npmjs.com/cli/) account, logged in: `npm whoami`
- A GitHub account; the repository will be public.

## 1. Build and verify

```sh
# from plugins/dsh-balance-plugin
pnpm run build
pnpm test
pnpm pack --dry-run  # must contain lib/, cordis.patch.yml, README files, and LICENSE
```

In an isolated DSH `0.1.5-rc.1` or later profile, verify both installation and update behavior:

```sh
dsh plugin --profile demo add ./dsh-balance-plugin-<version>.tgz
dsh plugin --profile demo update dsh-balance-plugin
dsh --profile demo --dump-config  # expect "# == dsh-balance-plugin"
```

Restart the Web profile and hard-refresh the browser to verify the authenticated balance readout.

## 2. Publish to npm

```sh
pnpm run build && pnpm test     # gates
npm version patch                # creates the release version and git tag
pnpm pack                        # inspect the tarball contents
npm publish                      # publishes prebuilt lib/ — users install with zero friction
git push && git push --tags
```

npm is the **recommended** channel: users run `dsh plugin --profile <name> add dsh-balance-plugin` and get prebuilt code with no install-time build or permission prompt. Existing npm users upgrade with `dsh plugin --profile <name> update dsh-balance-plugin`.

## 3. Publish a GitHub Release tarball

The package is in this monorepo's `plugins/` subdirectory, so `github:` package specs cannot target it. Publish the prebuilt tarball instead:

```sh
pnpm pack
gh release create v<version> dsh-balance-plugin-<version>.tgz --title "dsh-balance-plugin <version>" --notes-file <notes-file>
```

Users install or replace a tarball release with `dsh plugin --profile <name> add ./dsh-balance-plugin-<version>.tgz`, then run `dsh --profile <name> --dump-config` and restart DSH.

## 4. Versioning and release notes

- Keep npm version and GitHub tag in sync (both come from `npm version`).
- Create a GitHub Release per tag with the changelog; reference the npm version.
- Semantic versioning: `patch` for fixes, `minor` for features, `major` for breaking changes.

## 5. Local development loop

```sh
pnpm install
pnpm run build     # lib/index.js (host) + lib/client.js (browser) + lib/balance-core.js
pnpm test          # node:test unit tests (no framework)
```

To test changes live in a profile: `dsh plugin --profile web add ./` (links the local checkout), restart `dsh web`, hard-refresh the browser.
