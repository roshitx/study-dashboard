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

**Ini scaffolding, bukan produk terhubung.** Data UI sintetis. Editor mempertahankan draf hanya di memori sampai refresh. API R2, Google, AI, auth dan database belum dihubungkan. `bun run deploy` menolak deployment scaffold; baca `docs/DEPLOYMENT.md` sebelum menambahkan deploy sebenarnya. Tidak ada kredensial yang diperlukan untuk demo lokal.

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

Pilih path hasil pencarian untuk membuka reader hanya-baca. Reader mendukung GFM/tabel, callout, KaTeX dan Mermaid dalam iframe berorigin opaque dengan CSP tanpa jaringan. HTML mentah dibuang; Dataview/DataviewJS/Tasks ditampilkan sebagai kode, tidak dieksekusi. Wikilink dan Markdown link lokal memakai source path asli/canonical, relative path, alias dan heading; basename ambigu serta sumber di luar snapshot dilaporkan, bukan ditebak. Versi konflik dipilih eksplisit. Gambar/lampiran tidak diambil dari jaringan; tautan HTTP(S) hanya dibuka lewat klik pengguna, tanpa referrer.

Di bawah reader, **Draf snapshot · lokal** mengedit isi Markdown tanpa menulis ulang frontmatter, BOM atau konvensi newline. Tanpa edit, bytes export identik. **Simpan versi ke memori lokal** mempertahankan versi asal dan menambah versi baru; tidak ada persistence atau write R2. Draf belum disimpan memblokir filter/import dan meminta konfirmasi saat navigasi/tutup; refresh memakai peringatan browser. Versi tersimpan yang belum diexport juga memperingatkan saat keluar.

**Export ZIP lokal · versi N** mengunduh satu lapisan versi dengan canonical path asli. Unduh setiap tombol, lalu pilih semua ZIP sekaligus untuk import ulang dan mempertahankan konflik. Jangan mengekstrak lapisan berbeda ke folder sama dengan overwrite. Label diunduh berarti permintaan download telah dikirim ke browser, bukan bukti file tersimpan di disk; pastikan download selesai sebelum menutup sesi.

## Stack terkunci

TanStack Start/Router, React, TypeScript, Vite, Cloudflare Vite plugin dan Wrangler. Bun mengelola dependency exact melalui package.json dan bun.lock. UI memakai shadcn/ui Base UI, preset Nova dan Tailwind CSS v4; alias `@/` menunjuk `src/`. Tambahkan komponen resmi sesuai kebutuhan dengan `bunx --bun shadcn@latest add @shadcn/<komponen>` setelah membaca dokumentasinya. D1 diusulkan untuk metadata aplikasi; R2 existing tetap sumber vault terenkripsi. Google Sheets/Calendar menggunakan API resmi milik aplikasi ini dengan OAuth terpisah, bukan sesi plugin ChatGPT.
