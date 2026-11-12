// Jalankan di LAPTOP (bukan di Vercel). Menarik candle 1 jam MUNDUR sampai >=3 tahun. Maks ~3 request/detik, tidak paralel.
import fs from 'node:fs';
import { candles } from '../lib/indodax.js';
import { CFG } from '../lib/config.js';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = Math.floor(Date.now() / 1000), startT = now - (3 * 365 + 30) * 86400;
fs.mkdirSync('data', { recursive: true });
for (const p of CFG.pairs) {
  const m = new Map(); let to = now, req = 0;
  while (to > startT) {
    const arr = await candles(p, startT, to); req++; await sleep(400);
    if (!arr.length) break;
    const before = m.size; arr.forEach(b => m.set(b.t, b));
    if (m.size === before) break;
    to = arr[0].t - 1; process.stdout.write(`\r${p}: ${m.size} bar, ${req} request`);
  }
  const rows = [...m.values()].sort((a, b) => a.t - b.t);
  fs.writeFileSync(`data/${p}_60.csv`, 't,o,h,l,c,v\n' + rows.map(b => [b.t, b.o, b.h, b.l, b.c, b.v].join(',')).join('\n'));
  const t0 = rows[0]?.t ?? 0, first30 = rows.filter(b => b.t < t0 + 30 * 86400);
  const idrPerDay = first30.reduce((a, b) => a + b.c * b.v, 0) / 30;
  let gaps = 0; for (let i = 1; i < rows.length; i++) if (rows[i].t - rows[i - 1].t !== CFG.tfSec) gaps++;
  console.log(`\n${p}: data mulai ${new Date(t0 * 1000).toISOString().slice(0, 10)}, ${rows.length} bar, ${gaps} gap, rata-rata nilai transaksi 30 hari pertama = Rp${Math.round(idrPerDay).toLocaleString('id-ID')}/hari  <- bukti likuiditas di AWAL periode`);
}
