# Keputusan dan pertanyaan terbuka

## Sudah dipilih pengguna

Personal study assistant UT lintas semester; TanStack; dari awal tanpa repo existing; Cloudflare Workers dan bucket R2 sudah tersedia; Remotely Save S3-compatible, RClone Crypt. Google Sheets/Calendar API resmi. Prioritas: catatan/materi, diskusi/tugas/latihan, kegiatan hari ini. Assistant: latihan/review, rencana belajar dan pengelolaan.

## Default agar agent bisa langsung bekerja

| Keputusan | Default | Dapat diubah |
|---|---|---|
| Framework | TanStack Start React + Vite + TypeScript | Ikuti pilihan pengguna; jangan ganti stack tanpa alasan |
| Package manager | Bun 1.4+, dependency exact + bun.lock | Dipilih pengguna; npm/npx tidak dipakai |
| Audience | Satu owner, private | Multiuser bukan v1 |
| Bahasa/waktu | Indonesia, Asia/Jakarta | Konfigurabel |
| UI | Tenang, hijau/netral, laptop-first responsif | Tidak memblokir integrasi |
| Notes | Save eksplisit, plaintext di memori browser | Offline/persistence plaintext belum disetujui |
| Metadata app | D1 diusulkan | Belum diprovision atau dihubungkan |
| Login | Rekomendasi Google sign-in + owner allowlist | Cloudflare Access dapat dipilih pengguna sebelum M2 |
| AI | Nonaktif; provider belum dipilih | Tidak memblokir M1–M5 |
| UI components | shadcn/ui Base UI, preset Nova, Tailwind v4 | Dipilih pengguna; pasang komponen sesuai kebutuhan |
| Quality UI | Aturan anti-slop selama pengerjaan | Dipilih pengguna; bukan audit tertunda |

## Pertanyaan yang benar-benar diperlukan nanti

1. **Sebelum M2:** login memakai Google sign-in atau Cloudflare Access existing? Identitas owner dan domain/callback staging disiapkan melalui konfigurasi privat.
2. **Sebelum M3:** versi Remotely Save dan pengaturan non-secret prefix/nama/path yang digunakan? Siapkan vault/prefix uji dan fixture terenkripsi. Password dimasukkan lokal pada browser saat pengujian, bukan ditempel pada chat atau dokumen.
3. **Sebelum M4/M5:** OAuth client milik aplikasi, Sheet yang diizinkan per semester, kalender target dan kebutuhan baca/tulis. Gunakan secret store untuk konfigurasi rahasia.
4. **Sebelum M6 AI:** provider/model yang ingin dipakai, batas biaya bulanan, serta apakah materi terpilih boleh dikirim untuk generasi/review. Default tidak ada pemanggilan AI.
5. **Sebelum offline/P2:** apakah perlu akses saat offline dan apakah penyimpanan lokal terenkripsi persisten dapat digunakan? Default online-first dan memory-only.

Jangan meminta semua jawaban ini sebelum memulai M1. Catat asumsi dan lanjutkan pekerjaan independen yang sudah jelas. Tidak ada secret diperlukan untuk membuka starter atau menjalankan tests/build.
