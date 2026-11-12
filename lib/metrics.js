// Semua angka dashboard dihitung di sini dari log mentah (dipakai api/data.js DAN scripts/hitung_ulang.js).
import { CFG } from './config.js';
export const median = a => { const v = a.filter(x => x != null && isFinite(x)); if (!v.length) return null;
  const s = [...v].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const sum = (a, f) => a.reduce((x, y) => x + (f(y) || 0), 0);
export function maxDD(eq) { let pk = -Infinity, dd = 0; for (const e of eq) { pk = Math.max(pk, e); dd = Math.min(dd, e / pk - 1); } return dd; }
export function tradeStats(tr) {
  const w = tr.filter(t => t.pnl > 0), l = tr.filter(t => t.pnl <= 0);
  const gw = sum(w, t => t.pnl), gl = -sum(l, t => t.pnl);
  const fee = sum(tr, t => t.fee), sp = sum(tr, t => t.spreadCost), sl = sum(tr, t => t.slipCost);
  const net = sum(tr, t => t.pnl), gross = net + fee + sp + sl;
  return { trades: tr.length, wins: w.length, winRate: tr.length ? w.length / tr.length : null,
    avgWin: w.length ? gw / w.length : null, avgLoss: l.length ? -gl / l.length : null,
    profitFactor: gl > 0 ? gw / gl : null, net, fee, spreadCost: sp, slipCost: sl, grossProfit: gross,
    costShare: gross > 0 ? (fee + sp + sl) / gross : null };
}
export function pairTrades(orders) {            // gabungkan order BUY + SELL menjadi trade
  const open = {}, out = [];
  for (const o of orders) {
    if (o.side === 'BUY') open[o.pair] = o;
    else if (o.side === 'SELL' && open[o.pair]) { const b = open[o.pair]; delete open[o.pair];
      out.push({ pair: o.pair, entryT: b.candle, exitT: o.candle, entryFill: b.avgFill, exitFill: o.avgFill, pnl: o.pnl,
        fee: b.fee + o.fee, spreadCost: b.spreadCost + o.spreadCost, slipCost: b.slipCost + o.slipCost, reason: o.reason }); }
  }
  return out;
}
export function btcBench(btc, from, to, half, slip) {
  const a = btc.find(b => b.t >= from), z = [...btc].reverse().find(b => b.t <= to); if (!a || !z) return null;
  const r = (z.c * (1 - half - slip) * (1 - CFG.feeSell)) / (a.c * (1 + half + slip) * (1 + CFG.feeBuy)) - 1;
  return { from: a.t, to: z.t, returnPct: r };
}
export function summarizeBT(res, data, from, to, as) {
  const eq = res.equity.map(e => e.eq), days = (to - from) / 86400, ret = eq.length ? eq.at(-1) / CFG.capital - 1 : 0;
  return { from, to, days, returnPct: ret, cagr: Math.pow(1 + ret, 365 / days) - 1, maxDD: maxDD(eq),
    stats: tradeStats(res.trades), bench: btcBench(data.btcidr || [], from, to, as.half.btcidr ?? CFG.fallbackHalf, as.slip.btcidr ?? CFG.fallbackSlip),
    assumptions: as };
}
export function assumptionsFrom(snaps) {
  const half = {}, slip = {}, n = {}; let measured = false;
  for (const p of CFG.pairs) {
    const s = snaps.filter(x => x.pair === p); n[p] = s.length;
    const sp = median(s.map(x => x.spread)), sl = median(s.flatMap(x => [x.slipBuy, x.slipSell]));
    half[p] = sp != null ? sp / 2 : CFG.fallbackHalf; slip[p] = sl != null ? sl : CFG.fallbackSlip; if (sp != null) measured = true;
  }
  return { half, slip, n, source: measured ? 'snapshot_median' : 'FALLBACK_belum_ada_snapshot' };
}
export function buildPayload(L, bt, gap) {
  const { calls = [], orders = [], signals = [], equity = [], errors = [], snaps = [], events = [] } = L;
  const tr = pairTrades(orders), stats = tradeStats(tr), tf = CFG.tfSec;
  const eqS = calls.filter(c => c.equity != null).map(c => ({ t: Math.floor(c.ts / 1000), eq: c.equity }));
  const start = calls[0]?.serverTime ?? null, end = calls.at(-1)?.serverTime ?? null;
  const btc = snaps.filter(s => s.pair === 'btcidr');
  const bh = btc.length > 1 ? (btc.at(-1).bid * (1 - CFG.feeSell)) / (btc[0].ask * (1 + CFG.feeBuy)) - 1 : null;
  // uptime: candle diproses (semua pair) sebelum candle berikutnya ditutup
  let expected = 0, onTime = 0;
  if (start) { const done = new Map();
    for (const c of calls) for (const p of c.processed || []) if (c.ts / 1000 < p.candle + 2 * tf) {
      if (!done.has(p.candle)) done.set(p.candle, new Set()); done.get(p.candle).add(p.pair); }
    for (let T = Math.floor(start / tf) * tf - tf; T <= Math.floor(end / tf) * tf - tf; T += tf) {
      expected++; if (done.get(T)?.size === CFG.pairs.length) onTime++; } }
  const as = bt?.assumptions, spreads = {};
  for (const p of CFG.pairs) { const s = snaps.filter(x => x.pair === p);
    spreads[p] = { assumedBacktest: as ? as.half[p] * 2 : null, measuredAll: median(s.map(x => x.spread)), n: s.length }; }
  return {
    generatedAt: Math.floor(Date.now() / 1000), capital: CFG.capital,
    forward: { start, end, returnPct: eqS.length ? eqS.at(-1).eq / CFG.capital - 1 : null,
      maxDD: eqS.length ? maxDD(eqS.map(e => e.eq)) : null, stats, equity: eqS, daily: equity, buyHoldBTC: bh,
      openPositions: calls.at(-1)?.open ?? [] , trades: tr },
    backtest: bt || null, gap: gap || null,
    ops: { scheduledExpected: expected, processedOnTime: onTime, uptimePct: expected ? onTime / expected : null,
      calls: calls.length, errors: errors.length, killSwitchEvents: events.filter(e => e.type.startsWith('kill')).length,
      dailyLossHalts: events.filter(e => e.type === 'daily_loss_halt').length,
      blockedEntries: events.filter(e => e.type === 'entry_blocked').length, recentErrors: errors.slice(-8) },
    spreads, signalsLogged: signals.length,
    gapReturn: (eqS.length && gap?.btReturn != null) ? eqS.at(-1).eq / CFG.capital - 1 - gap.btReturn : null
  };
}
