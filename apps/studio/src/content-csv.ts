/** Plain CSV for Git and Excel (UTF-8 BOM, semicolon separator, quoted cells). */
export function contentCsv(rows:unknown[][]){
  const cell=(value:unknown)=>{
    let text=String(value??'');
    // Keep source text from becoming an Excel/LibreOffice formula when opened.
    if(/^[\s\u0000-\u001f]*[=+@-]/.test(text))text="'"+text;
    return '"'+text.replaceAll('"','""')+'"';
  };
  return '\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n')+'\r\n';
}

export function parseContentCsv(text:string){
  text=text.replace(/^\uFEFF/,'');
  const first=text.split(/\r?\n/,1)[0];
  const delimiter=first.includes(';')?';':',';
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
    if(c==='"'){if(cell||closed)throw new Error('Invalid CSV quote');quoted=true;}
    else if(c===delimiter){row.push(cell);cell='';closed=false;}
    else if(c==='\r'||c==='\n'){
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';closed=false;
    }else{if(closed)throw new Error('Unexpected text after a quoted CSV cell');cell+=c;}
  }
  if(quoted)throw new Error('Unclosed CSV quote');
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  if(!rows.length)throw new Error('Empty CSV');
  const headers=rows.shift()!.map(h=>h.trim());
  if(new Set(headers).size!==headers.length)throw new Error('Duplicate CSV column');
  if(!headers.includes('topic'))throw new Error('Planning CSV needs a topic column (plus style, optional layout/kind/category)');
  return rows.map((values,i)=>{
    if(values.length!==headers.length)throw new Error(`CSV row ${i+2}: expected ${headers.length} cells`);
    return Object.fromEntries(headers.map((key,j)=>[key,values[j].trim()]));
  });
}
