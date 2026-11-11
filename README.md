# Jejak Udara V9.4 — Compact Overview & Episodes

Tampilan dark dashboard satu layar dari V9.3 dipertahankan. Revisi lokal: **benchmark Station Snapshot tidak terpotong** dan bagian atas **Pollution Episodes lebih padat**, sementara timeline diperbesar.

Pada panel Episodes terdapat dua metrik ringkas tambahan: **hari layak dianalisis / hari kalender yang tercakup** dan **persentase hari di atas ambang dari hari layak**. Interpretasi perbandingan regulasi tetap bersifat indikatif.

Lihat `UPDATE_V9_4.md` untuk catatan perubahan.

**V9.2:** See `UPDATE_V9_2.md` for focused-cluster plot controls and complete 6-cluster Absolute Context panel.

# JEJAK UDARA V8.1 — ANALYTIC VALIDATION

**Versi V8.1 telah melalui audit statistik dan koreksi model lag lintas tahun.** Antarmuka dan tema dark tetap sama dengan V8. Lihat `validation/Jejak_Udara_V8_1_Laporan_Validasi.pdf` untuk angka yang diverifikasi.

**Dashboard interaktif tanpa scroll untuk desktop** (HTML/CSS/JavaScript, offline) yang disesuaikan dengan enam tujuan *Booklet Case Study Dashboard Analysis Gelar Rasa 2026*. Seluruh data lingkungan dan kesehatan **SINTETIS** dari paket CSV panitia. Proyek ini belum dianggap versi siap-publikasi resmi.

## Penggunaan

1. Ekstrak ZIP. Buka `jejak_udara_v8_analytic/index.html` menggunakan Chrome atau Edge. Tidak diperlukan akses internet untuk fungsi utama.
2. Navigasi lima tab di bagian atas. Tahun, polutan, dan stasiun dikendalikan dari header.
3. Khusus tab Health, parameter dikunci pada **PM2.5**. Bagian meteorologi pada Spatial & Time juga secara tegas berlabel **PM2.5**; sementara tren, ranking, profil 24 jam, dan hari kerja/akhir pekan mengikuti polutan global.
4. Episodes mengikuti polutan. Untuk PM2.5 tersedia pembanding PP22 55 µg/m³, WHO 15 µg/m³; PM10: PP22 75 dan WHO 45 µg/m³. Polutan lainnya **P95 relatif dari data panitia 2024**, bukan ambang hukum. Untuk PM2.5/PM10 P95 juga dapat dipilih.
5. Data Quality mempertahankan Overall Dataset dan Filtered Quality. Skor jaringan adalah **prioritas telaah dataset sintetis**, bukan prioritas pembangunan fasilitas nyata.
6. Zoom panel satu layar tetap berfungsi pada desktop. Di mobile dan saat browser di-zoom besar, fitur *fit-to-screen* mungkin memperkecil teks.

## Perubahan dibanding V7

- **Konsistensi filter:** pemeringkatan pulau, pola 24 jam dan hari kerja/akhir pekan kini mengikuti enam polutan yang terpilih. Analisis driver dan kesehatan tetap khusus PM2.5 dan **jelas diberi label**.
- **Episodes:** PM2.5/PM10 mengikuti parameter, gas hanya P95. Grafik harian memakai **skala linear**, bukan transformasi akar; hari tanpa cukup data dibedakan. Frekuensi tiap bulan ditulis `hari > ambang / hari layak`.
- **Overview:** minimum pembanding pemeringkatan antarstasiun diperkuat menjadi 120 hari layak per tahun (pilihan eksploratif), ditambah indikator perbandingan tahunan PP 22/2021 secara **indikatif** untuk 2024–2025 jika tersedia ≥75% hari layak.
- **Kesehatan:** 27 pasangan resmi dari booklet, lag 0–3 hari, Pearson harian, **regresi OLS penyesuaian** perubahan kasus per +10 µg/m³ PM2.5 dengan kontrol suhu, kelembapan, angin, bulan, hari dalam minggu, dan tren waktu; ketidakpastian dilaporkan berupa **interval 95% HAC(7)**. Tambahan perbandingan deskriptif jumlah kasus ISPA balita/lansia pada kuartil PM2.5 bawah dan atas.
- **Meteorologi:** arah angin per jam dihitung menggunakan rerata sirkular (sin/cos), tidak lagi rata-rata derajat secara linear.
- **Jaringan:** tiga lokasi prioritas audit berdasarkan rumus skenario yang transparan: `100 × [0.4 × (1 − proporsi slot jam QC VALID) + 0.4 × min(jarak stasiun terdekat / 500 km, 1) + 0.2 × (1 − min(jumlah stasiun paket pada pulau / 7, 1))]`. **Skor ini bukan model optimasi lokasi fasilitas** dan bukan angka standar nasional.

