# Issue #21 — update checkbox dan nilai Tuton

## Cakupan disetujui

Owner memilih edit checkbox dan nilai numerik, bukan checkbox saja. Implementasi dan smoke sintetis tidak mengizinkan agent menulis spreadsheet pribadi. Google OAuth saat ini read-only; consent write harus eksplisit, terpisah dari login, tidak diminta otomatis saat read. Tidak commit, push atau deploy otomatis.

## Kontrak keamanan

Workbook berasal dari GOOGLE_SHEET_ID server. Browser memilih offering dan aktivitas dari mapping terverifikasi, bukan spreadsheet ID atau arbitrary A1 range. Binding offering harus terikat workbook; sheetId saja tidak cukup. Sebelum edit, server membaca ulang identitas course/class, header sesi/aktivitas, nilai dan formula pada target. Pergeseran atau ambiguitas membatalkan write sampai remap. Input boolean hanya untuk checkbox native boolean; nilai numerik finite untuk kolom Nilai terverifikasi. Sel formula atau error tidak editable. Nilai kosong direpresentasikan null; false bukan 0. Session number tidak menjadi module number. Planner tidak memanggil endpoint ini.

## Mutasi dan serialisasi

Satu Durable Object per workbook melakukan seluruh operasi update aplikasi secara serial, termasuk persist receipt sebelum request provider. Handler Worker memverifikasi owner, Origin/CSRF, tipe dan ukuran body, allowlist resource dan binding. Coordinator memvalidasi ulang binding melalui data server; tidak mempercayai target dari browser. Tidak cukup memakai mutex module-level Worker karena isolate berbeda dapat aktif bersamaan.

Receipt memakai operation ID unik, payload fingerprint dan status pending, confirmed, rejected atau uncertain. ID sama dengan payload berbeda ditolak. Receipt memuat identitas target opaque dan data pemulihan minimum; jangan menyimpan workbook penuh atau notes. Token hanya server, terenkripsi saat disimpan. Tidak mencatat request body, token atau data pribadi ke logs/artifacts.

Provider values.update memakai RAW pada satu target terverifikasi sehingga formula/format/dataValidation lain tidak ditulis ulang. Header/identity dan expected value dicek tepat sebelum mutasi. Ini mengurangi risiko overwrite, bukan CAS atomik terhadap editor eksternal Google Sheets. Keterbatasan ini tampil sebelum konfirmasi.

## Hasil belum pasti dan recovery

Receipt pending ditulis sebelum panggilan provider. Setelah dispatch, timeout, network error atau restart tidak boleh dianggap write gagal aman dan tidak boleh retry otomatis. Operasi menjadi uncertain; receipt pending yang dipulihkan juga diperlakukan uncertain. Readback memverifikasi nilai target dan struktur. Nilai cocok adalah observasi readback, bukan bukti bahwa tidak ada editor lain. Status provider ditangani berbeda untuk auth expired, quota, conflict, invalid input dan uncertain result. Owner melihat receipt dan memilih baca ulang sebelum tindakan lanjutan. Readback tidak mengulangi write.

## UI

Tracker offering tersimpan menampilkan editor hanya pada target tervalidasi. Owner melihat nilai lama, nilai baru, sumber, offering, sesi/aktivitas dan peringatan concurrency sebelum konfirmasi. Tombol write disabled tanpa grant write dan binding valid. Setelah konfirmasi: pending, confirmed dengan readback, rejected atau uncertain dengan aksi baca ulang receipt. Draf tetap ada saat konflik; tidak mengubah submitted secara implisit. Raw/manual coordinate mapping bukan jalur write.

## Verifikasi

Test deterministik memeriksa header/row drift, wrong workbook/owner, false/null/0, formula protection, invalid checkbox/numeric value, idempotency key reuse, serial concurrent writes, restart/pending recovery, provider error sebelum/sesudah dispatch, auth/quota, readback mismatch dan preservation format/validation. Smoke provider sintetis menjalankan coordinator nyata; smoke UI menggunakan fixture sintetis. Live write spreadsheet owner memerlukan izin terpisah dan grant write; tanpa itu acceptance live issue tetap terbuka. Bun frozen install, tests, build, typecheck. Review keamanan independen sebelum enable write. Dokumentasi membedakan tests, mock provider dan live evidence.

## Gate implementasi

Tambahan Durable Object binding/class dan migration receipt adalah perubahan konfigurasi source saja; remote provisioning/deploy tidak termasuk izin ini. Keputusan penyimpanan tidak memerlukan service baru selain Cloudflare existing. #20 belum dinyatakan selesai; hanya prasyarat binding/workbook/header yang dibutuhkan write diselesaikan sebagai bagian #21. Tidak mengaktifkan write dengan mapping lama yang belum memenuhi kontrak.
