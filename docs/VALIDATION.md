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

## Metadata dan staging privat lokal (#16)

- Frozen install, 23 tests/130 assertions, client/Worker build dan typecheck lulus. Test SQLite nyata membuktikan create/read/update, revisi stale tidak overwrite, isolasi subject, foreign owner ditolak, Origin, size limit, unknown fields, relasi invalid, null SKS dan kode registrasi/BMP terpisah. Migration `0001_initial.sql` + `0002_owner_metadata.sql` berhasil melalui Wrangler D1 lokal; auth migration tetap terpisah. Tidak ada migration remote.
- Worker build dijalankan lokal melalui Node/Wrangler dengan konfigurasi dan session sintetis pada D1 lokal; bukan Google login palsu atau bypass endpoint. GET anonymous 401/no-store; owner GET 200 revision 0; PUT 200 revision 1; GET readback mempertahankan null dan dua kode berbeda; stale PUT 409; foreign-Origin PUT 403; unknown notes field 400; body 131073 byte 413; update revision 2; logout 204 lalu GET 401. Seluruh respons metadata yang diamati no-store. Session/data smoke sintetis dibersihkan; service dihentikan.
- Runtime Wrangler via Bun menghasilkan 503 karena dispatcher undici diabaikan; Node menjalankan build Worker dengan benar. `--persist-to .wrangler/state` eksplisit memastikan preview memakai migration lokal yang sama. Jev dicoba tetapi unavailable (`JEV_API_KEY` tidak tersedia); warning CSS sourcemap tetap. Tidak ada perubahan UI; browser visual tidak diuji ulang untuk API-only deliverable.
- Metadata menyimpan hanya konfigurasi akademik tervalidasi per owner, bukan notes/index/password/path. Belum ada UI editor konfigurasi server, adapter provider, staging remote atau deployment. Private remote staging memerlukan akun/domain/bindings nyata dan live Google acceptance #15; tidak diklaim lulus. Sumber privat tidak digunakan untuk smoke ini.

## UI/UX shadcn, 5 November 2026

- CLI `bunx --bun shadcn@latest info/search/docs/add` dipakai dengan registry `@shadcn`, Base UI Nova. 16 berkas komponen/hook resmi ditambahkan; Button existing tidak ditimpa. Palet hijau/krem/sage dipertahankan lewat token semantic, bukan preset neutral. CSS global legacy yang bertabrakan dengan kontrol dihapus; font Geist lokal tidak memerlukan Google Fonts.
- Frozen install berhasil; 23 tests/129 assertions, build dan typecheck lulus. Assertion literal `<table>` insidental dihapus karena shadcn Table menambahkan atribut; assertion sanitasi HTML/JS serta plugin inert tetap lulus. Warning CSS sourcemap existing tetap muncul.
- Obscura dicoba dahulu: screenshot berhasil, klik gagal `DOM.getBoxModel` float/i64; hidrasi tidak teramati. Doctor 0 fail. Pengguna mengizinkan Chromium sementara. Chromium build Worker: desktop 1440px, menu empat halaman, semester dengan ArrowUp/Enter, import Markdown sintetis, query, reader, edit/save dua versi, selector versi keyboard dan kedua tombol export berhasil. Ini bukti permintaan download, bukan verifikasi file tersimpan disk.
- Mobile 390×844: document scrollWidth = innerWidth = 390 saat snapshot/versi konflik; Sheet navigasi membuka, Escape menutup. Panel session reflow diperbaiki setelah screenshot menemukan kolom teks terlalu sempit; screenshot terbaru menunjukkan teks normal, tanpa overflow. Logout membersihkan workspace; buka ruang kosong berhasil. Tanpa auth config, revocation server tetap dilaporkan belum terkonfirmasi.
- Axe WCAG2A/AA pada snapshot desktop: 0 violation, 0 incomplete, 27 passes; mobile setelah Sheet ditutup: 0 violation, 0 incomplete, 22 passes. Page errors kosong pada pemeriksaan final. Screenshot hanya sintetis di `/tmp/`; tidak memakai sumber pengguna. Dark token tersedia tetapi dark mode bukan surface yang diuji dalam tugas ini.
- Delivery gate: komposisi shadcn PASS (CLI, komponen resmi, field/group/title); palet/ikon PASS (token existing, Lucide relevan); interaksi/keyboard PASS (alur di atas); mobile PASS (390px dan screenshot); privacy PASS untuk smoke sintetis tanpa upload sumber. Bukti ini bukan audit accessibility universal atau live-provider acceptance.

## Tema dan spacing sidebar, 5 November 2026

