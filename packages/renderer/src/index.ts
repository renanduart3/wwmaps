import sharp from 'sharp';
import { mapStyleGuide, resolveVisualStyle, type Brief } from '@atlas/contracts';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { projectionGeometry } from './geography.js';
export { projectionGeometry, mapProjection } from './geography.js';

const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function lines(text: string, max: number) {
  const output: string[] = [];
  for (const word of text.split(/\s+/)) {
    if (!output.length || output.at(-1)!.length + word.length + 1 > max) output.push(word);
    else output[output.length - 1] += ` ${word}`;
  }
  return output;
}
function textBlock(text: string, x: number, y: number, max: number, lineHeight: number, attrs = '') {
  return `<text x="${x}" y="${y}" ${attrs}>${lines(text, max).map((line, i) => `<tspan x="${x}" dy="${i ? lineHeight : 0}">${escape(line)}</tspan>`).join('')}</text>`;
}

export function renderSvg(brief: Brief, width = 1080, height = 1350): string {
  if (brief.mapType !== 'projection-comparison' || brief.visualizationType !== 'projection-comparison') throw new Error('Unsupported Studio map template. Consult schemas/editorial-catalog.json before rendering.');
  const style = resolveVisualStyle(brief);
  const playful = style.mode === 'playful-editorial';
  const pt = brief.languages[0] === 'pt-BR';
  const { paper, ink, primary, highlight } = mapStyleGuide.brand;
  const copy = pt ? {
    kicker:'CARTOGRAFIA / UM NOVO OLHAR', equal:'ÁREA EQUIVALENTE', merc:'Áreas ampliadas perto dos polos.',
    peters:'Área preservada; formas distorcidas.', takeaway:'O MESMO MUNDO. OUTRO OLHAR.',
    note:'A projeção muda a área aparente. Nenhum mapa plano preserva todas as propriedades.',
    clip:'Mercator: polos recortados em ±85,05°. Painéis ajustados separadamente.',
    credit:'Geometria: Natural Earth 1:110m / world-atlas. Fontes no artigo.', draft:'PRÉVIA · REVISÃO NECESSÁRIA'
  } : {
    kicker:'CARTOGRAPHY / A FRESH PERSPECTIVE', equal:'EQUAL AREA', merc:'Areas expand toward the poles.',
    peters:'Area preserved; shapes distorted.', takeaway:'SAME WORLD. DIFFERENT VIEW.',
    note:'Projection changes perceived area. No flat map preserves every geographic property.',
    clip:'Mercator: poles clipped at ±85.05°. Panels fitted independently.',
    credit:'Geometry: Natural Earth 1:110m / world-atlas. Sources in article.', draft:'PREVIEW · REVIEW REQUIRED'
  };
  const panels = (['mercator', 'gall-peters'] as const).map((kind, n) => {
    const geometry = projectionGeometry(kind);
    const x = n ? 552 : 52;
    const panelFill = playful ? (n ? '#E5EADA' : '#E9DDF6') : '#EEE6D9';
    return `<g transform="translate(${x} 366)"><rect width="476" height="570" rx="${playful ? 22 : 6}" fill="${panelFill}" stroke="${ink}" stroke-width="2"/>
<text x="22" y="42" font-size="15" letter-spacing="2">0${n + 1} / ${n ? copy.equal : 'MERCATOR'}</text>
<g transform="translate(0 66)" stroke-linejoin="round" stroke-linecap="round">
<path d="${geometry.outline}" fill="${paper}" stroke="${ink}" stroke-width="1.4"/>
${geometry.countries.map(country => `<path data-geometry="${kind}-${country.id}" d="${country.d}" fill="${playful ? '#BBA2DD' : '#C7B7D4'}" stroke="${ink}" stroke-width="${((playful ? .72 : .6) + Number(country.id) % 4 * .07).toFixed(2)}"/>`).join('')}</g>
<path d="M24 521 Q170 ${playful ? 514 : 520} 450 521" fill="none" stroke="${highlight}" stroke-width="3"/>
<text x="22" y="550" font-size="20">${n ? copy.peters : copy.merc}</text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1080 1350" role="img" aria-label="${escape(brief.visual.title)}" data-style="${style.mode}">
<defs><filter id="paper-grain"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" seed="17"/><feColorMatrix type="saturate" values="0"/></filter></defs>
<rect width="1080" height="1350" fill="${paper}"/><rect width="1080" height="1350" filter="url(#paper-grain)" opacity=".045"/>
<g font-family="Arial,sans-serif" fill="${ink}">
<text x="52" y="66" font-size="27" font-style="italic" font-weight="900" fill="${primary}">WWMAPS.COM</text><text x="1028" y="64" text-anchor="end" font-size="13">${copy.draft}</text>
<path d="M52 92 Q480 95 1028 92" fill="none" stroke="${ink}" stroke-width="2"/>
<text x="52" y="126" font-size="14" letter-spacing="2">${copy.kicker}</text>
${textBlock(brief.visual.title.toUpperCase(), 52, 204, 26, 72, `font-family="Barlow Condensed,Arial Narrow,Arial,sans-serif" font-size="64" font-style="italic" font-weight="900" fill="${primary}"`)}
${textBlock(brief.visual.subtitle, 52, 316, 65, 27, 'font-size="24"')}
${panels}
<path d="M430 977 Q540 ${playful ? 948 : 968} 650 977 M635 965 L650 977 L634 989" fill="none" stroke="${highlight}" stroke-width="4" stroke-linecap="round"/>
<rect x="52" y="1020" width="976" height="175" rx="${playful ? 18 : 4}" fill="${ink}"/>
<text x="80" y="1065" font-size="27" font-style="italic" font-weight="900" fill="${paper}">${copy.takeaway}</text>
${textBlock(copy.note, 80, 1110, style.characters === 'guide' ? 60 : 76, 29, `font-size="22" fill="${paper}"`)}
${style.characters === 'guide' ? `<g data-character="guide" transform="translate(940 1103)" stroke="${paper}" stroke-width="4" fill="none" stroke-linecap="round"><circle cy="-27" r="12"/><path d="M0 -15 Q-4 5 0 20 M0 0 L-18 -7 L-28 -26 M0 0 L18 -12 M0 20 L-16 45 M0 20 L17 45"/></g>` : ''}
<text x="52" y="1236" font-size="17">${copy.clip}</text><text x="52" y="1265" font-size="16">${copy.credit}</text>
<text x="52" y="1306" font-size="13" letter-spacing="1.3" fill="${primary}">${style.name.toUpperCase()} / ${mapStyleGuide.styleName.toUpperCase()}</text>
</g></svg>`;
}

export async function renderAssets(brief: Brief, assetDir: string): Promise<void> {
  const svg = renderSvg(brief);
  await writeFile(join(assetDir, 'map.svg'), svg, 'utf8');
  await sharp(Buffer.from(svg)).png().toFile(join(assetDir, 'instagram-4x5.png'));
  // Contain the entire infographic: a cover crop would remove one projection or its notes.
  await sharp(Buffer.from(svg)).resize(1200, 800, { fit: 'contain', background: mapStyleGuide.brand.paper }).webp({ quality: 85 }).toFile(join(assetDir, 'cover.webp'));
}
