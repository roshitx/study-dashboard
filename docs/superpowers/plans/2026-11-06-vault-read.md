# Read-only RClone Vault Implementation Plan

**Goal:** implement approved #17 contract without touching primary vault.

**Architecture:** owner-authenticated fixed-prefix R2 GET transport; browser module worker uses exact @fyears/rclone-crypt 0.0.7, base64 names, empty salt. Reuse existing reader in Koneksi.

- [x] Implement bounded transport and owner/path/cursor/error tests.
- [x] Implement worker/client lifecycle, bounded pagination, authenticated content verification, lock cancellation and generation checks.
- [x] Integrate password-only session UI and read-only snapshot reader.
- [x] Generate synthetic independent fixture with official rclone v1.75.2; test name/content, wrong password, tampering/truncation.
- [x] Browser worker/UI smoke using intercepted synthetic transport, explicitly not live provider proof.
- [ ] Provision separate remote test bucket, upload only independent encrypted synthetic fixture, bind staging, smoke actual owner session/R2 path. Requires explicit remote resource/publication approval; main bucket never used.

No new permanent write endpoints. Default local binding study-vault-interop; staging remains unconfigured for vault. Main-vault read-only inspection previously found readable keys and one sample missing encrypted magic; no content persisted or printed.
