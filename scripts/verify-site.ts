import {readdir,readFile,access} from 'node:fs/promises';
import {join,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../apps/web/dist');
const files=await readdir(root,{recursive:true,withFileTypes:true});
let pages=0;
for(const file of files){
 const path=join(file.parentPath,file.name),relative=path.slice(root.length).replaceAll('\\','/');
 if(relative.includes('/__studio/')||relative.includes('/.studio/')||/^catalog.*\.(csv|xlsx)$/.test(file.name)||file.name==='editor.html')throw new Error(`Private studio asset in production: ${relative}`);
 if(file.isFile()&&/\.(html|js)$/.test(file.name)){
  const text=await readFile(path,'utf8');
  if(text.includes('/__studio')||text.includes('studio-token')||text.includes('Sua mesa de edição.'))throw new Error(`Local studio UI/API reference leaked into production: ${relative}`);
 }
}
for(const file of files){if(!file.isFile()||!file.name.endsWith('.html'))continue;
 const path=join(file.parentPath,file.name),html=await readFile(path,'utf8');
 if(/http-equiv="refresh"/i.test(html))continue;
 pages++;
 const relative=path.slice(root.length).replaceAll('\\','/').replace(/index\.html$/,'');
 const lang=relative.startsWith('/pt-br/')?'pt-BR':'en';
 if(!html.includes(`lang="${lang}"`))throw new Error(`Wrong language: ${relative}`);
 if(!html.includes('rel="canonical"')||!html.includes('og:image'))throw new Error(`Missing SEO metadata: ${relative}`);
 if(!html.includes('data-language-switch'))throw new Error(`No language navigation: ${relative}`);
 for(const match of html.matchAll(/href="(\/[^"#?]*)[^\"]*"/g)){
  const href=decodeURIComponent(match[1]);if(href.startsWith('/api/'))continue;
  const target=join(root,href.endsWith('/')?href+'index.html':href);
  await access(target).catch(()=>{throw new Error(`Broken local link ${href} in ${relative}`);});
 }
 if(lang==='en'&&/Conheça a coleção|Buscar visuais|Ver na loja|Prévia com valores/.test(html))throw new Error(`Portuguese UI leaked into ${relative}`);
}
if(!files.some(f=>f.name.endsWith('.woff2')))throw new Error('No self-hosted font');
const png=await readFile(join(root,'brand/wwmaps-social.png'));if(png.readUInt32BE(16)!==1200||png.readUInt32BE(20)!==630)throw new Error('Wrong social card dimensions');
const sitemap=await readFile(join(root,'sitemap.xml'),'utf8');
if(!sitemap.includes('hreflang="en"')||!sitemap.includes('hreflang="pt-BR"'))throw new Error('Missing sitemap alternates');
console.log(`Verified ${pages} localized pages, local links, SEO metadata, font, social card and absence of the private local studio.`);
