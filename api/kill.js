import * as st from '../lib/store.js';
// POST /api/kill?on=1 (atau on=0) dengan header Authorization: Bearer <CRON_SECRET>. Tanpa deploy ulang.
export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });
  const on = String(req.query.on) === '1';
  await st.setObj('bot:kill', { on, ts: Date.now() });
  await st.push('log:events', { ts: Date.now(), type: on ? 'kill_switch_set_on' : 'kill_switch_set_off' });
  res.json({ ok: true, on });
}
