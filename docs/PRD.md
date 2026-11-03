# PRD — Study Assistant UT

Versi 1.0 • 3 November 2026 • Bahasa produk Indonesia • Zona waktu Asia/Jakarta

## 1. Ringkasan produk

Satu dashboard pribadi yang menghubungkan proses belajar BMP, catatan Obsidian, aktivitas Tutorial Online, latihan dan agenda. Produk harus berkembang lintas semester tanpa perubahan source untuk setiap semester baru. Fokus awal satu owner; multiuser/multitenant publik bukan target v1.

Alur utama: tentukan kegiatan hari ini → buka materi terkait → kerjakan diskusi/tugas/latihan → catat hasil dan progres → rencanakan review.

## 2. Masalah dan hasil yang diinginkan

Saat ini progres dicatat di Google Sheets, materi dan jawaban di Obsidian. Pengguna berpindah aplikasi untuk mencari hubungan antaraktivitas, memeriksa tenggat dan melanjutkan belajar. Website menjadi tempat membaca dan mengedit kedua sumber tersebut serta mengatur agenda. Obsidian lokal pada Mac tetap berfungsi melalui Remotely Save/R2.

Hasil v1: pengguna dapat melanjutkan catatan, menemukan materi terkait tugas, mencatat progres tanpa membuka sheet manual, memblok waktu belajar di Calendar, mengerjakan latihan dengan feedback, dan menambah semester tanpa migrasi manual source code.

## 3. Keputusan dan fakta sumber

Disepakati: TanStack, React/TypeScript yang diusulkan sebelumnya, Cloudflare Workers milik pengguna, bucket R2 existing, Remotely Save S3-compatible dengan RClone Crypt, Sheets/Calendar API resmi.

Hasil pemeriksaan sumber: University.zip memuat 486 note Markdown dan 13 Course Hub (6 semester 1, 7 semester 2). ZIP Bahasa Inggris memuat 51 note identik dengan salinannya di University. Ditemukan 12 blok Dataview DQL, 23 Mermaid, dan penanda rumus display di 82 note. Tidak ditemukan dataviewjs, query tasks, .canvas, PDF atau gambar dalam contoh; ini bukan kesimpulan tentang seluruh vault.

Struktur: University → program → semester → administrasi / mata kuliah → materi, diskusi, tugas, rangkuman, monitoring, ujian. Link dapat merujuk prefix `6 - Main Notes/Workspaces/University` dan sumber BMP di luar ZIP. Jangan menyimpulkan sumber BMP tersedia dari keberadaan wikilink saja.

Identitas source berbeda: MKDI4201 vs MKWI4201. Statistika MKKI4201 memiliki sumber SATS4121 yang kesetaraan resminya belum dikonfirmasi. Note D06 Bahasa Inggris merujuk Modul 7. Kunci TF1 Modul 6 Bahasa Inggris memiliki warning ketidakcocokan cetak. Data ini menjadi kasus acceptance, bukan sesuatu yang dinormalisasi otomatis.

## 4. Prioritas dan cakupan

| Prioritas | Kemampuan |
|---|---|
| P0 — fondasi | Semester/course offerings, importer dan reader/editor lokal, tautan/properties, status sumber data, batas auth/server, kontrak integrasi |
| P0 — koneksi | Interoperabilitas vault terenkripsi, konflik dan pemulihan, Sheets resmi baca/edit, kalender baca/tulis blok belajar |
| P1 — belajar | Import latihan, attempt terpisah, review berbasis sumber, planner berbasis aturan |
| P1 — assistant | Generasi latihan/review AI setelah provider serta pengiriman materi dipilih |
| P2 | Dukungan lanjut Tasks, templating, Canvas, offline penuh, insight historis |

Di luar v1: clone runtime Obsidian lengkap, menjalankan plugin arbitrary/DataviewJS, submit otomatis ke LMS UT, penetapan nilai akhir resmi UT, migrasi vault massal, live collaboration, marketplace, dan auto-deploy ke akun yang belum dikonfigurasi.

## 5. Requirement fungsional dan acceptance criteria

### FR-01 Semester dan mata kuliah

Pengguna memilih semester aktif maupun arsip, menambah semester dan memetakan spreadsheet serta folder vault. Satu course dapat memiliki offering berbeda pada semester berbeda. Nomor semester pribadi berbeda dari periode akademik UT. Nilai, sesi dan aktivitas tidak tercampur antaroffering. Kode kelas seperti `.1045` disimpan terpisah dari kode mata kuliah. SKS belum diketahui tetap null.

Acceptance: impor contoh menghasilkan 13 Course Hub tanpa memasukkan duplikasi Bahasa Inggris; tambah semester 3 dan offering melalui data/config tanpa edit route atau source. UI semester 2 tidak menampilkan nilai semester 1.

