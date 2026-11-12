import fs from 'node:fs';
import path from 'node:path';
import * as st from '../lib/store.js';
import { buildPayload } from '../lib/metrics.js';
const rd = f => { try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', f), 'utf8')); } catch { return null; } };
export default async function handler(req, res) {      // publik, hanya-baca, tanpa secret di dalamnya
  try {
    const L = {}; for (const k of st.KINDS) L[k] = await st.all('log:' + k);
    res.setHeader('Cache-Control', 's-maxage=60');
    res.json(buildPayload(L, rd('backtest_result.json'), rd('gap_result.json')));
  } catch (e) { res.status(500).json({ error: String(e.message) }); }
}
