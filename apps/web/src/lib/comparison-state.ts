export function comparisonSelection(query:string,ids:readonly string[],years:readonly number[]){
 const params=new URLSearchParams(query),raw=(params.get('countries')??'').split(',');
 const countries=[...new Set(raw.filter(id=>ids.includes(id)))].slice(0,5);
 const requested=Number(params.get('year'));
 return {countries:countries.length?countries:ids.slice(0,3),year:years.includes(requested)?requested:years.at(-1)!};
}
export function comparisonQuery(countries:readonly string[],year:number){return new URLSearchParams({countries:countries.join(','),year:String(year)}).toString();}
