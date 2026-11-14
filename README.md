# Bot dry run Indodax: EMA 50/100/150 (1 jam)

Dry run: tidak ada uang sungguhan, tidak ada API key Indodax. Strategi lengkap: lihat `STRATEGI.md`. Semua aturan ada di `lib/config.js`.

## Peta file
- `lib/signal.js` fungsi sinyal tunggal (dipakai bot dan backtest) · `lib/exec.js` fill dari order book
- `api/tick.js` bot (dipanggil tiap jam) · `api/kill.js` kill switch · `api/export.js` ekspor log · `api/data.js` data dashboard
- `scripts/fetch_history.js` tarik data 3 tahun · `scripts/backtest.js` · `scripts/export_logs.js` · `scripts/hitung_ulang.js`
- `public/index.html` dashboard (Vercel dan sumber file offline)

## Prosedur dari nol

**A. Persiapan (laptop)**
1. Pasang Node.js 20+ dan Git. Buat repositori GitHub PUBLIK baru, lalu `git init` di folder ini dan push.
2. `npm run fetch` (butuh beberapa menit; jangan paralel). Hasil: `data/*_60.csv`. Catat angka likuiditas yang tercetak ke `STRATEGI.md`.
3. Cek tarif dan minimum order, catat URL + tanggal akses di bagian "Bukti tarif" di bawah:
   `https://indodax.com/api/pairs` (`trade_fee_percent_taker`, `trade_min_base_currency`) dan halaman Rincian Biaya Transaksi di help.indodax.com.
   Pakai angka yang LEBIH MAHAL, lalu ubah `feeBuy`, `feeSell` di `lib/config.js` (nilai sekarang hanya placeholder konservatif).

**B. Deploy ke Vercel**
4. Vercel > Marketplace > Upstash Redis (gratis). Buat database; Vercel mengisi `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN`.
5. Vercel > Add New Project > impor repositori. Tambahkan env var `CRON_SECRET` (string acak panjang) dan `KILL_SWITCH=0`. Deploy.
6. Uji koneksi ke Indodax dari Vercel:
   `curl -H "Authorization: Bearer $CRON_SECRET" https://NAMA.vercel.app/api/tick`
   Hasil `{"ok":true,...}` berarti lolos. Bila error HTTP dari Indodax, laporkan ke dosen. Tanpa header secret harus 401.
7. GitHub repo > Settings > Secrets > Actions: tambahkan `CRON_SECRET` (sama) dan `BOT_URL` (`https://NAMA.vercel.app`).
   Workflow `.github/workflows/tick.yml` memanggil bot tiap jam pada menit ke-7. Jalankan sekali manual lewat tab Actions untuk mengetes.

**C. Freeze (lakukan setelah langkah 1–7 beres)**
8. Isi bagian "Freeze" di bawah dengan waktu mulai nyata, `git commit` dan `git push`. Commit ini adalah bukti freeze. Jangan force-push.
   Setelah ini jangan ubah `lib/config.js`, `lib/signal.js`, `lib/exec.js`. Perbaikan bug yang tidak mengubah aturan dicatat di "Log bug".

**D. Selama forward test**
9. Pantau `https://NAMA.vercel.app` (dashboard memanggil `/api/data`). Kill switch: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" "https://NAMA.vercel.app/api/kill?on=1"` (matikan dengan `on=0`).

**E. Pengumpulan**
10. `.env` lokal berisi `CRON_SECRET` dan `BOT_URL` (salin dari `.env.example`; muat dengan `export $(cat .env | xargs)`).
11. `npm run export` (log mentah ke `logs/*.csv` dan `logs/export.json`).
12. `npm run fetch` lagi agar candle jendela forward ikut terunduh, lalu `npm run backtest` (spread sekarang dari snapshot terukur).
13. `npm run hitung` menghasilkan `dashboard_offline.html`, `logs/payload.json`, `data/gap_result.json`. Commit `data/backtest_result.json` dan `data/gap_result.json`, push, redeploy agar dashboard Vercel ikut menampilkannya.
14. Tulis refleksi (`REFLEKSI.md`): selisih backtest vs forward dalam angka (fill, spread terukur vs asumsi, keterlambatan penjadwal, uptime).
15. ZIP semuanya (termasuk folder `.git`, tanpa `.env`) dan kirim ke RISE dengan link Vercel dan repositori di kolom catatan.

## Bukti tarif (isi)
- /api/pairs, diakses (tanggal): taker = ...
- Halaman rincian biaya, URL + tanggal: taker all-in = ...
- Dipakai: ...
- Minimum order dipakai Rp25.000 (Pro) vs `trade_min_base_currency` = ...

## Freeze (isi)
- Waktu mulai forward test (WIB): 2026-11-14 10:27:38
- Hash commit freeze: 
## Log bug (isi bila ada)
- 12 Nov 2026: /api/server_time dari Vercel mengembalikan HTTP 403. Diperbaiki dengan mengganti header User-Agent di lib/indodax.js (tidak mengubah aturan strategi).
- 14 Nov 2026: Redis dikosongkan (FLUSHDB) sebelum freeze untuk membuang log tes koneksi 12-14 Nov. Tidak ada perubahan kode atau aturan.
## Catatan perilaku yang perlu dijelaskan di refleksi
- Candle yang terlewat (jadwal GitHub terlambat/tidak jalan) tidak diproses mundur; bot memproses candle tertutup terbaru. Ini turun ke angka uptime.
- Kill switch hanya memblokir entri baru; exit tetap berjalan. Setiap pemakaian tercatat di `log:events`.
- Fill backtest = close candle ± (setengah spread + slippage) terukur; fill bot = menelusuri order book sungguhan. Selisihnya adalah bahan refleksi.
- Kuantitas dibulatkan ke bawah sesuai `volume_precision` dari /api/pairs. Kenaikan harga tidak perlu dibulatkan karena fill mengikuti level order book.
