# Phase 17 — Organization Lifecycle

Phase 17 closes the critical corporate member lifecycle before payment E2E work.

- Member status remains `INVITED → ACTIVE → SUSPENDED → LEFT` with guarded transitions.
- `SUSPENDED` and `LEFT` atomically suspend digital profiles and disable organization physical cards.
- Reactivation restores eligible suspended digital profiles; physical cards require explicit manager reactivation.
- `LEFT` is terminal and releases the membership from active/invited seat accounting already used by the product.
- Organization ownership can now be atomically transferred by the current active OWNER to another accepted, active member.
- The previous OWNER becomes ADMIN and the target becomes OWNER in the same database transaction.
- Existing invitation resend/revoke and status history mechanisms are retained.
