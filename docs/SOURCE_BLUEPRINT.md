# Study Assistant UT — Blueprint Implementasi

Tanggal: 3 November 2026. Status: rancangan berdasarkan arsip yang diberikan; belum merupakan aplikasi atau integrasi aktif.

## 1. Tujuan dan keputusan yang sudah diketahui

Dashboard pribadi untuk mahasiswa Sistem Informasi Universitas Terbuka, lintas semester. Alur utama: tentukan kegiatan hari ini → buka materi relevan → kerjakan diskusi/tugas/latihan → catat progres → review.

- Proyek baru dari awal menggunakan TanStack; usulan implementasi memakai TanStack Start, React, TypeScript dan Cloudflare Workers.
- Akun Workers dan bucket R2 milik pengguna sudah tersedia. Akses ke akun tersebut belum diberikan atau diuji.
- Vault lokal pada Mac disinkronkan dengan Remotely Save melalui S3-compatible R2; metode enkripsi RClone Crypt.
- Tracker Tuton yang diketahui: https://docs.google.com/spreadsheets/d/1ogN0IBD6JGMM6_NQHiCbKIEEB5GBsCV52Ij-X0iITP8/edit
- Integrasi Google Sheets memakai API resmi; kalender memakai Google Calendar. Tidak menggantungkan aplikasi pada sesi konektor percakapan ini.
- Fitur belajar: pengelolaan catatan, tugas, kalender, latihan dan review jawaban, serta rencana belajar berdasarkan tenggat dan progres.

## 2. Bukti dari arsip

Inventaris seluruh nama file dan pemindaian teks Markdown dilakukan. Pembacaan mendalam difokuskan pada University Hub, dashboard semester 2, KRS, Course Hub Bahasa Inggris dan Statistika, contoh materi, diskusi, tes formatif, kunci jawaban, dan monitoring; bukan audit akademik seluruh isi 486 catatan.

| Arsip | Temuan |
|---|---|
| University.zip | 486 catatan Markdown; 13 Course Hub: 6 semester 1 dan 7 semester 2 |
| MKDI4201 - Bahasa Inggris.zip | 51 catatan Markdown; seluruhnya identik byte demi byte dengan salinan di University.zip |
| Konten visual | 23 blok Mermaid dan 82 catatan yang mengandung penanda rumus display `$$` pada arsip University |
| Dataview | 12 blok query DQL; tidak ditemukan blok dataviewjs |
| Tasks/templat/Canvas | Tidak ditemukan blok query tasks, file .canvas, atau sintaks templat yang dipindai (`<%`, `{{date`, `{{title`); ini tidak membuktikan plugin tersebut tidak digunakan di vault lengkap |
| Lampiran | Tidak ada file PDF atau gambar dalam kedua arsip; University memuat satu DOCX |

Hierarki sumber: University → Universitas Terbuka - Sistem Informasi → Semester → Administrasi / Mata Kuliah → Course Hub / Materi / Diskusi / Tugas / Rangkuman / Monitoring / Ujian.

Properties yang sudah bermanfaat: semester, course_code, course_name, module, module_number, lecture_number, activity_type, session_number, assessment, status, source_course_code, source_edition, source_notes, related, confidence, created dan updated. Metadata tidak seragam di semua file; importer harus mempertahankan field yang tidak dikenali, menampilkan kekurangan metadata, dan tidak menulis normalisasi massal.

## 3. Aturan domain yang menentukan implementasi

