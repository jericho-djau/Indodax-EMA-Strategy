# Strategi tertulis: EMA 50/100/150, timeframe 1 jam, long-only

**Universe (3 pasangan IDR):** BTC/IDR, USDT/IDR (Indodax tidak punya "USD/IDR"; USDT adalah stablecoin USD), SOL/IDR.
Kriteria: pasangan paling likuid di Indodax. Anti-survivorship: `npm run fetch` mencetak rata-rata nilai transaksi harian
pada 30 hari PERTAMA data backtest tiap pasangan. Tempel angkanya di bawah (isi sendiri setelah menjalankan).
Catatan: USDT/IDR hampir datar, sehingga sinyal EMA jarang muncul. Ini wajar dan harus dijelaskan di refleksi.

**Kriteria pemilihan:** pasangan IDR dengan nilai transaksi harian rata-rata di atas Rp1 miliar, diukur pada 30 hari pertama data (16 Okt sampai 15 Nov 2023), yaitu 30 hari tepat sebelum backtest dimulai. Pengukuran memakai kondisi awal periode, bukan kondisi hari ini, supaya tidak terkena survivorship bias.

| Pair | Nilai transaksi rata-rata per hari (30 hari pertama, mulai 16 Okt 2023) | Bar 1 jam | Gap |
|---|---|---|---|
| btcidr | Rp21.883.334.805 | 27.001 | 0 |
| usdtidr | Rp36.698.512.006 | 27.001 | 0 |
| solidr | Rp3.682.493.379 | 27.001 | 0 |

Nilai transaksi dihitung dari jumlah (close x volume) per bar, dicetak oleh `npm run fetch` (`scripts/fetch_history.js`). Ketiga pair lolos kriteria pada awal periode, dan ketiganya punya data lengkap tanpa gap selama 3 tahun lebih.

Catatan: tanggal mulai data (16 Okt 2023) adalah batas penarikan data oleh skrip (3 tahun + 30 hari buffer pemanasan EMA), bukan tanggal pasangan itu pertama kali listing.

**Aturan masuk (BUY):** pada candle 1 jam yang BARU TERTUTUP, `close > EMA50 > EMA100 > EMA150` terpenuhi, dan pada candle sebelumnya
susunan itu belum terpenuhi (sinyal hanya saat susunan baru terbentuk). Posisi saat itu harus flat. Eksekusi: beli di ask order book.

**Aturan keluar (SELL), dicek setiap candle tertutup (artinya jam keluar = jam penutupan candle, tiap jam pada menit ke-7 saat bot jalan):**
1. Cut off tren: `close < EMA100`.
2. Stop loss: `close <= harga close sinyal masuk x (1 - 4%)`.
Eksekusi: jual di bid.

**Sizing:** maksimal 30% equity per posisi, maksimal 3 posisi terbuka (satu per pair), tanpa short/margin/leverage.
**Risk:** daily loss limit 3% (hari WIB, ganti 00.00 WIB), kill switch (`/api/kill` atau env `KILL_SWITCH=1`), idempotency per candle, retry terbatas (3x).
**EMA:** dihitung dari jendela tetap 500 candle tertutup terakhir (seed = SMA n bar pertama), identik di bot dan backtest.

## Catatan perubahan dari versi UTS
## Catatan perubahan dari versi UTS
- Aset dan timeframe: dari saham harian (UTS) menjadi kripto IDR di Indodax, timeframe 1 jam. Alasan: pasar kripto buka 24 jam dan soal UAS mewajibkan data live Indodax.
- Aturan masuk dan keluar: diganti ke susunan EMA 50/100/150. Masuk saat close > EMA50 > EMA100 > EMA150 baru terbentuk. Keluar saat close < EMA100 atau close turun 4% dari harga sinyal masuk.
- Sizing dan risk: maks 3 posisi, 30% equity per posisi, daily loss limit 3% (hari WIB), kill switch, idempotency per candle.
- Perubahan dilakukan sebelum freeze (commit 1e3a0ff). Tidak ada perubahan aturan setelah freeze.
