# Study Assistant UT — Agent Starter

Paket awal untuk membangun dashboard belajar pribadi lintas semester. Berisi PRD, arsitektur, backlog, model data dan aplikasi demo TanStack Start yang sudah dapat dibuild untuk Cloudflare Workers.

## Mulai

Gunakan Bun 1.4+ sebagai package manager, script runner dan test runner. `bun.lock` adalah satu-satunya lockfile. Node 22.18+ tetap didukung untuk kompatibilitas toolchain Vite/Wrangler; runtime produksi tetap Cloudflare Workers.

```sh
bun install --frozen-lockfile
bun test
bun run build
bun run typecheck
bun run dev
```

Buka `http://localhost:3000`. Setelah menambah route, jalankan dev/build untuk menghasilkan route tree sebelum typecheck. Preview lokal: `bun run preview` setelah build.

**Belum produk terhubung penuh.** Data demo sintetis; snapshot/draf hanya di memori browser. Dashboard kini memerlukan sesi owner melalui `/login`; login identitas terpisah dari grant sumber Google. Keberhasilan build bukan bukti akses Google live. `bun run deploy` tetap menolak deployment; baca `docs/DEPLOYMENT.md`.

### Login owner lokal (#15)

1. Buat OAuth client Google jenis Web milik aplikasi; daftarkan callback persis `http://localhost:3000/api/auth/google/callback`. Pilih audience/test user sesuai akun owner.
2. Salin `.env.example` ke `.dev.vars` secara lokal. Isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `AUTH_OWNER_EMAIL`; jangan kirim secret melalui chat/commit. Tidak memakai `VITE_*`. Password vault tidak masuk konfigurasi server.
3. Jalankan `node node_modules/wrangler/bin/wrangler.js d1 migrations apply AUTH_DB --local`, lalu `bun run dev`. Termasuk migrasi additive `0004_auth_return_to.sql`. Buka origin callback yang sama. Port berubah berarti callback Google dan konfigurasi harus diperbarui, bukan redirect otomatis.
4. Buka `/login`, klik Masuk dengan Google. Scope hanya identitas; Sheets/Calendar tetap terpisah. Session delapan jam, token opaque HttpOnly; Secure wajib HTTPS, pengecualian HTTP hanya literal loopback. Tujuan dashboard internal disimpan pada transaksi login. Keluar di samping tombol tema mencabut session D1 dan menutup workspace/draf termasuk tab lain; konfirmasi hanya jika draf belum tersimpan/diekspor. Kegagalan pencabutan menyediakan retry di halaman login.

`AUTH_DB` dan `METADATA_DB` hanya binding lokal tanpa database ID remote; migration auth terpisah di `migrations-auth/`. Semua endpoint private memanggil `requireOwner`. Tanpa konfigurasi, API dan tampilan dashboard gagal tertutup. Import/demo hanya tersedia setelah sesi owner terverifikasi. `bun run typecheck` menghasilkan Worker types yang diabaikan Git sebelum tsc.

### Metadata privat lokal (#16)

Jalankan `bunx --bun wrangler d1 migrations apply METADATA_DB --local`. GET `/api/metadata` mengembalikan `{ revision, metadata }` untuk owner dari session; belum tersimpan berarti revision 0. PUT ke path sama menerima tepat `{ expectedRevision, metadata }`, JSON maksimum 128 KiB, Origin sama. Revision stale menghasilkan 409; pertahankan perubahan lokal, baca ulang lalu rekonsiliasi sebelum retry. Tidak ada overwrite otomatis.

`metadata` memiliki tepat tiga array: `semesters` (maksimum 40: `id`, `number`, `academicPeriod`, `active`), `courses` (300: `id`, `courseCode`, `sourceCourseCode`, `name`), `offerings` (600: `id`, `semesterId`, `courseId`, `classId`, `credits`). Field nullable wajib ditulis null; kode registrasi/BMP berbeda, SKS unknown tetap null. ID unik per jenis, referensi harus terdaftar, satu semester aktif; field asing ditolak. ID menggunakan huruf ASCII/angka/underscore/hyphen, maksimum 64 karakter. Nomor semester 1–100, SKS 1–30/null. Batas string periode/class 64, kode 32, nama 160.

