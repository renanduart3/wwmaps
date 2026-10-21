import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { visualPostSchema, visualPostReady, type VisualPost } from '@atlas/contracts';
import { externalImagePrompt } from '@atlas/prompts';

export const imageFilename=(language:string,extension='png')=>`image.${language}.${extension}`;
export const visualPostUrl=(post:VisualPost,language:string)=>`${language==='en'?'/posts/':'/pt-br/posts/'}${post.id}/`;
export function visualPostVisible(post:VisualPost,now=new Date()){
  return post.status!=='draft'&&!!post.publishAt&&Date.parse(post.publishAt)<=now.getTime();
}
export async function visualImage(dir:string,language:string){
  const files=await readdir(dir);
  const images=['png','webp','jpg','jpeg'].map(ext=>imageFilename(language,ext)).filter(name=>files.includes(name));
  if(images.length>1)throw new Error(`Keep one image for ${language} in ${dir}: ${images.join(', ')}`);
  return images[0]??null;
}
export async function validateVisualPost(dir:string,post:VisualPost,options:{requireImage?:boolean}={}){
  const errors=visualPostReady(post);
  for(const language of post.languages){
    const expected=externalImagePromptSafe(post,language);
    if(expected){
      const saved=await readFile(join(dir,`prompt.${language}.txt`),'utf8').catch(()=>null);
      if(saved!==expected)errors.push(`${language}: prompt missing/outdated; run content:prompts`);
    }
    const image=await visualImage(dir,language);
    if(!image){if(options.requireImage)errors.push(`${language}: save image.${language}.png (or jpg/webp) in ${dir}`);continue;}
    const file=join(dir,image),bytes=await readFile(file);
    if((await stat(file)).size>25*1024*1024)errors.push(`${language}: image exceeds 25 MB`);
    const png=bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
    const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    const webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
    if(!(image.endsWith('.png')&&png||/\.jpe?g$/.test(image)&&jpeg||image.endsWith('.webp')&&webp))errors.push(`${language}: image extension/content mismatch`);
  }
  return errors;
}
function externalImagePromptSafe(post:VisualPost,language:'en'|'pt-BR'){
  return visualPostReady(post).length?null:externalImagePrompt(post,language);
}
export async function readVisualPosts(root:string,options:{drafts?:boolean;validate?:boolean;now?:Date}={}){
  const dirs=await readdir(root,{withFileTypes:true}).catch((error:NodeJS.ErrnoException)=>{if(error.code==='ENOENT')return [];throw error;});
  const posts:VisualPost[]=[];
  for(const item of dirs){
    if(!item.isDirectory()||item.name.startsWith('.'))continue;
    const dir=join(root,item.name),post=visualPostSchema.parse(JSON.parse(await readFile(join(dir,'post.json'),'utf8')));
    if(post.id!==item.name)throw new Error(`Visual ID differs from directory: ${item.name}`);
    // Validate future approved packages too: missing images must fail before their publication date.
    if(options.validate&&post.status!=='draft'){
      const errors=await validateVisualPost(dir,post,{requireImage:true});
      if(errors.length)throw new Error(`${post.id}:\n${errors.join('\n')}`);
    }
    if(options.drafts||visualPostVisible(post,options.now))posts.push(post);
  }
  return posts.sort((a,b)=>(b.publishAt??'').localeCompare(a.publishAt??'')||a.id.localeCompare(b.id));
}
export async function visualPublicationFingerprint(root:string,now=new Date()){
  const hash=createHash('sha256');
  for(const post of await readVisualPosts(root,{validate:true,now})){
    hash.update(JSON.stringify(post));
    for(const language of post.languages){const image=await visualImage(join(root,post.id),language);if(image)hash.update(await readFile(join(root,post.id,image)));}
  }
  return hash.digest('hex');
}
