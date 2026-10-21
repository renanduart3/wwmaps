import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve,join,relative,sep} from 'node:path';
import iso from 'i18n-iso-countries';
import {dashboardSchema, type DashboardData} from '@atlas/contracts';
import {apiPageSchema,wbCountrySchema,importSeries} from './lib/worldbank.js';
const root=resolve(import.meta.dirname,'..'),require=createRequire(import.meta.url);
const hash=(body:Buffer|string)=>createHash('sha256').update(body).digest('hex');
const reuseIndex=process.argv.indexOf('--from-raw');
const folder=reuseIndex>=0?resolve(process.argv[reuseIndex+1]):join(root,'datasets/raw/worldbank',new Date().toISOString().replaceAll(':','-'));
if(!relative(root,folder).startsWith(`datasets${sep}raw${sep}`))throw new Error('Raw directory must be inside datasets/raw');
await mkdir(folder,{recursive:true});
const specText=await readFile(join(root,'datasets/sources/worldbank.json'),'utf8');
const spec=JSON.parse(specText) as {sourceId:number;startYear:number;endYear:number;license:{id:'CC-BY-4.0';url:string};indicators:{id:string;code:string;category:DashboardData['indicators'][number]['category'];originalUnit:string;divisor:number;definition:{en:string;'pt-BR':string};limitations:{en:string;'pt-BR':string}}[]};
const previous=reuseIndex>=0?JSON.parse(await readFile(join(folder,'manifest.json'),'utf8')):null;
if(previous&&previous.specSha256!==hash(specText))throw new Error('Source specification changed since this raw snapshot');
const downloads:NonNullable<DashboardData['importManifest']>['countryFiles']=[];
async function request(url:string,file:string){
 const path=join(folder,file),local=relative(root,path).split(sep).join('/');
 let bytes:Buffer,retrievedAt:string;
 if(previous){const stored=previous.downloads.find((d:{path:string})=>d.path===local);if(!stored||stored.url!==url)throw new Error(`Missing archived request ${file}`);bytes=await readFile(path);if(hash(bytes)!==stored.sha256)throw new Error(`Checksum mismatch: ${file}`);retrievedAt=stored.retrievedAt;}
 else{let response:Response|undefined;for(let retry=0;retry<3;retry++){try{response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);break;}catch(error){if(retry===2)throw error;console.log(`Retry ${retry+1}: ${file}`);}}
  bytes=Buffer.from(await response!.arrayBuffer());retrievedAt=new Date().toISOString();await writeFile(path,bytes,{flag:'wx'});}
 const parsed=apiPageSchema.parse(JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,'')));
 const record={path:local,sha256:hash(bytes),url,retrievedAt,lastUpdated:parsed[0].lastupdated??null};downloads.push(record);
 console.log(`${previous?'Read':'Saved'} ${file}: ${parsed[1].length} records`);return {parsed,record};
}
async function pages(base:string,key:string){
 const url=new URL(base);url.searchParams.set('format','json');url.searchParams.set('per_page','1000');url.searchParams.set('page','1');
 const first=await request(url.href,`${key}-page-1.json`);const result=[first];
 for(let page=2;page<=first.parsed[0].pages;page++){url.searchParams.set('page',String(page));result.push(await request(url.href,`${key}-page-${page}.json`));}
 if(result.some(p=>p.parsed[0].total!==first.parsed[0].total||p.parsed[0].lastupdated!==first.parsed[0].lastupdated))throw new Error(`Source changed during pagination: ${key}`);
 const count=result.reduce((sum,p)=>sum+p.parsed[1].length,0);if(count!==first.parsed[0].total)throw new Error(`Incomplete pagination for ${key}: ${count}/${first.parsed[0].total}`);return result;
}
const countryPages=await pages('https://api.worldbank.org/v2/country','countries');
const countryRecords=countryPages.flatMap(p=>p.parsed[1].map(r=>wbCountrySchema.parse(r)));
const topology=JSON.parse(await readFile(require.resolve('world-atlas/countries-110m.json'),'utf8'));
const geometryIds=new Set(topology.objects.countries.geometries.map((g:{id:string})=>String(g.id).padStart(3,'0')));
const excluded:{iso3:string;name:string;reason:string}[]=[];
const countries:DashboardData['countries']=[];
for(const c of countryRecords){
 if(c.region.id==='NA'||c.region.value==='Aggregates'){excluded.push({iso3:c.id,name:c.name,reason:'Regional/income aggregate'});continue;}
 const numeric=iso.alpha3ToNumeric(c.id),alpha2=iso.alpha3ToAlpha2(c.id);
 if(!numeric||!alpha2||alpha2!==c.iso2Code){excluded.push({iso3:c.id,name:c.name,reason:'ISO mapping unavailable or mismatched; no invented numeric code'});continue;}
 countries.push({id:numeric.padStart(3,'0'),iso3:c.id,iso2:alpha2,name:c.name,mapAvailable:geometryIds.has(numeric.padStart(3,'0'))});
}
countries.sort((a,b)=>a.iso3.localeCompare(b.iso3));
const years=Array.from({length:spec.endYear-spec.startYear+1},(_,i)=>spec.startYear+i);
const mock=JSON.parse(await readFile(join(root,'datasets/indicators.json'),'utf8')) as DashboardData;
const indicators:DashboardData['indicators']=[];
for(const definition of spec.indicators){
 const meta=await pages(`https://api.worldbank.org/v2/indicator/${definition.code}?source=${spec.sourceId}`,`${definition.id}-metadata`);
 const metadata=meta[0].parsed[1][0] as {id:string;name:string;source:{id:string};sourceNote:string;sourceOrganization:string};
 if(metadata.id!==definition.code||metadata.source.id!==String(spec.sourceId))throw new Error('Wrong metadata source');
 if(definition.id==='poverty'&&(!metadata.name.includes('3.00')||!metadata.name.includes('2021')))throw new Error('Poverty definition changed. Review source specification.');
 const data=await pages(`https://api.worldbank.org/v2/country/all/indicator/${definition.code}?source=${spec.sourceId}&date=${spec.startYear}:${spec.endYear}`,`${definition.id}-data`);
 const imported=importSeries(data.map(p=>({path:p.record.path,rows:p.parsed[1]})),countries,years,definition.code,definition.divisor);
 const old=mock.indicators.find(i=>i.id===definition.id)!;
 indicators.push({id:definition.id,label:old.label,unit:old.unit,category:definition.category,source:{name:'World Bank · World Development Indicators',url:`https://data.worldbank.org/indicator/${definition.code}`,code:definition.code,api:data[0].record.url},values:imported.values,originalValues:imported.originals,provenance:{provider:'World Bank',sourceId:'2',indicatorCode:definition.code,originalUnit:definition.originalUnit,divisor:definition.divisor,attribution:`World Bank WDI (${definition.code}); original providers: ${metadata.sourceOrganization}. WWMaps conversion: divide by ${definition.divisor}; no imputation.`,license:{...spec.license,evidenceUrl:`https://data.worldbank.org/indicator/${definition.code}`},definition:definition.definition,limitations:definition.limitations,sourceNote:metadata.sourceNote,sourceOrganization:metadata.sourceOrganization,metadataFiles:meta.map(p=>p.record),files:data.map(p=>p.record),recordRefs:imported.refs,seriesReview:Object.fromEntries(countries.map(c=>[c.id,{status:'pending' as const}]))}});
}
const retrievedAt=previous?.retrievedAt??new Date().toISOString();
const mapping=Object.fromEntries(countries.map(c=>[c.id,{iso3:c.iso3,iso2:c.iso2!}]));
const mappingPackage=`i18n-iso-countries@${JSON.parse(await readFile(require.resolve('i18n-iso-countries/package.json'),'utf8')).version}`;
const dataset=dashboardSchema.parse({mode:'official-candidate',notice:'Official-source data candidate. Pending editorial review. Not approved for replacing the mock or publication.',years,countries,indicators,importManifest:{id:folder.split(sep).at(-1),retrievedAt,countryFiles:countryPages.map(p=>p.record),mappingPackage,countryMapping:mapping}});
const audit={mode:dataset.mode,review:'pending',retrievedAt,rawFolder:relative(root,folder).split(sep).join('/'),countryCount:countries.length,mapCountryCount:countries.filter(c=>c.mapAvailable).length,countriesWithoutGeometry:countries.filter(c=>!c.mapAvailable).map(c=>c.iso3),excluded,coverage:indicators.map(i=>({id:i.id,code:i.source.code,totalCells:countries.length*years.length,present:Object.values(i.values).flat().filter(v=>v!==null).length,missing:Object.values(i.values).flat().filter(v=>v===null).length,byYear:years.map((year,index)=>({year,available:countries.filter(c=>i.values[c.id][index]!==null).length,total:countries.length})),byCountry:countries.map(c=>({iso3:c.iso3,available:i.values[c.id].filter(v=>v!==null).length,latestYear:years.filter((_,index)=>i.values[c.id][index]!==null).at(-1)??null,review:'pending'})),sourceLastUpdated:i.provenance!.files[0].lastUpdated})),sample:indicators.flatMap(i=>['BRA','USA','CHN'].map(iso3=>{const c=countries.find(c=>c.iso3===iso3)!;const index=years.length-1;return {country:iso3,indicator:i.id,year:years[index],original:i.originalValues![c.id][index],value:i.values[c.id][index],divisor:i.provenance!.divisor,ref:i.provenance!.recordRefs[c.id][index]};})),checks:{pagination:'complete',duplicates:'rejected',aggregates:'excluded',unknownIso:'excluded',conversion:'raw/divisor, no rounding',missing:'null, no imputation',editorialApproval:'not performed'}};
const candidateDir=join(root,'datasets/candidates');await mkdir(candidateDir,{recursive:true});
const write=async(file:string,value:unknown)=>writeFile(file,JSON.stringify(value,null,2)+'\n');
await write(join(candidateDir,'worldbank.json'),dataset);await write(join(candidateDir,'worldbank.audit.json'),audit);
if(!previous)await write(join(folder,'manifest.json'),{retrievedAt,specSha256:hash(specText),downloads,mappingPackage,mapping});
await write(join(folder,'candidate.json'),dataset);await write(join(folder,'audit.json'),audit);
console.log(`Candidate ready: ${countries.length} countries, ${indicators.length} indicators, ${years.length} years. Pending editorial review. Active mock untouched.`);
