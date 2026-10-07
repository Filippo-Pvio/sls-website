import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';

test('all shipped browser scripts parse before a page can load them',async()=>{
  const assets=new URL('../assets/',import.meta.url);
  const scripts=(await readdir(assets,{recursive:true})).filter(file=>/\.(?:js|mjs)$/.test(file));
  assert.ok(scripts.includes('propstack-preview.js'));
  const failures=[];
  for(const file of scripts){
    const result=spawnSync(process.execPath,['--check',new URL(file,assets).pathname],{encoding:'utf8'});
    if(result.status!==0)failures.push(`${file}: ${result.stderr||result.error?.message||'syntax check failed'}`);
  }
  assert.deepEqual(failures,[]);
});
