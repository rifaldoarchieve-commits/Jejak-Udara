# Ringkasan Audit Analitis — V8

| Tujuan booklet | Halaman dashboard | Kondisi V8 | Batasan / tindak lanjut |
| --- | --- | --- | --- |
| 1. Ruang & waktu serta acuan mutu | Overview, Spatial & Time | KPI, peta, tren, urutan stasiun dan pulau berdasarkan polutan terpilih; pembanding harian dan tahunan PM2.5/PM10 **indikatif** | Belum ISPU/IKU formal, belum melakukan validasi ketentuan kecukupan pengukuran regulasi |
| 2. Periode kritis | Episodes, Spatial | Tren jam, pola weekday–weekend, hari di atas ambang, durasi terpanjang, skala linear, missing dibedakan | Tidak tersedia data hotspot/atribusi sumber asap; gas memakai P95 relatif, bukan standar resmi |
| 3. Faktor variasi polutan | Spatial | Korelasi cuaca, regresi terstandar bersyarat pada waktu, arah angin sirkular, trafik, jarak jalan, site type | Tidak menyimpulkan penyebab atau faktor paling dominan secara kausal; membutuhkan uji sensitivitas multivariat lebih jauh |
| 4. Kesehatan & kerentanan | Health | 27 pasangan AQMS–RS, 7 indikator, lag 0–3, Pearson, estimasi asosiasi tersesuaikan + interval 95% HAC(7), kontras volume balita/lansia | Bukan estimasi dampak kausal atau risiko; data paparan titik stasiun bukan paparan setiap pasien |
| 5. Keterwakilan pemantauan | Data Quality | Audit 27 titik, QC, cakupan bulanan dan skor prioritas telaah transparan | Belum optimasi penempatan stasiun nyata; tidak ada populasi cakupan dan kendala geografis/perizinan dalam paket |
| 6. Interaktif/storytelling | Lima tab | Filter dan satu layar laptop; catatan caveat sesuai konteks | Perlu logo resmi panitia, izin publikasi data dan aset basemap sebelum GitHub Pages |

**Status:** V8 adalah revisi analitis yang lebih matang daripada V7, **belum versi final untuk dikumpulkan**. Data panitia bersifat sintetis.


## Audit lanjutan V8.1
Model lag 1–3 kini mengikutsertakan paparan akhir tahun sebelumnya. Perbedaan jumlah observasi antara model regresi dan tabel korelasi sudah dihilangkan. Lihat `validation/Jejak_Udara_V8_1_Laporan_Validasi.pdf` untuk audit numerik independen dan langkah lanjutan.