Nama mata kuliah dan periode merupakan metadata pribadi yang disimpan D1 hanya setelah PUT eksplisit; importer tidak mengunggah apa pun. Endpoint tidak menerima owner ID, notes, indeks, path vault, password, object key, cell, kalender atau URL provider. Semua respons no-store. Konfigurasi akademik tersimpan atomik sebagai satu revisi owner-scoped; tabel domain awal belum dipakai adapter fitur berikutnya. Belum ada UI editor metadata server atau provisioning/deployment staging remote. Preview lokal tidak mempublikasikan sumber; gate remote tetap di `docs/DEPLOYMENT.md`.

### Koneksi Google API langsung

Pada **Koneksi**, masuk owner dahulu lalu pilih **Hubungkan Sheets** atau **Hubungkan Calendar**. Login identitas tidak otomatis memberikan grant API. Daftarkan callback tambahan `http://localhost:3000/api/google/callback` pada OAuth client yang sama (staging memakai origin HTTPS sesuai `GOOGLE_REDIRECT_URI`). Aktifkan Google Sheets API dan Calendar API pada project Google. Consent dilakukan sendiri oleh owner; jangan kirim password/token melalui chat.

Jalankan `bunx --bun wrangler d1 migrations apply AUTH_DB --local`. Isi `GOOGLE_TOKEN_KEY` melalui konfigurasi privat: 32-byte random hex, terpisah dari client secret; jangan rotasi tanpa migrasi token. Refresh token disimpan AES-GCM di D1, terikat owner/service; access token hanya request server. Key lokal sudah dibuat atas persetujuan owner, tidak dikomit. Konfigurasi remote/migration/deploy belum diterapkan.

Scope baca-saja: Sheets `spreadsheets.readonly`; Calendar `calendar.calendarlist.readonly`. Tombol baca memanggil provider nyata. Sheets mengembalikan metadata worksheet termasuk tipe GRID/OBJECT, locale/timezone, merge, nilai asli/efektif, formula, format teks, note dan validasi sel; tidak mengubah false menjadi 0 atau menyamakan worksheet OBJECT dengan tabel kosong. Mapping offering/sesi/aktivitas Tuton belum diterapkan. Calendar masih inventaris kalender, bukan event planner. Isi `GOOGLE_SHEET_ID` privat sebagai allowlist workbook; browser tidak boleh mengirim arbitrary spreadsheet ID. Respons dibatasi 2 MiB; sumber lebih besar ditolak, bukan dipotong diam-diam. Tidak ada fallback snapshot planner, write spreadsheet atau pembuatan event. Calendar list lebih dari 250 ditolak eksplisit.

POST connect/disconnect memerlukan session owner dan Origin tepat; callback terikat cookie/state/PKCE/nonce serta subject login. Token tidak dikirim ke browser. Cabut akses memanggil revocation Google; revocation dapat memutus grant kedua layanan. Logout mencabut session aplikasi tetapi grant API tersimpan tetap ada untuk owner sampai dicabut. Koneksi provider nyata memerlukan login/consent owner dan callback terdaftar; build/tests tidak membuktikan consent/readback live.

