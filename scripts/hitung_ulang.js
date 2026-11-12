// Menghasilkan ulang SEMUA angka dashboard dari log mentah (logs/export.json) + candle + backtest. Output: dashboard_offline.html
import fs from 'node:fs';
import { CFG } from '../lib/config.js';
import { runBacktest } from '../lib/backtest_core.js';
import { buildPayload, assumptionsFrom, tradeStats, maxDD, btcBench } from '../lib/metrics.js';
import { loadCandles, loadJSON } from '../lib/io.js';
const L = loadJSON('logs/export.json'); if (!L) throw new Error('logs/export.json tidak ada. Jalankan: npm run export');
const bt = loadJSON('data/backtest_result.json'), data = loadCandles();
let gap = null;
const sigs = (L.signals || []).filter(s => s.candle);
if (sigs.length && CFG.pairs.every(p => data[p].length)) {
  const as = assumptionsFrom(L.snaps || []);
  const from = Math.min(...sigs.map(s => s.candle)), to = Math.max(...sigs.map(s => s.candle));
  const res = runBacktest(data, { from, to, as, recordSignals: true });
  const bm = new Map(res.signals.map(s => [s.pair + '|' + s.t, s.action]));
  let match = 0, total = 0; const mism = [];
  for (const s of sigs) { const b = bm.get(s.pair + '|' + s.candle); if (b === undefined) continue; total++;
    if (b === s.action) match++; else mism.push({ pair: s.pair, candle: s.candle, bot: s.action, backtest: b, blocked: s.blocked || null }); }
  const fills = [];
  for (const o of L.orders || []) { const t = res.trades.find(x => x.pair === o.pair && (o.side === 'BUY' ? x.entryT === o.candle : x.exitT === o.candle));
    if (t) { const bf = o.side === 'BUY' ? t.entryFill : t.exitFill; fills.push({ pair: o.pair, side: o.side, candle: o.candle, botFill: o.avgFill, backtestFill: bf, diffPct: o.avgFill / bf - 1, slipVsSignal: o.slipVsSignal }); } }
  const eq = res.equity.map(e => e.eq);
  gap = { from, to, assumptions: as, btReturn: eq.length ? eq.at(-1) / CFG.capital - 1 : null, btMaxDD: eq.length ? maxDD(eq) : null,
    btStats: tradeStats(res.trades), btBench: btcBench(data.btcidr, from, to, as.half.btcidr, as.slip.btcidr),
    signalMatch: { total, match, pct: total ? match / total : null, mismatches: mism.slice(0, 50) }, fillDiffs: fills, btEquity: res.equity };
  fs.writeFileSync('data/gap_result.json', JSON.stringify(gap));
} else console.log('Candle jendela forward belum ada. Jalankan npm run fetch dulu, lalu ulangi.');
const P = buildPayload(L, bt, gap);
if (P.forward.returnPct != null && gap?.btReturn != null) P.gapReturn = P.forward.returnPct - gap.btReturn;
fs.writeFileSync('logs/payload.json', JSON.stringify(P, null, 2));
const html = fs.readFileSync('public/index.html', 'utf8').replace('<!--DATA-->', '<script>window.__DATA__=' + JSON.stringify(P).replace(/</g, '\\u003c') + '</script>');
fs.writeFileSync('dashboard_offline.html', html);
console.log('OK -> dashboard_offline.html, logs/payload.json');
console.log('Uptime:', P.ops.uptimePct, '| Signal match:', gap?.signalMatch?.pct, '| Forward return:', P.forward.returnPct, '| Backtest window return:', gap?.btReturn);