1. **Status catatan, status pemahaman, status pengumpulan dan nilai harus terpisah.** Catatan berstatus working bukan bukti tugas belum dikumpulkan; complete pada materi bukan bukti seluruh latihan dikerjakan. Jawaban diskusi siap dikirim bukan bukti sudah diposting ke LMS.
2. **Checkbox tidak selalu tugas.** Pemindaian menemukan 2.583 baris checkbox pada University, termasuk opsi A/B/C/D latihan. Angka ini bukan jumlah pekerjaan. Klasifikasikan berdasarkan jenis catatan, heading dan konteks; jangan buat agenda dari semua checkbox.
3. **Sesi Tuton tidak identik dengan modul BMP.** Contoh D06 Bahasa Inggris merujuk Modul 7. Simpan hubungan sesi–modul secara eksplisit, boleh banyak ke banyak.
4. **Kode registrasi dan kode sumber berbeda.** Bahasa Inggris memakai course_code MKDI4201 dan source_course_code MKWI4201. Catatan Statistika memakai MKKI4201 sementara sumber SATS4121 masih ditandai perlu konfirmasi kesetaraan. Jangan menggabungkan identitas atau mengisi SKS berdasarkan sumber secara otomatis.
5. **Kunci cetak dapat bermasalah.** Kunci Tes Formatif 1 Modul 6 Bahasa Inggris ditandai tidak cocok dengan soal. Review harus menampilkan catatan ini dan tidak menghasilkan nilai pasti dari kunci tersebut. Soal esai dan latihan berbobot membutuhkan rubrik yang jelas.
6. **Path arsip bukan seluruh path vault.** Banyak link memakai prefix `6 - Main Notes/Workspaces/University`, dan sebagian merujuk sumber BMP atau indeks di luar ZIP. Simpan logical vault root/prefix mapping. Target yang tidak disertakan ditandai belum tersedia, bukan langsung dianggap rusak.
7. **Nama berkas seperti `00 - Course Hub` berulang.** Resolver memakai path lengkap, path relatif serta konteks course/semester; nama pendek ambigu tidak boleh diarahkan ke mata kuliah pertama yang ditemukan.

## 4. Layar dan alur produk

| Layar | Perilaku |
|---|---|
| Hari Ini | Tenggat terdekat, aktivitas yang direncanakan, catatan terakhir, dan alasan prioritas; sumber data serta waktu refresh terlihat |
| Semester | Semester aktif/arsip, daftar mata kuliah, progres Tuton dan progres materi secara terpisah |
| Mata Kuliah | Ringkasan course, modul/KB, diskusi, tugas, latihan, rangkuman dan monitoring |
| Notes | Penjelajah folder, pencarian, baca/edit Markdown, properties, wikilink, callout, tabel, rumus dan Mermaid; tombol simpan eksplisit |
| Tuton | Matriks atau daftar per sesi; baca modul, presensi, diskusi/tugas, nilai, serta tautan catatan terkait |
| Latihan | Soal terpisah dari kunci, jawaban pengguna, riwayat percobaan, feedback; nilai objektif dipisahkan dari penilaian esai |
| Kalender | Agenda Google Calendar, tenggat dan blok belajar; tenggat tidak diduplikasi menjadi event setiap refresh |
| Pengaturan | Koneksi Google, buka/kunci vault, pemetaan spreadsheet dan prefix vault, pengelolaan semester |

Contoh alur: Hari Ini → Diskusi Bahasa Inggris Sesi 6 → materi Modul 7 → edit draf → buka halaman LMS melalui tautan → setelah benar-benar dikirim, pengguna mencatat status pengumpulan. Dashboard tidak menandai tugas terkirim hanya karena draf selesai.

## 5. Batas data dan arsitektur yang diusulkan

**Browser TanStack:** UI, editor dan renderer, indeks konten vault setelah dibuka, pencarian lokal, enkripsi/dekripsi RClone Crypt yang kompatibel. Password vault digunakan untuk sesi buka vault dan tidak dikirim ke Worker atau disimpan dalam kode/config aplikasi. Kemampuan adapter kripto masih harus dibuktikan dengan format Remotely Save aktual.

**Cloudflare Worker:** autentikasi dan otorisasi pengguna, API aplikasi, akses bucket terbatas, transport objek terenkripsi, OAuth serta panggilan resmi Sheets/Calendar. Bucket tetap privat. Jalur akses R2 hanya menerima objek dalam ruang vault yang dipetakan, bukan proxy URL arbitrer.