Setelah **Baca Sheets**, pilih worksheet GRID. Tabel sumber menunjukkan nomor baris/kolom asli. Isi ID semester/offering, kode registrasi dan kelas terpisah, baris header, kolom identitas, baris mata kuliah, kolom nilai, nomor sesi dan aktivitas. **Verifikasi dan tambahkan mapping** mengikat header dan identitas baris saat itu; nilai tampil tanpa mengubah null/false/0. Worksheet OBJECT diberi penjelasan, bukan tabel kosong. Mapping hanya memori komponen browser, belum tersimpan D1 atau ditautkan ke konfigurasi metadata akademik. Baca ulang mempertahankan mapping selama panel terpasang dan memeriksa header/identitas kembali; mapping berubah perlu dihapus dan dipetakan ulang. Berpindah panel/logout/reload membuang mapping. Tidak ada status submitted otomatis atau write Google.
Hasil menyertakan waktu baca WIB. Jika pembaruan gagal, data sebelumnya tetap terlihat dengan label **Data lama**, bukan hasil terbaru. Tombol baca layanan mengulangi pembacaan; sukses menghapus label data lama.
Preview **Tuton terdeteksi dari header** mengenali Kode/Nama Mata Kuliah, kelompok Sesi, rentang tanggal sumber dan label Baca Modul/Presensi/Diskusi/Tugas/Nilai. Klik mata kuliah untuk melihat nilai per sesi tanpa mengisi koordinat. Semester/offering belum ditentukan otomatis; preview belum menggantikan binding akademik tersimpan. Header ambigu atau sesi berulang menampilkan warning, tidak ditebak. Class suffix dipisah; sel abu-abu tidak dianggap tidak berlaku.
Panel **Hubungkan ke semester Anda**: baca konfigurasi tersimpan, isi nomor semester pribadi dan periode UT (opsional), lalu simpan. Nama/kode mata kuliah, kelas dan hubungan offering/worksheet masuk metadata privat owner D1, bukan nilai sel atau catatan. Referensi offering dan identitas kode/kelas divalidasi server; revisi lama ditolak 409, isian dipertahankan. Kelas/periode/binding berbeda tidak ditimpa otomatis. Baca konfigurasi lagi setelah reload untuk memulihkan pilihan semester dan offering tracker. Pemilihan worksheet dan nilai live tetap dibaca ulang dari Google.
Setelah konfigurasi dibaca/disimpan, **Tracker semester tersimpan** menyediakan pilihan semester (default aktif dari konfigurasi). Hanya offering dengan binding worksheet, kode registrasi dan kelas yang cocok ditampilkan. Identitas sumber hilang/berulang menampilkan peringatan; nilai kelas/semester lain tidak dipakai sebagai pengganti. Preview otomatis di atas tetap sumber mentah semua mata kuliah, bukan filter semester.

### Latihan manual dari snapshot (#24)

Import Markdown/ZIP, pilih catatan, lalu klik **Latihan dari catatan ini**. Preview memilih versi sumber dan menampilkan soal tanpa kunci; mulai latihan menyembunyikan reader/editor sumber. Pilihan ganda memakai radio, bukan task. Isian dicocokkan persis setelah trim dan lowercase; esai hanya review rubrik manual dengan label estimasi, bukan skor otomatis.

Format didukung: satu baris per soal `1. Pertanyaan`, opsi `A. Pilihan` atau `- [ ] A. Pilihan`, field `Kunci: A` / `Jawaban: teks`, `Rubrik: kriteria`, `Peringatan: alasan`. Heading menjadi provenance. Frontmatter/fenced code tidak diekstrak. Baris lanjutan/format lain belum didukung, cocokkan preview dengan sumber. Kunci duplikat/invalid/kosong, warning sumber, atau kode registrasi/BMP berbeda memblokir penilaian pasti. Tidak menyimpulkan ekuivalensi kode atau modul/sesi.

Kunci baru terlihat sesudah submit. Attempt baru tidak menimpa attempt sebelumnya; histori tersedia selama panel latihan terbuka. Kembali ke sumber, ganti note, menutup snapshot, reload atau logout membuang state latihan. Tidak ada persistence, upload, AI atau perubahan bytes sumber.

## Isi

