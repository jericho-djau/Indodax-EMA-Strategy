import * as st from '../lib/store.js';
export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });
  const out = { state: await st.getObj('bot:state') };
  for (const k of st.KINDS) out[k] = await st.all('log:' + k);
  res.json(out);
}
