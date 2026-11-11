# Jejak Udara V9.5 — Episode Day Composition

Perubahan terfokus pada **Episodes → High-Concentration Days**. Ruang kosong di bawah empat kartu KPI digunakan untuk bilah komposisi jumlah hari dalam periode yang dipilih:

- Hijau: hari layak dengan konsentrasi <= ambang yang sedang dipilih.
- Amber: hari layak dengan konsentrasi > ambang.
- Abu-abu: hari yang tidak layak untuk dianalisis.

Angka mengikuti filter tahun, stasiun, polutan, dan pilihan ambang (PP 22/2021 / WHO / P95 jika tersedia). Jika ambang statistik tidak dapat dihitung, semua hari diperlakukan belum dapat diklasifikasi; bukan hari rendah. Pembanding standar tetap bersifat indikatif (minimal 18 jam valid per hari), bukan pernyataan evaluasi kepatuhan resmi.

**Tidak diubah:** lima tab lain, hasil K-Medoids/WDTW, logika agregasi polutan, parameter statistik, desain satu layar, dan sistem navigasi.

## Pengujian

- Sintaks `js/app.js` lolos `node --check`.
- Browser headless dengan aset di-inline berhasil merender tanpa kesalahan JavaScript pada 1366×768, 1536×864, 1920×1080; scroll dokumen tidak muncul.
- Uji 2025: Gambir PM2.5 PP22 menghasilkan 365 hari di bawah/sama ambang, 0 di atas, 0 kurang data; Marunda 0/365/0; Sampit 269/96/0; Sampit PM10 PP22 304/61/0; Sampit PM10 WHO 242/123/0. Semua angka berasal dari tabel harian olahan dalam paket.
