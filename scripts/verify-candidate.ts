import {readFile} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {dashboardSchema} from '@atlas/contracts';
import {observationSchema} from './lib/worldbank.js';
const root=resolve(import.meta.dirname,'..');
export async function verifyCandidate(input='datasets/candidates/worldbank.json'){
const data=dashboardSchema.parse(JSON.parse(await readFile(resolve(root,input),'utf8')));
if(data.mode==='mock')throw new Error('A source candidate is required');
const files=new Map<string,unknown[]>();
for(const metric of data.indicators){const p=metric.provenance!;for(const f of [...p.files,...p.metadataFiles,...data.importManifest!.countryFiles]){
 if(files.has(f.path))continue;
 const path=resolve(root,f.path);if(!relative(root,path).startsWith(`datasets${sep}raw${sep}`))throw new Error('Invalid raw path');
 const bytes=await readFile(path);if(createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw new Error(`Checksum mismatch ${f.path}`);
 const body=JSON.parse(bytes.toString('utf8'));files.set(f.path,body[1]);
}}
let values=0,missing=0;
for(const metric of data.indicators){
 const expected=new Map<string,{file:string;index:number}>();for(const f of metric.provenance!.files)files.get(f.path)!.forEach((input,index)=>{const row=observationSchema.parse(input);expected.set(`${row.countryiso3code}/${row.date}`,{file:f.path,index});});
 for(const c of data.countries)for(let index=0;index<data.years.length;index++){
 const value=metric.values[c.id][index],original=metric.originalValues![c.id][index],ref=metric.provenance!.recordRefs[c.id][index];
 const expectedRef=expected.get(`${c.iso3}/${data.years[index]}`);if(expectedRef&&(ref?.file!==expectedRef.file||ref?.index!==expectedRef.index))throw new Error(`Dropped or incorrect raw record: ${metric.id}/${c.iso3}/${data.years[index]}`);
 if(ref){const row=observationSchema.parse(files.get(ref.file)![ref.index]);
 if(row.countryiso3code!==c.iso3||row.date!==String(data.years[index])||row.indicator.id!==metric.source.code||row.value!==original)throw new Error(`Wrong raw pointer: ${metric.id}/${c.iso3}/${data.years[index]}`);
 }else if(value!==null)throw new Error('Untraceable value');
 if(value===null)missing++;else values++;
}
}
console.log(`Verified ${values} official-source observations and ${missing} missing cells against ${files.size} SHA-256 checked raw files. Review remains pending.`);
return {values,missing,files:files.size};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/verify-candidate.ts'))await verifyCandidate(process.argv[2]);
