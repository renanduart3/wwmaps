import type { DashboardData } from '@atlas/contracts';
import { comparisonRows, comparisonCsv } from './comparison.js';
import { comparisonDataRows, countryColors } from './comparison-model.js';
import { comparisonSvg, historyChart, numberLabel } from './comparison-visual.js';
import { countryName, metricText, tr, type Locale } from './i18n.js';
import { compareText } from './compare-i18n.js';

export interface ComparisonExport {
  data:DashboardData; ids:string[]; year:number; metric:string; lang:Locale; allYears:boolean; generatedAt:string;
}
export function comparisonFilename(options:ComparisonExport,format:string){
  return `wwmaps-comparison-${options.data.mode.toUpperCase()}-${options.ids.map(id=>options.data.countries.find(c=>c.id===id)!.iso3).join('-')}-${options.year}-${options.lang}${options.allYears&&['csv','json','pdf'].includes(format)?'-all-years':''}.${format}`;
}
export function comparisonJson(o:ComparisonExport){
  return JSON.stringify({site:'wwmaps.com',mode:o.data.mode,notice:o.data.mode==='mock'?tr(o.lang,'demoWarning'):o.data.mode,
    locale:o.lang,generatedAt:o.generatedAt,year:o.year,countries:o.ids,historyIndicator:o.metric,scope:o.allYears?'all-years':'selected-year',
    rows:comparisonDataRows(o.data,o.ids,o.year,o.lang,o.allYears)},null,2);
}
export function saveBlob(blob:Blob,name:string){
  const url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export async function svgPng(svg:string):Promise<Blob>{
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  try{
    const image=new Image();
    await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('SVG image failed'));image.src=url;});
    const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const context=canvas.getContext('2d');if(!context)throw new Error('Canvas unavailable');
    context.fillStyle='#FAF5E9';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0);
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG encoding failed')),'image/png'));
  }finally{URL.revokeObjectURL(url);}
}

export async function comparisonPdf(o:ComparisonExport):Promise<Blob>{
  const { jsPDF }=await import('jspdf');
  const pdf=new jsPDF({orientation:'landscape',unit:'pt',format:'a4',compress:true});
  const {data,ids,lang,year}=o,t=compareText(lang), years=o.allYears?data.years:[year];
  const chunks=Array.from({length:Math.ceil(years.length/15)},(_,i)=>years.slice(i*15,i*15+15));
  let page=0;
  for(const metric of data.indicators){
    const rows=comparisonRows(data,ids,year,lang).filter(row=>row.indicator===metric.id);
    const max=Math.max(1,...rows.map(r=>r.value??0));
    const chart=new Uint8Array(await (await svgPng(historyChart(data,ids,metric.id,lang,year))).arrayBuffer());
    for(const chunk of chunks){
      if(page++)pdf.addPage();
      const w=pdf.internal.pageSize.getWidth();
      pdf.setFillColor('#FAF5E9');pdf.rect(0,0,w,pdf.internal.pageSize.getHeight(),'F');
      pdf.setFont('helvetica','bold');pdf.setTextColor('#7132DF');pdf.setFontSize(14);pdf.text('WWMAPS.COM',30,32);
      pdf.setTextColor('#281A3B');pdf.setFontSize(23);pdf.text(metricText(metric.id,lang).label,30,63);
      pdf.setFont('helvetica','normal');pdf.setFontSize(10);
      pdf.text(`${metricText(metric.id,lang).unit} | ${t.snapshot}: ${year} | ${t.period}: ${data.years[0]}-${data.years.at(-1)}`,30,83);
      pdf.setTextColor('#92213E');pdf.setFontSize(9);
      pdf.text(pdf.splitTextToSize(data.mode==='mock'?tr(lang,'mockNotice'):t.mode+': '+data.mode,w-60),30,101);
      rows.forEach((row,i)=>{
        const y=137+i*36;
        pdf.setFontSize(10);pdf.setTextColor('#281A3B');
        pdf.text(countryName(row.country,lang),30,y);pdf.text(numberLabel(row.value,lang),400,y,{align:'right'});
        pdf.setFillColor(countryColors[i]);if(row.value!=null&&row.value>0)pdf.roundedRect(30,y+8,row.value/max*370,8,2,2,'F');
      });
      pdf.setFontSize(12);pdf.setTextColor('#281A3B');pdf.text(t.history,30,340);
      pdf.addImage(chart,'PNG',15,350,395,116,`history-${metric.id}`,'FAST');
      pdf.setFontSize(8);pdf.text(pdf.splitTextToSize(t.noDataNote,375),30,485);
      pdf.setFontSize(12);pdf.text(`${t.tableCaption} (${o.allYears?t.full:t.snapshot})`,436,132);
      pdf.setFontSize(9);pdf.text(t.year,436,160);
      const colWidth=310/ids.length;
      ids.forEach((id,i)=>{
        pdf.setTextColor(countryColors[i]);pdf.text(data.countries.find(c=>c.id===id)!.iso3,500+i*colWidth,160);
      });
      chunk.forEach((y,index)=>{
        const yy=185+index*19;
        pdf.setDrawColor('#D7C8DB');pdf.line(436,yy+6,w-30,yy+6);
        pdf.setTextColor('#281A3B');pdf.setFontSize(9);pdf.text(String(y),436,yy);
        ids.forEach((id,i)=>pdf.text(numberLabel(metric.values[id]?.[data.years.indexOf(y)]??null,lang),500+i*colWidth,yy));
      });
      pdf.setDrawColor('#7132DF');pdf.line(30,515,w-30,515);
      pdf.setTextColor('#281A3B');pdf.setFontSize(8);
      pdf.text(`${t.source} [${metric.source.code}]: ${metric.source.url}`,30,532,{maxWidth:w-60});
      pdf.text(pdf.splitTextToSize(t.scopeNote,w-60),30,550);
      pdf.text(`${t.generated}: ${o.generatedAt} | ${t.mode}: ${data.mode} | ${t.page} ${page} / ${data.indicators.length*chunks.length}`,30,580);
    }
  }
  pdf.setProperties({title:tr(lang,'compareTitle'),author:'WWMaps',subject:`${data.mode} | ${ids.join(',')} | ${year}`,creator:'wwmaps.com local comparison'});
  return pdf.output('blob');
}
export async function exportComparison(format:'csv'|'json'|'svg'|'png'|'pdf',o:ComparisonExport){
  let blob:Blob;
  if(format==='csv')blob=new Blob([comparisonCsv(comparisonDataRows(o.data,o.ids,o.year,o.lang,o.allYears))],{type:'text/csv;charset=utf-8'});
  else if(format==='json')blob=new Blob([comparisonJson(o)],{type:'application/json'});
  else if(format==='pdf')blob=await comparisonPdf(o);
  else {
    const svg=comparisonSvg(o.data,o.ids,o.year,o.metric,o.lang,o.generatedAt);
    blob=format==='png'?await svgPng(svg):new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
  }
  saveBlob(blob,comparisonFilename(o,format));
}
