import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile, appendFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { visualPublicationFingerprint, readPosts } from '@atlas/content-store';

const root=resolve(import.meta.dirname,'..');
const stateArg=process.argv.indexOf('--state');
const state=resolve(stateArg>=0?process.argv[stateArg+1]:join(root,'output/publication-state.txt'));
const hash=createHash('sha256');
hash.update(await visualPublicationFingerprint(join(root,'content/visuals')));
// Include existing approved legacy packages, including their future publication dates.
for(const post of await readPosts(join(root,'content/posts'),{validate:true})){
  const dir=join(root,'content/posts',post.id);
  for(const file of (await readdir(dir,{recursive:true,withFileTypes:true})).filter(f=>f.isFile()).sort((a,b)=>join(a.parentPath,a.name).localeCompare(join(b.parentPath,b.name)))){
    const path=join(file.parentPath,file.name);
    hash.update(path.slice(dir.length));hash.update(await readFile(path));
  }
}
const fingerprint=hash.digest('hex'),previous=await readFile(state,'utf8').catch(()=>null);
const changed=previous?.trim()!==fingerprint;
console.log(`Published content changed: ${changed}`);
if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`changed=${changed}\n`);
await mkdir(dirname(state),{recursive:true});await writeFile(state,fingerprint+'\n');
