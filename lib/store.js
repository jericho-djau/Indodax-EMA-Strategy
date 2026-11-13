// Upstash Redis lewat REST (tanpa dependensi). Kredensial dari environment variable.
async function cmd(args) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  const r = await fetch(url, { method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(args) });
  const j = await r.json(); if (j.error) throw new Error('redis: ' + j.error); return j.result;
}
export const getObj = async k => { const v = await cmd(['GET', k]); return v ? JSON.parse(v) : null; };
export const setObj = (k, o) => cmd(['SET', k, JSON.stringify(o)]);
export const setnx = async (k, ttl = 864000) => (await cmd(['SET', k, '1', 'NX', 'EX', String(ttl)])) === 'OK';
export const push = (k, o) => cmd(['RPUSH', k, JSON.stringify(o)]);
export const all = async k => (await cmd(['LRANGE', k, '0', '-1'])).map(s => JSON.parse(s));
export const KINDS = ['calls', 'orders', 'signals', 'equity', 'errors', 'snaps', 'events'];
