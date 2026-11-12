import { CFG } from './config.js';
import { evaluate } from './signal.js';
const wib = t => new Date((t + CFG.tzOffsetH * 3600) * 1000).toISOString().slice(0, 10);
// data: {pair: candles[]} ; as: {half:{}, slip:{}}. Fill = close +/- (half-spread + slippage) terukur dari snapshot.
export function runBacktest(data, { from, to, as, recordSignals = false }) {
  const hs = p => as.half[p] ?? CFG.fallbackHalf, sl = p => as.slip[p] ?? CFG.fallbackSlip;
  const idx = {}, times = new Set();
  for (const p of CFG.pairs) { if (!data[p]?.length) continue; idx[p] = new Map(data[p].map((b, i) => [b.t, i]));
    for (const b of data[p]) if (b.t >= from && b.t <= to) times.add(b.t); }
  const T = [...times].sort((a, b) => a - b);
  let cash = CFG.capital, day = null, dayEq = cash, halted = false;
  const pos = {}, last = {}, trades = [], equity = [], signals = [];
  const eq = () => cash + Object.entries(pos).reduce((a, [p, x]) => a + x.qty * last[p] * (1 - hs(p)), 0);
  for (const t of T) {
    for (const p of CFG.pairs) if (idx[p]?.has(t)) last[p] = data[p][idx[p].get(t)].c;
    const d0 = wib(t); if (d0 !== day) { day = d0; dayEq = eq(); halted = false; }
    if (eq() < dayEq * (1 - CFG.dailyLossPct)) halted = true;
    for (const p of CFG.pairs) {
      if (!idx[p]?.has(t)) continue; const i = idx[p].get(t); if (i < CFG.lookback - 1) continue;
      const w = data[p].slice(i - CFG.lookback + 1, i + 1), c = w.at(-1).c, x = pos[p] || null;
      const d = evaluate(w, x, CFG); if (recordSignals) signals.push({ pair: p, t, action: d.action });
      if (d.action === 'BUY' && !x && !halted && Object.keys(pos).length < CFG.maxPositions) {
        const notional = Math.min(eq() * CFG.maxPosPct, cash / (1 + CFG.feeBuy)); if (notional < CFG.minOrder) continue;
        const fill = c * (1 + hs(p) + sl(p)), qty = notional / fill, fee = notional * CFG.feeBuy;
        cash -= notional + fee;
        pos[p] = { qty, entryFill: fill, signalPrice: c, costPU: (notional + fee) / qty, entryT: t, fee,
          spreadCost: hs(p) * notional, slipCost: sl(p) * notional };
      } else if (d.action === 'SELL' && x) {
        const fill = c * (1 - hs(p) - sl(p)), proceeds = x.qty * fill, fee = proceeds * CFG.feeSell;
        cash += proceeds - fee;
        trades.push({ pair: p, entryT: x.entryT, exitT: t, entryFill: x.entryFill, exitFill: fill, pnl: proceeds - fee - x.costPU * x.qty,
          fee: x.fee + fee, spreadCost: x.spreadCost + hs(p) * proceeds, slipCost: x.slipCost + sl(p) * proceeds, reason: d.reason });
        delete pos[p];
      }
    }
    equity.push({ t, eq: eq() });
  }
  return { trades, equity, signals };
}