| File | Kegunaan |
|---|---|
| `AGENTS.md` | Aturan kerja dan batas integrasi untuk agent |
| `docs/PRD.md` | Requirement, prioritas dan acceptance criteria |
| `docs/AGENT_START.md` | Prompt siap pakai untuk pekerjaan pertama |
| `docs/TASKS.md` | Backlog berurutan dan dependency |
| `docs/ARCHITECTURE.md` | Pembagian browser/server, kontrak dan strategi sinkronisasi |
| `docs/DECISIONS.md` | Keputusan, asumsi dan pertanyaan terbuka |
| `docs/DEPLOYMENT.md` | Jalur staging dan deployment ke akun Cloudflare sendiri |
| `docs/SOURCE_BLUEPRINT.md` | Blueprint awal sebagai konteks historis |
| `src/domain/` | Types dan aturan murni yang sudah diuji |
| `src/integrations/contracts.ts` | Ports integrasi, belum memiliki adapter live |
| `migrations/0001_initial.sql` | Skema metadata awal; belum diaplikasikan |
| `scripts/vault_inventory.py` | Inventaris ZIP tanpa mengekstrak atau menjalankan konten |
| `docs/VALIDATION.md` | Hasil pemeriksaan dan batas verifikasi |

Untuk agent: buka folder ini, baca AGENTS.md, kemudian gunakan prompt di docs/AGENT_START.md. Pekerjaan pertama adalah M1 importer/reader lokal, bukan menghubungkan kredensial produksi.

## Urutan kerja berikutnya

