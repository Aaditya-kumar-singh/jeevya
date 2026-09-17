import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const integration = fs.readFileSync(path.join(root,'src/services/lifeosIntegration.ts'),'utf8');
if (/from ['\"]@\/services\/lifeosIntegration['\"]/.test(integration)) throw new Error('integration service imports itself');
const services = ['tasks','habits','workouts','workoutHistory','sleep','recovery','nutrition','finance','books','journal','book-goals'];
for (const name of services) {
  const source = fs.readFileSync(path.join(root,`src/services/${name}.ts`),'utf8');
  if (source.includes("@/services/lifeosIntegration")) throw new Error(`${name} imports lifeosIntegration`);
}
console.log(`3A CIRCULAR DEPENDENCY AUDIT: ${services.length + 1} checks passed, 0 failed`);
