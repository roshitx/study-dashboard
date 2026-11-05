# Backlog untuk AI Agent

Jalankan berurutan. Satu milestone boleh terdiri beberapa perubahan kecil. Jangan menandai acceptance live lulus berdasarkan mock atau compile saja.

## M0 — handoff scaffold (tersedia)

- [x] TanStack Start, React, TypeScript, Vite dan Cloudflare config.
- [x] Demo shell, pemilihan semester, daftar course, editor memori, status koneksi.
- [x] Types, aturan domain, tests, initial SQL metadata dan integration ports.
- [x] PRD, arsitektur, keputusan, deployment checklist dan prompt pertama.
- [x] Smoke browser starter: CTA, keyboard Enter, editor/simpan memori, mobile 390px; bukti dan batas QA di `docs/VALIDATION.md`.

## Cara menjalankan pekerjaan

- Sumber requirement: `PRD.md`; kontrak browser/server: `ARCHITECTURE.md`; bukti hasil: `VALIDATION.md`; keputusan baru: `DECISIONS.md`.
- Satu branch dan PR per hasil yang bisa dipakai/direview. Branch pertama: `feat/local-import`. Tidak membuat folder, adapter atau endpoint kosong untuk milestone mendatang.
- Setiap hasil: implementasi minimum, test perilaku berisiko, smoke browser nyata, lalu catat hasil dan batasnya. Jalankan `bun install --frozen-lockfile`, `bun test`, `bun run build`, `bun run typecheck` sebelum merge.
- Fixture repo wajib sintetis. ZIP dan manifest pengguna tetap di `.local/`; pengujian sumber nyata hanya lokal. Jangan upload isi sumber ke GitHub, screenshot publik atau CI artifact.
- Tidak ada deployment otomatis pada tahap fondasi. Integrasi live memerlukan gate milestone terkait, bukan sekadar build hijau.

### Urutan deliverable M1

| Urutan | Hasil yang dapat dipakai | Acceptance sebelum lanjut |
|---|---|---|
| M1.1 | Pilih file/ZIP dan lihat laporan import di browser | Batas jumlah/ukuran terkompresi dan hasil ekstraksi ditetapkan; traversal, symlink, encoding/file invalid ditolak dengan diagnostic; note valid tetap diproses; sumber tidak dimutasi atau dikirim ke server |
| M1.2 | Indeks note dan metadata source-preserving | Canonical path + hash; duplikat identik digabung, beda isi menjadi konflik; raw bytes/frontmatter unknown dan field asli dipertahankan; parse ambigu dilaporkan, bukan dinormalisasi diam-diam |
| M1.3 | Navigasi semester/course dan pencarian dari snapshot | Tidak memakai fallback demo; offering terpisah antarsemester; semester baru lewat konfigurasi; pencarian dan indeks dibersihkan saat snapshot ditutup; ukur pencarian p95 terhadap target PRD |
| M1.4 | Reader aman dan resolver link | GFM, tabel, callout, math, Mermaid; HTML/JS/query plugin tidak dieksekusi; alias/heading, relative/prefix, basename ambigu dan sumber di luar ZIP memiliki state eksplisit |
| M1.5 | Editor draf dan export snapshot lokal | Unchanged byte round-trip identik; edit paragraf tidak menulis ulang metadata; warning draf saat pindah/refresh; export bisa diimpor ulang; konflik mempertahankan kedua versi; belum menulis R2 |
| M1.6 | Query lokal dan acceptance sumber nyata | Recently Updated dan missing-related dari indeks; subset DQL didokumentasikan; jumlah aktual/parse diagnostic dilaporkan; University 486 note/13 hub dan ZIP Inggris tidak menambah 51 duplikat pada sumber yang sama |

M1.1–M1.6 berurutan; reader/resolver dapat dikembangkan setelah kontrak indeks M1.2 stabil. Pertahankan model murni di `src/domain/`, UI di `src/routes/`, dan batas provider di `src/integrations/`; tentukan file baru saat implementasi hasil terkait, bukan terlebih dahulu.

### Dependency dan gate integrasi

| Milestone | Prasyarat | Konfigurasi yang dibutuhkan saat mulai | Gate utama |
|---|---|---|---|
| M2 | M1 | Owner allowlist, provider login, redirect dan tujuan staging | Semua endpoint privat menolak non-owner; logout membersihkan data sensitif |
| M3 | M2 | Versi Remotely Save, opsi format/prefix non-secret, vault uji | Mac–web–Mac dan recovery konflik; write utama dilarang sebelum interoperabilitas lulus |
| M4 | M2; dapat paralel dengan M3 | OAuth API terpisah, spreadsheet dan mapping offering | Readback nyata; formula/format aman; perubahan mapping memblokir write |
| M5 | M2 + aktivitas M4 atau snapshot eksplisit | Kalender pilihan, zona waktu, waktu tersedia | Preview sebelum write; event idempotent, konflik terlihat, event pribadi lain tidak berubah |
| M6 | Reader M1 | Latihan manual tidak perlu AI; provider/budget sebelum AI live | Kunci tersembunyi, attempt terpisah, warning sumber dan feedback dapat ditelusuri |
| M7 | Milestone scope rilis | Akun Cloudflare dan konfigurasi tujuan | Alur end-to-end, auth, backup/restore, konflik dan privasi terbukti sebelum deploy |

**Pekerjaan berikutnya:** implementasikan M1.1; belum menghubungkan Google, R2 atau AI. Detail acceptance lengkap di bawah dan `PRD.md` tetap berlaku.

## M1 — importer dan ruang belajar lokal (kerjakan pertama)

Tidak memerlukan kredensial Google/R2 atau provider AI.

