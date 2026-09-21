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
    'npm run ship is intentionally limited to GitHub Codespaces.',
  );
}

if (output('git', ['branch', '--show-current']) !== 'master') {
  throw new Error('Release builds must be made from master.');
}

if (output('git', ['status', '--porcelain'])) {
  throw new Error(
    'Working tree is not clean. Commit your changes before running npm run ship.',
  );
}

console.log('Pushing the exact source commit that will be released...');
run('git', ['push', 'origin', 'master']);

const buildScript = path.join(root, 'scripts', 'build-android-codespace.mjs');
run('node', [buildScript]);

const metadataPath = path.join(
  root,
  'dist',
  'releases',
  fs.readdirSync(path.join(root, 'dist', 'releases')).find((name) => name.endsWith('.apk.json')),
);

if (!fs.existsSync(metadataPath)) {
  throw new Error('Build metadata was not found.');
}

const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const apkPath = path.join(path.dirname(metadataPath), metadata.assetName);

const now = new Date();
const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\\.\\d{3}Z$/, 'Z');
const tag = `android-v${metadata.version}-${timestamp}`;

const notes = [
  `Automated Codespace Android release.`,
  '',
  `Version: ${metadata.version}`,
  `Android versionCode: ${metadata.versionCode}`,
  `Commit: ${metadata.commit}`,
  `SHA-256: ${metadata.sha256}`,
  '',
  'Build environment: GitHub Codespaces',
  'Build system: Expo prebuild + Gradle',
  'Signing: Jeevya local release keystore stored as Codespaces secrets',
].join('\\n');

console.log(`\\nPublishing GitHub release: ${tag}`);

const ghEnv = {
  ...process.env,
  ...(process.env.GH_TOKEN
    ? {}
    : process.env.GITHUB_TOKEN
      ? { GH_TOKEN: process.env.GITHUB_TOKEN }
      : {}),
};

run(
  'gh',
  [
    'release',
    'create',
    tag,
    apkPath,
    '--repo',
    'Aaditya-kumar-singh/jeevya',
    '--title',
    `Jeevya ${metadata.version} Android ${metadata.commit}`,
    '--prerelease',
    '--latest=false',
    '--target',
    'master',
    '--notes',
    notes,
  ],
  { env: ghEnv },
);

console.log('\\nRelease published successfully.');
console.log(`https://github.com/Aaditya-kumar-singh/jeevya/releases/tag/${tag}`);

if (process.env.CODESPACE_NAME) {
  console.log('\\nScheduling this Codespace to stop in 5 seconds...');

  const stopper = spawn(
    'bash',
    [
      '-lc',
      'sleep 5; gh codespace stop -c "$CODESPACE_NAME" || true',
    ],
    {
      cwd: root,
      detached: true,
      stdio: 'ignore',
      env: ghEnv,
    },
  );

  stopper.unref();
}
