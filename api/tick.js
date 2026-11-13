import { CFG } from '../lib/config.js';
import * as ix from '../lib/indodax.js';
import { evaluate } from '../lib/signal.js';
import { walkBuy, walkBuyQty, walkSell, floorTo, snapStats } from '../lib/exec.js';
import * as st from '../lib/store.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const wibDay = sec => new Date((sec + CFG.tzOffsetH * 3600) * 1000).toISOString().slice(0, 10);
const bid0 = b => b?.bids?.[0]?.[0];
const equityOf = (s, bk) => s.cash + Object.entries(s.positions).reduce((a, [p, x]) => a + x.qty * (bid0(bk[p]) ?? x.lastBid ?? x.entryFill), 0);

export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`)
    return res.status(401).json({ error: 'unauthorized' });
  const t0 = Date.now(), call = { ts: t0, processed: [], errors: [], notes: [] };
  const ev = (type, x = {}) => st.push('log:events', { ts: Date.now(), type, ...x });
  const err = async (where, e) => { const o = { ts: Date.now(), where, msg: String(e.message || e) }; call.errors.push(o); try { await st.push('log:errors', o); } catch {} };
  let s;
  try {
    s = await st.getObj('bot:state') || { cash: CFG.capital, positions: {}, day: null, dayStartEq: CFG.capital, halted: false };
    const now = await ix.serverTime(); call.serverTime = now;
    const killFlag = await st.getObj('bot:kill');
    const kill = process.env.KILL_SWITCH === '1' || killFlag?.on === true;
    if (kill) { call.notes.push('kill_switch_on'); await ev('kill_switch_active'); }

    // info pair: presisi kuantitas + bukti tarif/minimum dari /api/pairs
    const info = {};
    try { for (const x of await ix.pairsInfo()) { const k = String(x.id || x.symbol || '').toLowerCase().replace('_', '');
       if (CFG.pairs.includes(k)) { const qi = Number(x.quantity_increment); const vp = qi > 0 ? Math.min(12, Math.max(0, Math.round(-Math.log10(qi)))) : 8; info[k] = { vp, minBase: x.trade_min_base_currency, feeTaker: x.trade_fee_percent_taker }; } }
      call.pairInfo = info; } catch (e) { await err('pairs', e); }

    // order book semua pair (+ snapshot untuk estimasi spread/slippage)
    const books = {};
    for (const p of CFG.pairs) {
      try { const b = await ix.depth(p); await sleep(350);
        if (b.bids.length && b.asks.length) { books[p] = b; await st.push('log:snaps', { ts: t0, pair: p, ...snapStats(b, CFG.slipNotional) }); }
        else await err('depth:' + p, new Error('order book kosong'));
      } catch (e) { await err('depth:' + p, e); }
    }

    // equity & hari WIB
    const eq0 = equityOf(s, books), day = wibDay(now);
    if (s.day !== day) { s.day = day; s.dayStartEq = eq0; s.halted = false; await st.push('log:equity', { ts: t0, day, equity: eq0, cash: s.cash }); }
    if (!s.halted && eq0 < s.dayStartEq * (1 - CFG.dailyLossPct)) { s.halted = true; await ev('daily_loss_halt', { equity: eq0, dayStart: s.dayStartEq }); }

    for (const p of CFG.pairs) {
      try {
        const raw = await ix.candles(p, now - 700 * CFG.tfSec, now); await sleep(350);
        const closed = raw.filter(b => b.t + CFG.tfSec <= now);         // buang candle yang masih berjalan
        if (closed.length < CFG.lookback) { await st.push('log:signals', { ts: t0, pair: p, action: 'HOLD', reason: 'invalid:window_short', n: closed.length }); continue; }
        const w = closed.slice(-CFG.lookback), last = w.at(-1);
        if (!(await st.setnx(`done:${p}:${last.t}`))) { call.notes.push(`dup:${p}:${last.t}`); continue; }   // idempotency
        const pos = s.positions[p] || null, bk = books[p];
        const d = evaluate(w, pos, CFG);
        const spread = bk ? (bk.asks[0][0] - bk.bids[0][0]) / ((bk.asks[0][0] + bk.bids[0][0]) / 2) : null;
        const block = (now - (last.t + CFG.tfSec) > 2 * CFG.tfSec) ? 'stale_candle' : !bk ? 'empty_book' : spread > CFG.maxSpread ? 'wide_spread' : null;
        await st.push('log:signals', { ts: t0, pair: p, candle: last.t, ...d, blocked: block, spread });
        call.processed.push({ pair: p, candle: last.t });
        const vp = info[p]?.vp ?? 8;

        if (d.action === 'BUY' && !pos) {
          const why = kill ? 'kill_switch' : s.halted ? 'daily_loss_limit' : block || (Object.keys(s.positions).length >= CFG.maxPositions ? 'max_positions' : null);
          if (why) { await ev('entry_blocked', { pair: p, candle: last.t, why }); }
          else {
            const notional = Math.min(equityOf(s, books) * CFG.maxPosPct, s.cash / (1 + CFG.feeBuy));
            const est = notional >= CFG.minOrder ? walkBuy(bk.asks, notional) : null;
            const qty = est ? floorTo(est.qty, vp) : 0, cost = qty > 0 ? walkBuyQty(bk.asks, qty) : NaN;
            if (!est || !est.full || !(cost >= CFG.minOrder)) await ev('entry_blocked', { pair: p, candle: last.t, why: 'below_min_or_depth', notional });
            else {
              const fee = cost * CFG.feeBuy, ask = bk.asks[0][0], bid = bk.bids[0][0], mid = (ask + bid) / 2, avg = cost / qty;
              s.cash -= cost + fee;
              s.positions[p] = { qty, entryFill: avg, signalPrice: last.c, costPU: (cost + fee) / qty, entryTs: t0, entryCandle: last.t, lastBid: bid };
              await st.push('log:orders', { ts: t0, pair: p, side: 'BUY', qty, bestBid: bid, bestAsk: ask, avgFill: avg, fee, signalPrice: last.c,
                slipVsSignal: avg / last.c - 1, spreadCost: (ask - mid) * qty, slipCost: (avg - ask) * qty, candle: last.t, reason: d.reason, notional: cost });
            }
          }
        } else if (d.action === 'SELL' && pos) {
          if (!bk) await ev('exit_blocked', { pair: p, candle: last.t, why: 'empty_book' });
          else {
            const r = walkSell(bk.bids, pos.qty);
            if (!(r.qty > 0)) await ev('exit_blocked', { pair: p, candle: last.t, why: 'no_liquidity' });
            else {
              const fee = r.proceeds * CFG.feeSell, ask = bk.asks[0][0], bid = bk.bids[0][0], mid = (ask + bid) / 2, pnl = r.proceeds - fee - pos.costPU * r.qty;
              s.cash += r.proceeds - fee;
              const rest = pos.qty - r.qty; if (rest > 1e-12) pos.qty = rest; else delete s.positions[p];
              await st.push('log:orders', { ts: t0, pair: p, side: 'SELL', qty: r.qty, bestBid: bid, bestAsk: ask, avgFill: r.avg, fee, signalPrice: last.c,
                slipVsSignal: r.avg / last.c - 1, spreadCost: (mid - bid) * r.qty, slipCost: (bid - r.avg) * r.qty, candle: last.t, reason: d.reason, pnl });
            }
          }
        }
      } catch (e) { await err('pair:' + p, e); }
    }
    for (const [p, x] of Object.entries(s.positions)) if (bid0(books[p])) x.lastBid = bid0(books[p]);
    call.equity = equityOf(s, books); call.cash = s.cash; call.open = Object.keys(s.positions); call.halted = s.halted;
  } catch (e) { await err('tick', e); call.fatal = true; }
  finally {
    try { if (s) await st.setObj('bot:state', s); call.durationMs = Date.now() - t0; await st.push('log:calls', call); } catch (e) { call.errors.push({ where: 'save', msg: String(e) }); }
  }
  res.status(call.fatal ? 500 : 200).json({ ok: !call.fatal, processed: call.processed, errors: call.errors.length, equity: call.equity });
}
