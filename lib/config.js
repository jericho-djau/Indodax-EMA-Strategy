// ATURAN BEKU. Ubah hanya sebelum freeze commit.
export const CFG = Object.freeze({
  pairs: ['btcidr', 'usdtidr', 'solidr'],      // "USD/IDR" di Indodax = USDT/IDR
  tfSec: 3600, tf: 60,                            // 1 jam
  ema: [50, 100, 150],
  lookback: 500,                                  // jendela tetap: bot & backtest hitung EMA dari 500 bar terakhir
  stopLossPct: 0.04,                              // stop loss berbasis close bar (sama di backtest & bot)
  capital: 100_000_000,
  maxPositions: 3,
  maxPosPct: 0.30,                                // maks 30% equity per posisi
  dailyLossPct: 0.03,                             // batas rugi harian 3% (hari WIB)
  // TARIF: nilai konservatif sementara. WAJIB cek /api/pairs + help.indodax.com, pakai yang lebih mahal.
  feeBuy: 0.0020555, feeSell: 0.0041555,
  minOrder: 25_000,
  maxSpread: 0.02,
  tzOffsetH: 7,
  fallbackHalf: 0.0005, fallbackSlip: 0.0005,     // dipakai backtest HANYA bila snapshot belum ada
  slipNotional: 30_000_000                        // nominal untuk mengukur slippage di snapshot
});