- Light tetap default: krem, sage, hijau hutan. Pengalih tema di footer sidebar mengaktifkan token dark existing selama halaman terbuka; pilihan tidak dipersistenkan.
- Sidebar: inset menu 12px, padding isi 12px, tinggi target 44px, gap menu 6px; brand/footer sejajar pada 24px. Menu aktif memakai sidebar-primary; hover memakai sidebar-accent.
- `bun run build` dan `bun run typecheck` lulus. Warning CSS sourcemap existing tetap.
- Chromium: desktop 1440×1000 kedua tema diverifikasi visual, pengalih dua arah berfungsi; axe WCAG2A/AA masing-masing 0 violation/0 incomplete. Mobile 390×844: Sheet kedua tema, Escape, lebar dokumen 390px; dark setelah Sheet ditutup 0 violation/0 incomplete. Sheet terbuka 0 violation, 2 kategori incomplete (focus guard/inert dan kontras) memerlukan tinjauan manual. Audit saat animasi penutupan berjalan tidak dipakai sebagai hasil stabil. Page errors kosong.
- Screenshot sintetis lokal `/tmp/sidebar-*.png`. Tidak ada deployment atau verifikasi provider live.

## Koreksi light chalk dan indikator navigasi

- Light diperjelas: background `#faf9f6`, sidebar `#f6f5f0`, hero terang `#eeeee3`; dark token tetap. Aktif light memakai sage pucat, bukan blok hijau gelap.
- Navigasi memakai dua indikator terpisah: aktif dan hover; transform 200ms ease-out, hover memudar saat pointer keluar. CSS transition dapat diinterupsi; `motion-reduce:transition-none` tersedia. Tidak menambah dependency.
- Build/typecheck lulus. Chromium desktop: seluruh menu, keyboard Tab/Enter, hover antar-menu, hover keluar (opacity final 0), aktif final translateY 50px. Hover diperlambat ke 2 detik (10% kecepatan), perpindahan antar-target menghasilkan posisi intermediate dan transition yang dapat diinterupsi. Aktif juga diuji playbackRate 0.1 sebelum perubahan hover. Screenshot sintetis `/tmp/study-chalk*.png`.
- Axe final desktop: 0 violation, 1 incomplete kontras teks menu aktif; perlu tinjauan manual. Page errors kosong. Mobile smoke sebelum penambahan hover: dark, Sheet/menu, lebar dokumen 390px. Reduced-motion OS dan mobile setelah penambahan hover belum diuji runtime.

## Switcher navbar dan circular reveal

- Scope: switcher tema dan header dashboard, React/TanStack Start, Tailwind v4/shadcn. ENERGY 1 / RHYTHM 2 / MOTION 2. Palet chalk/sage dipertahankan untuk ruang baca; tombol 44×44 di sebelah Ruang lokal agar tersedia tanpa membuka sidebar. Sapuan lingkaran menghubungkan perubahan global dengan tombol asal, bukan dekorasi halaman.
- `ThemeToggle` menggantikan tombol footer, label aksi dan aria-pressed mengikuti tema; dua ikon currentColor memakai cross-fade/scale/blur. Native View Transition + Web Animations membuka snapshot tema baru dari pusat tombol selama 450ms. Tidak ada dependency baru. Reduced motion atau browser tanpa API berganti langsung. Klik selama transisi diabaikan agar snapshot tidak bertabrakan. Preferensi masih hanya selama halaman terbuka.
- `bun run build` dan `bun run typecheck` lulus; warning sourcemap existing tetap. Preview dimulai dari build terbaru. Obscura belum menghidrasi; Chromium sementara dipakai sesuai izin sebelumnya.
- Desktop 1440×1000: klik gelap, sapuan diperlambat 10% (4500ms), screenshot intermediate menunjukkan dua tema dengan batas lingkaran; titik asal (1386,88.5) sama dengan pusat tombol 44×44. Klik terang menyapu kembali, kelas transisi dibersihkan. Rapid double click menghasilkan satu perubahan, cleanup selesai. Simulasi matchMedia reduced-motion serta API tidak tersedia: tema berubah tanpa animasi baru.
- Mobile 390×844: Enter pada switcher mengubah tema, fokus tetap pada tombol; light/dark screenshot, scrollWidth 390. Sidebar dibuka lalu Escape menutup. Satu switcher saja tersedia. Axe header kedua tema desktop dan light mobile: 0 violation/0 incomplete, 12 passes. Page errors kosong. Ini bukan audit seluruh aplikasi atau uji perangkat fisik/OS reduced-motion.
- Gate scope: R-03/25/26/32/34/35 PASS berdasarkan ukuran, audit header, kedua arah toggle, keyboard dan screenshot di atas. R-01/04/19/31 PASS: palet dipertahankan, Sun/Moon menjelaskan aksi, motion berasal dari tombol. R-02/17/18/23/24/27/28/33/36/37/38 PASS untuk perubahan ini: tidak menambah copy klaim, data, aset, navigasi atau data fetching; implementasi langsung di source. Liveliness/quality locks PASS untuk scope: dials eksplisit, tombol aksen tunggal navbar, struktur dan tipografi existing dipertahankan, tidak ada template/efek tambahan. Audit seluruh aplikasi di luar scope.

- Koreksi separator navbar: override `data-vertical:self-stretch` bawaan dengan `data-vertical:self-center` pada pemakaian header saja. Build lulus; pengukuran Obscura menunjukkan pusat separator dan tombol sama-sama y=89px, tinggi separator 16px. Screenshot `/tmp/separator-centered.png` mengonfirmasi garis di tengah, bukan menempel border atas; hidrasi Obscura tetap di luar bukti ini.

## Belum diverifikasi / belum diimplementasikan

