import { visualPostReady, editorialDataLayout, type VisualPost } from '@atlas/contracts';
import templates from '../../../styles/prompt-templates.json' with {type:'json'};
import layouts from '../../../styles/editorial-data-layouts.json' with {type:'json'};

/** A standalone prompt: the external image model needs no other file or attachment. */
export function externalImagePrompt(post:VisualPost,language:'en'|'pt-BR'){
  const errors=visualPostReady(post);if(errors.length)throw new Error(errors.join('\n'));
  const copy=post.translations[language];if(!copy)throw new Error(`Missing language ${language}`);
  const metaphor=post.style==='micro-people-data'?(language==='en'?'People are illustrative; not a statistical count.':'Personagens ilustrativos; não representam uma contagem estatística.'):null;
  const layout=editorialDataLayout(post);
  return [
    `WWMAPS — FINAL IMAGE PROMPT / ${post.style}`,
    'Generate one finished 4:5 portrait infographic, ideally 1080 × 1350 px. Deliver the image, not code or a description.',
    templates[post.style].promptBase,
    ...(layout?[`EDITORIAL DATA LAYOUT: ${layout}. ${layouts[layout]}`]:[]),
    'BRAND: WWMaps / wwmaps.com. Off-white #FAF5E9, purple #7132DF, restrained crimson #BE2349 highlights, black/charcoal ink. Use a condensed bold italic title and clean readable body labels. Maintain strong contrast and generous margins.',
    language==='pt-BR'?'LANGUAGE: Instructions are English, but ALL visible artwork text must be Brazilian Portuguese only. Do not translate quoted Portuguese text into English. Do not mix languages.':'LANGUAGE: ALL visible artwork text must be English only. Do not mix languages.',
    `EXACT TITLE: ${JSON.stringify(copy.title)}`,
    `EXACT SUBTITLE: ${JSON.stringify(copy.subtitle)}`,
    `EXACT VISIBLE SOURCE FOOTER: ${JSON.stringify(copy.sourceCredit)}. Brand credit: wwmaps.com.`,
    `OTHER EXACT VISIBLE TEXT: ${JSON.stringify([...copy.imageText,...(metaphor?[metaphor]:[])])}`,
    `VISUAL FORMAT: ${post.visual.kind}`,
    `COMPOSITION AND GEOGRAPHY: ${post.visual.instructions}`,
    'EVIDENCE — include only the claims below; do not invent statistics, rankings, boundaries, dates or comparisons:',
    JSON.stringify(post.facts,null,2),
    'EXACT DATA TABLE (preserve values, period and unit meaning; localize country names and unit labels to the artwork language, never change numeric values; no imputation):',
    JSON.stringify(post.data,null,2),
    'SOURCE REFERENCES (already researched; do not invent additional sources):',
    JSON.stringify(post.sources,null,2),
    'DATA DESIGN: Bars start at zero; one scale for comparable values. Do not mix units or years without explicit labels. For line charts use an honest common scale, chronological time and visible gaps for missing observations. Bubble size must encode area, not radius. Use a readable legend for map colors, units and missing data. Do not imply that a larger value is a better outcome.',
    'MAP ACCURACY: Preserve recognizable real geography and correct region placement. Use the supplied historical period when relevant. Do not invent borders, flags, country shapes or precision. Keep scenes and characters from obscuring labels or boundaries. If a faithful detailed map cannot be drawn, prefer a simpler correct composition over fabricated detail.',
    'LAYOUT: One main visual, clear title/subtitle, short supporting annotations, readable legend and the exact localized source footer above. The source URLs and evidence JSON are reference material, not additional artwork text. Reproduce quoted visible text exactly. No additional unsupported prose or numbers.',
    'Before returning the image, check all chart values, unit labels, language, spelling, geographic positions and overlaps against this prompt.',
  ].join('\n\n')+'\n';
}
