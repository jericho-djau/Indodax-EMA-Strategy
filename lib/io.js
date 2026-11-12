import fs from 'node:fs';
import { CFG } from './config.js';
export function loadCandles(dir = 'data') {
  const out = {};
  for (const p of CFG.pairs) { const f = `${dir}/${p}_60.csv`; if (!fs.existsSync(f)) { out[p] = []; continue; }
    out[p] = fs.readFileSync(f, 'utf8').trim().split('\n').slice(1).map(l => { const [t, o, h, low, c, v] = l.split(',').map(Number); return { t, o, h, l: low, c, v }; }); }
  return out;
}
export const loadJSON = (f, d = null) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d;
export function toCSV(rows) {
  if (!rows.length) return '';
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const q = v => v == null ? '' : typeof v === 'object' ? '"' + JSON.stringify(v).replace(/"/g, '""') + '"' : String(v).includes(',') ? '"' + v + '"' : v;
  return [keys.join(','), ...rows.map(r => keys.map(k => q(r[k])).join(','))].join('\n');
}
