import fs from 'node:fs';
import { toCSV } from '../lib/io.js';
const r = await fetch(process.env.BOT_URL + '/api/export', { headers: { Authorization: 'Bearer ' + process.env.CRON_SECRET } });
if (!r.ok) throw new Error('export gagal: HTTP ' + r.status);
const j = await r.json(); fs.mkdirSync('logs', { recursive: true });
fs.writeFileSync('logs/export.json', JSON.stringify(j));
for (const k of ['calls', 'orders', 'signals', 'equity', 'errors', 'snaps', 'events']) fs.writeFileSync(`logs/${k}.csv`, toCSV(j[k] || []));
console.log('tersimpan di logs/:', Object.fromEntries(['calls', 'orders', 'signals', 'equity', 'errors', 'snaps', 'events'].map(k => [k, (j[k] || []).length])));
