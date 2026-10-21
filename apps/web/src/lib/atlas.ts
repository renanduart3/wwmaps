import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { dashboardSchema } from '@atlas/contracts';
import raw from '../../../../datasets/indicators.json';
import visuals from '../../../../datasets/visuals.json';
import products from '../../../../datasets/products.json';
const require = createRequire(import.meta.url);
const topology = JSON.parse(readFileSync(require.resolve('world-atlas/countries-110m.json'), 'utf8'));
const world = feature(topology, topology.objects.countries) as unknown as GeoJSON.FeatureCollection;
const projection = geoNaturalEarth1().fitExtent([[10, 5], [790, 405]], world);
const path = geoPath(projection);
export const shapes = world.features.filter(f => String(f.id) !== '010').map(f => ({
  id: String(f.id).padStart(3, '0'), name: String(f.properties?.name ?? ''), d: path(f) ?? ''
}));
export const data = dashboardSchema.parse(raw);
if(data.mode!=='mock')throw new Error('Official data must be reviewed separately before changing the active observatory and its notices.');
export { visuals, products };
export const palettes = ['#3e8274', '#e7a04b', '#6987a7', '#c87560'];
export function valueFor(indicator: typeof data.indicators[number], id: string, year: number): number | null | undefined {
  return indicator.values[id]?.[year];
}
export function colorFor(value: number | null | undefined, max: number, hue = 270) {
  return value == null ? '#e6e9e5' : `hsl(${hue} 34% ${88 - Math.sqrt(value / (max || 1)) * 57}%)`;
}