- Audit accessibility end-to-end dan kompatibilitas Obscura belum tuntas; smoke test browser setup terbaru tercatat di atas.
- DQL penuh/DataviewJS/Tasks, Canvas, PDF/image viewer serta durable editing belum ada. Subset DQL lokal dan acceptance snapshot tersedia di bawah; arsip Inggris independen belum tersedia untuk verifikasi ulang.
- Google login nyata/non-owner provider belum diverifikasi; auth/session D1 lokal tersedia. R2, D1 akademik remote, RClone Crypt interoperability dan conflict recovery belum ada.
- Google Sheets/Calendar OAuth, read/write dan provider readback belum dilakukan.
- AI model, generasi soal, scoring dan planner belum ada.
- Remote deployment dan migration produksi tidak dilakukan.

Starter hanya memiliki shell UI sintetis dan editor memori. Seluruh source snapshot pengguna dikecualikan dari ZIP handoff. Manifest inventory hasil analisis berada di `.local/` dan tidak dibundel.

## Latihan manual #24, 5 November 2026

- GitHub: #24 OPEN dengan dependency native #12 yang CLOSED/COMPLETED. #15/#16 live belum diklaim selesai. Tidak ada publish, commit atau perubahan issue remote.
- Frozen install lulus; `bun test`: 29 pass, 0 fail, 158 assertions. `bun run build` dan `bun run typecheck` lulus; warning CSS sourcemap existing tetap. Enam test latihan membuktikan pemisahan kunci, provenance, warning/mismatch, invalid/missing key, rubrik esai dan attempts terpisah.
- Chromium fixture sintetis `/tmp/practice-synthetic.md`: import, pilih note, preview versi, 3 soal; kunci mentah dan field kunci tidak terlihat pada preview/answer. Pilihan A + isian biru sesuai kunci, esai hanya rubrik manual estimasi; review menampilkan path/hash/heading/modul asli. Attempt kedua B/merah tidak menimpa attempt pertama A/biru; tombol histori membuka pertama.
- Build final setelah perbaikan landmark diuji ulang melalui preview yang direstart. Mobile 390×844 light/dark: scrollWidth 390, latihan/review dan input berfungsi. Axe workspace answer light/dark dan review dark: 0 violation, 0 incomplete, 20 passes. Page errors kosong. Logout menghapus panel latihan dan path sumber dari DOM. Screenshot sintetis `/tmp/practice-mobile-light.png`; Obscura tetap gagal hidrasi, Chromium dipakai seperti pengujian sebelumnya.
- Batas: format multiline/tabel kunci belum didukung, diagnostik preview menjelaskan batas. Histori tidak durable dan hilang saat panel ditutup. Tidak diuji dengan sumber privat nyata, AI/provider/live staging tidak dipakai. UI existing dipertahankan, tidak ada navigasi baru atau perubahan tema.

## CI hermetic #28 dan integrasi merge bertingkat

- #38 merged ke feat/private-metadata, #39 ke feat/study-ui-polish; origin/main a84c7de hanya memuat metadata. Branch fix/hermetic-ci menggabungkan hasil merge branch bertingkat tanpa mengubah implementasi UI/latihan. Tidak menimpa main atau melakukan deployment.
- Workflow baru: pull_request, push main, workflow_dispatch; ubuntu-24.04, Node 22.18.0, Bun sesuai packageManager. Checkout/setup actions dipin SHA hasil API GitHub. Contents read-only, checkout tanpa persisted credentials, timeout 15 menit, concurrency cancellation. Hanya install/test/build/typecheck; tanpa secret, vault input, artifact upload atau deploy.
- Smoke command lokal berurutan setelah integrasi: bun install --frozen-lockfile; bun test (29 pass, 158 assertions); bun run build; bun run typecheck. Semua lulus. Ini bukan bukti runner Linux/GitHub; run remote menunggu publish workflow. Warning CSS sourcemap existing tetap. UI tidak dimodifikasi; runtime browser sebelumnya berlaku untuk commit yang sama.

## #17 vault uji read-only — 6 November 2026

- Adapter exact @fyears/rclone-crypt 0.0.7 mengikuti Remotely Save 0.5.25, base64 names dan empty salt. Fixture sintetis independen dibuat official rclone v1.75.2, disimpan tests/fixtures/rclone.json. Password fixture publik study-fixture-only, bukan password pengguna.
- Frozen install, 35 tests/196 assertions, build dan typecheck lulus. Crypto tests: independent filename/content decryption, wrong password, corruption/truncation. Transport tests: owner denial, method/query/path/cursor allowlist, pagination, missing binding/object, size limit. Existing CSS sourcemap warning tetap.
- Obscura worker smoke timeout; Chromium fallback setelah izin eksplisit. Browser Worker nyata dengan fetch fixture terintersep: wrong password ditolak, path/content cocok, read setelah lock ditolak. UI Koneksi unlock/read menampilkan fixture; lock menghilangkan reader, salah password membersihkan input. Screenshot sintetis /tmp/vault-interop-reader.png diperiksa. Ini bukan proof auth/R2 live. Browser ditutup.
- Setelah izin resource/upload/deploy: bucket study-vault-interop dibuat, satu ciphertext sintetis official rclone diupload pada interop/, binding staging dipasang. Deploy version 6359e717-bd87-4597-abbe-45db7a143ad6. HTTPS /api/vault/list dan /api/vault/object tanpa cookie 401 + no-store. Bucket obsidian-vault tidak ditulis; tidak ada data pengguna di fixture.
- Pengguna kemudian mengonfirmasi vault uji sudah dapat dibuka pada staging. Ini hasil yang dilaporkan pengguna, bukan sesi owner agent. Diagnosis terpisah: ciphertext remote 92 byte cocok fixture; worker bundle produksi di Chromium mendekripsi nama/content dengan benar. Lock/logout pada sesi provider pengguna belum dikonfirmasi spesifik. Tidak ada save/rename/delete endpoint; tidak ada physical memory wipe guarantee.

