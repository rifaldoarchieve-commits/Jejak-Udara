# Jejak Udara V9 — Advanced Analytics (K-Medoids + WDTW)

Versi ini memperluas Jejak Udara V8.1 Validated dengan tab keenam **Advanced Analytics**. Lima tab asli dan desain dashboard satu layar tidak diubah secara substantif.

## Cara membuka
1. Ekstrak folder ZIP secara lengkap.
2. Buka `index.html` di Chrome/Edge. Jika browser membatasi akses file lokal, jalankan server statis lokal dari folder ini, misalnya `python -m http.server 8000`, dan buka `http://localhost:8000`.
3. Klik tab **Advanced Analytics**. K=6 adalah mode awal; **K=3 · pembanding** adalah opsi sekunder.
4. Klik kurva legenda klaster, kartu anggota, batang ringkasan, atau titik peta untuk mengeksplorasi. CSV hasil dapat diunduh dari panel validasi.

## Input dan keputusan analisis
- Sumber: 27 berkas AQMS sintetis Gelar Rasa 2026 dan `sites.csv` untuk konteks stasiun. **Data kesehatan dan meteorologi tidak menjadi variabel clustering**.
- Objek: stasiun. Periode: Januari–Desember **2025**, parameter: **PM2.5 µg/m³**. Kedua filter di layar dikunci hanya untuk tab Advanced Analytics; filter lama tetap berlaku pada tab lain.
- Stasiun layak: **20/27**. Tiga stasiun berlabel ppm dikecualikan karena tidak tersedia dasar penyamaan unit partikulat; empat stasiun lain tidak lolos kriteria kelengkapan.
- QC: gunakan `VALID` dengan pengukuran nonnegatif numerik terbatas; kelompokkan pengukuran 15 menit ke jam unik; minimal 18 jam layak per hari, minimal 20 hari per bulan untuk masing-masing dari 12 bulan.
- Input model: **matriks 20 stasiun × 12 bulan** berisi rata-rata PM2.5 bulanan yang distandardisasi dengan **Z-score per stasiun**. WDTW dengan `g=0,05`, K-Medoids/PAM.
- Output: K=6 utama (7/6/3/2/1/1), silhouette WDTW **0,649270**, dua singleton (Cisarua, Baranangsiang). Pembanding K=3 (11/7/2), silhouette **0,554639** tanpa singleton.
- Uji sensitivitas K=6: ARI 2024 bulanan 1,000; ARI 2025 mingguan 0,853; tanpa Z-score ARI 0,491. Uji `g` 0–0,25 menghasilkan ARI 1,000 terhadap K=6 utama. ARI merupakan kesepakatan keanggotaan, tidak menunjukkan validasi eksternal atau kausalitas.

## Cara membaca tab
1. **Shape Clustering:** kurva rata-rata Z-score anggota dalam klaster. Klik legenda untuk fokus pada salah satu pola.
2. **Peta:** 20 marker berwarna menurut klaster, 7 marker abu untuk stasiun yang tidak dianalisis; peta garis Natural Earth (elemen kartografi).
3. **Membership & Medoid:** anggota tiap klaster dan stasiun medoid; klik klaster untuk fokus.
4. **Absolute Context:** rata-rata konsentrasi tahunan asli pada setiap klaster (µg/m³), hanya untuk interpretasi setelah pengelompokan; *bukan* faktor yang menentukan jarak WDTW.
5. **Model Checks:** silhouette K2–K6 dan kestabilan ARI; tautan unduh CSV hasil K3 dan K6.

## Batasan utama
- Data dari panitia bersifat **sintetis**, bukan kondisi operasional aktual Indonesia.
- K=6 mengandung dua klaster beranggota tunggal: silhouette individual = 0 menurut konvensi implementasi. Keduanya berfluktuasi sangat kecil dalam satuan asli; Z-score membuat fluktuasi kecil itu tampak besar secara relatif.
- WDTW tidak otomatis lebih unggul daripada DTW biasa; perbandingan formal dengan DTW/algoritma lain **belum dilakukan dalam tab ini**.
- Klaster menjelaskan **kemiripan bentuk profil PM2.5 sepanjang 2025**, bukan peringkat polusi nasional, risiko kesehatan, atau bukti penyebab pencemaran.
- Tidak ada perubahan komputasi ulang saat pengguna memilih stasiun: angka clustering merupakan hasil model pra-hitung, dan pilihan hanya memfokuskan tampilan. Pilihan tahun/parameter lain baru berlaku pada lima tab sebelumnya.

## Berkas tambahan
- `data/wdtw.js`: data agregat & hasil model prahitung untuk tampilan offline.
- `data/advanced_memberships_2025.csv`: tabel gabungan K3/K6 yang dapat diunduh melalui dashboard.
- `analysis/*`: salinan ringkasan data bulanan, hasil K=6, uji sensitivitas, dan grafik asli.
- `js/advanced.js`, `css/advanced.css`: seluruh komponen tab Advanced Analytics.
- `README.md`: dokumentasi V8.1 dasar.

## Validasi teknis saat pembuatan
- `node --check` lulus untuk `js/app.js` dan `js/advanced.js`.
- Uji komponen melalui JS runtime: K=6 berisi 6 kartu klaster dan 20 marker, K=3 menampilkan 3 kartu, peta dan kurva SVG terisi, serta nilai silhouette muncul sesuai sumber.
- Pengujian browser otomatis **tidak dapat dijalankan pada lingkungan penyusunan ini karena kebijakan browser terkelola** (`ERR_BLOCKED_BY_ADMINISTRATOR`). Oleh karena itu, sebelum deployment GitHub Pages, periksa tampilan, tombol, dan ukuran layar dengan Chrome lokal; jangan menganggap sudah lolos pengujian visual akhir.
- Untuk pengumpulan lomba, tambahkan logo panitia, pastikan izin publikasi data turunan dan penggunaan aset basemap, serta selaraskan kesimpulan dengan booklet.
