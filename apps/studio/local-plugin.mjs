import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';

export function localStudioRequest(req){
  const peer=req.socket.remoteAddress;
  if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(peer))return false;
  try{
    const host=new URL(`http://${req.headers.host}`);
    if(!['localhost','127.0.0.1','[::1]'].includes(host.hostname))return false;
    if(req.headers.origin&&req.headers.origin!==host.origin)return false;
    return true;
  }catch{return false;}
}

/** Registered by Vite only during dev. No Astro page or Pages Function is created. */
export function localStudioPlugin(root){
  return {name:'wwmaps-private-local-studio',apply:'serve',configureServer(server){
    const token=randomBytes(32).toString('hex');
    server.middlewares.use(async(req,res,next)=>{
      const path=(req.url??'/').split('?')[0];
      if(path!=='/__studio'&&!path.startsWith('/__studio/'))return next();
      res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('X-Robots-Tag','noindex, nofollow');
      const json=(status,payload)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(payload));};
      if(!localStudioRequest(req))return json(403,{error:'O painel aceita somente acesso local da mesma origem.'});
      try{
        if((path==='/__studio'||path==='/__studio/')&&req.method==='GET'){
          const html=await readFile(resolve(root,'apps/studio/ui/editor.html'),'utf8');
          res.setHeader('Content-Type','text/html; charset=utf-8');
          res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'nonce-${token}'; style-src 'nonce-${token}'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`);
          res.end(html.replaceAll('__STUDIO_TOKEN__',token));return;
        }
        if(req.headers['x-wwmaps-local']!==token)return json(403,{error:'Sessão local desatualizada. Reabra o painel.'});
        const editor=await server.ssrLoadModule(resolve(root,'apps/studio/src/local-editor.ts'));
        if(path==='/__studio/api/import-template'&&req.method==='GET'){
          res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="wwmaps-planning-template.csv"');res.end(editor.planningCsvTemplate());return;
        }
        if(path==='/__studio/api/catalog'&&req.method==='GET')return json(200,await editor.editorData(root));
        if(path==='/__studio/api/detail'&&req.method==='GET'){
          const query=new URL(req.url,'http://localhost').searchParams;
          return json(200,await editor.editorDetail(root,query.get('origin'),query.get('id')));
        }
        if(path==='/__studio/api/trash'&&req.method==='GET')return json(200,await editor.editorTrash(root));
        if(path==='/__studio/api/export'&&req.method==='GET'){
          const catalog=await server.ssrLoadModule(resolve(root,'apps/studio/src/content-catalog.ts'));
          const csv=await server.ssrLoadModule(resolve(root,'apps/studio/src/content-csv.ts'));
          res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="wwmaps-content.csv"');res.end(csv.contentCsv(await catalog.contentCatalogRows(root)));return;
        }
        if(path==='/__studio/api/edit'&&req.method==='POST'){
          if(!req.headers['content-type']?.startsWith('application/json'))return json(415,{error:'Envie application/json.'});
          let bytes=0,body='';
          for await(const chunk of req){bytes+=chunk.length;if(bytes>1024*1024)return json(413,{error:'Lote grande demais. Limite de 1 MB.'});body+=chunk;}
          const result=await editor.editContent(root,JSON.parse(body));
          server.moduleGraph.invalidateAll();return json(200,result);
        }
        return json(404,{error:'Rota local inexistente.'});
      }catch(error){return json(error.status??400,{error:error.message??String(error)});}
    });
  }};
}
