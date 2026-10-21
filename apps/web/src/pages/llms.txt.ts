import {getPublicPosts,postUrl} from '../lib/posts';
import {getPublicVisualPosts,visualPostUrl} from '../lib/visual-posts';
export async function GET(){
 const lines=['# WWMaps','','> Maps, data and visual stories. English is primary; Brazilian Portuguese is available under /pt-br/.','','## Explore','','- [Observatory](/)','- [Português](/pt-br/)','- [Compare countries](/compare/)','- [Categories](/categories/)','- [Methodology](/methodology/)','- [Collection](/collection/): illustrative products.','','## Data','','- [Demonstration data](/data/indicators.json): SYNTHETIC values, not official statistics. Source links are planned references.','- [Editorial feed](/ai-feed.json): published content with its actual language and sources.','','## Editorial publications',''];
 for(const post of await getPublicPosts())for(const lang of post.languages)lines.push(`- [${post.translations[lang]!.title}](${postUrl(post,lang)}) (${lang})`);
 for(const post of await getPublicVisualPosts())for(const lang of post.languages)lines.push(`- [${post.translations[lang]!.title}](${visualPostUrl(post,lang)}) (${lang})`);
 return new Response(lines.join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
