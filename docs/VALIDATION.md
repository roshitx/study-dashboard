# Hasil validasi handoff

## Issue #11: navigasi dan pencarian snapshot, 4 November 2026

- Explorer snapshot memakai konfigurasi JSON semester/offering, bukan array demo. Semester personal/academicPeriod UT dan offering terpisah; credits null tetap unknown. Prefix offering tidak boleh overlap. Catatan tanpa mapping tetap dapat ditemukan melalui filter belum dipetakan.
- Pencarian path/isi seluruh versi konflik dipersiapkan sekali per index/config di memori browser. Tutup snapshot unmount explorer dan melepas indeks pencarian, konfigurasi, query, pilihan dan error; tidak ada persistence atau upload.
- Frozen install, 15 tests, build dan typecheck lulus. Tests mencakup semester 3 dari konfigurasi, periode/null credits, mapping invalid/overlap, isolasi offering, unmapped dan pencarian versi konflik.
- Chromium: ZIP sintetis 486 note, konfigurasi semester 1/3 untuk kode course sama; filter s3 + earlier menghasilkan 0, s3 + later menghasilkan 243. Konfigurasi invalid menampilkan error dan mempertahankan konfigurasi valid. Close/reimport mengosongkan query/semester/config/error. Mobile 390px tanpa overflow, tanpa page errors. Obscura tidak terhidrasi; fallback disetujui.
- Benchmark browser sesudah indexing: 486 note sintetis, 200 query, p95 0,30 ms untuk fungsi pencarian (target <500 ms). Tidak mencakup render React atau source pengguna nyata; bukan klaim performa seluruh vault.
- Reader/editor snapshot belum termasuk issue ini; editor demo diberi identitas terpisah. Warning sourcemap CSS toolchain tetap.

## Issue #10: indeks source-preserving, 3 November 2026

- Root/prefix configurable dipetakan hanya pada batas folder; source path, raw bytes, BOM/CRLF dan frontmatter asli tetap disimpan. Path tak cocok prefix tetap utuh, bukan ditebak dari basename.
- Properties memakai YAML core tanpa custom tags; unknown fields dipertahankan, kode dan nomor modul/sesi tidak disatukan. Invalid YAML/alias dan unquoted wikilink non-string diberi diagnostic tanpa rewrite sumber. Indeks menggunakan SHA-256; same canonical path/hash digabung dengan daftar source path, beda hash mempertahankan semua versi konflik.
- 13 test, frozen install, build/typecheck lulus. Regression mencakup bytes/BOM/CRLF, unknown/null/false, field akademik independen, prefix boundary, hash diketahui, dedup/conflict dan YAML ambigu/alias/invalid.
- Smoke Chromium ZIP sintetis dengan dua prefix: 1 path unik, 1 duplikat identik, 1 konflik; dua versi dan warning wikilink terlihat. Reset melepas index/report dan membuka konfigurasi lagi. Mobile 390px tanpa overflow; tidak ada fetch/XHR tercatat. Screenshot diperiksa; Obscura tidak terhidrasi, fallback disetujui.
- Belum menghubungkan indeks ke course/semester/search/editor; itu M1.3+. Tidak ada penerimaan source pengguna nyata atau integrasi provider dalam bukti ini. Warning sourcemap toolchain tetap; Jev terblokir JEV_API_KEY.

## Issue #9: import lokal, 3 November 2026

