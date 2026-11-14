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
- Sumber 1: https://indodax.com/api/pairs, diakses (3 Nov 2026).
  btcidr, usdtidr, solidr: trade_fee_percent_taker = 0.2%, trade_min_base_currency = 10000, quantity_increment = 1e-8.
- Sumber 2: https://help.indodax.com/hc/id/articles/4416646599705-Rincian-Biaya-Transaksi-di-INDODAX (3 Nov 2026).
  Tabel IDR Market, Pro Mode, Taker: beli all-in 0.20555%, jual all-in 0.41555%
  (service fee 0.20% + pajak 0% beli / 0.21% jual + CFX fee 0.00555%). Gambar tabel: bukti_tarif_indodax.png.
- Dipakai (lebih mahal di kedua sisi, sumber 2): beli 0.20555% (feeBuy = 0.0020555), jual 0.41555% (feeSell = 0.0041555) di lib/config.js.
- Minimum order: Rp25.000 (order langsung di mode Pro) dibanding Rp10.000 (API). Dipakai Rp25.000.

## Freeze (isi)
- Waktu mulai forward test (WIB): 2026-11-14 10:27:38
- Hash commit freeze: commit 2750d57bd3cfe35a568ba51db3aa4c941c131353 (HEAD -> main, origin/main)
- Commit freeze: 1e3a0ff (commit FREEZE pertama).
- Ada commit FREEZE kedua (2750d57) dan dua commit "catat hash freeze" (18968fa, f2436ab) karena perintah commit terjalankan dua kali. Isinya hanya README; lib/, api/, dan vercel.json tidak berubah sejak 1e3a0ff (dicek dengan git diff).
## Log bug (isi bila ada)
- 13 Nov 2026 sekitar 23.29 WIB: /api/server_time dari Vercel mengembalikan HTTP 403. Diperbaiki dengan mengganti header User-Agent di lib/indodax.js. Tidak mengubah aturan strategi.
- (14 Nov 2026): sintaks .github/workflows/tick.yml diperbaiki agar workflow terbaca. Hanya penjadwal, bukan aturan.
- (14 Nov 2026): Redis dikosongkan (FLUSHDB) sebelum freeze untuk membuang log tes koneksi. Tidak ada perubahan kode atau aturan.
## Catatan perilaku yang perlu dijelaskan di refleksi
- Penjadwal: GitHub Actions (cron menit ke-7 tiap jam), ditambah (ISI: cron-job.org sebagai cadangan, bila dipasang).
- Run manual lewat "Run workflow": (uji awal setelah freeze dan percobaan untuk menghindari risiko penjadwalan tertunda).
- Jadwal GitHub kadang terlambat atau terlewat. Dampaknya pada uptime dijelaskan di REFLEKSI.md.
- Kill switch (/api/kill) tidak dipakai selama forward test.