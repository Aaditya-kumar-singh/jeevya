import fs from 'node:fs';
import path from 'node:path';

const roots = ['dist-performance', 'dist', 'android/app/build/outputs/apk/release', 'android/app/build/outputs/apk/debug'];
function filesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(full);
    }
  };
  walk(dir);
  return out;
}
const rows = [];
for (const root of roots) {
  for (const file of filesUnder(root)) {
    const bytes = fs.statSync(file).size;
    if (/\.(js|map|bundle|apk|aab|hbc)$/i.test(file)) rows.push({ file: path.relative(process.cwd(), file), bytes });
  }
}
const total = (exts) => rows.filter((r) => exts.some((e) => r.file.toLowerCase().endsWith(e))).reduce((n, r) => n + r.bytes, 0);
const report = {
  generatedAt: new Date().toISOString(),
  javascriptBytes: total(['.js', '.bundle', '.hbc']),
  sourceMapBytes: total(['.map']),
  apkBytes: total(['.apk']),
  aabBytes: total(['.aab']),
  artifacts: rows.sort((a,b) => b.bytes-a.bytes).slice(0, 40),
  coldStart: 'requires instrumented Android/iOS runtime measurement',
  memory: 'requires Android Studio profiler or equivalent runtime measurement',
};
console.log(JSON.stringify(report, null, 2));
fs.writeFileSync('performance-audit.json', JSON.stringify(report, null, 2));
