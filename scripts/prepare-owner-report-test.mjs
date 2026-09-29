import {readFile,writeFile} from 'node:fs/promises';
const p='scripts/generate-owner-report.mjs';
const a=(await readFile(p,'utf8')).split('\n');
a.splice(31,3,' const unitId=TEST_ID;');
await writeFile(p,a.join('\n'));