## Conditional save dan encrypted recovery #18

- PR #43 ternyata merged ke parent feat/private-staging, bukan main. Reader #17 diintegrasikan ke branch feat/vault-conditional-save sebelum perubahan #18; main/deployment tidak diubah.
- Frozen install, 36 tests/217 assertions, build, typecheck lulus. Transport tests membuktikan exact Origin, gate default off, stale/race CAS 409, backup gagal tidak mengubah bytes, save bytes berbeda, restore bytes lama, uncertain provider failure; binding histori terpisah dari bucket sinkronisasi. Warning CSS sourcemap existing tetap.
- Obscura worker timeout lagi; pengguna mengizinkan Chromium sementara. Browser worker nyata + transport sintetis terintersep: unlock/read, stale conflict, explicit reread/retry, encrypt/save/readback Unicode, history dan recover/readback bytes awal berhasil. UI nyata: editor, stale alert dengan draf tetap, remote terpisah, retry/save, history berhasil; screenshot sintetis /tmp/vault-save-synthetic.png diperiksa. Bukti ini bukan live R2 conditional-write proof.
- Ciphertext dari save UI didekripsi official rclone v1.75.2 menjadi tepat `# Perubahan ü 日本語`; file verifikasi sintetis di direktori /tmp terisolasi. Remotely Save 0.5.25 Mac–web–Mac, attachments, provider logout dan recovery dua arah belum diverifikasi.
- Setelah persetujuan pengguna: bucket `study-vault-interop-history` dibuat terpisah, staging gate diaktifkan, build staging/typecheck/deploy berhasil; version `277f9f87-5439-4d2e-b079-566d7a5217de`. PUT anonim HTTPS mendapat 401/no-store. Owner live save/recovery belum dijalankan; sesi Google owner tidak tersedia pada browser smoke. Tidak membuat bypass/token owner sintetis pada staging. Bucket utama tidak dibinding/ditulis. #18 belum memenuhi release acceptance; perlu sesi owner dan test vault Obsidian terpisah. Jev dicoba; unavailable karena JEV_API_KEY tidak diset.
- Pengguna melaporkan staging berhasil setelah instruksi uji owner save/konflik/recovery. Konfirmasi ini tidak dirinci per langkah; tidak dianggap bukti Mac–web–Mac/lampiran. Pengguna meminta commit/push dan penutupan #18; acceptance interoperability yang belum teramati tetap gate terpisah sebelum write utama atau enable rename/delete.

## Verifikasi CI remote #28 — 6 November 2026

