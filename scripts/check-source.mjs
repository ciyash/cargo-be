import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ignored = new Set(['node_modules', '.git', '.agents', '.codex', '.aws', '.frontend-build-current', '.crm-implementation', '.frontend-build-check', '.browser-compact-header', '.browser-logistics', '.preview', '.preview-company-v2', '.preview-qa']);
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (ignored.has(entry.name) || entry.name === '.private-db-backups') return [];
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : /\.(js|mjs)$/.test(entry.name) ? [file] : [];
  });
}
const files = walk('.');
let failures = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) { console.error(result.stderr); failures++; }
  // Template strings in code generators contain imports for generated files.
  // Those paths are relative to the generated file, not this script.
  const source = fs.readFileSync(file, 'utf8').replace(/`(?:\\[\s\S]|[^`])*`/g, '');
  for (const match of source.matchAll(/^\s*(?:import|export)\s+[^\n]*?from\s+['"](\.[^'"]+)['"]/gm)) {
    if (!fs.existsSync(path.resolve(path.dirname(file), match[1]))) {
      console.error(`${file}: missing import ${match[1]}`);
      failures++;
    }
  }
}
console.log(`Checked syntax and relative imports in ${files.length} source files; ${failures} failures.`);
process.exitCode = failures ? 1 : 0;
