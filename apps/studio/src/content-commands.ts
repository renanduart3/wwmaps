import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { imageStyleSchema, visualPostSchema, editorialDataLayoutSchema } from '@atlas/contracts';
import { externalImagePrompt } from '@atlas/prompts';
import { readVisualPosts, validateVisualPost } from '@atlas/content-store';
import { slugify } from '@atlas/content-engine';
import {parseContentCsv} from './content-csv.js';
import {writeContentCatalog} from './content-catalog.js';

export function parseTopics(text:string,defaultStyle?:string,format?:'csv'){
  const raw=format==='csv'?parseContentCsv(text):text.trim().startsWith('[')||text.trim().startsWith('{')?JSON.parse(text):text.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith('#')).map(line=>{
    const [topic,style,layout]=line.replace(/^(?:[-*]|\d+[.)])\s+/,'').split('|').map(s=>s.trim());return {topic,style:style||undefined,layout:layout||undefined};
  });
  const items=Array.isArray(raw)?raw:raw.topics;
  if(!Array.isArray(items)||!items.length||items.length>100)throw new Error('Use a list of 1–100 topics');
  const topics=items.map(item=>{
    const value=typeof item==='string'?{topic:item}:item;
    if(typeof value.topic!=='string'||!value.topic.trim()||!slugify(value.topic))throw new Error('Each topic needs a title');
    if(value.style==='editorial-detailed')throw new Error('editorial-detailed was replaced by editorial-data. Review the data-card composition and update the declared style.');
    const style=imageStyleSchema.parse(value.style||defaultStyle);
    const layout=value.layout?editorialDataLayoutSchema.parse(value.layout):undefined;
    if(layout&&style!=='editorial-data')throw new Error('Editorial data layouts require style editorial-data');
    return {topic:value.topic.trim(),id:slugify(value.topic),style,layout,kind:value.kind||undefined,category:value.category||undefined};
  });
  if(new Set(topics.map(t=>t.id)).size!==topics.length)throw new Error('Duplicate topic IDs; use distinct titles');
  return topics;
}
export async function analyzeTopics(root:string,input:string,style?:string,languages:string[]=['en']){
  const topics=parseTopics(await readFile(input,'utf8'),style,input.toLowerCase().endsWith('.csv')?'csv':undefined);
  const posts=topics.map(item=>visualPostSchema.parse({id:item.id,style:item.style,languages,
    category:item.category,visual:{kind:item.kind,layout:item.layout,instructions:''},
    translations:Object.fromEntries(languages.map(language=>[language,{title:item.topic}]))}));
  const output=[];
  for(const post of posts){
    const dir=join(root,post.id);
    if(await access(join(dir,'post.json')).then(()=>true,()=>false)){output.push({id:post.id,status:'kept-existing'});continue;}
    await mkdir(dir,{recursive:true});
    await writeFile(join(dir,'post.json'),JSON.stringify(post,null,2)+'\n',{flag:'wx'});
    output.push({id:post.id,status:'draft-created; research and final prompts pending'});
  }
  return output;
}
export async function writeVisualPrompts(dir:string){
  const post=visualPostSchema.parse(JSON.parse(await readFile(join(dir,'post.json'),'utf8')));
  // Compute all languages before writing: incomplete research never becomes a usable image prompt.
  const prompts=post.languages.map(language=>({language,prompt:externalImagePrompt(post,language)}));
  for(const {language,prompt} of prompts)await writeFile(join(dir,`prompt.${language}.txt`),prompt,'utf8');
  return prompts.map(p=>join(dir,`prompt.${p.language}.txt`));
}
export async function contentCommand(root:string,args:string[]){
  const [command]=args,visualRoot=join(root,'content/visuals');
  const flag=(name:string)=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
  if(command==='catalog'){console.log(await writeContentCatalog(root));return;}
  try{
  if(command==='analyze'){
    const input=flag('--input');if(!input)throw new Error('Use --input content/inbox/topics.md and an explicit --style, or styles on each list item');
    console.log(JSON.stringify(await analyzeTopics(visualRoot,resolve(input),flag('--style'),(flag('--languages')??'en').split(',')),null,2));
    console.log('Next: Codex researches each topic, completes post.json, then runs content:prompts. No image was generated.');
  }else if(command==='prompts'){
    const value=flag('--post');
    const dirs=value?[resolve(value.includes('/')||value.includes('\\')?value:join(visualRoot,value))]:(await readVisualPosts(visualRoot,{drafts:true})).map(p=>join(visualRoot,p.id));
    if(!value&&!args.includes('--all'))throw new Error('Use --post <folder or id> or --all');
    let blocked=0;
    for(const dir of dirs){
      const rel=relative(visualRoot,dir);
      if(!rel||rel.startsWith('..')||rel.includes('/')||rel.includes('\\'))throw new Error('Select one post directory inside content/visuals');
      try{console.log((await writeVisualPrompts(dir)).join('\n'));}catch(error){blocked++;console.error(`${dir}: ${String(error)}`);}
    }
    if(blocked)throw new Error(`${blocked} post(s) still need research/metadata. No final prompts written for them.`);
  }else if(command==='check'){
    const posts=await readVisualPosts(visualRoot,{drafts:true,validate:true});
    for(const post of posts){
      const errors=await validateVisualPost(join(visualRoot,post.id),post,{requireImage:post.status!=='draft'});
      console.log(`${post.id} [${post.status}]: ${errors.length?errors.join('; '):'ready'}`);
    }
    console.log(`${posts.length} visual posts checked. Drafts may be incomplete; scheduled/published posts may not.`);
  }else throw new Error('Content commands: analyze --input <file> --style <style>, prompts --post <id> | --all, check, catalog');
  }finally{
    if(['analyze','prompts','check'].includes(command)){const catalog=await writeContentCatalog(root);console.log(`Catalog: ${catalog.file} (${catalog.count} posts)`);}
  }
}
