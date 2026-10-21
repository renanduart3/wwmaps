/** Run inside the Codex CUA REPL with an owned comparison tab, not a shell browser driver.
 * const checks = await import('file:///C:/.../tests/browser/comparison.cua.mjs');
 * await checks.selectionChecks(tab); await checks.downloadChecks(tab, outputDirectory);
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, copyFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const snapshot = tab => tab.getAXState({emit:false});
export async function selectionChecks(tab){
  const p=tab.playwright;
  await p.getByRole('button',{name:'Original BRICS (5)',exact:true}).click();await snapshot(tab);
  assert.equal(await p.getByRole('checkbox',{name:'Germany',exact:true}).isEnabled(),false);
  assert.equal(await p.getByRole('checkbox',{name:'Brazil',exact:true}).evaluate(e=>e.checked),true);
  await p.getByRole('searchbox',{name:'Search countries',exact:true}).fill('turkiye');await snapshot(tab);
  assert.equal(await p.getByRole('checkbox',{name:'Türkiye',exact:true}).isVisible(),true);
  assert.equal(await p.getByRole('checkbox',{name:'Brazil',exact:true}).isVisible(),false);
  await p.getByRole('button',{name:'Remove Brazil',exact:true}).click();await snapshot(tab);
  assert.equal(await p.getByRole('checkbox',{name:'Türkiye',exact:true}).isEnabled(),true);
  await p.getByRole('checkbox',{name:'Türkiye',exact:true}).check();await snapshot(tab);
  for(const name of ['Russia','India','China','South Africa']){await p.getByRole('button',{name:'Remove '+name,exact:true}).click();await snapshot(tab);}
  assert.equal(await p.getByRole('button',{name:'Remove Türkiye',exact:true}).isEnabled(),false);
  assert.equal(await p.getByRole('checkbox',{name:'Türkiye',exact:true}).isEnabled(),false);
  await p.getByRole('button',{name:'G7 sample (5)',exact:true}).click();await snapshot(tab);
  await p.getByRole('combobox',{name:'Year',exact:true}).selectOption('2015');await snapshot(tab);
  await p.getByRole('combobox',{name:'Historical indicator',exact:true}).selectOption('income');await snapshot(tab);
  await p.getByRole('checkbox',{name:'Include all years in the table and CSV, JSON and PDF exports',exact:true}).check();await snapshot(tab);
  assert.equal(await p.getByRole('table').getByRole('row').count(),451);
  const portuguese=p.getByRole('link',{name:'Português brasileiro',exact:true});
  const href=await portuguese.getAttribute('href');assert.match(href,/year=2015/);assert.match(href,/metric=income/);assert.match(href,/allYears=1/);
  await portuguese.click();await snapshot(tab);
  assert.equal(await p.getByRole('combobox',{name:'Ano',exact:true}).evaluate(e=>e.value),'2015');
  assert.equal(await p.getByRole('combobox',{name:'Indicador do histórico',exact:true}).evaluate(e=>e.value),'income');
  assert.equal(await p.getByRole('table').getByRole('row').count(),451);
  assert.match(await p.getByRole('table').innerText(),/PIB per capita/);
  return {status:'passed',checks:['search-localized-and-ISO','five-country-limit','one-country-minimum','presets','year','history-indicator','all-years-table','language-preserves-selection']};
}

export async function downloadChecks(tab,directory){
  await mkdir(directory,{recursive:true});
  const files={};
  for(const [format,name] of [['json','↓ JSON'],['csv','↓ CSV'],['svg','↓ SVG'],['png','↓ PNG'],['pdf','↓ Baixar PDF']]){
    const pending=tab.playwright.waitForEvent('download');
    await tab.playwright.getByRole('button',{name,exact:true}).click();
    const download=await pending;await snapshot(tab);
    const path=await download.path();assert.ok(path,format+' download missing');
    const target=join(directory,`comparison-pt-BR.${format}`);await copyFile(path,target);files[format]=target;
    const bytes=await readFile(target);assert.ok(bytes.length>100);
    if(format==='json'){
      const payload=JSON.parse(bytes.toString('utf8'));
      assert.equal(payload.locale,'pt-BR');assert.equal(payload.year,2015);assert.equal(payload.scope,'all-years');assert.equal(payload.historyIndicator,'income');
      assert.equal(payload.rows.length,450);assert.equal(payload.mode,'mock');
      assert.deepEqual([...new Set(payload.rows.map(r=>r.country))],['USA','CAN','DEU','FRA','JPN']);
      assert.ok(payload.rows.every(r=>r.source_role==='planned-reference'));
    }
    if(format==='csv'){assert.match(bytes.toString('utf8'),/raw_record_index/);assert.equal(bytes.toString('utf8').split('\r\n').length,451);}
    if(format==='svg'){assert.match(bytes.toString('utf8'),/PIB per capita/);assert.match(bytes.toString('utf8'),/2015/);assert.match(bytes.toString('utf8'),/wwmaps.com/);}
    if(format==='png')assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    if(format==='pdf')assert.equal(bytes.subarray(0,4).toString(),'%PDF');
  }
  await writeFile(join(directory,'browser-results.json'),JSON.stringify({status:'passed',files,checkedAt:new Date().toISOString()},null,2));
  return {status:'passed',files};
}

export async function printChecks(tab){
  const workspace=tab.playwright.getByRole('main');
  assert.equal(await tab.playwright.getByRole('button',{name:'Imprimir',exact:true}).isEnabled(),true);
  const result=await workspace.evaluate(e=>({
    rules:[...e.ownerDocument.styleSheets].flatMap(sheet=>[...sheet.cssRules]).filter(rule=>rule.conditionText==='print').map(rule=>rule.cssText).join('\n'),
  }));
  assert.match(result.rules,/table-header-group/);assert.match(result.rules,/max-height:\s*none/);
  assert.match(result.rules,/\.compare-exports[^}]*display:\s*none/);
  return {status:'passed',checks:['print-button-enabled','print-controls-hidden','full-table-overflow-restored','table-headers-repeat'],limitation:'Native print dialog blocks the browser automation channel. Native preview and physical printer output require OS-level review.'};
}
