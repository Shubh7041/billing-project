# Initial Owner Bootstrap

This procedure is for the single-store Cracker Mall deployment defined by local migrations 001-004. The remote project migration state was not queried. Before applying anything, compare the remote schema and policies with those migrations; the new migration intentionally aborts if it finds multiple stores, existing identity/store policies, unexpected client grants, or missing RLS/schema prerequisites.

## Security Boundary

The `/setup` page creates only a Supabase Auth email/password user. The submitted store name is saved as untrusted Auth user metadata for display; it is not authorization. The browser never creates a `profiles` row, store, or `owner` membership and never receives a service-role key.

`bootstrap_initial_store_owner(uuid, text, text)` is `SECURITY INVOKER`, has a fixed `pg_catalog` search path, and is executable only by the SQL Editor's trusted `postgres` role. It requires a real Auth user with `email_confirmed_at`, serializes concurrent attempts with a transaction advisory lock, and creates the store/profile/membership atomically. A unique expression index enforces one store globally. An identical repeat returns the same store ID; a different user or different details are rejected once a store exists. Never expose the SQL Editor call through an application endpoint.

Authenticated clients receive SELECT only on `profiles`, `store_memberships`, and `stores`, constrained by RLS to their own profile, their active memberships, and active stores tied to those memberships. No grants or policies are added to purchasing, catalog, or inventory tables by this migration. Existing purchasing RPC permissions are intended to remain unchanged.

## Manual Supabase Dashboard Sequence

1. In Supabase Dashboard, inspect the remote migration history and schema. Confirm migrations 001-004 and their table definitions match this repository. Resolve existing stores, policies, grants, or schema drift manually before applying the new migration; do not bypass its preflight.
2. In **SQL Editor**, review and run [`20261028130000_single_store_owner_bootstrap.sql`](migrations/20261028130000_single_store_owner_bootstrap.sql). The migration creates the single-store constraint, three read-only context policies, narrowly scoped SELECT grants, and the admin-only bootstrap function. Do not run the verification script as the migration.
3. In **Authentication → Providers**, enable Email/Password. Choose whether email confirmation is required. Add the deployed app's `/setup` URL and local development `/setup` URL to the allowed redirect URLs. No password-reset or invitation flow is included here.
4. Open the app's `/setup` route and submit the first owner's display name, requested store name, email, and password. This creates the Auth account only. The store name in user metadata is untrusted and must be reviewed by the administrator.
5. If signup returns no session, follow the email confirmation link first, then sign in. The setup page displays the Auth UUID only after a real session is available. If confirmation is disabled but the Auth row is still unconfirmed, mark/confirm that Auth user in the Dashboard before continuing; the SQL function rejects unconfirmed users.
6. In SQL Editor, ensure the execution role is `postgres`, verify the Auth UUID and requested names, then call the bootstrap function with literal values substituted for the example arguments:

   ```sql
   SELECT public.bootstrap_initial_store_owner(
     'AUTH-USER-UUID'::uuid,
     'Verified Store Name',
     'Owner Display Name'
   );
   ```

   The Auth user must exist and be email-confirmed before this call. The SQL statement creates the active store with INR and `Asia/Kolkata`, the active profile using that Auth UUID, and the active `owner` membership in one transaction.
7. Run [`20261028130000_single_store_owner_bootstrap.sql`](tests/20261028130000_single_store_owner_bootstrap.sql) from SQL Editor. Its default checks need no Auth session. They are read-only and the optional path block is skipped while its three variables remain NULL. To test a real confirmed user before permanent provisioning, replace all three optional NULL values in the test block, run the full script, and confirm the explicit final `ROLLBACK` completes. That optional test may create temporary bootstrap rows inside its transaction but must leave none behind.
8. After the permanent call, sign in at `/login` (or reload an already-authenticated tab). The app should resolve the profile and active store membership before rendering business routes. The confirmation/setup page itself does not complete provisioning.
9. After initial setup, disable public self-signup in Supabase unless a separately reviewed account-onboarding design is in place. Future staff profile and membership provisioning is not implemented by this bootstrap; do not assign roles from the browser.

## Verification Limits

The SQL verification script checks the role enum, expected identity constraints, RLS policy names/commands, table grants, the singleton index, bootstrap function security/search path/grants, and that Migration 004's purchasing boundary remains intact. Its optional Auth-user exercise is transaction-scoped and rolled back. SQL Editor execution does not prove PostgREST RLS behavior for a real browser JWT; verify with the actual owner session and a separate account, confirming neither can read another user's profile/memberships or an unrelated store.

Neither script has been run against the remote database. Do not infer the remote migration state from the files in this repository.