- Log GitHub Actions diperiksa: [run main 42159750877](https://github.com/roshitx/study-dashboard/actions/runs/42159750877), head `c8089b72a98d48b911132957516b3431961c08cf`, event push, success; [run PR #44 42173445337](https://github.com/roshitx/study-dashboard/actions/runs/42173445337), head `840f511ecac64db9f31a2f2b5bf0d9366646fa76`, event pull_request, success. Checkout PR memakai merge ref; bukti berlaku pada snapshot masing-masing, bukan deliverable mendatang.
- Runner PR Ubuntu 24.04, Node 22.18.0 dan Bun 1.4.0: frozen install, 36 tests/217 assertions (0 fail), build client/Worker dan typegen/typecheck selesai sukses. Workflow hanya menjalankan checks tersebut; contents read-only, checkout tanpa persisted credentials, tanpa secrets provider, deploy atau upload artifact sumber. Fixture kripto sintetis, bukan vault pengguna.
- Pemeriksaan lokal diulang berurutan: `bun install --frozen-lockfile`, `bun test` (36 pass, 0 fail, 217 assertions), `bun run build`, `bun run typecheck`; semuanya exit 0. Tidak ada perubahan dependency atau kode runtime. Warning sourcemap CSS/chunk besar tetap; log remote juga memperingatkan deprecation runtime Node action, bukan kegagalan checks.
- Koreksi status historis: pernyataan “run remote menunggu publish” di bagian CI sebelumnya tidak lagi berlaku. #28 tidak ditutup: dependency native masih mencakup deliverable terbuka #15–#17, #19–#27. Bukti hermetic tidak menggantikan Google/Sheets/Calendar live, Mac–web–Mac/recovery #45 atau acceptance rilis. Tidak ada commit, push, merge, deploy atau perubahan issue GitHub dalam verifikasi ini.


## Koneksi Google API langsung — 6 November 2026

- Arahan terbaru owner membatalkan planner snapshot; implementasi/tests/panduan planner tersebut dihapus. Import catatan M1 tetap existing. Grant API Sheets/Calendar terpisah login, OAuth state/PKCE/nonce/cookie dan subject binding, refresh token AES-GCM owner/service-bound di D1. Key lokal dibuat atas persetujuan pengguna tanpa ditampilkan; migration AUTH_DB 0002 lokal berhasil. Tidak mengubah OAuth credentials atau remote.
- Frozen install, 38 tests/237 assertions (0 fail), client/Worker build dan typecheck lulus. Tests baru: anonymous/foreign Origin/service invalid/duplicate query ditolak, scope Sheets minimum, callback tambahan, offline PKCE, replay salah state dikonsumsi, disconnected read, dekripsi independen token dan penolakan owner binding salah, wrong encryption key fail closed. Ini bukan test callback provider sukses atau API readback live.
- Runtime dev localhost:3000: GET /api/google/status anonymous 401, Cache-Control no-store. Obscura lebih dahulu tidak menghidrasi; fallback Chromium diizinkan pengguna. Panel Koneksi nyata menampilkan Masuk sebagai owner terlebih dahulu, tombol grant disabled, periksa ulang berfungsi. Mobile 390px document width 390; screenshot sintetis panel diperiksa. Axe panel final 0 violations/0 incomplete setelah heading h2 ditambahkan. Page errors kosong. Tidak membuat bypass/session owner pada runtime.
- Prasyarat live belum tersedia: consent owner belum dilakukan, callback tambahan http://localhost:3000/api/google/callback perlu didaftarkan di Google Console, GOOGLE_SHEET_ID belum dikonfigurasi. GOOGLE_TOKEN_KEY lokal tersedia. Client hanya menampilkan inventaris workbook/kalender nyata setelah grant, bukan mapping nilai Tuton/event planner; #20/#23 belum dinyatakan selesai. Tidak ada data provider palsu, fallback snapshot planner, write Sheet/event, deployment atau perubahan issue GitHub.
- Scope UI tetap chalk/sage dan komponen existing. Gate tampilan unauthenticated/mobile/axe PASS; alur consent/read/revoke live belum diverifikasi. Jev belum tersedia (JEV_API_KEY). Server dipakai hanya lokal untuk smoke; staging tidak diubah.

## Readback Sheets nyata — 6 November 2026

- Setelah owner memperbarui callback dan melakukan consent, D1 lokal memiliki grant sheets dan calendar. Allowlist spreadsheet sudah dikonfigurasi. Smoke privat memakai refresh token terenkripsi existing secara read-only: refresh OAuth berhasil, spreadsheets.get HTTP 200 menggunakan field mask implementasi aktual. Respons 95.943 byte, dua worksheet bertipe GRID dan OBJECT, 321 posisi sel, 138 boolean dan 138 validasi. Isi sel, judul workbook, token, subject dan kredensial tidak dicetak/disimpan ke artifact. Ini membuktikan provider Sheets nyata, bukan write/readback nilai setelah edit.
- Adapter diperluas dari inventaris ke metadata worksheet/merge dan nilai asli/efektif/formula/teks/note/validasi sel. Tidak melakukan normalisasi false/0 atau menganggap OBJECT sebagai tabel. Batas respons 2 MiB tetap berlaku. Mapping offering/sesi/aktivitas belum diterapkan; #20 tidak selesai. Calendar hanya grant tersimpan, read provider belum diuji di langkah ini.
- Frozen install, 38 tests/237 assertions, build dan typecheck lulus setelah perubahan. Warning sourcemap vite:css-post masih muncul. Obscura pada session baru menerima 401 karena bukan session browser owner; tidak membuat session bypass atau menyalin cookie owner. Smoke provider terpisah tidak membuktikan tombol baca pada browser owner. Session browser uji ditutup.

## Tracker mapping baca-saja — 6 November 2026

- UI hasil Sheets kini worksheet picker, tabel koordinat native, mapping eksplisit semester/offering/kode registrasi/kelas/sesi/aktivitas dan nilai. Identitas header/baris diperiksa kembali terhadap workbook terbaru. OBJECT diberi status non-GRID, bukan tabel kosong. Mapping hanya memori panel, belum persist D1 atau validasi referensi terhadap metadata akademik. #20 belum dinyatakan selesai penuh.
- Smoke komponen aktual melalui Vite memakai workbook sintetis, tanpa bypass auth atau data pengguna: submit mapping menampilkan sesi 3 Diskusi false; memilih OBJECT menghilangkan form dan menampilkan alasan; viewport 390px tanpa overflow. Obscura diuji dahulu, FormData(form).get mengembalikan null meski input terisi; fallback Chromium disetujui pengguna dan submit berhasil. Screenshot sintetis mobile diperiksa. Smoke ini bukan bukti browser owner live end-to-end.
- Tests domain mencakup sparse grid offsets, null/0/false, header/row/workbook drift, invalid coordinates dan OBJECT. Provider Sheets nyata sudah dibuktikan pada bagian sebelumnya, tidak diulang sebagai bukti mapping offering live pengguna.
- Verifikasi akhir: 42 tests/248 assertions lulus; build/typecheck lulus; axe tracker 0 violations/0 incomplete setelah container sumber menjadi region section. Page errors kosong; browser smoke ditutup. Warning sourcemap vite:css-post tetap ada.

## Issue #20 — kesegaran hasil provider

- Panel membedakan loading/ready/stale/error; hasil lama tetap terlihat saat refresh gagal dengan peringatan bukan kondisi terbaru Google. Timestamp pembacaan ditampilkan Asia/Jakarta. Respons source/fetchedAt tidak valid ditolak. Connect/disconnect membuang hasil lama.
- Smoke Obscura pada komponen GoogleConnection aktual, fetch sintetis hanya di tab: read sukses ready + OBJECT; read 502 menampilkan stale dan mempertahankan tracker; read sukses berikutnya memulihkan ready dan menghapus stale. Tidak memakai token/data produksi atau mengklaim provider live dari mock. 42 tests/248 assertions, build/typecheck lulus; warning sourcemap existing.
- Issue #20 tetap terbuka: mapping masih form koordinat/memori, belum pengenalan header bertingkat dan keterikatan offering pada metadata tersimpan; belum smoke owner penuh. Tidak beralih ke #21/#22/#23 atau menutup issue.

## Issue #20 — deteksi header Tuton bertingkat

- Preview otomatis mengenali header Kode/Nama Mata Kuliah, Sesi N, label tanggal sumber serta aktivitas; kode registrasi dan class suffix dipisah. Tidak hardcode A:AH, semester, tanggal atau jumlah mata kuliah. Header identitas ambigu dan nomor sesi berulang diblokir. OBJECT tetap non-GRID. Deteksi baru preview, belum binding semester/offering tersimpan.
- 44 tests/254 assertions, build/typecheck lulus. Smoke komponen aktual melalui Obscura dengan sumber sintetis: kode/class terdeteksi, sesi Diskusi false dan Nilai 0 tampil terpisah; details dibuka, screenshot sintetis diperiksa. Tidak menggunakan data pribadi, tidak mengklaim verifikasi deteksi workbook owner. Warning sourcemap existing tetap muncul. Browser smoke ditutup.

## Issue #20 — metadata binding akademik tersimpan

- Metadata owner menerima tutonBindings opsional: offeringId, sheetId dan sourceCourse. Referensi offering, duplikasi dan identitas kode/class diperiksa server. Tidak menerima nilai sel, arbitrary spreadsheet resource atau owner ID; endpoint allowlist Google tetap server-only. Konfigurasi existing tanpa binding tetap valid. PUT memakai revisi atomik existing; source data Google tidak ditulis.
- UI eksplisit membaca konfigurasi, menerima nomor semester pribadi/periode UT, membuat course/offering dengan SKS dan kode BMP null, menolak beda kelas/periode/binding tanpa overwrite. Hanya metadata akademik disimpan setelah klik owner. Konfigurasi dapat dibaca ulang setelah reload; tracker belum difilter/diikat ke pilihan semester tersimpan. Gate #20 masih terbuka, bukan acceptance lengkap.
- Frozen install, 45 tests/257 assertions, build/typecheck lulus. Test API SQLite nyata mencakup persist/read binding serta referensi offering hilang. Smoke UI sintetis: Obscura read config berhasil; Chromium sementara disetujui pengguna untuk submit. Tombol simpan menghasilkan binding dan kelas terpisah, 409 menampilkan konflik dan mempertahankan isian; axe 0 violations/0 incomplete. Fetch hanya mock tab, bukan bukti D1 owner live. Browser ditutup; tidak menyimpan data pengguna lewat agent. Warning sourcemap existing.

## Issue #20 — filter semester/offering tersimpan, 9 November 2026

- Konfigurasi metadata yang dibaca/disimpan kini diteruskan ke tracker; semester aktif dipilih dari data, bukan hardcode. Resolver membatasi offering pada semester dan worksheet; kode/class harus cocok tepat dan unik pada sumber terbaru. Identitas hilang atau duplikat diblokir tanpa fallback offering lain. Preview sumber mentah tetap terpisah dari tracker terfilter.
- 46 tests/261 assertions, build/typecheck lulus. Test resolver: isolasi semester/class, worksheet salah, identitas duplikat. Smoke komponen aktual Obscura memakai workbook/metadata sintetis: default semester aktif s2 menampilkan false; beralih s1 menampilkan identitas hilang, tidak membocorkan nilai s2. Screenshot sintetis diperiksa, browser ditutup. Tidak mengklaim owner live end-to-end; warning sourcemap existing.

## Issue #21 — update Tuton aman, 9 November 2026

- Coordinator serial per workbook; pending durable sebelum dispatch, ID/payload collision ditolak, restart pending menjadi uncertain, reconcile hanya membaca. Provider allowlist workbook server, metadata owner, struktur sumber tersimpan, native boolean/number/null, proteksi formula, expected value dan pembacaan ulang. Values API RAW tidak memutasi format/validation. Bukan CAS editor eksternal.
- Frozen install, 53 tests/291 assertions, build dan typecheck lulus. Test provider sintetis menjalankan prepare/write/read aktual dengan mock HTTP: false menjadi true, nilai 5 menjadi 0 lalu kosong, stale conflict, formula dan row drift ditolak. Tidak membuktikan perilaku Google live atau restart Durable Object deployed.
- Runtime endpoint lokal tanpa owner menolak 403/no-store pada origin noncanonical. Obscura gagal DOM.getBoxModel dan interaksi React. Pengguna mengizinkan Chromium sementara: komponen React aktual dengan transport sintetis membuktikan review lama/baru, uncertain, readback confirmed, operasi baru setelah terminal, reload memulihkan ID dan memblokir edit. Screenshot mobile diperiksa; tanpa overflow pada smoke awal. Fixture tidak memuat stylesheet aplikasi, bukan bukti visual integrasi halaman penuh. Browser sementara ditutup.
- Review provider menemukan kode penolakan hilang dan optional scope refresh ditolak; diperbaiki. Grid data diminta eksplisit. Jev tidak tersedia: JEV_API_KEY belum disetel. Owner live write/consent, migration remote dan acceptance #21 tetap belum diverifikasi. Tidak ada write data pribadi, commit, push atau deploy.

## Feedback reconnect Google

- Owner melaporkan Hubungkan ulang Sheets gagal/tidak terlihat hasilnya. Pemeriksaan lokal menunjukkan grant sheets/calendar/sheetsWrite tersimpan, tanpa transaksi OAuth pending; ini tidak membuktikan seluruh percobaan berhasil.
- Temuan source-path: cabang callback sukses sebelumnya mengembalikan root, sementara Dashboard menginisialisasi Hari ini. Ini bukan reproduksi penyebab kegagalan klik owner. Callback kini ke `/?tab=connections`; search divalidasi router, panel Koneksi dirender sejak SSR. Percobaan hash + effect tidak bekerja pada smoke Obscura dan diganti query route. Smoke browser adalah satu-satunya verifikasi perilaku return panel; tidak ada regression test callback sukses atau OAuth live untuk perubahan ini.
- Browser Obscura membuka `/?tab=connections` dan mengamati heading Koneksi sumber, Google Sheets & Calendar, Vault uji. Panel menambahkan petunjuk bahwa grant tersimpan bukan pembacaan workbook. 53 tests/291 assertions, build/typecheck lulus. Klik OAuth dalam browser owner belum dapat diperiksa: session ada pada browser pengguna, relay extension tidak terhubung. Penyebab kegagalan klik owner belum dipastikan; tidak ada write spreadsheet.

## Diagnosis reconnect_required saat baca

- Laporan owner: Baca workbook live menghasilkan reconnect_required. Root cause live belum diketahui. Catch sebelumnya mengubah semua exception tidak dikenal menjadi reconnect_required, termasuk dekripsi, jaringan dan konfigurasi OAuth.
- Refresh membedakan invalid_grant (reconnect_required), invalid_client (oauth_client_error), token_unreadable, refresh_unavailable dan provider_error; transport API menjadi provider_unavailable, API 401 access_token_rejected, 403 provider_access_denied. Tidak mengirim body/provider detail/token ke UI atau log. Tidak menghapus grant atau retry otomatis.
- Regresi sintetis gagal sebelum perbaikan, lulus sesudahnya: invalid grant/client, provider error, jaringan, token rusak. 54 tests/296 assertions, build/typecheck lulus sebelum pemisahan kode API terakhir. Live read sukses belum terbukti; perubahan ini diagnosis, bukan perbaikan penyebab live. Inspeksi SQLite langsung gagal dan tidak dilanjutkan; tidak mengekspor token.
- Regresi endpoint tambahan membuktikan refresh berhasil lalu API 401/403/429 dipisahkan; transport fetch API yang gagal sebelumnya menjadi provider_error, kini provider_unavailable. Red-before/green-after teramati. Suite 55 tests/304 assertions dan typecheck lulus; mock fetch dipulihkan via finally, suite default Bun tanpa concurrent. Live owner tetap belum terverifikasi.
- Owner melaporkan reconnect tetap menghasilkan provider_unavailable. Probe tanpa kredensial: curl mencapai OAuth (404) dan Sheets (403); Wrangler/Workers melalui Node juga mencapai kedua host dengan status sama. Probe memakai fungsi googleAccessToken aktual dengan kredensial sintetis menerima oauth_client_error dari Google. Ini bukan bukti grant owner atau workbook live berfungsi. Probe Bun gagal forwarding dispatcher; aplikasi aktif memakai Node, sehingga kegagalan probe Bun tidak ditetapkan sebagai penyebab owner. Probe/config sementara dihapus, proses ditutup.
- Transport refresh sekarang refresh_unavailable; transport fetch API tetap provider_unavailable. Tidak mencetak token atau detail respons owner. Suite 55 tests/304 assertions dan typecheck lulus. Diagnosis live masih memerlukan tahap error terbaru dari sesi owner; tidak meminta reconnect ulang.
- Regresi handleGoogle tambahan memastikan kegagalan transport refresh menjadi HTTP 502 dengan JSON tepat {error: 'refresh_unavailable'}, bukan provider_error. UI source meneruskan string error respons ke AlertDescription tanpa pemetaan ulang; browser owner belum diuji. Suite 55 tests/306 assertions, build dan typecheck lulus. Perubahan lokal, tidak deploy; klasifikasi ini hanya berlaku pada runtime yang memuat kode terbaru.

## Halaman login privat, 9 November 2026

- /login dua panel, mobile bertumpuk, tema existing; OwnerSession guard tidak merender dashboard sebelum sesi valid. Satu header dashboard dengan tema dan Keluar. Dirty registry untuk draf demo/import/vault/Tuton; logout POST sebelum redirect, retry kegagalan di /login. Alasan closed/expired tidak auto-redirect walau cookie server masih berlaku.
- 57 tests/330 assertions, build dan typecheck lulus setelah perubahan akhir. Detector Impeccable pada login/guard menghasilkan []. Peringatan sourcemap vite:css-post tetap ada. Migration 0004_auth_return_to.sql diterapkan lokal, dua commands; tidak remote.
- Obscura membuka SSR login, tetapi klik gagal deserialisasi DOM.getBoxModel dan hidrasi tidak terjadi. Owner mengizinkan Chromium sementara: login actual app terhidrasi, tema berubah, screenshot desktop dark/mobile dark diperiksa; mobile 390px tanpa overflow, target tombol tema 44px dan login 48px. Fixture browser hanya /api/session, /api/auth/logout; endpoint API lain ditolak 401 tanpa mengambil data pribadi. Guard sempat tertahan akibat effect cleanup StrictMode; lock dipindah ke scope effect, render dashboard demo kemudian teramati dengan satu tombol Keluar sejajar tema.
- Percobaan konfirmasi draf berhenti karena selector tidak cocok; belum membuktikan dialog/retry/logout lintas tab/expiry/keyboard/semua error. Owner memerintahkan berhenti pengujian browser; kedua sesi ditutup. Tidak ada login Google nyata atau data pribadi. Delivery Gate visual belum lengkap, tidak dinyatakan PASS. Verifikasi browser lanjutan tidak dilakukan.
- Revisi visual atas screenshot owner: panel kiri mengganti paragraf dominan dengan komposisi buku, label Catatan Anda/Sumber belajar, ikon akademik/privat; bukan screenshot data atau klaim koneksi live. Ikon Google SVG putih pada tombol hijau tetap di kedua tema, bukan huruf G tiruan. Elemen visual besar disembunyikan di bawah breakpoint sm agar login mobile tidak terdorong. Alur autentikasi tidak diubah. Build/typecheck dan 57 tests/330 assertions lulus. Tidak menjalankan browser sesuai instruksi owner; tampilan revisi belum diverifikasi visual.
- Panel kanan dipersingkat atas permintaan owner: judul Selamat datang kembali, satu baris petunjuk akun, tombol Google. Paragraf izin sumber dan footer berulang dihapus; status expiry/logout dipersingkat, error dan retry tetap. Build/typecheck lulus setelah perubahan copy. Tidak membuka browser.
- Penyatuan warna: latar fokus dashboard hardcode #eeeee3 dihapus, memakai bg-brand/text-brand-foreground seperti panel login. Tombol Google hardcode dipindah ke token, sidebar-primary ikut alias brand dengan teks putih. Build/typecheck dan 57 tests/330 assertions lulus; tanpa browser, hasil visual belum diverifikasi.
- Logout memakai AlertDialog shadcn/Base UI, menggantikan window.confirm. Dialog hanya untuk draf belum tersimpan/diekspor; tanpa draf langsung logout. Batal dan Escape dikelola primitive Close/Root, konfirmasi menjalankan logout existing. Pemeriksaan interaksi browser tidak dijalankan sesuai batas owner; keyboard/fokus/visual belum dibuktikan end-to-end.
- Setelah pembatasan dialog ke draf dirty: bun test lulus 57 tests/330 assertions, bun run build dan bun run typecheck lulus. Warning sourcemap vite:css-post existing tetap muncul. Suite ini bukan bukti interaksi dialog; browser tetap tidak dijalankan.

## Issue #20, validasi konfigurasi sebelum refresh

- Ditemukan bug urutan independen: ID workbook kosong/invalid baru diperiksa setelah refresh token. Regresi sintetis menerima 502, bukan 503, ketika refresh transport gagal. Ini bukan bukti penyebab kegagalan live owner.
- Guard khusus service sheets dipindah sebelum refresh, setelah pemeriksaan owner/grant. ID kosong/invalid kini menghasilkan 503 sheet_not_configured tanpa kontak Google. Calendar tanpa ID workbook tetap menghasilkan hasil kalender sintetis yang benar. Respons langsung tidak melewati catch; tidak diperlukan penambahan sheet_not_configured ke known.
- Verifikasi setelah perbaikan: 59 tests/341 assertions, build dan typecheck lulus. Warning sourcemap existing tetap. Tidak membuka browser, memakai grant owner, reconnect, atau menulis workbook. Read live dan binding owner tetap belum terverifikasi.
