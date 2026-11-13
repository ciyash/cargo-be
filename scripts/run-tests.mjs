import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.name.startsWith('.')||entry.name==='node_modules'?[]:entry.isDirectory()?walk(join(dir,entry.name)):/\.test\.(js|mjs|cjs)$/.test(entry.name)?[join(dir,entry.name)]:[]);
const files=['test','prototypes'].flatMap(walk);
const result=spawnSync(process.execPath,['--test','--test-reporter=spec',...files],{stdio:'inherit'});
process.exitCode=result.status??1;
