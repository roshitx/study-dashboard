# #17 — Read-only RClone vault uji

## Goal
List berpaginasi dan baca vault uji melalui owner-authenticated Worker; dekripsi nama/content di browser. Tidak ada transport write, rename atau delete. Vault utama tidak dipakai sebagai fixture.

## Format authority
Remotely Save tag 0.5.25: src/encryptRClone.ts, src/fsEncrypt.ts, docs/encryption/rclone.md. Menggunakan @fyears/rclone-crypt (^0.0.7 pada upstream), Cipher base64, key(password, empty salt). Pilih versi exact setelah memeriksa API paket. Library tersebut implementasi pihak ketiga yang dipakai Remotely Save, bukan library resmi rclone.

## Transport
Binding R2 khusus bucket uji. Server menentukan bucket dan root prefix; request tidak dapat memilih bucket/prefix lain. GET listing menerima cursor opaque bounded, maksimal 100 objek per halaman. GET object menerima key relatif hanya di root allowlist, menolak traversal/absolute paths, ukuran maksimum 8 MiB, memverifikasi owner sebelum mengakses binding. Responses no-store; error generik tanpa key/content/token. Tidak memasukkan isi ke log, SSR, telemetry atau repository. Credentials transport berupa binding; bukan S3 keys browser.

## Browser lifecycle
Kontrol vault uji pada halaman Koneksi existing, tanpa redesign shell. Password input session-only; key material berada pada worker browser yang dihentikan saat lock/logout/unmount. Unlock memuat daftar terbatas, mendekripsi nama dan minimal satu file untuk verifikasi autentikasi ciphertext sebelum menampilkan unlocked. Empty vault tidak dianggap password valid. Salah password, corrupt ciphertext, locked, not_configured dan unavailable ditampilkan tanpa mengklaim kepastian yang tidak ada.

Selected decrypted Markdown diteruskan ke importer/index/reader existing secara eksplisit; source hanya di memori. Tidak menyediakan save/export kembali ke R2. Lock membuang referensi password/key/notes/index/cache/draft, membatalkan operasi async dan mencegah hasil request lama membuka workspace kembali. Tidak menjanjikan physical memory wipe.

## Proof
Fixture sintetis lokal dapat membuktikan perilaku library, tetapi round-trip menggunakan library yang sama bukan bukti interoperabilitas independen. Acceptance membutuhkan fixture hasil Remotely Save 0.5.25 atau official rclone dengan base64 filename encoding dan salt kosong; metadata pembuat dicatat. Fixture/test password sintetis boleh berada di repo, password nyata tidak.

Test boundaries: anonymous/foreign owner, cursor/path/size limits, authentication failure/truncation, pagination, lock/unlock races, logout clearing. Smoke browser actual unlock/read/wrong password/lock memakai fixture independen; Bun frozen install/tests/build/typecheck. Remote provider proof terpisah. Tanpa fixture independen yang tersedia, implementasi tidak dinyatakan selesai #17.

## Main bucket observation
User authorized read-only inventory. Target prefix has readable filenames. One markdown sample did not match RClone/OpenSSL file magic; content was not printed/saved. REST object endpoint ignored Range, response reading cancelled. Observation is not a claim that every object is plaintext. No main bucket writes or encryption setting changes.
