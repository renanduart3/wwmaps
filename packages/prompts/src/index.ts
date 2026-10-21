import { mapStyleGuide, resolveVisualStyle, type Brief } from '@atlas/contracts';
export { externalImagePrompt } from './external.js';

export function createImagePrompt(brief: Brief) {
  const style = resolveVisualStyle(brief);
  const requiredElements = ['Real geographic geometry', 'Named Mercator and Gall–Peters panels', 'Title block', 'Projection and clipping note', 'Source credit'];
  const optionalElements = ['Hand-drawn arrows outside geographic paths', 'Compact explanatory callouts',
    ...(style.characters === 'guide' ? ['One small secondary stickman guide outside the map'] : [])];
  return {
    format: 'instagram-4x5', width: 1080, height: 1350,
    style: mapStyleGuide.styleName, styleVersion: mapStyleGuide.version,
    topic: brief.topic, objective: brief.angle, mainInsight: brief.angle,
    mainTitle: brief.visual.title, subtitle: brief.visual.subtitle,
    visualizationType: brief.visualizationType, category: brief.category,
    contentType: brief.contentType, mapType: brief.mapType, geographicScope: brief.geographicScope,
    commercialPurpose: brief.commercialPurpose,
    mode: style.mode, visualTone: style.tone, brandStyle: style.brandStyle,
    characters: style.characters, requiredElements, optionalElements,
    brand: { ...mapStyleGuide.brand, typography: 'Condensed bold italic display headings; readable sans-serif body and numbers' },
    factualClaims: brief.claims.map(c => ({ text: c.text, sourceIds: c.sourceIds })),
    data: brief.data, sources: brief.sources,
    constraints: [...mapStyleGuide.corePrinciples, ...mapStyleGuide.avoid.map(rule => `Avoid: ${rule}`),
      'Do not raster-regenerate the geographic skeleton; composite illustration around verified projected paths',
      'Do not add country highlights or area ratios unless supplied evidence and template support them',
      'Human review of labels, geography, numbers and sensitivity is required before publication'],
    prompt: `${mapStyleGuide.masterPrompt} Mode: ${style.mode}. ${style.tone}. Character policy: ${style.characters}. Palette: purple #7132DF, light beige #FAF5E9, crimson #BE2349, ink #281A3B. Topic: ${brief.topic}. Insight: ${brief.angle}. Title: ${brief.visual.title}. Subtitle: ${brief.visual.subtitle}. ${mapStyleGuide.mapDirections[brief.mapType]} Required: ${requiredElements.join('; ')}. Optional: ${optionalElements.join('; ')}. No invented figures, borders, countries or claims. Keep text and data fills free of texture. Credit wwmaps.com. This prompt is an art direction specification, not permission to redraw or replace verified geography.`
  };
}
