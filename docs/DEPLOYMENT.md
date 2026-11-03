# Deployment ke Cloudflare milik pengguna

Paket ini diserahkan sebagai source scaffold lokal. Belum ada project Cloudflare yang dibuat, binding bucket yang diubah, migration remote yang dijalankan atau deployment yang diterbitkan.

## Mengapa deploy belum aktif

UI saat ini hanya demo sintetis tanpa auth. `scripts/deploy.mjs` gagal eksplisit agar command umum tidak keliru dianggap sudah men-deploy aplikasi private. Ini batas teknis scaffold; bukan permintaan persetujuan ulang untuk pengembangan lokal.

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

Tidak ada remote binding/config nyata dalam paket; template binding mengikuti dokumentasi resmi terbaru, bukan ID tebakan:
https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/
