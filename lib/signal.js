// Fungsi sinyal MURNI. Dipakai identik oleh bot (api/tick.js) dan backtest.
export function ema(x, n) {
  const k = 2 / (n + 1), out = new Array(x.length).fill(NaN);
  if (x.length < n) return out;
  let p = 0; for (let i = 0; i < n; i++) p += x[i]; p /= n; out[n - 1] = p;
  for (let i = n; i < x.length; i++) { p = x[i] * k + p * (1 - k); out[i] = p; }
  return out;
}
export function windowCheck(w, cfg) {
  if (w.length < cfg.lookback) return 'window_short';
  for (let i = 1; i < w.length; i++) if (w[i].t - w[i - 1].t !== cfg.tfSec) return 'gap_in_window';
  const l = w.at(-1); if (!(l.c > 0) || !(l.v > 0)) return 'zero_price_or_volume';
  return null;
}
// w: bar TERTUTUP saja (urut naik), pos: {signalPrice} atau null
export function decide(w, pos, cfg) {
  const c = w.map(b => b.c); const [a, b, d] = cfg.ema.map(n => ema(c, n)); const i = c.length - 1;
  const stack = j => c[j] > a[j] && a[j] > b[j] && b[j] > d[j];
  const info = { close: c[i], ema50: a[i], ema100: b[i], ema150: d[i] };
  if (!pos) { const go = stack(i) && !stack(i - 1);
    return { action: go ? 'BUY' : 'HOLD', reason: go ? 'close>EMA50>EMA100>EMA150 baru terbentuk' : 'flat', ...info }; }
  if (c[i] < b[i]) return { action: 'SELL', reason: 'close<EMA100', ...info };
  if (c[i] <= pos.signalPrice * (1 - cfg.stopLossPct)) return { action: 'SELL', reason: 'stop_loss', ...info };
  return { action: 'HOLD', reason: 'in_trend', ...info };
}
export function evaluate(w, pos, cfg) {
  const bad = windowCheck(w, cfg);
  if (bad === 'window_short') return { action: 'HOLD', reason: 'invalid:' + bad, invalid: bad };
  const d = decide(w, pos, cfg);
  if (bad && d.action === 'BUY') return { ...d, action: 'HOLD', reason: 'invalid:' + bad, invalid: bad };
  return d;
}
