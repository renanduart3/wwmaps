import { defineConfig } from 'astro/config';
import { readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {localStudioPlugin} from '../studio/local-plugin.mjs';
const visualRoot=resolve(fileURLToPath(new URL('../../content/visuals',import.meta.url)));

// Development only: serve a newly saved external image immediately, without a copy/build step.
const localVisuals={name:'wwmaps-local-visuals',configureServer(server){
  server.watcher.add(visualRoot);
  const reload=(_event,path)=>{
    const rel=relative(visualRoot,path);
    if(rel&&!rel.startsWith('..')&&/post\.json$|image\.(?:en|pt-BR)\.(?:png|webp|jpe?g)$/.test(rel)){
      server.moduleGraph.invalidateAll();server.ws.send({type:'full-reload'});
    }
  };
  server.watcher.on('all',reload);server.httpServer?.once('close',()=>server.watcher.off('all',reload));
  server.middlewares.use(async(req,res,next)=>{
    const path=new URL(req.url??'/','http://localhost').pathname;
    if(!path.startsWith('/visual-images/'))return next();
    const match=path.match(/^\/visual-images\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(image\.(?:en|pt-BR)\.(png|webp|jpe?g))$/);
    if(!match){res.statusCode=404;res.end();return;}
    try{const image=await readFile(resolve(visualRoot,match[1],match[2]));res.setHeader('Content-Type',match[3]==='jpg'||match[3]==='jpeg'?'image/jpeg':`image/${match[3]}`);res.setHeader('Cache-Control','no-store');res.end(image);}
    catch{res.statusCode=404;res.end();}
  });
}};

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://wwmaps.com',
  output: 'static',
  vite:{server:{strictPort:true},plugins:[localStudioPlugin(resolve(fileURLToPath(new URL('../..',import.meta.url)))),localVisuals]},
  build: { assets: '_assets' }
});
