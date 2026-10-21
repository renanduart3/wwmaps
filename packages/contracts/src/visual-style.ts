import { z } from 'zod';
import guide from '../../../styles/legacy-map-style-guide.json' with { type: 'json' };

export const visualModeSchema = z.enum(['playful-editorial', 'analytical-editorial']);
export type VisualMode = z.infer<typeof visualModeSchema>;
export const mapStyleGuide = guide;

/** Evidence controls sensitivity; a generated visual preference cannot relax it. */
export function resolveVisualStyle(input: {
  category: string; contentType?: string; commercialPurpose?: readonly string[];
  sensitiveContent?: boolean; visual?: { mode?: VisualMode; characters?: 'none' | 'guide' };
}) {
  const serious = input.sensitiveContent || ['economy','geopolitics','regional-intelligence'].includes(input.category)
    || input.contentType === 'regional-intelligence' || input.commercialPurpose?.includes('b2b');
  const mode: VisualMode = serious ? 'analytical-editorial' : input.visual?.mode ?? 'playful-editorial';
  return { ...guide.modes[mode], mode, characterPolicy: guide.modes[mode].characters,
    characters: mode === 'playful-editorial' && input.visual?.characters === 'guide' ? 'guide' as const : 'none' as const,
    brandStyle: guide.styleName };
}
