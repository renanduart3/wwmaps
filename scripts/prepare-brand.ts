import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import sharp from 'sharp';
const dir=resolve(import.meta.dirname,'../apps/web/public/brand');
await mkdir(dir,{recursive:true});
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#21112f"/><circle cx="1050" cy="200" r="270" fill="#7132df"/><circle cx="1050" cy="200" r="200" fill="none" stroke="#b18be9" stroke-width="3"/><ellipse cx="1050" cy="200" rx="95" ry="200" fill="none" stroke="#b18be9" stroke-width="3"/><path d="M850 200h400M880 100h340M880 300h340" stroke="#b18be9" stroke-width="3"/><rect x="65" y="100" width="95" height="9" fill="#be2349"/><text x="65" y="235" fill="#faf5e9" font-family="Arial,sans-serif" font-weight="900" font-style="italic" font-size="112">WWMAPS</text><text x="68" y="335" fill="#faf5e9" font-family="Arial,sans-serif" font-size="36">A world of perspectives.</text><text x="68" y="550" fill="#cab3e6" font-family="Arial,sans-serif" font-size="28">wwmaps.com</text></svg>';
await sharp(Buffer.from(svg)).png().toFile(resolve(dir,'wwmaps-social.png'));
await sharp(Buffer.from(svg.replace('A world of perspectives.','Um mundo de perspectivas.'))).png().toFile(resolve(dir,'wwmaps-social-pt-br.png'));