## Sumber dan cakupan

- 27 file `*_AQMS.csv`, `sites.csv`, `sensors.csv`, `hospitals.csv`, `HLT-01_health_outcomes_daily.csv`, serta metadata dari paket **Synthetic Metropolitan AQMS Dataset** panitia.
- Booklet halaman 2–3: enam tujuan; 4–7: pasangan AQMS–rumah sakit; 7–8: satuan serta timestamp WIB; 9: definisi variabel kesehatan.
- `data/data.js` dan `data/quality.js` berasal dari preprocessing dashboard sebelumnya. `data/case.js` diproduksi oleh `scripts/build_case.py`. **Baru:** `data/v8.js`, dihasilkan melalui `scripts/build_v8.py` menggunakan CSV panitia.
- `assets/map_geometry.js` berisi geometri Natural Earth untuk basemap, **tidak digunakan sebagai dataset polutan, epidemiologi, atau data tambahan untuk membenarkan temuan**. Konfirmasi aturan panitia soal aset eksternal sebelum publikasi.

## Prinsip metodologis dan kehati-hatian

1. AQMS: label `qc_flag=VALID`, angka nonnegatif terhingga dan rentang waktu resmi; beberapa stasiun memiliki jendela 15 menit yang dirangkum pada jam unik. Hari digunakan bila ≥18 jam dengan parameter valid (batas **eksploratif**). Tiga stasiun dengan PM2.5 berlabel `ppm` tidak digabungkan dengan µg/m³.
2. Pembanding PP22 dan WHO **bukan ISPU**, bukan evaluasi pelanggaran formal, bukan interpretasi risiko klinis. WHO 2021 menggunakan ketentuan evaluasi persentil ke-99 untuk nilai 24 jam. Rerata tahunan 2026 **tidak ditampilkan sebagai pembanding tahunan penuh**.
3. Regresi model kesehatan adalah **asosiasi statistik**, bukan ukuran risiko populasi atau efek kausal. Estimasi per +10 µg/m³ mencerminkan model linear, dapat tidak stabil bila variasi PM2.5 kecil atau faktor penyesuaian berkorelasi kuat. Interval HAC(7) menangani sebagian autokorelasi residual, tidak membuktikan kecukupan model. Perlu cek asumsi model, potensi *overdispersion*, *multiple testing*, dan stabilitas hasil. Angka balita/lansia adalah **jumlah kasus**, tanpa populasi berisiko.
4. *Site Type*, jarak jalan, dan trafik merupakan metadata konteks; tidak membuktikan sumber polusi. Korelasi/regresi lingkungan bersifat eksploratif.
5. Skor jaringan hanya menggambarkan **keterwakilan 27 titik sintetis dalam paket**, bukan jumlah stasiun aktual Indonesia. Peta tidak menginterpolasi konsentrasi antarwilayah.
6. 2026 sampai **14 Oktober** saja. Data sintetis tidak boleh diklaim sebagai pantauan udara aktual Indonesia.
7. Detail publikasi situs: tambahkan logo resmi Gelar Rasa, izin publikasi data turunan, dan konfirmasi kebijakan aset basemap eksternal.

