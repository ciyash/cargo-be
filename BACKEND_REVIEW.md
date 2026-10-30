# Backend review and setup

Reviewed the Express entry point, the 18 mounted routers, their controllers and models, authentication, loading/unloading, booking numbers, delivery, vouchers, financial CRUD, and database resource handling. Syntax and relative imports are checked across the entire application tree, including unmounted legacy modules. Automated behavior checks cover the changed workflows; this is not a production load or heap-profile result.

## Changes

- Extracted the Express application from server startup. Startup validates configuration and waits for MongoDB before listening. Database commands no longer buffer indefinitely. Shutdown stops HTTP traffic and disconnects Mongoose, with a bounded shutdown deadline.
- Enabled Helmet, configurable CORS, bounded URL-encoded bodies, bounded logo uploads, JSON errors for malformed bodies, and a database readiness endpoint at `/health`.
- All four parcel creation flows validate company identity, distinct numeric GRNs, matching LRs, allowed booking states, and array types. Parcel records and booking updates now share a retried transaction with session cleanup. Invalid requests do not open sessions.
- Branch-to-branch unloading now actually moves bookings to unloaded status. Branch-to-branch loading accepts booked or unloaded stock, allowing onward transport. Standard unloading requires loaded stock. Existing API field spellings such as `vehicalNumber` remain supported.
- Delivery and CF voucher generation also use transactions. Vouchers group with a `Map`, insert documents in a batch and update booking flags once. Concurrent duplicate voucher attempts conflict on the booking writes.
- GRNs, LR sequences, receipts and voucher numbers use atomic counters seeded against existing records. An LR receives the same GRN allocated for its booking. Counters can have gaps after failed requests, which is intentional. Counter creation races retry the winning counter.
- Replaced repeated per-parcel booking scans in voucher reports with a GRN map. Membership lookup now reuses one company document. Added lean reads, bounded booking pagination, deduplicated GRN lookups, and a set for sender membership checks.
- Added indexes for company/status/date, LR, loading dates, unloading dates and vouchers. Production startup does not automatically build indexes.
- Fixed the live snapshot route signature and authentication. Financial aggregates now cast company ObjectIds and use the actual expense fields (`branchId`, `expenseDate`). Snapshot reads exclude today's snapshot when choosing opening balance; repeat daily snapshot writes update the same date. Snapshot processing uses a cursor that closes in `finally`.
- Scoped branch, staff update, financial and company-management queries to their authenticated company. Bank, item, vendor, branch reports, Shiprocket and person deletion now require authentication. Person deletion additionally requires an admin and an explicit ID. Staff-created signup requires an admin.
- New bank/item/vendor/expense/category/customer/snapshot records store `companyId`. Update helpers prevent ownership changes and reject MongoDB update operators and dotted paths.
- Fixed the undefined person-delete ID, undefined company-access `next()`, branch-wise parameter handling, numeric OTP comparison, bulk booking update's incorrect `grnNumber` field, invalid loading string-field population, and unloading fields that Mongoose previously discarded.
- Account JSON omits password hashes and recovery fields. OTPs are no longer returned in the forgot-password response. SMTP certificate verification is enabled. Shiprocket HTTP calls have finite timeouts.
- Replaced the unused database file's undefined globals/import-time queries with the shared connection export. Fixed broken relative imports in the unmounted admin branch module.

## Local setup

1. Use Node.js with native `node:test`, watch mode and modern HTTP shutdown support; validation here used Node 24.
2. Install dependencies with `npm ci`. On PowerShell systems blocking `npm.ps1`, use `npm.cmd ci`. Existing dependencies were used for this review; no installation was performed.
3. Copy `.env.example` to `.env` only if you do not already have an environment file. Fill in your MongoDB URI and separate staff/company signing secrets. Leave optional email/Shiprocket credentials empty until using those integrations.
4. MongoDB must be a replica set or sharded cluster for the transactional parcel, delivery and voucher writes. Atlas supports this topology; a standalone local MongoDB instance needs replica-set configuration.
5. Run `npm run check` and `npm test`, then `npm start`. `/health` returns 200 when connected and 503 when the database is disconnected.
6. Use the refreshed collection in `postman/`. Set company and staff credentials, log in, and replace sample branch/GRN/LR values before sending writes.

The existing 40 MB JSON allowance is preserved and can be reduced using `JSON_BODY_LIMIT`. `CORS_ORIGINS` accepts comma-separated frontend origins. If it is omitted, CORS retains the existing permissive behavior. Configure trusted proxies deliberately at deployment before relying on forwarded client IPs.

## Deployment requirements

- Back up existing data and run `npm run db:check` against the intended environment. This script only reads database topology, missing company ownership and existing index definitions. It was not run during this review.
- Backfill `companyId` on legacy bank, item, vendor, expense, expense-type, customer, category and snapshot records using an explicit, reviewed ownership mapping. Until backfilled, those legacy records are excluded from company-scoped APIs. Do not guess ownership or assign every record to one company.
- Legacy unloading records may lack branch, vehicle and city fields because the original schema discarded them. Backfill only where linked records establish the values reliably. A parcel spanning multiple cities currently stores a summary city, not a full route history.
- Review declared schema indexes and create the missing indexes in a deployment migration. Check duplicates before introducing additional unique business constraints. Review existing random voucher collisions before relying on a voucher lookup as unique.
- `.env` and 2,808 files under `node_modules` were already tracked in Git. The new ignore rules do not untrack files already committed. Remove them from tracking in a repository maintenance change, review any shared history, and rotate credentials that were exposed. This review neither displayed `.env` values nor altered Git history/index tracking.

## Verification and limits

Validation passed: 39 automated tests; syntax and relative-import checks across 111 JavaScript files; 220 Postman requests. `npm test` covers input rejection, company scope, transaction/session propagation and cleanup on errors, status transitions, sequence-upsert collision retry, delivery and voucher transactions, live financial snapshots, serialization, mounted router construction, authentication, malformed JSON, readiness, report pagination and missing routes. Database calls are mocked; the tests do not establish actual replica-set rollback behavior or production throughput.

Before calling the backend production-ready, verify with a disposable replica-set database: booking → loading → unloading → delivery, branch transfers, voucher retries, simultaneous loading/delivery attempts, legacy data migration and frontend authentication changes. Run representative reports with query plans and load/heap profiling on production-sized data. Source review cannot prove the absence of memory leaks.

Report pagination now covers 42 handlers; see [the pagination contract](postman/REPORT_PAGINATION.md). Record reports use database paging and separate full-result totals; composite legacy reports page after calculating their complete summaries. Remaining design work includes streaming/database aggregation for those large composite reports, transactional enforcement of subscription booking quotas, a complete role/permission matrix for generic booking edits/deletes, and a public recovery flow with rate limiting (forgot/reset routes still retain their existing staff authentication requirement). Define accounting rules for cancelled/to-pay bookings before treating snapshot `grandTotal` sums as cash collected. No automatic cron job was enabled: the snapshot handler requires an explicit company-aware caller.

Unmounted legacy admin/user/account modules remain outside the active API; syntax/import checks do not make those modules production-ready. No database migration, external Shiprocket order, production benchmark, dependency audit or credential rotation was performed.
