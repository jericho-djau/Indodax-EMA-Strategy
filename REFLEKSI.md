# Refleksi: backtest vs forward test

## 1. Durasi dan bobot perbandingan
Forward test berjalan dari (ISI waktu mulai) sampai (ISI waktu ekspor final) WIB, yaitu sekitar (ISI) jam atau (ISI) candle 1 jam, bukan 10 hari. Alasan: forward test baru bisa dimulai pada 14 Nov setelah koneksi Vercel ke Indodax dan penjadwal selesai disiapkan, sedangkan tenggat pengumpulan 14 Nov 23.59 WIB. Akibatnya jumlah trade sangat sedikit (dashboard: (ISI) trade), sehingga return dan drawdown forward test tidak bisa dipakai untuk menilai kualitas strategi.

## 2. Kecocokan sinyal backtest vs bot
Dashboard (bagian Kecocokan sinyal): (ISI) dari (ISI) sinyal sama, yaitu (ISI)%. Kode sinyal dipakai bersama oleh bot dan backtest (lib/signal.js), dengan jendela tetap 500 candle tertutup. Sinyal yang berbeda: (ISI jumlah dan sebabnya, atau "tidak ada").

## 3. Selisih fill per trade
(Isi bila ada trade.) Selisih fill bot terhadap fill backtest: (ISI)%. Sumbernya: spread asumsi backtest vs terukur ((ISI)% vs (ISI)%, dari tabel Spread di dashboard), slippage dari menelusuri order book, dan keterlambatan jadwal antara penutupan candle dan panggilan bot. Bila tidak ada trade: tulis bahwa belum ada fill untuk dibandingkan, dan jelaskan bahwa log sinyal tetap bisa dibandingkan dengan backtest.

## 4. Spread backtest vs seluruh snapshot
Asumsi backtest per pair: (ISI). Median seluruh snapshot: (ISI). Jumlah snapshot: (ISI). Selisihnya: (ISI). Catatan: snapshot baru terkumpul sejak Redis dikosongkan sebelum freeze, jadi jumlahnya sedikit.

## 5. Uptime dan penjadwal
Dashboard (panel Operasional): (ISI) dari (ISI) candle diproses tepat waktu, uptime (ISI)%. Penjadwal GitHub Actions (cron menit ke-7) bisa terlambat atau terlewat, (ISI: cron-job.org sebagai cadangan). Panggilan manual dilakukan pada (ISI jam). Dampak: (ISI).

## 6. Kejadian operasional
- HTTP 403 dari Indodax terhadap fungsi Vercel pada 13 Nov 2026 sekitar 23.29 WIB; diperbaiki dengan mengganti User-Agent (tidak mengubah aturan).
- Sintaks workflow tick.yml diperbaiki.
- Redis dikosongkan sebelum freeze agar log tes tidak ikut terhitung.
- Error API selama forward test: (ISI jumlah dari dashboard). Kill switch: (ISI). Daily loss limit: (ISI).

## 7. Keterbatasan
- Forward test hanya beberapa jam, tanpa kesempatan melihat berbagai kondisi pasar.
- USDT/IDR hampir datar sehingga jarang menghasilkan sinyal.
- Backtest memakai fill di sekitar harga close dengan spread dan slippage terukur, bukan fill order book historis.
- Candle yang terlewat tidak diproses mundur oleh bot.

## 8. Kesimpulan
- Pada hasil backtest sayangnya belum bisa dilakukan beberapa hari yang diminta sehingga hasil yang akan didapatkan sangat minim. namun untuk kerangka, struktur, dan web telah dibuatkan sesuai permintaan dengan variabel yang telah saya pilih. Oleh karena itu bot akan terus berjalan hingga 10 hari kedepan tetapi file akan dikumpulkan pada tanggal 14 Nov 2026 pukul 23:00:00