### FR-02 Hari Ini dan planner

Tampilkan deadline terdekat, aktivitas direncanakan, catatan terakhir dan langkah lanjut. Prioritas dijelaskan, misalnya tenggat mendekat, belum dikirim, atau konsep perlu review. Waktu tersedia dan estimasi durasi dapat diedit; tanpa estimasi, tampilkan belum diestimasi. Tanggal tanpa jam tidak diberi jam deadline rekaan. Planner tidak mengubah progres atau membuat event tanpa tindakan pengguna.

Acceptance: jadwal tidak tumpang tindih dengan busy event terpilih, tidak melewati tenggat tanpa penjelasan, dan dapat dipindah pengguna. Tugas ambigu tidak otomatis dianggap terlambat. Status data stale/not connected tidak diinterpretasi sebagai kosong.

### FR-03 Notes dan pembacaan materi

Penjelajah folder, pencarian, baca/edit Markdown, frontmatter/properties, wikilink alias/heading, callout, tabel, code, Mermaid dan matematika. Isi mentah dipertahankan saat tidak diedit, termasuk metadata unknown. Simpan eksplisit dan indikator draf. Konflik tidak menimpa perubahan diam-diam. Renderer memblok HTML/JS berbahaya dan tidak menjalankan query plugin arbitrer.

Acceptance: edit satu paragraf tidak menulis ulang seluruh metadata atau memperbarui nilai yang tak terkait; note unchanged byte round-trip cocok. Link relatif, prefix penuh, nama pendek ambigu dan sumber di luar ZIP memiliki hasil yang benar. Rumus dan diagram tampil tanpa mengeksekusi isi note sebagai program umum. Pencarian konten vault hanya tersedia setelah unlock dan dibersihkan saat lock.

### FR-04 Sinkronisasi Obsidian/R2

Website membaca dan menulis objek sesuai Remotely Save RClone Crypt aktual, meliputi nama objek, isi dan metadata yang dibutuhkan. Password ada pada sesi browser; kunci tidak dikirim ke Worker atau telemetry. Default tanpa cache plaintext persisten. Lock menghapus referensi data, draft dan query cache sensitif sejauh runtime memungkinkan; jangan menjanjikan penghapusan fisik memori browser.

Acceptance sebelum write utama: file dibuat Mac dapat dibaca web; edit web kembali ke Mac dengan isi benar; nama Unicode, folder, lampiran dan rename lolos; password salah ditangani; save dengan revisi lama menghasilkan konflik; kedua versi dapat dipulihkan. Hasil test mencantumkan versi Remotely Save. Mutasi dan rename/delete baru diaktifkan jika masing-masing kasus sudah diuji.

### FR-05 Tuton Tracker dan Google Sheets

Header workbook dibaca live, lalu dipetakan ke offering, sesi, aktivitas dan nilai. Mapping per semester; tidak bergantung mutlak pada A:AH. Kolom sesi 3/5/7 yang sudah ada pada tracker tidak menjadi bukti bahwa diskusi tidak berlaku di kelas tersebut. Dukungan penambahan aktivitas per kelas tetap ada.

Acceptance: baca ulang nilai setelah update menunjukkan hasil nyata; nilai kosong tetap null; false pada checkbox tetap boolean. Write hanya target mapping yang diverifikasi dan tidak merusak formula/format/validation. Header atau row mapping berubah harus memblokir write sampai dipetakan ulang. Status pending/uncertain ditangani sebelum retry. Pemeriksaan expectedValue mengurangi risiko overwrite tetapi bukan transaksi CAS terhadap semua editor eksternal; UI harus transparan terhadap batas ini.

### FR-06 Kalender

Pilih kalender, lihat agenda, buat/edit blok belajar dan event tenggat yang dipilih. Event provider dan deadline internal berbeda entitas. Catat eventId/etag dan kunci asal agar refresh atau retry tidak menduplikasi event. Konflik edit provider ditampilkan.

Acceptance: pembuatan ulang studySession yang sama tidak membuat duplikat; event personal lain tidak berubah. Jam UI dan payload konsisten Asia/Jakarta dengan offset tersimpan benar. Kalender tanpa akses write tetap dapat digunakan read-only.

### FR-07 Latihan, penilaian dan AI

Soal dan kunci sumber dipisahkan. Jawaban pengguna disimpan sebagai attempt, bukan mengubah soal atau jawaban cetak. Dukungan bertahap pilihan ganda, isian dan esai. Kunci tersembunyi sampai review. Rubrik dan asal feedback dapat diperiksa. Kunci tidak cocok atau skor tak memiliki dasar ditandai perlu review; jangan memberi skor definitif.

