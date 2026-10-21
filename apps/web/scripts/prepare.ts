import { mkdir, rm, cp } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { readPosts, readVisualPosts, visualImage } from '@atlas/content-store';
import '../../../scripts/validate-dashboard';
import '../../../scripts/prepare-brand';
import {loadCandidate} from '../src/lib/candidate';
import {verifyCandidate} from '../../../scripts/verify-candidate';
import {writeContentCatalog} from '../../studio/src/content-catalog';
const webRoot = resolve(import.meta.dirname, '..');
const source = resolve(webRoot, '../../content/posts');
const target = join(webRoot, 'public/content');
const posts = await readPosts(source, { drafts: process.argv.includes('--drafts'), validate: true });
if (relative(webRoot, target) !== join('public', 'content')) throw new Error('Unexpected generated asset directory');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const post of posts) await cp(join(source, post.id, 'assets'), join(target, post.id, 'assets'), { recursive: true });
const visualRoot=resolve(webRoot,'../../content/visuals');
const visualTarget=join(webRoot,'public/visual-images');
if(relative(webRoot,visualTarget)!==join('public','visual-images'))throw new Error('Unexpected visual asset directory');
await rm(visualTarget,{recursive:true,force:true});
for(const post of await readVisualPosts(visualRoot,{drafts:process.argv.includes('--drafts'),validate:true})){
  for(const language of post.languages){
    const image=await visualImage(join(visualRoot,post.id),language);
    if(image){await mkdir(join(visualTarget,post.id),{recursive:true});await cp(join(visualRoot,post.id,image),join(visualTarget,post.id,image));}
  }
}
await mkdir(join(webRoot, 'public/data'), { recursive: true });
for (const file of ['indicators.json', 'visuals.json', 'products.json']) {
  await cp(resolve(webRoot, '../../datasets', file), join(webRoot, 'public/data', file));
}
await cp(resolve(webRoot,'../../docs/BARLOW-OFL.txt'),join(webRoot,'public/brand/BARLOW-OFL.txt'));
const candidate=await loadCandidate();
const reviewDir=join(webRoot,'public/data-review');
if(relative(webRoot,reviewDir)!==join('public','data-review'))throw new Error('Unexpected generated review directory');
await rm(reviewDir,{recursive:true,force:true});
if(candidate){
  await verifyCandidate();
  await mkdir(join(reviewDir,'raw'),{recursive:true});
  await cp(resolve(webRoot,'../../datasets/candidates/worldbank.json'),join(reviewDir,'candidate.json'));
  await cp(resolve(webRoot,'../../datasets/candidates/worldbank.audit.json'),join(reviewDir,'audit.json'));
  const files=[...candidate.importManifest!.countryFiles,...candidate.indicators.flatMap(i=>[...i.provenance!.files,...i.provenance!.metadataFiles])];
  for(const file of new Map(files.map(f=>[f.path,f])).values()){
    const sourceFile=resolve(webRoot,'../..',file.path);
    if(!relative(resolve(webRoot,'../../datasets/raw'),sourceFile).startsWith('worldbank'))throw new Error('Invalid raw source path');
    await cp(sourceFile,join(reviewDir,'raw',file.path.split('/').at(-1)!));
  }
}
console.log(`Validated and prepared ${posts.length} post(s).`);
await writeContentCatalog(resolve(webRoot,'../..'));
