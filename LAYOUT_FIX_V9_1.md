# Jejak Udara V9.1 — Advanced Analytics layout correction

## Akar masalah

`css/viewport.css` menetapkan `.bento > .tile { grid-column: auto; }` untuk grid lama. Karena panel Advanced Analytics memakai kelas `bento ad-grid`, aturan itu mengalahkan `grid-area` pada `.ad-shape`, `.ad-map`, dll. Panel akhirnya berjejer di tiga kolom pertama dengan lebar sangat sempit, sementara sisi kanan kosong.

## Perbaikan

`css/advanced.css` diberi aturan dengan spesifisitas lebih tinggi menggunakan posisi eksplisit pada grid 12 kolom:

- Baris pertama: `Shape Clustering` (7/12) + `Station Geography` (5/12).
- Baris kedua: `Membership & Medoid` (6/12) + `Absolute Context` (3/12) + `Model Checks` (3/12).
- Tetap menggunakan tinggi layar dan navigasi atas; tidak mengubah perhitungan K=3/K=6, anggota, medoid, atau nilai validasi.
- Kartu anggota dan label legenda diberi ukuran teks lebih mudah dibaca.

## Cara mencoba

Ekstrak paket ZIP lalu buka `jejak_udara_v9_1_layout_fix/index.html#advanced` di Chrome, zoom 100%. Pilih K=3 atau K=6; navigasi ke tab lain harus tetap berjalan.

## Pengujian

Diperiksa struktur HTML/CSS, skrip JavaScript, dataset keanggotaan, serta mekanisme tab dan interaksi di pengujian JS. Pratinjau browser otomatis mungkin dibatasi oleh kebijakan browser lingkungan eksekusi; periksa tampilan final di Chrome lokal.