## Reproduksi

```bash
python scripts/build_case.py /path/ke/folder-csv
python scripts/build_v8.py /path/ke/folder-csv
python scripts/test_features.py
python scripts/test_v8.py
```

Diperlukan `pandas`, `numpy`, dan `playwright` untuk pengujian browser (pembuatan data tidak memakai layanan eksternal). Uji browser pernah berhasil pada resolusi 1366×768, 1536×864, dan 1920×1080.

## Referensi regulasi (bukan data analisis)

- PP Nomor 22 Tahun 2021 Lampiran VII: https://ppkl.menlhk.go.id/website/filebox/999/2107071506548.%20Lampiran%20VII%20Salinan%20PP%20Nomor%2022%20Tahun%202021.pdf
- WHO Global Air Quality Guidelines 2021: https://www.who.int/publications/i/item/9789240034228


## Validasi statistik V8.1 (November 2026)

- Kesalahan model lag 1–3 pada tanggal awal tahun telah diperbaiki: paparan di Desember tahun sebelumnya kini digunakan apabila tersedia. Sebelumnya regresi tidak memasukkan hari-hari tersebut, sementara tabel korelasi memasukkannya.
- Jumlah observasi 1.848 model regresi sekarang tepat sama dengan jumlah pasangan pada tabel korelasi V8.1 untuk model yang tersedia. Sebanyak 72 model `resp` telah diperiksa secara independen dari file CSV (6 stasiun x 3 tahun x 4 lag), selisih estimasi kurang dari atau sama dengan 0,0005 karena pembulatan.
- Uji independen terhadap 17 stasiun-tahun PM2.5 menunjukkan selisih rerata maksimum 0,000382 µg/m³ dari JSON (pembulatan), dan jumlah hari di atas 55 µg/m³ cocok untuk semua contoh tersebut.
- Model OLS HAC(7) menggunakan koreksi derajat bebas `n/(n-k)`; dapat direplikasi menggunakan `statsmodels` dengan `cov_kwds={'maxlags':7,'use_correction':True}`. Tidak ada pengujian penyebab kausal atau pengukuran risiko populasi.
- Ada 1.848 kombinasi model yang tersedia; 496 interval kepercayaan nominal 95% tidak memotong nol. Angka ini **tidak boleh** dianggap 496 temuan konfirmatori, karena banyaknya perbandingan dan struktur sintetis dataset. Gunakan hasil eksploratif, hindari cherry-picking.
- **Sampit 2025**: `resp` vs PM2.5 memiliki korelasi Pearson 0,8236, tetapi korelasi setelah setiap variabel dikurangi rata-rata per bulannya hanya 0,0387. Ini menunjukkan sebagian besar hubungan sederhana terkait pola perubahan antarbulan.
- Folder `validation/` berisi laporan PDF serta empat CSV audit yang dapat dijadikan pemeriksaan silang.

**Perubahan teknis utama terhadap V8:** `scripts/build_v8.py` dan hasilnya `data/v8.js`. File UI (`index.html`, `css/`, `js/`) dipertahankan supaya desain dashboard tidak berubah.

---

## Pembaruan V9 — Advanced Analytics

Tambahan tab keenam untuk K-Medoids + WDTW, dengan **K=6 utama** dan **K=3 pembanding**, profil waktu bulanan 2025, peta kelompok, keanggotaan medoid, perbandingan konsentrasi asli dan metrik validasi. Baca `ADVANCED_ANALYTICS_GUIDE.md` untuk metode, penggunaan tab, batasan interpretasi, dan status pengujian browser.

## V9.5 — Episodes
Ringkasan komposisi hari dengan bilah tiga warna ditambahkan agar area KPI Episode lebih informatif; lihat `UPDATE_V9_5.md`.