- Panel Catatan menerima `.md` UTF-8 dan `.zip` hanya di browser; mempertahankan bytes file valid dalam memori, belum menghubungkan hasil ke editor/navigasi (M1.2+).
- Batas sesi: 32 MiB input, 2.000 entri, 64 MiB bytes ekstraksi, 2 MiB per file. ZIP diproses sequential memakai zip.js; sink membatasi bytes aktual, metadata ukuran tidak dipercaya. Traversal/absolute path/backslash, symlink, file khusus, encrypted ZIP, unsupported extension, NUL/invalid UTF-8 ditolak dengan diagnostic. ZIP rusak memiliki diagnostic arsip.
- Frozen install, 10 test, client/Worker build dan typecheck lulus. Regression meliputi sibling valid di ZIP campuran, traversal/symlink/invalid UTF-8, input/entry/file limits, ukuran ZIP dipalsukan dan sumber tetap identik. Warning sourcemap CSS lama tetap ada.
- Smoke Chromium via file picker ZIP sintetis: 1 file diterima, 2 diagnostic, 3 entri; tutup snapshot menghapus laporan. Viewport 390 × 844 tidak overflow; screenshot diperiksa. Resource timing tidak menunjukkan fetch/XHR selama import; implementasi tidak memiliki transport upload.
- Obscura dicoba terlebih dahulu, hidrasi tidak teramati; fallback Chromium disetujui pengguna. Jev tidak tersedia karena `JEV_API_KEY` belum diatur. Audit accessibility penuh dan acceptance University nyata bukan bagian bukti ini.

## Setup Bun dan shadcn, 3 November 2026

Lingkungan: macOS arm64, Bun 1.4.0. Package manager, script dan test runner memakai Bun; `bun.lock` menggantikan `package-lock.json`. Tailwind v4 dan shadcn/ui Base UI preset Nova terpasang; baru CTA pembuka catatan memakai Button shadcn, bukan migrasi seluruh tampilan.

| Pemeriksaan | Hasil |
|---|---|
| `bun install --frozen-lockfile` | Lulus; lockfile tidak berubah |
| `bun test` | 6 lulus, 0 gagal |
| `bun run build` | Client dan SSR Worker berhasil; peringatan sourcemap CSS toolchain masih ada |
| `bun run typecheck` | Lulus |
| Preview Worker lokal | Chromium: CTA membuka Catatan, editor dapat diubah dan disimpan ke memori demo |
| Keyboard dan mobile | Enter mengaktifkan CTA; viewport 390 × 844 tanpa overflow horizontal pada Home dan Catatan |
| Desktop dan console | Screenshot Home diperiksa; tanpa page error tercatat selama smoke test Chromium |

Obscura dicoba terlebih dahulu: SSR terbaca, tetapi hidrasi tidak teramati, klik koordinat gagal pada deserialisasi `DOM.getBoxModel`, dan screenshot biasa gagal pada `Runtime.callFunctionOn`. Pengguna mengizinkan fallback Chromium untuk verifikasi. Ini keterbatasan verifikasi Obscura, bukan bukti kompatibilitas aplikasi dengannya. Audit accessibility penuh belum dilakukan.

## Bukti handoff sebelumnya (historis)

Tanggal: 3 November 2026. Lingkungan: Linux, Node 24.22.1, npm 11.9.0. Versi dependency exact tersedia pada package.json dan lockfile.

| Pemeriksaan | Hasil |
|---|---|
| Dependency install | Berhasil, 153 paket; scripts install eksternal dinonaktifkan saat validasi |
| Lockfile reproducibility | Lulus, 157 paket dari lockfile; tanpa mengubah versi dependency |
| `npm test` | 6/6 test domain lulus |
| `npm run build` | Client dan SSR Worker build berhasil |
| `npm run typecheck` | Lulus setelah route tree dihasilkan build |
| Script inventory pada University.zip | 486 Markdown, 13 Course Hub, 0 warning inventory |
| SQL migration | Berhasil pada SQLite in-memory; grade null, batas nilai, single active semester, dan foreign key owner diuji |

Domain tests mencakup kode kelas terpisah, null grade vs zero, submitted vs ready, checkbox quiz vs task, prefix/relative links serta nama ambigu/traversal. Ini bukan tes implementasi live provider.

Build mengeluarkan peringatan CSS sourcemap dari toolchain; hasil build berhasil. Tidak ada klaim debugging CSS sourcemap sudah sempurna. Proxy warning berasal dari environment build.

## Reader snapshot (#12)

