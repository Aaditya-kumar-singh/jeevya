import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
}
walk(root);

let any = 0, emptyCatch = 0, swallowedCatch = 0, effects = 0, directStorage = 0, casts = 0;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  any += (text.match(/\bany\b/g) ?? []).length;
  emptyCatch += (text.match(/catch\s*\{\s*\}/g) ?? []).length;
  swallowedCatch += (text.match(/catch\s*\{[^}]{0,180}(?:return\s+(?:null|\[\]|0|false)|\/\/)/gs) ?? []).length;
  effects += (text.match(/\buseEffect\s*\(/g) ?? []).length;
  directStorage += (text.match(/AsyncStorage\.(?:getItem|setItem|removeItem|getAllKeys)/g) ?? []).length;
  casts += (text.match(/as\s+(?:any|unknown\s+as)/g) ?? []).length;
}
console.log(JSON.stringify({
  files: files.length,
  anyOccurrences: any,
  emptyCatchBlocks: emptyCatch,
  likelySwallowedCatches: swallowedCatch,
  useEffectCount: effects,
  directAsyncStorageCalls: directStorage,
  unsafeCastPatterns: casts,
}, null, 2));
