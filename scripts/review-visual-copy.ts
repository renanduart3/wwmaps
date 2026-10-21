import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {visualText} from '../apps/web/src/lib/i18n.js';
const root=resolve(import.meta.dirname,'..');
const visuals=JSON.parse(await readFile(resolve(root,'datasets/visuals.json'),'utf8')) as {slug:string;title:string;subtitle:string;indicator:string}[];
const notes:Record<string,{reason:string;en:[string,string];pt:[string,string]}>= {
 'visual-2':{reason:'GDP per capita is not household income. Avoid labeling it simply income.',en:['GDP per person','Economic output per resident, not household income.'],pt:['PIB por habitante','Produção econômica por pessoa, não renda domiciliar.']},
 'visual-4':{reason:'Life expectancy does not itself establish quality of life or living better.',en:['Life expectancy around the world','A period mortality indicator, shown by country.'],pt:['Expectativa de vida pelo mundo','Um indicador de mortalidade de período, por país.']},
 'visual-5':{reason:'Specify the poverty threshold and PPP vintage.',en:['Extreme poverty in perspective','Below US$3.00/day at 2021 PPP; coverage varies by survey.'],pt:['Pobreza extrema em perspectiva','Abaixo de US$3/dia em PPC 2021; cobertura varia por pesquisa.']},
 'visual-6':{reason:'Intentional homicide rates do not measure all aspects of safety. No 2024 observations in this import.',en:['Intentional homicides by country','Rates per 100,000 people; compare the same available year.'],pt:['Homicídios intencionais por país','Taxas por 100 mil; compare o mesmo ano disponível.']},
 'visual-8':{reason:'GDP per person should not be described as average personal income.',en:['Beyond a country’s size','GDP per person, and what it cannot tell us.'],pt:['Além do tamanho do país','PIB por pessoa e os limites desse indicador.']}
};
const entries=visuals.map(v=>({slug:v.slug,indicator:v.indicator,status:'proposal-pending-human-approval',current:{en:visualText(v,'en'),'pt-BR':visualText(v,'pt-BR')},proposed:notes[v.slug]?{en:{title:notes[v.slug].en[0],subtitle:notes[v.slug].en[1]},'pt-BR':{title:notes[v.slug].pt[0],subtitle:notes[v.slug].pt[1]}}:null,reviewNote:notes[v.slug]?.reason??'Neutral framing. Before activation, verify the chosen year, source coverage, labels, numbers and source-specific limitations; do not reuse synthetic conclusions.'}));
await writeFile(resolve(root,'datasets/candidates/visual-review.json'),JSON.stringify({status:'pending-human-approval',activeCopyChanged:false,entries},null,2)+'\n');
console.log('Prepared 12 caption reviews; 5 proposed corrections. No public copy or publication state changed.');