1. Buat browser file/ZIP selection dan importer di worker browser bila diperlukan. Archive limits, traversal dan file invalid menghasilkan diagnostic. Input tidak mengubah vault sumber.
2. Buat manifest dan model indexed note. Canonical root configurable; map prefix `6 - Main Notes/Workspaces/University` tanpa menghapus struktur aslinya.
3. Parse properties aman, preserve raw frontmatter dan unknown fields. Variasi field modul dan kode sumber tidak digabung otomatis.
4. Dedup ZIP University dan Bahasa Inggris menurut canonical path + hash. Jika same path berbeda isi, tampilkan conflict.
5. Bangun semester/course navigation dari index, bukan array demo. Bedakan source snapshot dan live.
6. Reader: GFM/table, wikilink, callout, math, Mermaid. Jangan execute source JS, HTML berbahaya atau arbitrary plugin queries.
7. Editor: draft/unsaved warning, save/export snapshot lokal yang jelas, round-trip metadata dan konten tanpa edit. Belum menulis ke R2.
8. Tampilkan Recently Updated dan missing-related views sebagai query aplikasi untuk DQL yang dibutuhkan; preserve query source. Dokumentasikan subset yang didukung.

Acceptance: 486 notes/13 Course Hub pada sumber pengguna; tambahan ZIP Bahasa Inggris tidak menghasilkan 51 note ganda. Resolver relative/prefix/ambiguous diuji. Opsi jawaban tidak otomatis menjadi task. Tidak ada plaintext di server bundle. UI semester 3 dapat dibuat dari konfigurasi. Laporan berisi counts aktual dan kegagalan parse, bukan angka hardcode sebagai syarat import umum.

## M2 — identitas, staging dan konfigurasi metadata

Depends: M1. Pilih provider login dengan owner allowlist; default Google sign-in untuk satu owner. Pastikan ini tidak disamakan dengan grant API Sheets/Calendar. Buat session secure, resource authorization, no-store, CSRF/Origin, input limits, private staging. Terapkan migration lokal dahulu; lengkapi metadata schema bila diperlukan. Semua endpoint data menolak unauthenticated.

Acceptance: unauthorized/foreign owner ditolak di server; staging tidak mengekspos source notes; logout membersihkan data browser. Konfigurasi owner/redirect perlu pengguna sebelum live auth.

Status #16 lokal: GET/PUT metadata owner-scoped tersedia dengan schema akademik strict, limit 128 KiB, Origin, no-store dan expectedRevision atomik. Migration D1 lokal dan Worker round-trip/denial smoke lulus; bukti di VALIDATION. Auth provider Google nyata #15 serta provisioning/domain private staging remote tetap gate terpisah, tidak diblokirkan ke pengembangan lokal. Tidak ada notes/index/password disimpan D1 atau deployment dilakukan.

## M3 — vault terenkripsi read/write

Depends: M2. Dapatkan versi plugin dan konfigurasi non-secret prefix/format, fixture encrypted yang disiapkan di vault uji. Adapter kripto browser harus interoperabel; lock/unlock, content and filename decoding, transport read/list paginated, revision conflicts dan recovery.

Acceptance: pengujian Mac→web→Mac untuk Unicode, folder, markdown dan lampiran; stale writes tidak overwrite; perubahan dua arah dapat dipulihkan; wrong password ditangani. Rename/delete diuji terpisah sebelum tombolnya diaktifkan. Tidak pernah aktifkan write vault utama untuk sekadar mengejar checklist.

## M4 — Tuton Google Sheets resmi

Depends: M2. Boleh dibangun sebelum M3 selesai. OAuth scopes, token lifecycle, read header/cell metadata, source mapping tiap semester, expected-state checks, update status/nilai spesifik, receipts dan readback. Jangan membawa data worksheet OBJECT menjadi tabel kosong palsu; dashboardnya harus direpresentasikan oleh UI aplikasi.

Acceptance: nilai null/0, checkbox boolean, class suffix, header/row berubah, auth expired, quota dan uncertain write diuji. Formula/format/validation tetap. Pembaruan rencana belajar tidak menandai submitted.

## M5 — Google Calendar dan planner aturan

Depends: M2 + data aktivitas M4 atau data snapshot eksplisit. Pilih kalender, busy ranges, StudySession, durasi/waktu tersedia, time zones, idempotent event upsert dan conflict etag. Planner memberi alasan prioritas dan preview sebelum membuat/mengubah event.

Acceptance: tidak duplikat pada refresh/retry; event pribadi tak terkait tidak berubah; tanggal tanpa jam tidak punya deadline palsu; konflik jadwal terlihat.

## M6 — latihan dan assistant

Depends: reader M1; AI live setelah keputusan provider. Extract soal dan kunci dengan preview; soal tersimpan terpisah dari attempts dan feedback. Scoring objektif hanya jika kunci valid. Esai memakai rubrik dan label estimasi. AI menerima materi pilihan dengan sumber, tidak full vault secara default.

Acceptance: key hidden dahulu; checkbox opsi adalah input jawaban; warning kunci tidak cocok mencegah nilai pasti; percobaan kedua tidak menimpa pertama; feedback merujuk sumber nyata. Tanpa AI, latihan manual tetap berfungsi.


## M7 — release

Depends: milestones yang masuk scope rilis. Uji alur end-to-end, multi-semester, akses ponsel/keyboard, error recovery, export/draft, quota/latency dan restore. Update VALIDATION dengan bukti runtime/provider dan keterbatasan. Deploy ke akun Cloudflare tujuan yang sudah dikonfigurasi sesuai DEPLOYMENT, bukan ke hosting pengganti.
