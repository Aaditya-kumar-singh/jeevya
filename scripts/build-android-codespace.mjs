import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function run(command, args, options = {}) {
  console.log(`\\n$ ${command} ${args.join(' ')}`);
  execFileSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    ...options,
  });
}

function output(command, args) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  }).trim();
}

if (process.env.CODESPACES !== 'true') {
  throw new Error(
    'This command is designed for GitHub Codespaces. Open Jeevya in a Codespace first.',
  );
}

const required = [
  'ANDROID_KEYSTORE_BASE64',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Missing Codespaces secret: ${name}`);
  }
}

if (!fs.existsSync(path.join(root, 'package-lock.json'))) {
  throw new Error('package-lock.json is missing.');
}

const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
);
const version = packageJson.version;
const commit = output('git', ['rev-parse', '--short=12', 'HEAD']);
const commitCount = Number(output('git', ['rev-list', '--count', 'HEAD']));
const versionCode = 100000 + commitCount;

console.log(`Jeevya ${version}`);
console.log(`Commit: ${commit}`);
console.log(`Android versionCode: ${versionCode}`);

const productionEnvPath = path.join(root, '.env.production');
fs.writeFileSync(
  productionEnvPath,
  [
    `EXPO_PUBLIC_SUPABASE_URL=${process.env.SUPABASE_URL}`,
    `EXPO_PUBLIC_SUPABASE_KEY=${process.env.SUPABASE_ANON_KEY}`,
    '',
  ].join('\n'),
  { mode: 0o600 },
);

console.log('Supabase production environment prepared from Codespaces secrets.');
process.on('exit', () => {
  fs.rmSync(productionEnvPath, { force: true });
});

run('npx', ['expo', 'prebuild', '--platform', 'android', '--clean', '--no-install'], {
  env: {
    ...process.env,
    JEEVYA_VERSION_CODE: String(versionCode),
  },
});

run('node', ['scripts/configure-android-signing.mjs'], {
  env: {
    ...process.env,
    JEEVYA_VERSION_CODE: String(versionCode),
  },
});

run('./gradlew', [
  ':app:assembleRelease',
  '--no-daemon',
  '--max-workers=2',
  '--stacktrace',
  '-PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64',
], {
  cwd: path.join(root, 'android'),
  env: {
    ...process.env,
    JEEVYA_VERSION_CODE: String(versionCode),
  },
});

const apkSource = path.join(
  root,
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'release',
  'app-release.apk',
);

if (!fs.existsSync(apkSource)) {
  throw new Error(`Release APK was not produced: ${apkSource}`);
}

const outputDir = path.join(root, 'dist', 'releases');
fs.mkdirSync(outputDir, { recursive: true });

const assetName = `Jeevya-${version}-${commit}-android.apk`;
const assetPath = path.join(outputDir, assetName);
fs.copyFileSync(apkSource, assetPath);

const apksigner = output(
  'bash',
  ['-lc', 'command -v apksigner || find "$ANDROID_HOME/build-tools" -name apksigner -type f | sort -V | tail -1'],
);

if (!apksigner) {
  throw new Error('apksigner was not found in the Android SDK.');
}

run(apksigner, ['verify', '--verbose', assetPath]);

const sha256 = output('sha256sum', [assetPath]).trim().split(/\s+/)[0];
const metadata = {
  version,
  versionCode,
  commit,
  assetName,
  sha256,
};

const metadataPath = path.join(outputDir, `${assetName}.json`);

fs.writeFileSync(
  metadataPath,
  JSON.stringify(metadata, null, 2) + '\n',
);

console.log('\\nRelease APK ready:');
console.log(assetPath);
console.log(`Metadata: ${metadataPath}`);
console.log(`SHA-256: ${sha256}`);

export { assetPath, metadata, metadataPath };