**R2 vault:** sumber catatan Markdown dan lampiran dalam bentuk terenkripsi. Pertahankan nama/path terenkripsi, format isi serta metadata yang dibutuhkan Remotely Save. RClone Crypt tidak berarti seluruh protokol sinkronisasi otomatis kompatibel.

**Penyimpanan aplikasi terpisah (D1 diusulkan):** semester, identitas mata kuliah dan penawarannya per semester, mapping baris/kolom Sheets, relasi catatan, ID event Calendar, preferensi serta status integrasi. Jangan menjadikan D1 salinan plaintext seluruh vault. Penamaan course atau judul catatan pada database juga merupakan metadata sensitif; simpan hanya yang diperlukan secara eksplisit.

**Google Sheets:** sumber progres Tuton dan nilai yang sudah digunakan pengguna. Mapping awal berdasarkan struktur A:AH yang telah dibaca pada percakapan, kemudian wajib diperiksa ulang terhadap header live sebelum implementasi write. Kolom kode berisi suffix kelas seperti `.1045`; pisahkan kode mata kuliah dari identitas kelas. Nama mata kuliah dapat berbeda dari vault; utamakan mapping kode yang diverifikasi. Nilai kosong bukan nol.

**Google Calendar:** sumber event kalender. Tenggat akademik, jadwal belajar dan event eksternal dibedakan. Simpan event ID dan kunci asal aktivitas untuk mencegah event ganda.

**AI belajar:** ketika pengguna meminta latihan/review, kirim hanya potongan materi yang dipilih dan sumbernya ke model. Ini berarti plaintext terpilih keluar dari browser untuk proses tersebut; jangan menjanjikan AI server dapat membaca semua vault sambil tidak pernah menerima plaintext. Provider, biaya, model, retensi dan alur persetujuan penggunaan materi belum dipilih. Versi pertama dapat memakai bank soal yang sudah ada sebelum generasi AI.

## 6. Identitas lintas semester

Entitas: Semester; Course; CourseOffering (mata kuliah pada semester tertentu); Module/KB; TutonSession; Activity; NoteReference; StudySession; PracticeAttempt; IntegrationBinding.

- CourseOffering mencegah nilai atau tugas mata kuliah berulang menimpa semester lama.
- semester_id stabil; semester_number untuk urutan pribadi dan academic_period untuk periode UT disimpan terpisah.
- NoteReference memakai ID aplikasi dan canonical vault path, bukan basename saja.
- Activity menyimpan jenis, tenggat, sumber, catatan terkait dan status; nilai mengikuti sumber dengan status belum tersedia jika kosong.
- PracticeAttempt terpisah dari soal/kunci sehingga jawaban sumber tidak tertimpa.
- Deadline dan sesi memakai Asia/Jakarta; tanggal tanpa jam tidak diberi jam tenggat fiktif.

## 7. Perilaku simpan dan konflik

1. Baca objek beserta versi/ETag atau bukti revisi yang tersedia. Simpan versi dasar untuk sesi edit.
2. Edit plaintext di browser; pertahankan frontmatter, wikilink dan field tak dikenal.
3. Enkripsi kembali dengan format yang sudah lolos uji interoperabilitas.
4. Worker melakukan write bersyarat terhadap versi dasar. Perubahan sejak pembacaan menghasilkan konflik yang terlihat, bukan overwrite diam-diam.
5. Simpan draf yang berkonflik dengan jalur pemulihan; pengguna dapat membandingkan versi. Jangan mengklaim ini menjamin plugin lokal tidak pernah menimpa data: perilaku Remotely Save harus diuji pula.
6. Terapkan pencatatan revisi terenkripsi untuk pemulihan dengan lokasi yang tidak tersinkron sebagai note biasa. Status autosync lokal dan refresh website ditampilkan jujur, bukan dilabeli real-time tanpa bukti.

Penulisan ke Sheets dan Calendar memiliki status sukses masing-masing. Jika satu sistem gagal, UI menunjukkan hasil parsial dan tidak mengulangi seluruh rangkaian write secara buta.

## 8. Tahapan implementasi dan kriteria selesai

