# #18 — Conditional save and encrypted recovery

Approved user contract: browser encrypts/decrypts; server only handles ciphertext. Test bucket only, no primary bucket writes, no rename/delete. Preserve local draft on conflict; explicit remote refresh before retry, no automatic overwrite.

GET object includes ETag; PUT requires exact Origin, owner, application/octet-stream, bounded ciphertext and If-Match. Server reads current object, archives its ciphertext in a separate history bucket, then conditional R2 put etagMatches. Stale 409. Archive failure means no write; uncertain provider/network outcome must not be called success. Extra archive from a losing CAS is safe, not proof a save succeeded. History IDs and encrypted-key hash bind archive to resource, no plaintext paths or content in metadata/logs. Restore archives the current object then conditional-put chosen historical ciphertext; never blind restore.

History bucket excluded entirely from Remotely Save sync listing. Write gate disabled by default; requires explicit test-only binding and VAULT_TEST_WRITES=enabled. Main bucket not bound. Dirty drafts retained on save errors; lock/logout must not leave keys or reader references; security logout overrides navigation guards. No physical memory wipe guarantee.

Implementation: extend vault.server.ts/routes/tests; VaultSession revision/save/history/recover; worker encrypt action; vault-reader edit/conflict/history controls. Independently verify browser-produced ciphertext with official rclone. Test stale writes, concurrent change between read and CAS, archive failure, uncertain outcome, Origin/owner/gate/body limits and restore revision conflict. Exercise actual browser surface with synthetic transport then local real R2 emulator if feasible. Frozen install/test/build/typecheck.

Acceptance Mac–web–Mac additionally requires Obsidian test vault on Remotely Save 0.5.25, separate bucket, Unicode/folder/Markdown/attachments and two-direction recovery proof. Unit tests/rclone alone do not establish plugin synchronization. Keep issue open and primary writes disabled until proof; no production deployment or remote test writes without separate approval.
