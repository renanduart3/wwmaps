import {pageEntries} from '../lib/page-entries';
import {getPublicPosts,postUrl} from '../lib/posts';
import {route,equivalents} from '../lib/routes';
import {getPublicVisualPosts,visualPostUrl} from '../lib/visual-posts';
export async function GET({site}:{site:URL|undefined}){
  const origin=site??new URL('https://wwmaps.com');
  const entries=(await pageEntries()).filter(e=>!e.redirect&&e.page!=='visual'&&e.page!=='dataReview');
  const paths=[route('home','en'),route('home','pt-BR'),...entries.map(e=>e.path)];
  const posts=await getPublicPosts();
  const visuals=await getPublicVisualPosts();
  for(const post of visuals)for(const lang of post.languages)paths.push(visualPostUrl(post,lang));
  for(const post of posts)for(const lang of post.languages)paths.push(postUrl(post,lang));
  const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  const urls=[...new Set(paths)].map(path=>{
    const post=posts.find(p=>p.languages.some(lang=>postUrl(p,lang)===path));
    const visual=visuals.find(p=>p.languages.some(lang=>visualPostUrl(p,lang)===path));
    const alternatives=post?Object.fromEntries(post.languages.map(lang=>[lang,postUrl(post,lang)])):visual?Object.fromEntries(visual.languages.map(lang=>[lang,visualPostUrl(visual,lang)])):equivalents(path);
    return `<url><loc>${escape(new URL(path,origin).href)}</loc>${Object.entries(alternatives??{}).map(([lang,url])=>`<xhtml:link rel="alternate" hreflang="${lang}" href="${escape(new URL(url,origin).href)}"/>`).join('')}</url>`;
  });
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
