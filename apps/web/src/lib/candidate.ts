import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {dashboardSchema} from '@atlas/contracts';
export async function loadCandidate(){
 const path=resolve(import.meta.dirname,'../../../../datasets/candidates/worldbank.json');
 let text:string;try{text=await readFile(path,'utf8');}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
 const candidate=dashboardSchema.parse(JSON.parse(text));if(candidate.mode!=='official-candidate')throw new Error('The review page only accepts an unapproved source candidate');return candidate;
}
