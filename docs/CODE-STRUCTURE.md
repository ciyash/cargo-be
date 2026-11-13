# Backend code map

## Application lifecycle

`src/server.js` resolves the root environment file, validates configuration, connects to MongoDB and starts `createApp()` from `src/app.js`. Shutdown closes HTTP connections and the database connection. The root `app.js` remains a compatibility export. The only server entry point is `src/server.js`.

`src/app.js` owns security headers, CORS, request parsing, authentication throttling, webhook ordering, route mounting, health checks and final error handling. The raw Razorpay webhook handler still runs before JSON parsing.

## Authentication and permissions

| Responsibility | Location |
| --- | --- |
| Shared company/staff login | src/controllers/unified-login.controller.js |
| Admin account model | src/models/admin.auth.model.js |
| Account/login/profile handlers | src/controllers/admin.auth.controller.js |
| Current-account authentication | src/middleware/workspace.auth.js |
| Legacy endpoint scope middleware | src/middleware/auth.middleware.js |
| Company management gate | src/middleware/company.auth.js |
| Canonical roles and permissions | src/services/roles.js |
| Team/branch assignment rules | src/services/staff-access.js |
| Per-request tenant/branch model scope | src/services/legacy-data-scope.js |

Canonical roles are `company_admin`, `admin`, `staff`. The `Admin` collection and existing user IDs are unchanged by this reorganization.

## Logistics and accounts

| Workflow | Controller / route | Business service |
| --- | --- | --- |
| Booking and reports | booking.controller.js / booking.route.js | shipping.js, booking-calculation.js |
| Parcel loading | parcel.loading.controller.js / parcel.loading.route.js | parcel-workflow.js |
| Parcel unloading | parcel.unloading.controller.js / parcel.unloading.route.js | parcel-workflow.js |
| Delivery | Existing booking handlers | delivery-workflow.js |
| Credit statements | cf.voucher.controller.js / cf.voucher.generate.route.js | voucher-workflow.js |
| Cities | city.controller.js | company-cities.js |
| Courier integration | workspace.route.js | couriers.js, delhivery.js, courier-secrets.js |
| Subscription and payments | billing.route.js | billing.js, razorpay.js, quota.js |

Controllers live under `src/controllers/`, routes under `src/routes/`, services under `src/services/`, and schemas under `src/models/`. Existing report calculations are preserved; this change relocates their files rather than rewriting their business rules.

## Test and maintenance boundaries

`test/` imports the active `src/` modules. `scripts/check-source.mjs` verifies remaining source syntax/imports while excluding private backup snapshots. Migration commands in `scripts/` import the active schemas/services and remain versioned and idempotent where documented.

Historical `legacy/modules`, `legacy/account`, and `legacy/routes` have been removed after confirming that no active route, test or maintenance tool depends on them. New account features use the current Admin model. The removed source remains restorable from the private cleanup archive, not duplicated inside the application tree.

## Structure-refactor validation

- 132 source files relocated with imports resolved from their original destinations.
- 179 JavaScript source files passed syntax and relative-import checks.
- All 165 backend tests passed, including route mounting, company/branch permissions, quota/refunds, loading/unloading, payments and authentication.
- No endpoint paths, environment values, MongoDB records or collection names were changed by the structure refactor.

## Unused-code cleanup

66 files were removed: historical unmounted modules, old staging copies, unmounted all-role/voucher-collection routes and handlers, orphaned DB/terms source, and obsolete one-time patch scripts. Two unreferenced token-only auth implementations were also removed; active database-backed authentication remains unchanged.

The import graph showed 100 active runtime modules before cleanup. Role migration support is retained because tests and operational migration tools still use it. Root startup compatibility files, current courier integration, backups, report documents, demos and frontend source are retained.

The archive `.private-db-backups/code-cleanup/unused-code-before-cleanup.zip` contains all 66 removed files. `manifest.json` in the same directory records original paths and SHA256 hashes; every archived file was hash-verified before its working copy was removed.
