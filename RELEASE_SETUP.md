# Jeevya GitHub Development and Release Pipeline

## Architecture

```text
GitHub Codespace
    |
    | edit / test
    v
git push origin master
    |
    +----------------------+
    |                      |
    v                      v
CI validation        Android release
    |                      |
    |                 EAS Build
    |                 github-release
    |                      |
    |                 signed APK
    |                      |
    +-----------> GitHub Release
```

## 1. Development in GitHub Codespaces

Open the repository and choose **Code → Codespaces → Create codespace on master**.

The repository contains:

```text
.devcontainer/devcontainer.json
```

The container automatically installs dependencies with:

```bash
npm ci
```

The environment includes Node.js 24 and the recommended VS Code extensions.

### Stop the Codespace

Use:

**Command Palette → Codespaces: Stop Current Codespace**

or:

```bash
gh codespace stop
```

GitHub also automatically stops a Codespace after its configured idle timeout. The timeout is controlled by the user's GitHub Codespaces settings, not by the repository's devcontainer file.

## 2. Normal development flow

```bash
git status
npm run lint
npx tsc --noEmit
npm test -- --runInBand
npm run test:checks

git add .
git commit -m "feat: describe change"
git push origin master
```

A push to `master` starts both:

- `Jeevya CI`
- `Jeevya Android Release`

The release workflow does not build until all validation checks pass.

## 3. Expo authentication for GitHub Actions

The Android release workflow uses EAS Build. GitHub Actions must authenticate to the Expo account with an `EXPO_TOKEN`.

Create an Expo access token from:

https://expo.dev/settings/access-tokens

Then add it to:

**GitHub repository → Settings → Secrets and variables → Actions → New repository secret**

Use exactly:

```text
Name: EXPO_TOKEN
Value: <your Expo access token>
```

Never commit the token to the repository.

## 4. Android release profile

The repository keeps two different release purposes:

```text
production
  Android → AAB
  Purpose → Google Play / production distribution

github-release
  Android → APK
  Purpose → GitHub Releases / direct Android installation
```

This prevents the GitHub download from receiving an AAB that cannot be directly installed by normal Android users.

The GitHub release profile uses EAS remote version-code auto-incrementing.

## 5. What happens after a push

For every successful push to `master`:

1. GitHub checks out the commit.
2. Dependencies are installed with `npm ci`.
3. TypeScript is checked.
4. Jest runs.
5. Jeevya project checks run.
6. Expo Doctor runs.
7. EAS builds the Android APK.
8. The workflow downloads the completed APK.
9. A unique GitHub release tag is created.
10. The APK is attached to that release.

Example:

```text
Jeevya 1.1.0 build 42
        |
        +-- Jeevya-1.1.0-42-android
```

The build tag is intentionally different from the stable semantic version tag. This prevents every development push from overwriting the stable `v1.1.0` release.

## 6. Stable releases

When a stable version is ready, update:

```text
package.json
app.json
CHANGELOG.md
```

Then create a semantic version tag:

```bash
git tag -a v1.2.0 -m "Jeevya 1.2.0"
git push origin v1.2.0
```

The existing `production` EAS profile remains available for generating the Google Play AAB.

## 7. Important billing/build consideration

Every push to `master` can start an EAS Android build. EAS build capacity is account-dependent.

If you do not want every commit to consume an EAS build, change the release workflow trigger to tags or manual dispatch. CI validation can continue on every push.

Recommended team policy:

```text
Every push       → CI
Every PR         → CI
Every master     → optional APK release
Stable tag       → production AAB
```

## 8. Secrets

Never commit:

- `.env`
- `.env.local`
- Supabase service-role keys
- Expo access tokens
- Android keystores
- private signing keys

The existing `.gitignore` excludes local environment files and signing material.

## 9. Rollback

If a release is broken, the source code remains available as immutable Git commits and Git tags.

For a hotfix:

```bash
git checkout master
git pull
# fix issue
git add .
git commit -m "fix: ..."
git push origin master
```

The next successful pipeline produces a new build.

## 10. Release principle

The pipeline is deliberately split into:

- development environment: GitHub Codespaces
- source control: GitHub
- validation: GitHub Actions
- native Android build/signing: EAS Build
- public binary distribution: GitHub Releases
- Google Play artifact: production AAB

This keeps the Codespace disposable. Your code lives in Git, while builds do not depend on the Codespace remaining online.

### One-command push and Codespace stop

After committing your changes, use this inside Codespaces:

```bash
npm run ship
```

This verifies that the working tree is clean, verifies you are on `master`, pushes `master`, and then asks the Codespace GitHub CLI to stop the current Codespace in the background. If the Codespace cannot be stopped automatically, the push is still complete and the command tells you to stop it manually.