Mulai **M1.1: pilih file/ZIP dan laporan import browser-local**, lalu indeks source-preserving, navigasi/pencarian, reader aman, editor/export dan acceptance sumber nyata. Rincian hasil serta gate ada di [kerangka kerja](docs/TASKS.md#cara-menjalankan-pekerjaan).

Sesudah M1: identitas/otorisasi (M2), vault terenkripsi (M3) dan Sheets (M4), Calendar/planner (M5), latihan/assistant (M6), lalu release gate (M7). Kode dan dokumentasi boleh publik; vault, ZIP, kredensial dan manifest pengguna tidak masuk GitHub. Gunakan satu branch/PR per deliverable; tidak ada deployment otomatis sebelum gate rilis.

## Bahan pengguna

ZIP sumber tidak dibundel ulang ke repository atau aset browser. Bila diperlukan, letakkan salinan di `.local/inputs/`. Contoh inventaris:

```sh
python3 scripts/vault_inventory.py '.local/inputs/University.zip' --output .local/vault-inventory.json
```

Script hanya menghasilkan manifest path/hash/frontmatter mentah, bukan mengimpor note ke aplikasi.

Import tersedia di tab **Catatan → Import snapshot lokal**. Pilih `.md` UTF-8 atau `.zip`; lihat file diterima dan diagnostic, lalu **Tutup snapshot** untuk melepas laporan, indeks dan pencarian dari memori. Maksimum 32 MiB input, 2.000 entri, 64 MiB ekstraksi, 2 MiB per file. Tidak ada upload atau perubahan sumber. Lampiran belum tersedia.

Sebelum memilih file, atur **Canonical root** dan prefix sumber (satu per baris). Prefix hanya dipetakan pada batas folder; path lain tetap utuh. Panel **Indeks dan metadata** menampilkan SHA-256, source path, properties dan diagnostic YAML. Duplikat identik pada canonical path sama digabung; konten berbeda tetap sebagai versi konflik. Tutup snapshot sebelum mengganti konfigurasi import.

**Jelajahi snapshot lokal** menyediakan filter semester/mata kuliah dan pencarian path/isi. Buka konfigurasi JSON untuk menambah semester dan offering sesuai contoh di panel; `academicPeriod` dan `credits` boleh null. `pathPrefix` harus sesuai folder canonical dan tidak overlap dengan offering lain. Tanpa mapping, note tetap tersedia sebagai belum dipetakan; tidak ada fallback demo. Konfigurasi invalid menampilkan error tanpa menghapus konfigurasi valid. Tutup snapshot menghapus seluruh state explorer. Selector semester global dan editor lama tetap berlabel demo, terpisah dari snapshot.

Pilih path hasil pencarian untuk membuka reader hanya-baca. Reader mendukung GFM/tabel, callout, KaTeX dan Mermaid dalam iframe berorigin opaque dengan CSP tanpa jaringan. HTML mentah dibuang; DataviewJS/Tasks tetap kode inert. Dataview DQL hanya diproses melalui subset aplikasi di bawah. Wikilink dan Markdown link lokal memakai source path asli/canonical, relative path, alias dan heading; basename ambigu serta sumber di luar snapshot dilaporkan, bukan ditebak. Versi konflik dipilih eksplisit. Gambar/lampiran tidak diambil dari jaringan; tautan HTTP(S) hanya dibuka lewat klik pengguna, tanpa referrer.

Di bawah reader, **Draf snapshot · lokal** mengedit isi Markdown tanpa menulis ulang frontmatter, BOM atau konvensi newline. Tanpa edit, bytes export identik. **Simpan versi ke memori lokal** mempertahankan versi asal dan menambah versi baru; tidak ada persistence atau write R2. Draf belum disimpan memblokir filter/import dan meminta konfirmasi saat navigasi/tutup; refresh memakai peringatan browser. Versi tersimpan yang belum diexport juga memperingatkan saat keluar.

**Export ZIP lokal · versi N** mengunduh satu lapisan versi dengan canonical path asli. Unduh setiap tombol, lalu pilih semua ZIP sekaligus untuk import ulang dan mempertahankan konflik. Jangan mengekstrak lapisan berbeda ke folder sama dengan overwrite. Label diunduh berarti permintaan download telah dikirim ke browser, bukan bukti file tersimpan di disk; pastikan download selesai sebelum menutup sesi.

### Query lokal (subset DQL)

View **Recently Updated** mengurutkan property `updated` menurun (null terakhir, bukan waktu filesystem); **Missing-related** memilih `length(related) = 0`. Related ambigu/gagal parse bernilai unknown, tidak dianggap kosong. Semua versi konflik disertakan; klik path membuka reader. Ringkasan menampilkan jumlah aktual, duplikat, konflik, diagnostic metadata dan query gagal/tidak didukung.

Grammar: `TABLE field [as Label], ...`; opsional `FROM "folder literal"` dengan batas folder canonical/source path; `WHERE` kondisi digabung `AND`; `SORT field ASC|DESC, ...`; `LIMIT 0..2000`. Field: nama property sederhana, `file.name`, `file.folder`, `file.link`, `length(related)`. Kondisi: field truthy, field `=`/`!=` string/angka, panjang numerik `<`, serta bentuk tepat `contains(file.folder, this.file.folder)` (pencocokan substring seperti DQL sumber). Tidak ada OR, ekspresi JS, fungsi lain, evaluasi plugin atau arbitrary code. LIMIT default 2000. Query unsupported menghasilkan diagnostic, bukan hasil kosong palsu; blok sumber tetap tersedia tanpa rewrite. String updated ISO sumber diurutkan leksikografis; tanggal tidak valid tidak dinormalisasi.

## Stack terkunci

TanStack Start/Router, React, TypeScript, Vite, Cloudflare Vite plugin dan Wrangler. Bun mengelola dependency exact melalui package.json dan bun.lock. UI memakai shadcn/ui Base UI, preset Nova dan Tailwind CSS v4; alias `@/` menunjuk `src/`. Tambahkan komponen resmi sesuai kebutuhan dengan `bunx --bun shadcn@latest add @shadcn/<komponen>` setelah membaca dokumentasinya. D1 diusulkan untuk metadata aplikasi; R2 existing tetap sumber vault terenkripsi. Google Sheets/Calendar menggunakan API resmi milik aplikasi ini dengan OAuth terpisah, bukan sesi plugin ChatGPT.

## Vault uji RClone #17

Halaman Koneksi menyediakan unlock/read/edit/lock Markdown vault uji. Password dan enkripsi/dekripsi hanya di browser worker, tanpa persistence; lock/logout/unmount menghentikan worker dan membuang referensi reader. Tidak menjanjikan physical memory wipe. Adapter `@fyears/rclone-crypt@0.0.7` mengikuti Remotely Save 0.5.25: nama base64, salt kosong; bukan library resmi rclone.

Transport `/api/vault/list` dan `/api/vault/object` wajib owner, no-store, binding `VAULT_TEST_BUCKET`, prefix tetap `interop/`, maksimal 100 objek/halaman, 2.000 objek/client, 8 MiB ciphertext dan 2 MiB plaintext Markdown. Binding development memakai bucket lokal `study-vault-interop`; staging memakai bucket remote terpisah bernama sama dengan fixture sintetis saja. Empty vault atau tanpa Markdown tidak membuktikan password valid.
PUT object dan POST `/api/vault/history` memerlukan Origin tepat, If-Match dari ETag, `VAULT_TEST_WRITES=enabled` serta bucket `VAULT_HISTORY_BUCKET` terpisah. Default lokal tertutup; staging diaktifkan atas izin pengguna hanya untuk fixture, histori pada `study-vault-interop-history`. Ciphertext lama diarsipkan create-only sebelum R2 conditional put; stale 409, hasil ambigu wajib dibaca ulang. Draf konflik dan versi remote ditampilkan terpisah; retry eksplisit. Histori maksimal 100 entri; overflow gagal eksplisit, bukan daftar parsial. Tidak ada rename/delete atau binding bucket utama. Mac–web–Mac Remotely Save dan recovery dua arah belum terbukti; jangan aktifkan write bucket utama.

Fixture `tests/fixtures/rclone.json` dibuat official rclone v1.75.2 dengan password sintetis publik; bukan data pengguna. Tests membuktikan decrypt lintas implementasi, salah password, corruption dan truncation. Smoke browser memakai transport fixture yang diintersep, bukan bukti koneksi R2 live. Acceptance remote #17 tetap terbuka sampai fixture staging diuji owner. Password fixture: `study-fixture-only`. Bucket utama tidak ditulis.

## Update Tuton #21

Izin edit Sheets terpisah dari izin baca dan login owner. Terapkan migration auth `0003_sheets_write_grant.sql` sebelum consent write. Worker memakai `src/worker.ts`, binding `TUTON_WRITER` dan migration Durable Object SQLite; perubahan konfigurasi source bukan deployment atau provisioning remote.

Baca workbook, baca konfigurasi, lalu simpan ulang hubungan semester untuk mengikat workbook dan struktur header/baris. Binding lama tetap terbaca tetapi tidak dapat menulis sebelum diikat ulang. Editor checkbox native dan Nilai meminta review nilai lama/baru. Formula, error, custom checkbox, drift struktur dan expected-value berbeda diblokir. Update hanya Values API RAW satu sel; format/validasi tidak ditulis. Serialisasi berlaku untuk aplikasi ini, bukan CAS terhadap editor Google eksternal.

Receipt persisten sebelum dispatch; hasil ambigu tidak dikirim ulang. Baca receipt atau reconcile readback memakai ID sama. ID operasi tersimpan sessionStorage untuk reload tab, tanpa nilai sel/token. Tutup sesi browser dapat kehilangan ID lokal; simpan ID receipt bila perlu. Confirmed berarti nilai ditemukan saat readback, bukan bukti siapa yang menulis. Tracker perlu pembacaan ulang; checkbox bukan submitted.

Write spreadsheet pribadi, consent owner, deployment dan acceptance live #21 belum dilakukan. Jangan menyimpulkan keberhasilan provider dari test sintetis.
