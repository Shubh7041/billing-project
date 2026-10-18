# Migration 004 Handoff

## Files

- [20261017160000_authorized_purchasing_operations.sql](supabase/migrations/20261017160000_authorized_purchasing_operations.sql): authorization-checked purchasing RPCs and atomic receipt/reversal inventory updates. It adds no tables, policies, or table grants.
- [20261017160000_authorized_purchasing_operations.sql](supabase/tests/20261017160000_authorized_purchasing_operations.sql): rollback-only verification harness plus two-session concurrency test instructions. Replace the store/user UUID placeholders before running.

## Functions

All functions below use `SECURITY DEFINER` and fixed `search_path = pg_catalog`.

| Function | Parameters | Return | Access / behavior |
|---|---|---|---|
| `require_purchasing_access` (internal) | `p_store_id uuid` | `uuid` | Requires `auth.uid()`, active profile/store/membership, and role owner, manager, or inventory clerk. Direct execution revoked. |
| `apply_purchase_inventory` (internal) | `p_store_id uuid, p_purchase_id uuid, p_direction smallint` | `void` | Derives quantities from stored lines; atomically updates balances and inserts movements. Direct execution revoked; intended only for authorized posting functions. |
| `create_purchase_draft` | `p_store_id uuid, p_supplier_id uuid, p_purchase_number text, p_purchase_date date, p_supplier_invoice_ref text, p_notes text` | `uuid` | Authorized roles; supplier must be active and in the store. Identical purchase-number retries by the same creator return the existing ID. |
| `update_purchase_draft` | `p_store_id uuid, p_purchase_id uuid, p_supplier_id uuid, p_purchase_number text, p_purchase_date date, p_supplier_invoice_ref text, p_notes text` | `uuid` | Authorized roles; locks and updates ordinary drafts only; supplier must be active and in-store. |
| `add_purchase_line` | `p_store_id uuid, p_purchase_id uuid, p_purchase_item_id uuid, p_product_id uuid, p_product_unit_id uuid, p_quantity numeric, p_unit_cost numeric` | `uuid` | Authorized roles; ordinary drafts only. Checks quantity/cost limits; Migration 003’s trigger validates product/unit and fills snapshots. Line UUID is the retry key. |
| `update_purchase_line` | `p_store_id uuid, p_purchase_id uuid, p_purchase_item_id uuid, p_product_id uuid, p_product_unit_id uuid, p_quantity numeric, p_unit_cost numeric` | `uuid` | Authorized roles; ordinary drafts only. Existing snapshot trigger refreshes catalog snapshots. |
| `remove_purchase_line` | `p_store_id uuid, p_purchase_id uuid, p_purchase_item_id uuid` | `boolean` | Authorized roles; ordinary drafts only. Missing-line retry returns false. |
| `post_purchase` | `p_store_id uuid, p_purchase_id uuid` | `uuid` | Authorized roles; requires an ordinary draft, active supplier, and at least one line. Repeated posting returns the posted ID. |
| `create_and_post_purchase_reversal` | `p_store_id uuid, p_original_purchase_id uuid, p_reversal_purchase_number text, p_reversal_reason text` | `uuid` | Authorized roles; creates/posts a full reversal only for an unreversed posted receipt; rejects insufficient stock. Matching retries return the existing reversal ID. |

The seven public RPCs are executable by `authenticated`. The two internal helpers are not. Authentication always uses `auth.uid()`; no caller-supplied user ID is trusted. Cashier is not an allowed purchasing role.

## Security and Locking

The migration revokes function execution from `PUBLIC`, `anon`, `authenticated`, and `service_role`, then grants only the seven RPCs to `authenticated`. It grants `USAGE` on `public` to `authenticated`, but no table access; it creates no RLS policies. A preflight requires the migration executor to be the common owner of the ten referenced tables or a superuser, with needed table/function privileges and RLS enabled.

Draft line RPCs lock the purchase header before line DML; Migration 003’s trigger increments `line_revision`. Posting locks the header first, then processes product IDs in sorted order. It creates a zero balance row if needed, atomically updates the balance, and records per-line movements using the returned balance. All changes occur in the RPC transaction.

Reversal locks the original header before checking for an existing reversal. The existing unique reversal indexes, locked header, and matching-retry check prevent duplicate committed reversals. Balance updates use the same sorted product order as receipts; negative updates require sufficient stock. Future sales posting must use the same per-product balance update/lock protocol and deterministic ordering.

## Verification Status

Actually executed locally: source-level searches for unwanted policies/table grants and unsafe qualified `NULLIF`/`COALESCE`, plus `git diff --check` (no whitespace diagnostics). Git status showed only the two Migration 004 files untracked before this handoff was created.

Not executed: the verification SQL, PostgreSQL parsing, RPC calls, rollback/deferred-trigger tests, privilege checks against a live catalog, or concurrency tests. No SQL was run and no Supabase connection was made. No SQL parser/linter, `psql`, or Supabase CLI was available.

The verification script needs real existing active store and Auth-user UUIDs supplied locally. It makes temporary fixture changes and ends with `ROLLBACK`; do not change that to `COMMIT`. Its concurrent scenarios require separate sessions and are instructions, not automated tests.

## Dependencies and Open Risks

- Existing Supabase Auth session/JWT (`auth.uid()`), active `profiles`/`store_memberships`, and the allowed membership role are required. Existing frontend Supabase URL and publishable-key environment variables remain unchanged; no new environment variables or packages are needed.
- Costs are entered by authorized staff: Migrations 001–003 contain selling prices but no authoritative supplier-cost source. RPCs validate cents/range and calculate totals in PostgreSQL.
- No read/list RPCs or policies are added, so the client still cannot read purchasing/catalog tables directly. A separately reviewed read path is needed for UI workflows.
- SQL Editor application must satisfy the new ownership preflight. The migration comment mentions a trusted `BYPASSRLS` role, but the actual preflight allows only a common table owner or superuser; reconcile that wording during review. Existing definer-function ownership in the database was not queried.
- The test harness runs as a trusted SQL Editor role and sets JWT claim GUCs; this does not substitute for a PostgREST/JWT integration test or prove client grants under the real API role.
