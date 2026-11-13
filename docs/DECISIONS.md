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

## Latihan manual #24

- Dipilih karena dependency native #12 sudah CLOSED/COMPLETED; #15 Google nyata dan #16 staging remote tetap gate terpisah. Tidak melewati gate vault/Sheets/Calendar.
- Latihan hidup di panel note snapshot, tanpa menu baru, memakai Card/Field/Button/Select existing. Palet chalk/sage, navbar, sidebar dan theme reveal tidak diubah.
- Ekstraksi hanya pola eksplisit satu baris dan harus melalui preview; kunci/rubrik terpisah dari soal. Warning eksplisit diperlakukan konservatif lintas note, perbedaan kode tidak dinormalisasi. Short-answer hanya exact trim/lowercase, esai review manual estimasi, bukan penilai AI.
- Attempts state browser panel saja; attempt baru append, tidak overwrite. Close panel/navigasi note/snapshot/logout membuang state. Tidak ada persistence atau pengiriman materi baru.

## Conditional save vault uji (#18)

- ETag R2 menjadi expected revision, owner + exact Origin untuk writes. Browser mengenkripsi; server tidak menerima plaintext/password.
- Arsip ciphertext create-only pada bucket histori terpisah sebelum CAS; gagal backup membatalkan write. CAS kalah boleh meninggalkan arsip redundan, bukan bukti save sukses. Timeout/provider error setelah write berstatus uncertain, tanpa retry otomatis.
- Konflik mempertahankan draf lokal; pengguna mengambil remote lalu memilih retry eksplisit. Restore memakai backup+CAS yang sama. Gate write default nonaktif; staging diaktifkan atas izin pengguna hanya untuk fixture pada study-vault-interop, histori terpisah study-vault-interop-history. Mac–web–Mac plugin tetap release gate; bucket utama tidak dibinding.

## Prioritas koneksi Google

- Arahan terbaru pengguna membatalkan planner snapshot lokal. Implementasi, tests dan panduan import planner dihapus; koneksi Google nyata didahulukan. Import catatan M1 existing tidak termasuk pembatalan ini.
- Grant API terpisah per layanan, baca-saja dahulu. OAuth callback tambahan /api/google/callback mengikat subject session owner; refresh token AES-GCM menggunakan secret server terpisah, bukan password vault. Google revocation dapat memutus kedua grant sehingga receipt lokal owner dibuang bersama setelah provider mengonfirmasi.
- Tahap koneksi menampilkan inventaris provider nyata; belum mengklaim mapping Tuton #20 lengkap atau event Calendar #23. Spreadsheet allowlist server memakai GOOGLE_SHEET_ID. Tidak menambah snapshot planner pengganti.

- Pembacaan Sheets dilanjutkan read-only dengan field mask metadata dan sel native Google, termasuk sheetType, nilai boolean/number/formula dan dataValidation. Tidak mengasumsikan A:AH atau mengubah sheet OBJECT menjadi tabel kosong. Mapping akademik belum ditentukan; pembacaan live bukan izin write.
- Tracker baca-saja memakai mapping eksplisit header/identitas baris, ID semester/offering, kode registrasi dan kelas terpisah. Mapping disimpan hanya memori panel, tanpa persistence privat tambahan atau write Google; identitas sumber diperiksa kembali saat workbook dibaca ulang. Checkbox tetap nilai boolean, bukan submitted otomatis.

## Update Tuton #21

Checkbox native dan Nilai dapat diedit setelah grant sheetsWrite terpisah serta binding workbook/struktur tersimpan. Satu Durable Object per workbook, receipt persisten sebelum dispatch, expected value dan readback; uncertain tidak otomatis retry. Serialisasi aplikasi tidak mengunci editor eksternal. Tidak ada perubahan status planner/submitted, scope Calendar, izin write vault, provisioning atau deployment. Hanya implementasi lokal dan bukti sintetis; live owner tetap gate.

## Login privat, 9 November 2026

Owner menyetujui /login dua panel editorial dengan identitas existing, dashboard privat, tujuan login internal sebelumnya, expiry menutup state privat, logout sejajar tema pada satu header. Navbar sesi/Owner dihapus. Konfirmasi logout hanya ketika draf belum tersimpan/diekspor. Login Google identitas tetap terpisah grant sumber. Return destination terikat transaksi, allowlist route / dan tab dashboard. Migration auth 0004 additive. Tidak deploy/commit/reconnect. Owner menghentikan pengujian browser; jangan melanjutkan tanpa arahan baru.

## Warna brand terpadu

Hijau login menjadi warna brand tetap di light/dark: --brand #284c3e, --brand-foreground putih, --brand-hover #203e32. Tailwind v4 mengekspos bg-brand, text-brand-foreground, hover:bg-brand-hover. Panel login, fokus dashboard, tombol Google dan navigasi aktif memakai token ini; primary light dan sidebar-primary mereferensikannya. Primary dark tetap adaptif untuk kontrol umum. Tidak ada nilai hex hijau pada JSX; perubahan brand cukup melalui src/styles.css.

## Dialog konfirmasi logout

Konfirmasi native window.confirm diganti AlertDialog shadcn berbasis Base UI. Sesuai keputusan awal, dialog hanya muncul untuk draf belum tersimpan/diekspor; sesi bersih langsung logout. Judul dan peringatan menjelaskan kehilangan draf, Batal mempertahankan workspace, Keluar menjalankan alur penutupan lokal dan pencabutan sesi existing. Komponen memakai token tema existing dan tombol minimal 44px; tidak menambah dekorasi atau mengubah identitas.
