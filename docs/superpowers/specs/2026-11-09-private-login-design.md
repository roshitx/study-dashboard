# Autentikasi privat

Disetujui owner melalui enam keputusan ask: dashboard privat, login dua panel editorial, kembali ke tujuan internal, expiry menutup data privat, konfirmasi logout hanya jika draf belum tersimpan, implementasi dilanjutkan.

Halaman /login memakai identitas hijau/Geist yang sudah ada. Desktop dua panel; mobile ringkas satu kolom. ENERGY 2 / RHYTHM 2 / MOTION 1. Panel editorial menjelaskan ruang belajar personal, bukan statistik atau janji fitur. Panel tindakan berisi satu aksi Google, penjelasan owner dan pemisahan izin sumber. Tema tersedia. Font menjaga konsistensi dan keterbacaan; bidang hijau memberi identitas dan hierarki; ruang lega memisahkan konteks dari tindakan; tanpa kartu bertumpuk atau ilustrasi rekaan.

State: pemeriksaan sesi, signed out, redirecting, cancellation, forbidden, expired/invalid callback, network/provider error, not configured, logout pending/failed/success. Browser callback tidak menampilkan JSON mentah. Error hanya kode allowlist dan penjelasan aman. Return destination terikat transaksi OAuth, dibatasi route dashboard internal.

Dashboard tidak dirender sebelum owner terverifikasi. Expiry timer dan pemeriksaan saat focus menutup akses ketika sesi berakhir. Unmount membersihkan state privat dan mengunci vault. Logout memberi tahu tab lain; kegagalan pencabutan server tidak diklaim sukses. Draf mendaftarkan dirty state untuk konfirmasi logout. Tidak menyimpan draf privat permanen.

Hapus navbar sesi terpisah, badge Owner dan login navbar. Keluar berdampingan tombol tema pada satu header. Tidak merombak dashboard, mengubah kredensial, reconnect Google, deploy atau commit.

Verifikasi: regresi endpoint destination/state/error, suite/build/typecheck; browser Obscura desktop/mobile, kedua tema, keyboard, status/error/transisi sintetis. OAuth owner nyata dilaporkan terpisah.
