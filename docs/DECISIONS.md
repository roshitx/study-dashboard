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
| Login | Google sign-in + owner allowlist, dipilih pengguna untuk #15 | Session D1 server-side delapan jam; callback awal localhost, staging belum diprovision |
| AI | Nonaktif; provider belum dipilih | Tidak memblokir M1–M5 |
| UI components | shadcn/ui Base UI, preset Nova, Tailwind v4 | Dipilih pengguna; pasang komponen sesuai kebutuhan |
| Quality UI | Aturan anti-slop selama pengerjaan | Dipilih pengguna; bukan audit tertunda |

## Pertanyaan yang benar-benar diperlukan nanti

1. **M2 live:** Google sign-in dan session D1 telah dipilih. Siapkan OAuth client, owner email dan callback melalui konfigurasi privat; tidak melalui chat. Verifikasi Google nyata tetap gate terpisah.
2. **Sebelum M3:** versi Remotely Save dan pengaturan non-secret prefix/nama/path yang digunakan? Siapkan vault/prefix uji dan fixture terenkripsi. Password dimasukkan lokal pada browser saat pengujian, bukan ditempel pada chat atau dokumen.
3. **Sebelum M4/M5:** OAuth client milik aplikasi, Sheet yang diizinkan per semester, kalender target dan kebutuhan baca/tulis. Gunakan secret store untuk konfigurasi rahasia.
4. **Sebelum M6 AI:** provider/model yang ingin dipakai, batas biaya bulanan, serta apakah materi terpilih boleh dikirim untuk generasi/review. Default tidak ada pemanggilan AI.
5. **Sebelum offline/P2:** apakah perlu akses saat offline dan apakah penyimpanan lokal terenkripsi persisten dapat digunakan? Default online-first dan memory-only.

## Metadata privat #16

Konfigurasi semester/course/offering disimpan sebagai satu dokumen JSON tervalidasi per subject owner, dengan compare-and-swap revision atomik D1. Ini menghindari partial update lintas tabel; tabel domain awal tetap belum menjadi sumber runtime. Kode registrasi dan BMP terpisah, unknown tetap null. API hanya menerima konfigurasi akademik dengan field allowlist, bukan integration config generik. Provider resource mapping ditunda ke milestone adapter masing-masing. Tidak ada upload notes/index/password, tidak ada migration atau deployment remote. Gate Google nyata #15 terpisah dari pekerjaan lokal #16.

Jangan meminta semua jawaban ini sebelum memulai M1. Catat asumsi dan lanjutkan pekerjaan independen yang sudah jelas. Tidak ada secret diperlukan untuk membuka starter atau menjalankan tests/build.

## UI/UX shadcn, 5 November 2026

- Arahan pengguna: UI rapi seperti shadcn, palet existing dipertahankan, ikon Lucide. ENERGY 1 / RHYTHM 2 / MOTION 1: ruang belajar tenang; fokus import materi, bukan metrik atau chart rekaan.
- Registry resmi `@shadcn`, Base UI Nova; sidebar responsif, Card, Field, Select, Alert, Table dan Empty menggantikan markup custom. Sidebar memisahkan empat tugas yang sudah ada; Sheet mobile memberi navigasi keyboard tanpa membuat tujuan baru.
- Hijau `#284c3e`, krem `#f5f5ef`, sage dan aksen `#dce6a7` dipindahkan ke token semantic agar seluruh komponen konsisten. Geist lokal yang sudah terpasang menjadi satu font untuk keterbacaan kontrol; font Google eksternal dan CSS global legacy dihapus agar tidak mengganggu komponen.
- Card membatasi konten/aksi yang terkait, bukan menambah panel statistik. Lucide BookOpen/FileText/CalendarDays/Link2/Save/Download dipilih untuk tugas buku/catatan/jadwal/koneksi/simpan/export, sesuai permintaan pengguna. Tidak ada animasi dekoratif; hanya transisi komponen bawaan.
