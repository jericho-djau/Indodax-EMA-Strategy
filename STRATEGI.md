# Strategi tertulis: EMA 50/100/150, timeframe 1 jam, long-only

**Universe (3 pasangan IDR):** BTC/IDR, USDT/IDR (Indodax tidak punya "USD/IDR"; USDT adalah stablecoin USD), SOL/IDR.
Kriteria: pasangan paling likuid di Indodax. Anti-survivorship: `npm run fetch` mencetak rata-rata nilai transaksi harian
pada 30 hari PERTAMA data backtest tiap pasangan. Tempel angkanya di bawah (isi sendiri setelah menjalankan).
Catatan: USDT/IDR hampir datar, sehingga sinyal EMA jarang muncul. Ini wajar dan harus dijelaskan di refleksi.

| Pair | Nilai transaksi rata-rata/hari, 30 hari pertama backtest |
|---|---|
| btcidr | (isi) |
| usdtidr | (isi) |
| solidr | (isi) |

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
(isi sendiri: strategi UTS saham harian diganti ke EMA 50/100/150 1 jam untuk kripto; alasan dan tanggal)