- Frozen install, 17 tests/62 assertions, client/Worker build dan typecheck lulus. Resolver diuji untuk relative path, source prefix, alias/heading, ambiguity, missing, skema berbahaya dan traversal. Render regression membuktikan tabel/math tampil, HTML aktif dibuang, query plugin tetap teks. Review callout diperbaiki pada AST: marker `[!WARNING]` menjadi label tebal `WARNING:` tanpa marker mentah; diverifikasi lewat render React aktual.
- Smoke Chromium yang disetujui memakai Markdown sintetis: tabel dan KaTeX tampil; screenshot menunjukkan Mermaid Mulai/Selesai; callout WARNING tampil; tautan missing/unsafe memberi alert; tautan heading scroll ke tujuan. `window.__unsafe` tetap false, tidak ada elemen gambar remote. Mobile 390×844 tanpa overflow; browser page errors kosong.
- Obscura tetap menampilkan shell tanpa hidrasi/label; tidak diklaim kompatibel. Mermaid memakai sandbox allow-scripts tanpa allow-same-origin dan CSP connect-src none; source tidak diunggah. Frame cross-origin tidak dapat diinspeksi lewat helper frame agent-browser, bukti Mermaid adalah screenshot aktual.
- Bukti ini bukan acceptance source pengguna, audit semua grammar Mermaid, live provider atau persistence produksi. Warning CSS sourcemap toolchain masih ada.

## Editor/export snapshot (#13)

- Frozen install, 18 tests/68 assertions, client/Worker build dan typecheck lulus. Round-trip memakai importer asli: bytes tidak berubah identik; edit paragraf mempertahankan BOM, CRLF, komentar/unknown YAML, false/null; dua ZIP lapisan diimpor bersama mempertahankan kedua versi konflik pada canonical path sama. NUL ditolak tanpa menyimpan draf.
- Chromium fallback disetujui setelah Obscura kembali tanpa hidrasi. Smoke: edit/simpan menghasilkan dua versi; batal navigasi tab/tutup mempertahankan editor; beforeunload cancelable dibatalkan selama draf atau versi belum diexport; filter/import dinonaktifkan saat dirty. Dua tombol export mengirim download dan membersihkan flag setelah semua lapisan. Native dialog refresh OS tidak diotomasi; handler beforeunload diuji melalui event browser.
- Mobile 390×844 dengan dua versi: editor terpasang dan tanpa overflow setelah select hash dibatasi lebar. Screenshot lokal sintetis; tidak ada source pengguna yang diunggah. Bukti download UI bukan bukti browser selesai menulis disk; payload ZIP diuji lewat round-trip domain/importer.
- Simpan hanya memori sesi, tidak ada write R2 atau persistence produksi. Export satu ZIP per lapisan menghindari nama entri duplikat; semua lapisan harus dipilih bersama saat reimport. Jev unavailable karena JEV_API_KEY belum dikonfigurasi; warning CSS sourcemap tetap.
- Review save-state: setelah simpan editor memilih indeks versi hasil save, bukan mengembalikan body versi dasar. Chromium membuktikan dua save berurutan mempertahankan body masing-masing, selector 1 lalu 2, total tiga versi, dirty false; tests/build/typecheck tetap lulus.

## Query lokal dan acceptance snapshot (#14)