Acceptance: opsi checkbox tidak muncul di task planner. Attempt kedua tidak menimpa pertama. Feedback menyertakan catatan/modul/heading sumber yang benar-benar dipakai. Review objektif dapat dihitung dari kunci yang valid; nilai esai otomatis dilabel estimasi. Generasi AI dimulai setelah pengguna memilih materi yang dikirim, bukan mengirim seluruh vault otomatis. Tanpa provider AI, latihan yang sudah ada tetap bisa dikerjakan manual.

### FR-08 States dan pengaturan koneksi

Setiap sumber memiliki status disconnected, loading, ready, stale, error, locked atau conflict sesuai konteks. Tampilkan waktu refresh dan sumber demo/snapshot/live. Kegagalan satu koneksi tidak menghapus data sumber lain. Partial success tidak disamarkan sebagai sukses penuh.

Acceptance: OAuth ditolak, token kedaluwarsa, rate limit, vault terkunci dan koneksi putus memiliki pesan serta jalur pemulihan yang tepat. Tidak ada tombol Connect palsu pada starter.

## 6. Model data

Semester → CourseOffering ← Course. CourseOffering terhubung ke Module/KB, TutonSession, Activity, NoteReference, StudySession dan PracticeAttempt. Activity dapat merujuk beberapa modul/notes; sesi dan modul tidak disamakan. Semua records server memiliki owner_id. Note state, learning state, submission state dan grade disimpan terpisah.

R2 menyimpan vault encrypted. D1 diusulkan untuk konfigurasi, relasi opaque, receipts dan metadata aplikasi yang disetujui. Catatan plaintext dan indeksnya tidak disalin ke D1. Metadata akademik (nama course, judul tugas) tetap informasi pribadi walau bukan note body; jelaskan penyimpanannya pada pengaturan.

## 7. Nonfunctional requirements

- Owner-only authorization di setiap endpoint, bukan hanya UI. Google API grant dan autentikasi pengguna adalah dua hal berbeda.
- Secrets server melalui binding/secret store; password vault tidak menggunakan env server.
- Mutasi memvalidasi Origin/CSRF, resource allowlist, input/ukuran, idempotency dan revisi. Endpoint private memakai no-store. Jangan log token, ciphertext payload besar, plaintext atau password.
- Default rendering konten vault client-side setelah unlock; tidak di-SSR atau di-prerender ke aset publik.
- Keyboard navigation, focus terlihat, label form, kontras cukup, layout laptop dan ponsel. Pilih style tenang bernuansa hijau; detail visual boleh disesuaikan tanpa mengganti domain.
- Untuk contoh 486 note, ukur import/search setelah implementasi pada perangkat pengguna; target awal pencarian lokal p95 <500 ms setelah indexing selesai. Ini target, belum benchmark.
- Batasi ukuran import/lampiran dan lakukan proses bertahap; satu note rusak menghasilkan diagnostik, tidak merusak import lain atau memicu write ke sumber.
- Deployment hanya setelah auth, source privacy dan jalur pemulihan diuji. Build sukses bukan bukti runtime end-to-end.

## 8. Kriteria keberhasilan rilis

Satu alur lengkap bekerja: pilih semester → buka tugas → buka materi terkait → edit draf → simpan kompatibel dengan Obsidian → catat progres yang benar di Sheets → buat blok belajar Calendar tanpa duplikasi. Semester baru dapat ditambahkan melalui konfigurasi. Latihan memiliki attempts dan feedback sumber. Tidak ada kehilangan data pada rangkaian pengujian konflik.

## 9. Tahapan dan pertanyaan

Ikuti docs/TASKS.md. Detail auth owner, konfigurasi Google OAuth, kalender target, versi plugin dan prefix R2 diperlukan untuk milestone integrasi. Provider/model/budget AI diperlukan sebelum M6. Semua itu tidak menghalangi M1 lokal. Default awal: single owner, Indonesia, Asia/Jakarta, online-first, plaintext hanya memori, edit dengan save eksplisit, AI nonaktif sampai dikonfigurasi.

## 10. Referensi

Dokumen ini menurunkan requirement dari percakapan, ZIP pengguna dan docs/SOURCE_BLUEPRINT.md. Sumber teknis resmi diperiksa 3 November 2026:

- https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/
- https://tanstack.com/start/latest/docs/framework/react/build-from-scratch
- https://github.com/remotely-save/remotely-save
- https://github.com/remotely-save/remotely-save/blob/master/docs/encryption/README.md
- https://blacksmithgu.github.io/obsidian-dataview/

Referensi bukan janji bahwa seluruh fitur sudah diimplementasikan dalam scaffold.
