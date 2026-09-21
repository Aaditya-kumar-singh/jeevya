# Jeevya GitHub Codespace Build and Release

Jeevya is configured so the **Codespace itself** performs the Android build, signing, GitHub Release upload, and shutdown.

GitHub Actions is used for validation only. EAS Build is not used by the release command.

## Architecture

```text
GitHub Codespace
    |
    | Java 17
    | Android SDK 36
    | Gradle
    | Node.js 24
    |
    v
npm run ship
    |
    +--> git push origin master
    |
    +--> Expo prebuild
    |
    +--> configure release signing
    |
    +--> Gradle assembleRelease
    |
    +--> verify APK signature
    |
    +--> GitHub Release + APK
    |
    +--> stop current Codespace
```

Expo SDK 57 uses Android API 36 for compile and target SDK, so this repository's Codespace installs Android platform 36 and Build Tools 36.0.0. citeturn3search0

## Important terminology

`github.dev` is the browser editor. It does not provide the full cloud VM required to run Java, Android SDK, Gradle, and an Android build.

Use **GitHub Codespaces** for this setup. Codespaces is the cloud development machine; it can be opened in the browser with VS Code. GitHub documents stopping a Codespace with `gh codespace stop`. citeturn0search1turn0search3

## 1. Create the Codespace

Open the repository:

https://github.com/Aaditya-kumar-singh/jeevya

Choose:

**Code → Codespaces → Create codespace on master**

The repository's `.devcontainer/devcontainer.json` installs:

- Node.js 24
- Java/JDK 17
- Android SDK
- Android platform 36
- Android Build Tools 36.0.0
- GitHub CLI
- VS Code Java/Expo/ESLint/Prettier tooling

After changing `.devcontainer/devcontainer.json`, rebuild the Codespace so the new environment is actually installed. GitHub recommends rebuilding after dev-container changes. citeturn6search0

## 2. Signing is the one-time setup

A release Android app must be signed. Android stores the signing private key in a keystore, and losing the signing identity can prevent updates to an existing app. Expo also recommends keeping release keystores out of Git. citeturn4search4turn4search5

Run inside the Codespace:

```bash
npm run setup:codespace-signing
```

The script can:

1. Generate a new Jeevya release keystore, or
2. Import an existing .jks/.keystore.
3. Store the keystore as a Codespaces secret.
4. Store the keystore password as a Codespaces secret.
5. Store the key alias as a Codespaces secret.
6. Store the key password as a Codespaces secret.

The four secrets are:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

GitHub Codespaces secrets are exposed to the Codespace as environment variables and are encrypted by GitHub. They are separate from GitHub Actions secrets. citeturn5search1turn5search2

The setup script uses GitHub CLI's Codespaces secret support, so you do not have to paste the keystore into the repository. GitHub CLI supports user-level Codespaces secrets with `gh secret set --user --app codespaces`. citeturn10search0

### Very important: existing EAS builds

Jeevya already has older EAS-built APKs.

If those APKs are already installed on your phone and you want future GitHub-built APKs to update them **without uninstalling**, use the existing EAS Android keystore.

Expo documents downloading existing EAS credentials with:

```bash
eas credentials -p android
```

and downloading the credentials/keystore. citeturn11search0turn11search1

Import that existing keystore when `npm run setup:codespace-signing` asks for the keystore path.

If you generate a completely new key, the new APK is a different signing identity. Existing APKs signed with the old key will not be updated by the new APK.

## 3. Build only

For testing the build without publishing or shutting down:

```bash
npm run android:codespace
```

This performs:

```text
expo prebuild
      ↓
generate android/
      ↓
restore keystore from Codespaces secrets
      ↓
configure Gradle release signing
      ↓
./android/gradlew :app:assembleRelease
      ↓
verify APK signature
```

The generated native `android/` directory is intentionally not committed. Expo's CNG/prebuild workflow is designed to generate native projects when needed. citeturn4search3turn3search1

## 4. Full release

After your code is committed:

```bash
npm run ship
```

This command:

1. Verifies you are in GitHub Codespaces.
2. Verifies the branch is `master`.
3. Requires a clean Git working tree.
4. Pushes `master`.
5. Generates the native Android project.
6. Restores the signing keystore.
7. Builds a release APK.
8. Verifies the APK signature.
9. Calculates the SHA-256 checksum.
10. Creates a GitHub prerelease.
11. Uploads the APK.
12. Schedules the current Codespace to stop.

The GitHub CLI release command supports attaching assets, prereleases, and explicitly preventing the build from becoming the repository's latest stable release. citeturn7search0

## 5. Release naming

Every build receives a unique release tag similar to:

```text
android-v1.1.0-20260921T123456Z
```

The release is marked as a **prerelease**.

This prevents development builds from replacing the stable release.

The APK includes the source commit in its filename, for example:

```text
Jeevya-1.1.0-a1b2c3d4e5f6-android.apk
```

Each build also writes a SHA-256 checksum beside the APK during the build.

## 6. Android versionCode

The Codespace release script uses the current Unix timestamp in seconds as the Android `versionCode`.

This gives independently built APKs increasing Android version codes without needing EAS's remote version counter.

The version name remains the version in `package.json`.

## 7. What is still cloud-based?

The actual Android compilation and signing happen inside the **GitHub Codespace VM**.

The GitHub Release is a GitHub service used only to publish the finished APK.

There is no EAS Build call in `npm run ship`.

Therefore the normal release does not consume an EAS cloud Android build.

## 8. Codespace shutdown

The release script schedules:

```bash
gh codespace stop -c "$CODESPACE_NAME"
```

after the GitHub Release has successfully been created.

GitHub documents `gh codespace stop` as the supported CLI method for stopping a running Codespace. citeturn0search1turn0search8

If the shutdown command cannot run, GitHub's normal Codespaces idle timeout remains a backup. Stopping a Codespace preserves its saved work and stops running processes. citeturn0search0

## 9. Development flow

Normal development:

```bash
npm start
```

Before release:

```bash
npx tsc --noEmit
npm test -- --runInBand
npm run test:checks
npx expo-doctor
```

Then:

```bash
git add .
git commit -m "feat: your change"
npm run ship
```

The release command itself pushes the commit before building it.

## 10. Security

Never commit:

- Android keystores
- keystore passwords
- private keys
- `credentials.json`
- Supabase service-role keys
- GitHub access tokens

The repository's `.gitignore` excludes native build output and signing files.

The Codespaces signing secrets remain outside the Git repository.

## 11. Stable production releases

GitHub prereleases are intended for direct APK testing.

For a deliberate stable release:

```text
package.json
app.json
CHANGELOG.md
```

Update the version intentionally, commit it, and create the stable Git tag/release separately.

The APK pipeline remains the same and does not require EAS.

## 12. Why this design

The important separation is:

```text
Codespaces
  = development machine + Android build machine

GitHub
  = source control + release storage

GitHub Actions
  = validation only

Expo
  = framework / prebuild tooling

EAS Build
  = optional, not required for the Codespace release pipeline
```

This means the Codespace can be completely disposable. The source code and releases survive after the VM is stopped.
