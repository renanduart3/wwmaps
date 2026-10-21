import http from 'node:http';
const target='http://127.0.0.1:8788';
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:8789');
 if(url.pathname==='/__review'){
  const sizes={mobile:390,tablet:768,desktop:1200};const size=url.searchParams.get('size')??'mobile';const width=sizes[size]??390;
  const path=url.searchParams.get('path')??'/';const safe=/^\/[a-z0-9\-/]*$/.test(path)?path:'/';
  res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>WWMaps responsive review</title><style>body{margin:0;background:#ddd;font:12px sans-serif}nav{padding:7px}iframe{display:block;width:${width}px;height:1100px;margin:auto;border:0;background:white}</style><nav>Local review: ${size} · ${width}px</nav><iframe title="WWMaps ${size} viewport" src="${safe}"></iframe></html>`);return;
 }
 try{const upstream=await fetch(target+req.url,{redirect:'manual'});res.writeHead(upstream.status,Object.fromEntries([...upstream.headers].filter(([key])=>!['content-encoding','transfer-encoding','content-length'].includes(key))));res.end(Buffer.from(await upstream.arrayBuffer()));}catch{res.writeHead(502);res.end('Start npm run preview first.');}
}).listen(8789,'127.0.0.1',()=>process.stdout.write('Responsive review: http://127.0.0.1:8789/__review?size=mobile\n'));
