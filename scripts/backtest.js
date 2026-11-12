import fs from 'node:fs';
import { CFG } from '../lib/config.js';
import { runBacktest } from '../lib/backtest_core.js';
import { summarizeBT, assumptionsFrom } from '../lib/metrics.js';
import { loadCandles, loadJSON } from '../lib/io.js';
const data = loadCandles(), snaps = loadJSON('logs/export.json', { snaps: [] }).snaps || [];
const as = assumptionsFrom(snaps);
const to = Math.max(...CFG.pairs.map(p => data[p].at(-1)?.t ?? 0)), from = to - 3 * 365 * 86400;
const res = runBacktest(data, { from, to, as });
const sum = summarizeBT(res, data, from, to, as);
const daily = []; for (const e of res.equity) { const k = Math.floor(e.t / 86400); if (daily.length && daily.at(-1).k === k) daily.at(-1).eq = e.eq; else daily.push({ k, t: e.t, eq: e.eq }); }
fs.writeFileSync('data/backtest_result.json', JSON.stringify({ ...sum, equity: daily.map(({ t, eq }) => ({ t, eq })), trades: res.trades.length }));
console.log(JSON.stringify({ ...sum, bench: sum.bench }, null, 2));
if (as.source !== 'snapshot_median') console.log('\n!! Asumsi spread masih FALLBACK. Jalankan npm run export lalu ulangi backtest setelah snapshot terkumpul.');
