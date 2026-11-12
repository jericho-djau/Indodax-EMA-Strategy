const BASE = 'https://indodax.com';
const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function getJSON(url, { tries = 3, timeout = 12000 } = {}) {
  let err;
  for (let i = 0; i < tries; i++) {
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), timeout);
    try {
      const r = await fetch(url, { signal: ac.signal, headers: { 'user-agent': 'ema-bot/1.0' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); if (j == null) throw new Error('empty response'); return j;
    } catch (e) { err = e; await sleep(500 * 2 ** i); } finally { clearTimeout(t); }
  }
  throw new Error(`${url} -> ${err.message}`);
}
export async function serverTime() {
  const j = await getJSON(BASE + '/api/server_time'); let t = Number(j.server_time);
  if (!(t > 0)) throw new Error('bad server_time'); if (t > 1e12) t = Math.floor(t / 1000); return t;
}
export async function candles(pair, from, to, tf = 60) {
  const j = await getJSON(`${BASE}/tradingview/history_v2?symbol=${pair.toUpperCase()}&tf=${tf}&from=${from}&to=${to}`);
  if (!Array.isArray(j)) throw new Error('candles bukan array');
  return j.map(c => { let t = Number(c.Time ?? c.time); if (t > 1e11) t = Math.floor(t / 1000);
    return { t, o: +c.Open, h: +c.High, l: +c.Low, c: +c.Close, v: +c.Volume }; }).sort((a, b) => a.t - b.t);
}
export async function depth(pair) {
  const j = await getJSON(`${BASE}/api/depth/${pair}`);
  const bids = (j.buy || []).map(([p, q]) => [+p, +q]).sort((a, b) => b[0] - a[0]);
  const asks = (j.sell || []).map(([p, q]) => [+p, +q]).sort((a, b) => a[0] - b[0]);
  return { bids, asks };
}
export const pairsInfo = () => getJSON(BASE + '/api/pairs');