### A. Fondasi lokal berbasis snapshot

TanStack Start + Worker skeleton, login boundary, model semester/course, importer ZIP atau fixture dari catatan yang diberikan, navigasi Hari Ini/Semester/Course/Notes, renderer dan editor. UI membedakan data snapshot dari live. Tidak perlu kredensial produksi untuk memulai.

Selesai jika 486 catatan terinventaris tanpa duplikasi, 13 course hub dipetakan, link relatif/prefix ditangani, matematika dan Mermaid tampil, dan checkbox latihan tidak masuk agenda secara otomatis.

### B. Bukti interoperabilitas RClone Crypt

Gunakan vault/bucket atau prefix uji terpisah. Uji file dibuat Obsidian → dibaca web; file diedit web → dibuka Obsidian; nama/path, folder, Unicode, lampiran, rename, format metadata, dan konflik dua arah. Verifikasi juga penanganan password salah serta tidak adanya plaintext dalam log/SSR/server cache.

Selesai jika isi dan path pulang-pergi cocok serta perubahan bersamaan dapat dipulihkan. Akses tulis vault utama tetap belum digunakan sebelum bukti ini ada.

### C. Tracker dan kalender live

OAuth resmi; baca header Sheets terbaru; mapping per semester; update sel yang tepat lewat tindakan pengguna; Google Calendar baca/buat/edit event dengan ID asal dan penanganan kegagalan. Google Calendar belum terhubung atau diuji dalam sesi ini.

Selesai jika perubahan dari website terbaca kembali dari API resmi dan tidak merusak checkbox, nilai, format atau event lain.

### D. Latihan dan rencana belajar

Import soal/kunci dengan preview; dukung pilihan ganda, isian dan esai secara bertahap. Kelompokkan opsi soal sebagai pilihan, bukan task. Simpan attempt; tampilkan peringatan sumber pada kunci bermasalah. Planner awal berbasis aturan transparan: tenggat, progres, perkiraan durasi dan waktu tersedia; kemampuan AI ditambahkan setelah provider dan batas penggunaan materi ditetapkan.

### E. Kelengkapan kompatibilitas

Terjemahkan 12 query Dataview yang ditemukan menjadi tampilan aplikasi setara, sambil mempertahankan query asli. Dukungan Tasks, templating dan Canvas lengkap membutuhkan contoh nyata; saat ini belum dapat diverifikasi dari ZIP. Tambahkan lampiran PDF/gambar setelah file uji tersedia. Arsip semester dan pembuatan konfigurasi semester baru diuji tanpa perubahan kode.

## 9. Informasi yang belum tersedia

Versi Remotely Save, opsi path/prefix serta metadata/salt aktual; contoh objek terenkripsi nonrahasia untuk uji; nama binding bucket produksi; konfigurasi login aplikasi dan Google OAuth; kalender target; kredensial deployment; provider AI; target biaya dan domain. Detail ini diperlukan saat integrasi/deployment, bukan untuk mulai fondasi lokal. Password, token R2 dan secret OAuth tidak ditaruh di dokumen atau diminta melalui catatan biasa.

## 10. Referensi teknis primer

- TanStack Start di Cloudflare Workers: https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/
- Panduan hosting TanStack Start: https://tanstack.com/start/latest/docs/framework/react/guide/hosting
- Remotely Save: https://github.com/remotely-save/remotely-save
- Dokumentasi enkripsi Remotely Save: https://github.com/remotely-save/remotely-save/blob/master/docs/encryption/README.md
- Format Rclone Crypt (adapter Remotely Save tetap perlu diperiksa): https://rclone.org/crypt/
- Dataview: https://blacksmithgu.github.io/obsidian-dataview/

Sumber lokal: University.zip dan MKDI4201 - Bahasa Inggris.zip yang diunggah pengguna. Spreadsheet menggunakan pembacaan sebelumnya dalam percakapan; bukan pembacaan live baru pada tanggal pembuatan blueprint. Tidak ada sumber yang dimodifikasi.
