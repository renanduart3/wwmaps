import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { briefSchema, resolveVisualStyle } from '@atlas/contracts';
import { createImagePrompt } from '@atlas/prompts';
import { renderSvg, projectionGeometry, mapProjection } from '@atlas/renderer';

const raw = JSON.parse(await readFile(new URL('../briefs/mercator.json', import.meta.url), 'utf8'));
test('sensitive, economy, geopolitics and B2B inputs cannot acquire cartoon characters through generated preferences', () => {
  for (const override of [{ sensitiveContent: true }, { category: 'economy' }, { category: 'geopolitics' }, { commercialPurpose: ['b2b'] }, { contentType: 'regional-intelligence' }]) {
    const brief = briefSchema.parse({ ...raw, ...override, visual: { ...raw.visual, mode: 'playful-editorial', characters: 'guide' } });
    const prompt = createImagePrompt(brief);
    assert.equal(prompt.mode, 'analytical-editorial'); assert.equal(prompt.characters, 'none');
    assert.doesNotMatch(renderSvg(brief), /data-character=/);
    assert.deepEqual(prompt.factualClaims, brief.claims.map(c => ({ text: c.text, sourceIds: c.sourceIds })));
    assert.deepEqual(prompt.data, brief.data);
  }
  assert.equal(resolveVisualStyle({ category: 'history', sensitiveContent: true }).mode, 'analytical-editorial');
});
test('both styles use identical real projected paths; decorations never displace geographic geometry', () => {
  const svg = (mode: 'playful-editorial' | 'analytical-editorial') => renderSvg(briefSchema.parse({ ...raw, visual: { ...raw.visual, mode, characters: 'guide' } }));
  const playful = svg('playful-editorial'), sober = svg('analytical-editorial');
  const paths = (s: string) => [...s.matchAll(/data-geometry="([^"]+)" d="([^"]+)"/g)].map(m => [m[1], m[2]]);
  assert.ok(paths(playful).length > 300); assert.deepEqual(paths(playful), paths(sober));
  assert.match(playful, /data-character="guide"/); assert.doesNotMatch(sober, /data-character=/);
  assert.doesNotMatch(playful, /feDisplacementMap/); assert.match(playful, /±85,05/);
  const merc = projectionGeometry('mercator'), equal = projectionGeometry('gall-peters');
  assert.deepEqual(merc.countries.map(c => c.id), equal.countries.map(c => c.id));
  assert.notEqual(merc.countries.find(c => c.id === '076')?.d, equal.countries.find(c => c.id === '076')?.d);
});
test('invalid styles are rejected and characters default to none', () => {
  assert.equal(briefSchema.safeParse({ ...raw, visual: { ...raw.visual, mode: 'gis' } }).success, false);
  assert.equal(createImagePrompt(briefSchema.parse(raw)).characters, 'none');
});
test('Gall–Peters preserves local area ratios while Mercator enlarges high latitudes', () => {
  const relativeArea = (kind: 'mercator' | 'gall-peters', latitude: number) => {
    const p = mapProjection(kind), delta = .0001;
    const a = p([-30, latitude])!, b = p([-30 + delta, latitude])!, c = p([-30, latitude + delta])!;
    return Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])) / Math.cos(latitude*Math.PI/180);
  };
  const equalRatio = relativeArea('gall-peters', 60) / relativeArea('gall-peters', 0);
  const mercRatio = relativeArea('mercator', 60) / relativeArea('mercator', 0);
  assert.ok(Math.abs(equalRatio-1) < .0001);
  assert.ok(Math.abs(mercRatio-4) < .0001);
});
