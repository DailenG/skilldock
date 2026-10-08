# Fork releases

## Versioning

Fork builds use `<upstream-version>-fork.<N>`, for example `1.0.21-fork.1`. Increment `N` for each fork-only release, and reset it to `1` when the upstream version changes. These prerelease versions are ordered by SemVer, so newer revisions and upstream version bumps sort correctly.

## Publish a release

1. Open **Actions → Release (fork) → Run workflow**.
2. Select the source ref and fork revision, then run the workflow.
3. For the first fork release only, download its Windows x64 NSIS installer and install it over the existing upstream installation. This one-time manual install switches the app to the fork's updater endpoint and signing key.

Never run or publish a fork build with the upstream **Release** workflow; it targets the upstream release channel.

## Required repository secrets

Configure these under **Settings → Secrets and variables → Actions**:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

The workflow uses the repository-provided `GITHUB_TOKEN` with `contents: write`.
