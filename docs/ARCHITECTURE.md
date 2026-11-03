# Arsitektur dan kontrak

## Komponen

TanStack Start menjalankan UI React dan fungsi/route server di Workers melalui Cloudflare Vite plugin. Browser menangani unlock vault, dekripsi, indeks dan editor. Worker menangani identitas, binding R2, konfigurasi D1 dan Google OAuth/API. Tidak diperlukan server Node yang selalu hidup.

Default entrypoint mengikuti `@tanstack/react-start/server-entry`. `wrangler.jsonc` saat ini tidak memiliki binding produksi. Dokumentasi Cloudflare resmi: https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/

## Struktur kode

- `domain`: model dan fungsi murni. Tidak mengimpor UI, provider, env atau storage.
- `integrations`: ports. Implementasi nanti dipisah client-only vault crypto, server-only R2/Google dan persistence.
- `data/demo`: contoh sintetis. Tidak menjadi fallback diam-diam untuk live provider.
- `routes`: shell produk; saat ini satu route dengan tab. M1 memecah route bila perlu tanpa mengubah model domain.
- `migrations`: D1 metadata, belum dijalankan. Review sebelum diterapkan; schema awal belum mencakup semua tabel modul/planner/riwayat.
- `scripts`: utilitas agent lokal; bukan handler server produksi.

## Data ownership dan cache

| Data | Sumber | Kebijakan |
|---|---|---|
| Note/lampiran | R2 Remotely Save encrypted | Browser unlock; tidak dibundel atau di-SSR |
| Progres/nilai Tuton | Google Sheets | Mapping per offering; baca ulang sebelum write |
| Event | Calendar | Simpan ID dan revision; jangan clone semua event ke sumber baru |
| Konfigurasi/relasi | D1 yang diusulkan | Owner scope; opaque note refs |
| Indeks note | Memori browser | Bersih saat lock; tidak persistence plaintext default |
| AI input | Potongan dipilih pengguna | Hanya saat diminta; jelaskan data yang akan keluar browser |

TanStack Query dapat ditambahkan sebagai cache saat integrasi read mulai dibangun, bukan sebagai salinan utama vault. Cache note harus berada pada sisi browser dan invalidasi saat lock/logout. Jangan memasukkan plaintext ke loader server. Untuk sumber live, status error tidak otomatis berarti daftar kosong.

## Kontrak API rencana (belum tersedia)

| Endpoint | Perilaku |
|---|---|
| GET `/api/session` | Identitas owner autentik, tidak mengembalikan tokens |
| GET `/api/vault/objects?cursor=...` | List paginated encrypted keys di prefix yang diotorisasi |
| POST `/api/vault/read` | Encrypted bytes dan revisi, resource ID dipetakan server |
| POST `/api/vault/write` | Ciphertext + expectedRevision + idempotencyKey; konflik jika stale |
| GET `/api/sheets/offerings/:id` | Ringkasan nilai/status dari mapping server yang sudah diverifikasi |
| POST `/api/activities/:id/progress` | Validasi tipe field; cek mapping/expected state; tulis sel yang benar |
| GET `/api/calendar/events` | Rentang waktu dibatasi dan kalender dari koneksi owner |
| POST `/api/study-sessions/:id/calendar` | Upsert event yang terkait dengan entitas aplikasi |
| POST `/api/ai/review` | Input materi pilihan, batas ukuran, provider configurable |

Semua endpoint di tabel harus gagal tertutup jika auth/binding belum siap. Tidak ada endpoint generik yang menerima URL, arbitrary cell, arbitrary bucket atau token client. GET tidak melakukan mutasi. Body, error provider dan debug tidak boleh membocorkan notes/credentials. Error standar: unauthorized, forbidden, not_configured, invalid_input, source_changed, conflict, rate_limited, provider_error, uncertain_write.

## Google OAuth

Aplikasi Cloudflare memiliki OAuth client sendiri; koneksi Google Drive ChatGPT tidak menyediakan kredensial untuk website ini. Gunakan callback terdaftar, state/PKCE sesuai flow dan validasi owner. Simpan refresh token server-side dengan perlindungan secret terpisah, jangan dalam JS bundle, cookie yang bisa dibaca JS atau query URL. Scope bertahap untuk kebutuhan Sheet/Calendar aktual; jangan meminta Drive penuh hanya untuk mempermudah discovery. Pemilihan login awal ada di DECISIONS.

Google Sheets: expectedValue + read-before-write bukan atomic CAS untuk editor eksternal. Serialize writes aplikasi per resource, batasi batch, verifikasi readback dan tampilkan konflik yang terdeteksi. Jangan mengklaim jaminan serialisasi terhadap UI Google Sheets.

## Vault round-trip

Enkripsi RClone Crypt tidak otomatis menyediakan protokol Remotely Save penuh. Agent harus memeriksa versi plugin dan opsi nama/path/metadata yang dipakai pengguna. Jangan menaruh key derivation server-side demi SSR atau AI. Gunakan adapter yang tervalidasi dengan fixture interoperabilitas, bukan menulis algoritme kripto sendiri.

Save: encrypted object read + revision → decrypt/edit browser → encrypt → conditional put → refresh revision. Rename/deletion harus memiliki protokol recovery dan diaktifkan terpisah. Histori terenkripsi disimpan di lokasi terpisah yang tidak disinkron sebagai note biasa. ETag server hanya menahan overwrite web yang stale; pengaruh sync Mac tetap harus diuji.

## Importer konten M1

Script inventory adalah alat analisis awal, bukan importer lengkap. Importer sebenarnya memproses ZIP/file di browser setelah pilihan pengguna. Validasi limits/path/symlink, parse frontmatter dengan diagnostic per note, pertahankan unknown fields dan raw bytes. Frontmatter wikilink yang tidak dikutip dapat memiliki representasi YAML non-string; jangan mengubahnya diam-diam. Semua penyesuaian metadata perlu preview dan edit terarah.

Bagian read/edit harus mendukung note berulang namanya, prefix vault logis, alias, relative links, missing external sources dan dedup hash. Snapshot tidak dianggap sudah tersinkron. Minimalikan konten privat pada fixture tests; gunakan potongan sintetis kecuali pengujian lokal eksplisit menggunakan sumber pengguna.

## Dependensi dan pengujian

Versi exact + bun.lock disertakan. `bun install --frozen-lockfile` untuk reproduksi; `bun test` menjalankan domain tests melalui bun:test. Vite memakai plugin Tailwind v4 dan Cloudflare; UI shadcn/ui Base UI preset Nova ditambahkan sebagai source dengan alias `@/` ke `src/`. Runtime produksi tetap Workers, bukan server Bun permanen. Typecheck TypeScript dan Vite client/Worker build diperiksa terpisah. Tes API auth dan integration ditambahkan saat endpoint ada. Bukti OAuth, R2 dan interoperability tetap memerlukan pengujian provider nyata.