- Frozen install, 19 tests/78 assertions, build/typecheck lulus. Tests mencakup source-prefix folder boundary, filter/sort/limit, null, seluruh versi konflik dan penolakan query arbitrer. Bytes query dan checkbox jawaban tidak diubah; tidak ada konversi checkbox menjadi task/planner.
- Importer dan indeks aktual dijalankan atas University.zip lokal: 486 catatan unik, 13 Course Hub, 486 versi, 0 konflik; 394 versi dengan diagnostic metadata (termasuk related ambigu, bukan semuanya kegagalan YAML). 12 blok DQL, 0 gagal/tidak didukung. Angka ini bukti sumber, bukan batas/konstanta importer.
- Arsip Inggris terpisah tidak tersedia di workspace/Downloads. Subset privat 51 Markdown Inggris diambil byte-identik dari University untuk uji tambahan ZIP: total 537 file diterima, 51 duplikat identik, tetap 486 catatan. Ini menguji dedup 51 file yang sama, bukan re-verifikasi arsip Inggris independen. 586 diagnostic import: 538 entri metadata macOS dan 48 non-Markdown. Tidak ada konten privat/manifest yang dikomit.
- Chromium disetujui setelah Obscura tanpa hidrasi: import kedua ZIP privat menampilkan counts di atas, fetch/XHR 0; tidak mengambil screenshot sumber privat. Fixture sintetis: Enter pada link Recently Updated membuka reader; query unsupported tampil diagnostic, kode tidak berjalan; edit/save/export kedua versi berhasil. Mobile 390×844 tanpa overflow setelah grid main diberi min-width 0. Screenshot hanya sintetis.
- Scan 440 sampel baris privat panjang pada 21 artifact JS/HTML/map/JSON dist: 0 file cocok. Ini pemeriksaan sampling kebocoran plaintext, bukan bukti kriptografis universal. File privat hanya dipilih browser/lokal; tidak ada endpoint pengunggah. Jev tetap unavailable (JEV_API_KEY); warning CSS sourcemap tetap.

## Owner auth/session lokal (#15)

- Migration auth berhasil pada D1 lokal; tidak ada database remote dibuat. Worker unconfigured: session/logout 503 not_configured dan no-store. Konfigurasi sintetis: session tanpa cookie 401; foreign-Origin logout 403; same-origin empty-body logout 204 + cookie expiry; login 302 ke Google dengan state/nonce/S256/scopes identitas saja. Redirect tidak diikuti memakai client sintetis.
- Frozen install, 21 tests/108 assertions, client/Worker build dan typecheck dengan typegen lulus. Tests mencakup owner mismatch, expiry, hashed token, revocation, browser-bound transaction, state mismatch/replay/expiry, redirect injection dan Origin. SQLite nyata menguji SQL DELETE RETURNING; ini bukan bukti Google callback sukses. Scan 21 artifact JS/HTML/map/JSON: synthetic secret dari .dev.vars tidak ditemukan. Konfigurasi sintetis dihapus sesudah smoke.
- Chromium sementara disetujui setelah Obscura kembali tanpa hidrasi. Synthetic import, buka reader/editor, dirty draft, logout: workspace/draft/text hilang; buka ruang kosong: files 0, tanpa summary/draft. Dirty navigation guard diperbaiki agar logout tidak diblokir confirmation. Keyboard Enter logout, 390px tanpa overflow; configured browser menerima Session server ditutup. Tidak ada page errors tercatat.
- Dependency lokal Wrangler sempat memiliki nested workerd tidak lengkap/invalid signature; frozen force reinstall memperbaiki, typegen/migration berhasil. Dua dev server berbagi optimizer sempat memberi stale chunk; restart --force mengatasi. Jev unavailable karena JEV_API_KEY. Login Google nyata, callback sukses dengan signature nyata dan revocation session hasil provider belum diuji: OAuth client/owner belum tersedia. Tidak deploy; #15 live acceptance belum dinyatakan lulus.

## Belum diverifikasi / belum diimplementasikan

- Audit accessibility end-to-end dan kompatibilitas Obscura belum tuntas; smoke test browser setup terbaru tercatat di atas.
- DQL penuh/DataviewJS/Tasks, Canvas, PDF/image viewer serta durable editing belum ada. Subset DQL lokal dan acceptance snapshot tersedia di bawah; arsip Inggris independen belum tersedia untuk verifikasi ulang.
- Google login nyata/non-owner provider belum diverifikasi; auth/session D1 lokal tersedia. R2, D1 akademik remote, RClone Crypt interoperability dan conflict recovery belum ada.
- Google Sheets/Calendar OAuth, read/write dan provider readback belum dilakukan.
- AI model, generasi soal, scoring dan planner belum ada.
- Remote deployment dan migration produksi tidak dilakukan.

Starter hanya memiliki shell UI sintetis dan editor memori. Seluruh source snapshot pengguna dikecualikan dari ZIP handoff. Manifest inventory hasil analisis berada di `.local/` dan tidak dibundel.
