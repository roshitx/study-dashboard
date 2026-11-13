# Private Login Implementation Plan

**Goal:** halaman login khusus dan dashboard owner privat sesuai spesifikasi disetujui.
**Architecture:** route /login memakai shell autentikasi editorial; OwnerSession menjadi provider/guard tanpa navbar. Backend mempertahankan OAuth existing dengan return destination transaksi dan error browser aman.
**Tech Stack:** TanStack Start, React, TypeScript, Tailwind, Base UI, Workers, Bun.

## Kontrak
Tidak mengubah kredensial, publish, deploy, reconnect atau data pribadi. Tidak menambah dependency. Identitas desain existing; ENERGY 2 / RHYTHM 2 / MOTION 1. Tidak menyimpan isi draf permanen.

## Langkah
- Backend: src/integrations/auth.server.ts dan tests/auth.test.ts. Validasi returnTo route / dan tab allowlist, simpan di auth transaction, callback kembali ke tujuan, document failures ke /login?error=kode aman. /api/session memberikan expiry aktual. Migration additive bila perlu.
- Frontend: src/components/owner-session.tsx mengelola sesi, expiry/focus, cross-tab logout, retry logout gagal, dirty registry. Guard tidak merender children sebelum authenticated. src/routes/login.tsx menampilkan semua state dan memulai login dengan native navigation.
- src/routes/index.tsx: hapus navbar sesi, tambah tombol Keluar sejajar ThemeToggle; pertahankan tab di URL; registrasikan draf. Editor snapshot/vault/Tuton mendaftarkan dirty state tanpa memindahkan konten ke storage.
- Verifikasi setelah seluruh edit: bun test && bun run build && bun run typecheck. Jalankan Obscura actual app, desktop/mobile light/dark, login/session errors dan logout sintetis tanpa akun pribadi. Jalankan detector Impeccable satu kali lalu perbaiki temuan material. Update docs/VALIDATION.md, docs/DECISIONS.md dan README.
