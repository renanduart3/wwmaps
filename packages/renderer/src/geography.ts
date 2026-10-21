import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoMercator, geoPath, geoProjection, type GeoProjection } from 'd3-geo';

const require = createRequire(import.meta.url);
const topology = JSON.parse(readFileSync(require.resolve('world-atlas/countries-110m.json'), 'utf8'));
const world = feature(topology, topology.objects.countries) as unknown as GeoJSON.FeatureCollection;
const radians = Math.PI / 4;
const equalArea = () => geoProjection((lambda, phi) => [lambda * Math.cos(radians), Math.sin(phi) / Math.cos(radians)]);

/** Both panels retain exactly the same source features. Styling never changes d. */
export function mapProjection(kind: 'mercator' | 'gall-peters') {
  const projection: GeoProjection = kind === 'mercator' ? geoMercator() : equalArea();
  projection.fitExtent([[20, 20], [456, 456]], { type: 'Sphere' });
  return projection;
}
export function projectionGeometry(kind: 'mercator' | 'gall-peters') {
  const projection = mapProjection(kind);
  const path = geoPath(projection);
  return { outline: path({ type: 'Sphere' }) ?? '', countries: world.features.map(f => ({ id: String(f.id).padStart(3, '0'), d: path(f) ?? '' })) };
}
