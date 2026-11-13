# Three-role migration activation

Requested canonical role keys:

| Existing persisted key | New persisted key | Access |
| --- | --- | --- |
| admin / superadmin | company_admin | Company administration and all company operations |
| subadmin | admin | Assigned branch operations and permitted Staff management |
| employee | staff | All five operational permissions; no creation/settings access |

The `Admin` collection and all record IDs, branch assignments, passwords, booking ownership and company subscriptions remain intact. A `roleVersion: 2` marker distinguishes new Branch Admin records from historical Company Admin records using the same `admin` value. Never use a replacement that maps the same record twice.

The read-only preflight is `node scripts/role-migration-preflight.mjs`. The tested mapping is in `src/services/role-migration-plan.js`; it is not imported by production authentication. Unknown roles, missing branches and specialized legacy roles block activation for review.

Activation must update these together:

1. Persisted role enum, serialization, permissions and tenant/branch authorization.
2. Company and staff login responses, JWT creation and account-based role resolution. Existing JWT role claims must not override the account record.
3. All role-sensitive controllers and endpoint gates, including team creation, billing, bookings, loading and reports. Existing URL paths and business field names must not be renamed as if they were role values.
4. Frontend role catalog, guards, team selectors and menus. Mark newly stored sessions with role version 2; handle preexisting sessions without reinterpreting historical Company Admin as Branch Admin.
5. Transactional migration of eligible records with a saved previous-role manifest and conditional writes. Verify account counts, IDs, branch assignments and permissions before reopening the portal.
6. Role-specific login, cross-company denial, cross-branch denial, Staff restrictions and frontend navigation tests. Recheck production build.

Rollback: stop admission to the portal, restore previous roles from the migration manifest using the version marker, and deploy the paired previous backend/frontend together. Do not roll back only the role enum or only the database.

Activation was explicitly approved and completed using audited role-only AST edits and reviewed selectors/allowlists, rather than a blanket string replacement. Existing endpoint paths, record IDs and business fields were preserved.

Verified result:

- `Admin` collection: 1 `company_admin`, 2 `admin`, 2 `staff`, all with `roleVersion: 2`.
- All non-role account data matched its pre-migration hash, including password hashes, company/branch assignments and permissions.
- Previous roles are saved under `.private-db-backups/role-v2/accounts-*.json`; edited source snapshots are under `.private-db-backups/role-v2/source/`.
- 165 backend tests and the production frontend build passed.
- Browser checks passed for canonical booking routing, Company Admin role selectors and restricted-role settings denial.
- Existing browser sessions were verified to migrate once, without promoting an already migrated Branch Admin.
- All 5 live accounts passed database-backed authentication and the running backend profile endpoint returned the expected canonical roles. Old elevated JWT role claims could not override the account role.

The transactional, versioned migration is `node scripts/migrate-role-v2.mjs --apply`; repeat runs are no-ops after successful migration. The read-only preflight remains available. Retain the private rollback manifests; they contain no passwords or tokens.
