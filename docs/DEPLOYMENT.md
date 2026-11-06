# Deployment ke Cloudflare milik pengguna

Staging auth/metadata telah diterbitkan ke `https://study-staging.roshit.id` pada 6 November 2026 dengan izin pengguna. Dua D1 staging terpisah digunakan; tidak ada binding bucket atau konten vault yang dipublikasikan. Root `roshit.id` tidak diubah.

## Batas deployment

Shell demo/snapshot lokal publik; API privat wajib Google login owner. Cloudflare Access belum dipasang, sehingga seluruh situs tidak diklaim privat. Login/logout Google lokal dikonfirmasi pengguna; login Google HTTPS staging masih perlu diuji pengguna. `scripts/deploy.mjs` umum tetap menolak deploy implisit; deployment staging memakai build environment dan config output eksplisit di bawah.

## Langkah agent saat milestone integrasi siap

1. Konfirmasikan akun, project, domain staging dan owner identity dari konfigurasi pengguna. Jangan membuat akun/repo hosting pengganti secara otomatis.
2. Implementasikan dan verifikasi login + server-side owner authorization. Tentukan apakah Google sign-in atau Access. Semua API data harus menolak pemanggilan tanpa identitas tepercaya.
3. Konfigurasikan D1/R2 bindings di Wrangler untuk lingkungan staging. Gunakan bucket/prefix uji terpisah dari vault utama. Jangan menaruh placeholder bucket produksi pada config yang bisa terpakai tanpa sengaja.
4. Google OAuth: daftar origin/callback, client ID/secret, token protection dan scope minimal. Secrets via Wrangler/Cloudflare, tidak di repo atau client `VITE_*`.
5. Jangan memasukkan password vault dalam `.dev.vars` atau server secrets; unlock terjadi pada browser.
6. Build dan lakukan Wrangler dry-run atau preview lokal sesuai environment. Periksa bundle bahwa input ZIP, note asli, token dan password tidak terkandung di client/SSR/assets.
7. Interoperability vault staging, conflict/recovery, Google read/write dan auth denial harus diuji dan dicatat. Belum lulus berarti fitur terkait belum siap produksi.
8. Setelah tujuan dan konfigurasi jelas, ubah script deploy menjadi alur build + Wrangler deployment yang tepat. Default `workers_dev:false` dan `preview_urls:false` saat ini mencegah paparan URL otomatis; domain private harus dikonfigurasi sesuai skema auth.
9. Rilis hanya fitur yang lolos pemeriksaan, dengan state not_configured/disabled untuk yang belum selesai. Verifikasi owner runtime, source statuses, undo/recovery dan absence of private caching.

Binding D1 remote staging nyata tersedia pada environment `staging`; default development tetap lokal. Referensi framework:
https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/

## Staging lokal #16

Binding default `AUTH_DB` dan `METADATA_DB` tetap lokal, tanpa ID remote. Gunakan origin loopback untuk development. Environment `staging` memiliki database remote terpisah; jangan memakai default environment untuk deployment. `workers_dev:false`, `preview_urls:false`, observability nonaktif tetap dipertahankan. Route metadata memverifikasi owner sebelum mengakses D1; tidak menyediakan upload note atau proxy provider generik.

Untuk smoke build: jalankan `node node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --persist-to .wrangler/state --port 8787` setelah migration lokal. Node diperlukan untuk runtime Wrangler forwarding pada versi ini: Bun fetch mengabaikan dispatcher undici dan menghasilkan 503. CLI migration tetap memakai `bunx --bun`. Konfigurasi OAuth callback harus cocok origin yang diuji; konfigurasi sintetis hanya membuktikan batas session/API, bukan login Google.

## Staging remote #16 — provisioning 6 November 2026

Pengguna menyetujui hostname `study-staging.roshit.id`; root `roshit.id` tidak diubah. Branch `feat/private-staging` mengonfigurasi Worker `study-dashboard-staging` dan custom domain tersebut pada environment `staging`.

- `study-auth-staging`: migration `0001_sessions.sql` remote lulus.
- `study-metadata-staging`: migrations `0001_initial.sql`, `0002_owner_metadata.sql` remote lulus.
- Frozen install, 29 tests/158 assertions, build staging, typecheck dan Wrangler dry-run lulus. Worker dan custom domain telah dideploy; version `e0e2588d-b5d9-4814-b9ac-9bab65c9fa18`. Tidak ada data vault/R2 yang dibaca atau ditulis.
- Build dengan `CLOUDFLARE_ENV=staging bun run build`. Config hasil build sudah flattened untuk staging; deploy/dry-run memakai `bunx --bun wrangler deploy --config dist/server/wrangler.json` tanpa memilih environment ulang. Periksa target Worker, custom domain dan binding sebelum deploy.
- Setelah pengguna mengonfirmasi callback staging ditambahkan, empat secrets dipasang melalui stdin Wrangler, memakai client/owner dari `.dev.vars` existing dengan redirect HTTPS staging. Nilai tidak dicetak atau ditulis ke repo; konfigurasi lokal tidak diubah.
- Smoke HTTPS nyata: `/` 200; `/api/session` dan `/api/metadata` tanpa cookie 401 + no-store; login 302 ke accounts.google.com, callback staging tepat, PKCE S256, cookie transaksi __Host-/Secure/HttpOnly. Login owner staging dan read/write metadata terautentikasi belum diklaim. Jangan memakai password vault sebagai secret server.
