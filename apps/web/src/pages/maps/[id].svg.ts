import { data, shapes, colorFor, valueFor } from '../../lib/atlas';
export function getStaticPaths() {
  return data.indicators.flatMap(indicator => [270,35,280,345].map(hue => ({
    params: { id: `${indicator.id}-${hue}` }, props: { indicator, hue }
  })));
}
export function GET({ props }: { props: { indicator: typeof data.indicators[number]; hue: number } }) {
  const { indicator, hue } = props;
  const max = Math.max(1, ...Object.values(indicator.values).flat().filter(v=>v!=null));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 410"><rect width="800" height="410" rx="12" fill="#faf5e9"/>${shapes.map(s=>`<path d="${s.d}" fill="${colorFor(valueFor(indicator,s.id,data.years.length-1),max,hue)}" stroke="#403048" stroke-width=".85" stroke-linejoin="round"/>`).join('')}<path d="M20 30 Q54 26 90 30 M710 378 Q746 375 780 378" fill="none" stroke="#7132df" stroke-width="2" stroke-linecap="round"/></svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}
