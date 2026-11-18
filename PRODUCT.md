# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Owner personal, mahasiswa Universitas Terbuka. Dashboard bukan aplikasi publik multi-user.

## Product Purpose
Ruang belajar personal untuk catatan, struktur akademik dan integrasi sumber Google/vault dengan batas data privat yang eksplisit.

## Capabilities and Constraints
TanStack Start, React, TypeScript, Vite, Cloudflare Workers, Bun. Data demo sintetis harus dibedakan dari live. Login Google owner berbeda dari grant Sheets/Calendar. Dashboard hanya terlihat setelah sesi owner terverifikasi. Tidak menyimpan kunci vault atau isi draf privat secara permanen. Tujuan login hanya route internal. Logout dan expiry menutup state privat, tab lain ikut keluar.

## Brand Commitments
Bahasa Indonesia. Identitas dashboard hijau dan tipografi existing dipertahankan untuk halaman login. Tidak membuat logo, ilustrasi, statistik atau klaim baru.

## Product Principles
- Data sumber dan status aktual tidak diganti asumsi.
- Privasi mendahului kenyamanan pemulihan draf.
- Error menjelaskan tindakan pemulihan tanpa membocorkan detail provider.
