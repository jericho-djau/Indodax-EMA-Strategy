# Refleksi: backtest vs forward test

## 1. Durasi dan bobot perbandingan
Forward test berjalan pada 14 Nov 2026 dari pukul 10.53 WIB (panggilan bot pertama setelah Redis dikosongkan dan commit freeze) sampai 22.07 WIB (ekspor final), yaitu sekitar 11 jam 14 menit atau 13 candle 1 jam (candle pukul 09.00 sampai 21.00 WIB), bukan 10 hari. Penyebabnya, koneksi Vercel ke Indodax dan penjadwal baru selesai disiapkan pada 13 sampai 14 Nov, sedangkan tenggat pengumpulan 14 Nov 23.59 WIB. Akibatnya forward test menghasilkan 0 trade dan return 0,00%. Angka itu hanya membuktikan bahwa bot berjalan tanpa error dan sinyalnya konsisten dengan backtest. Angka itu tidak bisa dipakai untuk menilai kualitas strategi.

## 2. Kecocokan sinyal backtest vs bot
Dashboard mencatat 39 dari 39 sinyal sama (100,00%), yaitu 13 candle dikali 3 pair. Backtest yang dijalankan ulang pada jendela forward dengan candle yang sama juga menghasilkan 0 trade, jadi tidak ada sinyal BUY atau SELL yang berbeda. Hasil ini sesuai harapan karena bot dan backtest memakai fungsi sinyal yang sama (lib/signal.js) dengan jendela tetap 500 candle tertutup.

## 3. Selisih fill per trade
Tidak ada order selama forward test, jadi tidak ada fill bot yang bisa dibandingkan dengan fill backtest (dashboard: "Belum ada order"). Selisih fill akibat spread, slippage, dan keterlambatan jadwal tidak bisa diukur pada data ini. Yang bisa diperiksa hanya kecocokan log sinyal (poin 2) dan ukuran spread (poin 4).

## 4. Spread backtest vs seluruh snapshot
Asumsi backtest sama dengan median seluruh snapshot: BTC/IDR 0,01% vs 0,01%, USDT/IDR 0,01% vs 0,01%, SOL/IDR 0,07% vs 0,07%, masing-masing dari 24 snapshot (angka dibulatkan dua desimal oleh dashboard). Kesamaan ini terjadi karena asumsi backtest dihitung dari snapshot yang sama (hasil ekspor yang sama), sehingga ini bukan validasi independen. Keterbatasannya, 24 snapshot hanya mencakup sekitar 11 jam pada siang sampai malam hari. Spread pada jam sepi (dini hari) bisa lebih lebar dan tidak terwakili.

## 5. Uptime dan penjadwal
Dashboard mencatat 13 dari 13 candle diproses tepat waktu (uptime 100,00%), dengan 24 panggilan bot dan 0 error API. Jumlah panggilan lebih banyak daripada jumlah candle karena (panggilan terjadwal GitHub Actions tiap jam pada menit ke-7). Panggilan tambahan untuk candle yang sama dilewati oleh idempotency (notes "dup"), jadi tidak ada order ganda. Jadwal GitHub Actions bisa terlambat, tetapi selama bot memproses candle sebelum candle berikutnya ditutup, uptime tidak berkurang.

## 6. Kejadian operasional
- 13 Nov 2026 sekitar 23.29 WIB: /api/server_time dari Vercel mengembalikan HTTP 403. Diperbaiki dengan mengganti header User-Agent di lib/indodax.js (tidak mengubah aturan strategi).
- Sintaks workflow tick.yml diperbaiki agar workflow terbaca.
- Redis dikosongkan (FLUSHDB) sebelum freeze agar log tes koneksi tidak ikut terhitung.
- Selama forward test: 0 error API, 0 pemakaian kill switch, 0 daily loss halt, 0 entri diblokir.

## 7. Hasil backtest 3 tahun dan keterbatasannya
Backtest sekitar 3 tahun (data mulai 16 Okt 2023, hasil ditampilkan untuk periode 3 tahun terakhir) menghasilkan hasil negatif: return total -69,12%, CAGR -32,41%, maximum drawdown -74,33%, dari 904 trade dengan win rate 11,73%. Rata-rata untung per trade Rp1.343.851 dan rata-rata rugi Rp265.256, sehingga profit factor 0,67. Porsi biaya (fee + spread + slippage) terhadap laba kotor adalah 221,87%. Karena rasio itu hanya terdefinisi bila laba kotor positif, artinya sebelum biaya strategi masih untung tipis, tetapi biaya lebih dari dua kali lipat laba kotor itu. Sebagai pembanding, buy and hold BTC/IDR pada periode yang sama +111,13%. Pada jendela forward, buy and hold BTC -2,71% (jendela backtest) dan -1,83% (forward, dari ask pertama ke bid terakhir; selisihnya karena titik awal dan akhir harga berbeda).

Keterbatasan lain:
- Forward test hanya beberapa jam, tanpa trade.
- USDT/IDR hampir datar sehingga jarang menghasilkan sinyal.
- Backtest memakai fill di sekitar harga close ditambah spread dan slippage terukur, bukan fill order book historis.
- Candle yang terlewat tidak diproses mundur oleh bot.

## 8. Kesimpulan
- Pada hasil backtest sayangnya belum bisa dilakukan beberapa hari yang diminta sehingga hasil yang akan didapatkan sangat minim. namun untuk kerangka, struktur, dan web telah dibuatkan sesuai permintaan dengan variabel yang telah saya pilih. Oleh karena itu bot akan terus berjalan hingga 10 hari kedepan tetapi file akan dikumpulkan pada tanggal 14 Nov 2026 pukul 23:00:00