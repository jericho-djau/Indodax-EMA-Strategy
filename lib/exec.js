export const floorTo = (x, d) => { const m = 10 ** d; return Math.floor(x * m + 1e-9) / m; };
export function walkBuy(asks, notional) {           // belanja senilai notional IDR
  let left = notional, qty = 0;
  for (const [p, q] of asks) { if (left <= 0) break; const c = p * q;
    if (c <= left) { qty += q; left -= c; } else { qty += left / p; left = 0; } }
  return { qty, full: left <= 1e-6 };
}
export function walkBuyQty(asks, qty) {             // biaya IDR untuk membeli qty
  let left = qty, cost = 0;
  for (const [p, q] of asks) { if (left <= 0) break; const t = Math.min(q, left); cost += t * p; left -= t; }
  return left > 1e-12 ? NaN : cost;
}
export function walkSell(bids, qty) {
  let left = qty, got = 0, sold = 0;
  for (const [p, q] of bids) { if (left <= 0) break; const t = Math.min(q, left); sold += t; got += t * p; left -= t; }
  return { qty: sold, proceeds: got, avg: sold ? got / sold : NaN };
}
export function snapStats(bk, notional) {
  const b = bk.bids[0][0], a = bk.asks[0][0], mid = (a + b) / 2;
  const buy = walkBuy(bk.asks, notional), sell = walkSell(bk.bids, notional / b);
  return { bid: b, ask: a, spread: (a - b) / mid,
    slipBuy: buy.full ? (notional / buy.qty) / a - 1 : null, slipSell: sell.qty ? 1 - sell.avg / b : null };
}
