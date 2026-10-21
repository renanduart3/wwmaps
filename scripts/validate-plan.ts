import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { editorialPlanSchema, mapCapabilities } from '@atlas/contracts';
const file=process.argv[2];
if(!file)throw new Error('Usage: npm run plan:validate -- briefs/plans/<file>.json');
const plan=editorialPlanSchema.parse(JSON.parse(await readFile(resolve(file),'utf8')));
console.log(JSON.stringify({ valid:true,plan,capability:mapCapabilities.find(m=>m.id===plan.mapType),nextStep:'Research primary sources; inspect capabilities before producing an executable brief. No content generated or approved.' },null,2));
