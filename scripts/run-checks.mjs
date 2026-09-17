import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../src/__tests__/', import.meta.url));
const names = (await readdir(root)).filter((name) => name.endsWith('.check.ts')).sort();
const setup = pathToFileURL(join(process.cwd(), 'scripts/check-setup.mjs')).href;
const legacySetup = pathToFileURL(join(process.cwd(), 'src/__tests__/mock-setup.ts')).href;
const timeoutMs = 30000;
const concurrency = 4;

if (names.length === 0) {
  console.log('No legacy checks found.');
  process.exit(0);
}

let failed = 0;
let cursor = 0;

async function runOne(name) {
  const filePath = join(root, name);
  const fileUrl = pathToFileURL(filePath).href;
  process.stdout.write(`\n▶ ${name}\n`);
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(filePath, 'utf8'));
  const needsLegacySetup = source.includes("require('./mock-setup')") || source.includes("from './mock-setup'");
  const args = ['--import', 'tsx', '--import', setup];
  if (needsLegacySetup) args.push('--import', legacySetup);
  args.push('--eval', `await import(${JSON.stringify(fileUrl)})`);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'test' }, windowsHide: true });
    let output = '';
    let settled = false;
    let summaryTimer;
    const finish = (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(summaryTimer);
      if (output) process.stdout.write(output);
      resolve(code);
    };
    const inspect = (chunk) => {
      output += chunk.toString();
      const recent = output.slice(-1200);
      const summary = recent.match(/\b\d+ passed,\s*(\d+) failed\b/i) || recent.match(/\b\d+ passed and\s*(\d+) failed\b/i);
      if (summary) {
        const summaryCode = Number(summary[1]) > 0 ? 1 : 0;
        clearTimeout(summaryTimer);
        summaryTimer = setTimeout(() => { child.kill(); finish(summaryCode); }, 100);
      }
    };
    child.stdout.on('data', inspect);
    child.stderr.on('data', inspect);
    const timer = setTimeout(() => { child.kill(); finish(124); }, timeoutMs);
    child.on('close', (exitCode) => finish(exitCode ?? 1));
    child.on('error', () => finish(1));
  });
}

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= names.length) return;
    const name = names[index];
    const code = await runOne(name);
    if (code !== 0) {
      failed += 1;
      console.error(`FAIL ${name} (exit ${code})`);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, names.length) }, () => worker()));
console.log(`\nLegacy checks: ${names.length - failed} passed, ${failed} failed.`);
process.exitCode = failed === 0 ? 0 : 1;
