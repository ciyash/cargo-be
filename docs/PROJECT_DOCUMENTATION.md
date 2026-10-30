# CargoNest Logistics
## Complete Project Documentation

Version: 1.0  
Prepared: 30 October 2026  
Scope: Current local Angular frontend and Node.js backend

This document covers the product, user journeys, architecture, data model, modules, APIs, billing, setup, testing, deployment and current limitations. It follows the latest implementation: common login pages, two-letter company logos and a compact header. Real passwords, secrets and customer data are intentionally excluded.

## Contents

1. Product overview
2. Architecture and repositories
3. Accounts, roles and authentication
4. Company registration and onboarding
5. Branch and team management
6. Booking and shipment lifecycle
7. Reports and supporting modules
8. Billing and Razorpay
9. Platform owner dashboard
10. Company identity and frontend design
11. Database structure
12. Backend and frontend source map
13. Environment configuration
14. Installation and local operation
15. API conventions
16. Testing and verification
17. Deployment and operations
18. Troubleshooting
19. Current limits and follow-up
20. Maintenance guide
21. Mounted API inventory
22. Frontend route inventory

## 1. Product overview

CargoNest Logistics is a multi-company logistics management application. A customer registers a company, signs in as its owner, creates branches and management accounts, and gives staff access to daily operations. Operational records are associated with their company and, where applicable, a branch.

The software product owner has a separate private dashboard for monitoring companies and platform activity. This is different from a customer company owner or staff admin.

Core capabilities include company registration, branch/team management, parcel booking, package pricing, loading, transfers, unloading, delivery, customer records, reports, agents, vouchers, vehicles, expenses and other supporting business data.

The booking commercial model gives each company 100 free bookings once. A verified INR 1,000 payment enables unlimited bookings for 30 days. Renewal is manual.

The product name CargoNest Logistics is temporary branding. Customer company names remain their own business data.

## 2. Architecture and repositories

| Layer | Implementation | Responsibility |
| --- | --- | --- |
| Customer frontend | Angular 16, TypeScript, SCSS | Company management and staff operations |
| UI libraries | Bootstrap, PrimeNG, PrimeIcons | Forms, tables, navigation, dialogs and icons |
| Frontend utilities | RxJS, Select2, Chart.js, XLSX, html2pdf.js | Requests, controls, charts and exports |
| Backend | Node.js, Express 4, ES modules | Authentication, APIs and workflows |
| Database | MongoDB with Mongoose 8 | Business records, sequences and payment orders |
| Private owner frontend | HTML/CSS/JavaScript served by Express | Platform reports at /owner/ |
| Payments | Razorpay Orders and Checkout | Monthly plan payment processing |
| Email | Nodemailer | Existing email/OTP functionality |
| Shipping service | Axios-based Shiprocket integration | Existing shipping API module |

Local folders:

- Backend: D:/Ciyash-Company/cargo/cargo-logistics
- Angular frontend: D:/Ciyash-Company/cargo/crm-frontend
- Documentation: cargo-logistics/docs/
- Temporary development verification build: cargo-logistics/.frontend-build-check/

Request flow:

Browser -> Angular component/service -> Express route -> authentication -> controller/service -> Mongoose -> MongoDB.

Payment flow:

Company owner -> company billing UI -> backend order -> Razorpay Checkout -> server verification -> transactional plan activation.

The backend directly serves the private owner console. It does not currently mount the Angular build at its root. Angular needs a development server, static host or reverse proxy.

## 3. Accounts, roles and authentication

### Account types

| Account | Purpose | Login |
| --- | --- | --- |
| Platform owner | Company/platform monitoring | Backend /owner/ |
| Company owner | Company, branches, admins, logo and billing | Frontend /clogin |
| Staff admin | Company operations and permitted staff creation | Frontend /login |
| Subadmin | Assigned-branch operations | Frontend /login |
| Employee | Daily parcel work and permitted reports | Frontend /login |
| Accountant | Account-oriented screens in existing code | Frontend /login |
| Supervisor | Task-oriented screens; schema spelling is superviser | Frontend /login |
| Driver | Delivery-oriented screens in existing code | Frontend /login |

The staff schema also contains a legacy superadmin role. It is not the dedicated platform owner identity.

Company owners currently create admin and subadmin accounts. Staff admins use a separate protected endpoint to create permitted downstream roles. Menu visibility is not a substitute for backend authorization.

### Session boundaries

- Company JWTs use COMPANY_SECRET; staff JWTs use JWT_SECRET.
- Company/staff login controllers issue tokens with a one-day expiry.
- Staff authentication requires staff identity and company context in the token.
- The platform owner uses OWNER_SECRET with a separate role, issuer and audience.
- Owner sessions last one hour and use an HttpOnly, SameSite=Strict cookie. Production requires HTTPS for the secure cookie.
- Company/staff tokens and user summaries are held in browser localStorage by TokenService.
- Sign-out clears company/staff storage and returns to the appropriate common login page.
- Passwords are hashed using bcrypt. Company serialization removes passwords; staff serialization removes password and recovery fields.

Because company/staff tokens use localStorage, preventing script injection remains an important deployment responsibility.

## 4. Company registration and onboarding

Current journey:

1. Open /signup.
2. Enter company name, email, password and confirmation.
3. Optionally enter contact name, phone, address and state.
4. Optionally enter exactly two English logo letters.
5. Submit registration and continue to /clogin?registered=1.
6. Sign in as the company owner.
7. Use /create-admin to manage branches, management accounts, logo and billing.
8. Staff subsequently sign in at /login for operations.

Registration requires a non-empty company name, valid email and password of at least eight characters. The backend normalizes the email, rejects duplicate company emails and hashes the password. Public registration creates an independent company and ignores a supplied parent company ID.

The frontend no longer asks for an image. Optional logoText contains two letters; blank means use company-name initials. Legacy image support still exists in backend source for compatibility, but is not part of the current customer UI.

Example only:

```json
{
  "name": "Example Logistics",
  "email": "owner@example.com",
  "password": "example-password-only",
  "logoText": "EL",
  "phone": "9000000000",
  "state": "Telangana"
}
```

Send this kind of JSON payload to POST /company/register. These are illustrative values, not real project credentials.

## 5. Branch and team management

A company can create its first branch without an existing staff account. Ownership is derived from the company token. A subadmin needs a branch belonging to that company; a company-wide admin does not require a branch.

Branch data includes name, type, city, location, address, phone, alternate phone, PIN code, state and country. The company workspace provides an India country default. Staff branch creation also sends its existing India default. Branch types are main and normal.

The schema contains a MongoDB branch ObjectId and a branchUniqueId. Use the identifier expected by the specific endpoint; they are not interchangeable.

The latest Create Branch screen uses three desktop columns, a Select branch type placeholder and a Create branch button inside the same form card. Required fields are marked with an asterisk. Existing branch list/edit/delete controls remain available.

Team management includes company-created admins/subadmins, subadmin branch assignment, and staff-admin-created downstream roles. Username and phone are optional in the company account form. Staff login accepts email, phone or username according to the login controller.

## 6. Booking and shipment lifecycle

### Booking information

A booking contains route, pickup/drop branches, booking type, packages, sender/receiver details, charges and shipment identifiers. Package fields include quantity, package type, contents, weight, unit price and total price.

Booking types are paid, toPay, credit and FOC. Credit bookings require an agent. The backend validates route/customer fields, package quantities, non-negative amounts and grand total.

Identifiers:

- GRN uses a company-scoped sequence.
- LR combines company/location/city initials with financial-year sequence logic.
- Receipt numbers use a dedicated counter.
- eWayBillNo is generated internally by the existing booking code.

The internal eWayBillNo must not be presented as a government-issued e-way bill: the reviewed code does not establish a government e-way bill integration.

### Status values

| Value | Status |
| --- | --- |
| 0 | Booked |
| 1 | Loaded |
| 2 | Unloaded |
| 3 | Missing |
| 4 | Delivered |
| 5 | Cancelled |

Normal operational flow is booking -> loading/dispatch -> receipt/unloading -> optional transfer -> delivery. Missing and cancellation are separate cases. Workflow services restrict allowed transitions; delivery requires unloaded stock and checks branch context.

Parcel, delivery and voucher workflows use MongoDB transactions where related records must commit together. Sequence allocation supports concurrent identifier generation.

Booking entitlement is checked before processing and again during the final transactional save. Booking creation and company usage update share the same transaction. Concurrent free bookings serialize through the company document; an insert failure rolls back usage. Cancellation does not restore the free allowance.

## 7. Reports and supporting modules

Reports include bookings, today/date-range summaries, booking-type collections, party/branch accounts, consolidated data, pending delivery, delivered stock, pending dispatch, dispatched/received stock, dispatch memos, incoming luggage, GST/customer data, status-date differences, movement and voucher reports.

The admin dashboard includes shipment-stage totals, branch sales, sales mix, branch status and account summaries.

Supporting modules include vehicles, cities, dispatch/package configuration, extra charges, CF masters/agents, CF charges, vouchers, banks, vendors, items and expenses. The historical expense API prefix is /expensive; its spelling remains part of the contract.

Selected reports use default page size 25 and maximum limit 100. Page and limit must be positive integers. Query pagination takes precedence over request-body values where both are supported. Metadata includes totals, pages, returned records and next/previous indicators.

Frontend ReportInterceptor merges configured paginated reports for legacy consumers. Explicitly paginated consumers retain the API envelope. Not every endpoint is paginated; inspect the route and helper mapping for a new integration.

## 8. Billing and Razorpay

### Commercial rules

| Rule | Behavior |
| --- | --- |
| Free tier | First 100 bookings once per company |
| Scope | Shared by all branches and staff |
| Paid plan | INR 1,000 for unlimited bookings |
| Duration | 30 days per successful payment |
| Renewal | Manual; no automatic debit |
| Early renewal | Extends from later of now or existing expiry |
| Cancellation | Does not restore a free slot |
| Existing bookings | Count when initial usage is derived |
| Company blocking | Overrides booking access |

This is an Orders/Checkout integration, not an automatic Razorpay Subscriptions mandate.

### Payment lifecycle

1. Company owner calls POST /billing/orders.
2. Backend fixes amount at 100000 paise and currency INR.
3. PlatformPayment stores the order-to-company association locally.
4. Frontend opens Checkout with the public key ID and order ID.
5. POST /billing/verify validates the signature against the stored order.
6. Backend fetches the Razorpay payment and requires the expected captured payment, order, amount and currency.
7. Payment status and company paidUntil update in one transaction.
8. Duplicate callbacks/webhooks do not extend validity twice.

POST /billing/reconcile checks interrupted confirmations. The company UI calls this Check payment. If a charge may have succeeded, check the existing payment before paying again.

POST /billing/webhook is mounted before express.json and validates the raw-body signature. Successful events handled are payment.captured and order.paid; payment details are re-fetched before activation.

Internal company IDs are not sent as Razorpay order metadata. The association remains in the local database.

### Current payment readiness

Dummy keys are configured as requested. They deliberately disable Checkout and cannot fabricate successful payment activation. A real Razorpay test transaction has not been completed with genuine credentials.

Replace key ID, key secret and webhook secret with valid account values and restart the backend. Configure capture settings and a public HTTPS webhook URL. Localhost alone cannot receive provider webhooks.

The company workspace displays pricing, payment controls and recent history. Staff booking pages show no full pricing card. Only a small notice appears when usage is low, exhausted or blocked.

POST /company/subscription now returns 410 instead of allowing self-activation. Verified booking access uses billing fields, not company-supplied legacy subscription dates.

Automatic recurring billing, refunds, chargebacks and tax invoices are outside this implementation.

## 9. Platform owner dashboard

The private owner console is at http://localhost:4000/owner/ by default. It is served by Express and needs no Angular build.

Reports cover company counts, independent/subsidiary counts, blocked and legacy subscription indicators, branch totals, selected-period registrations/bookings, freight value, registration trends and a company directory. Search, status filtering, pagination and CSV export are available.

Dates use UTC boundaries, default to current month-to-date and are limited to 366 days. Directory pages contain 25 companies. Company/branch totals are all-time; selected dates apply to registration and booking figures.

Interpretation:

- Freight value means customer booking value, not platform revenue.
- Owner active/status indicators currently use legacy subscription.validTill, not exclusively verified billing.paidUntil. Do not present them as certified paid-customer counts.
- Company payment history exists; consolidated platform subscription revenue reporting is not implemented.
- CSV exports retrieve pages sequentially and are not snapshot-isolated during concurrent registrations.

Owner setup requires OWNER_EMAIL, OWNER_PASSWORD_HASH and an independent OWNER_SECRET of at least 32 characters. There is no public owner sign-up. The limiter allows five attempts per IP per 15-minute window within each process. Scaled hosting needs a shared or gateway limiter.

## 10. Company identity and frontend design

### Company logo

Optional logoText accepts exactly two English letters. Blank values derive stable initials: Example Logistics -> EL; Acme -> AC. Custom letters display uppercase. A single-letter name is repeated. Older long logoText values fall back to company initials.

CompanyLogoComponent builds the monogram/arrow and company wordmark directly in HTML/CSS with a navy/teal palette. No customer image upload or image-generation service is needed. Owners edit letters in the company workspace.

The current login pages are common /login and /clogin. Company-specific login links are no longer generated or shared. GET /company/branding requires company authentication; the old public branding-by-ID route was removed.

### Compact header

Desktop uses one navy row for logo, menu, branch and profile. Sign out is inside the profile dropdown. The old tall white top bar and Company workspace caption were removed. Isolated browser measurements were approximately 65px desktop and 95px mobile.

Menus support click, active-route styling, outside-click dismissal and Escape. Profile and main-menu dropdowns close one another. Mobile retains a visible navigation strip and an expandable Menu control.

### Forms and widgets

The shared design uses light surfaces, navy text, teal actions, consistent controls, responsive fields and readable report tables.

The shipment search widget accepts embedded=true on parent pages to avoid duplicate navbars. The standalone search route keeps its own header. Search values initialize safely when the route contains no GRN parameter.

All three booking roles have a light charges grid, not standalone blue table rows. Create Branch keeps its action in the form card. Authentication and print routes are excluded from the main workspace theme; print media hides navigation.

## 11. Database structure

MongoDB must support transactions using a replica set or sharded topology. A standalone server cannot support the transactional booking/payment/parcel flows.

| Model area | Relationships and purpose |
| --- | --- |
| Company | Identity, contacts, logoText, parentCompany, blocking and billing |
| Subadmin | Staff with companyId, role and branch relationship |
| Branch | companyId, branchUniqueId, location, contacts and creator |
| Booking | Company, booker, branches, packages, prices and shipment status |
| User | Company-associated customer/contact records |
| Delivery | Company/booking-linked delivery record |
| ParcelLoading / ParcelUnloading | Movement records |
| PlatformPayment | Company, unique order ID, amount, status, payment and validity |
| Counter | Atomic numeric sequence values |
| CF masters/vouchers | Agent, charge and voucher data |
| Vehicle/Bank/Item/Vendor/Expense | Supporting operational records |

Relationships:

Company -> branches and staff.
Company -> bookings -> delivery/movement records.
Company -> payment orders.
Company -> optional subsidiary companies.

Important billing fields:

- billing.freeBookingsUsed: persistent free usage; existing bookings are considered during initialization.
- billing.paidUntil: verified unlimited-booking expiry.
- billing.revision: company write counter used during transactions.

Legacy subscription, bookingLimit and companyAccess fields remain. They are not the authoritative new paid-booking entitlement.

Booking indexes include unique companyId/grnNo and compound company/status/date/report indexes. Production disables automatic index creation; migrations and index rollout require an explicit maintenance process.

## 12. Backend and frontend source map

### Backend

| Path | Purpose |
| --- | --- |
| server.js | Configuration, database connection, startup and shutdown |
| app.js | Express middleware, mounts, static owner UI, health and errors |
| routes/ | HTTP contracts |
| controllers/ | Request validation, orchestration and responses |
| models/ | Mongoose schemas/indexes |
| services/ | Billing, Razorpay, parcel, delivery, sequence and voucher workflows |
| config/ | Staff/company auth, environment and integration configuration |
| utils/ | Errors, report helpers, allowlists and branding |
| public/owner/ | Private owner dashboard frontend |
| test/ | Node tests |
| postman/ | Collection, sample environment, curl examples and generator |
| scripts/ | Source checks, database preflight and owner password hashing |

Middleware includes Helmet, CORS, JSON/form parsers and development request logging. X-Powered-By is disabled. Default JSON size limit is 40 MB; form parsing has separate limits.

GET /health returns 200 when MongoDB is connected, otherwise 503. Startup waits for MongoDB. Shutdown handles SIGINT/SIGTERM, closes HTTP and disconnects MongoDB.

Tenant workflows derive company context from tokens. Selected updates use allowlists to block ownership changes/operator injection. These are targeted protections, not proof of a complete audit of every historical endpoint.

modules/ and account/ contain additional/legacy structures. Only actually mounted route files are included in the API inventory.

### Angular frontend

| Area | Purpose |
| --- | --- |
| USER/ | Login, company login, signup, workspace, dashboard, header and profile |
| Branch/ | Booking, parcel movement, widgets, reports and CF screens |
| SubAdmin/ | Subadmin operations/reports |
| empolyee/ | Employee operations; spelling is historical |
| pages/Admin/ | Branch, vehicle, employee, city and other setup screens |
| service/ | Auth/token guards, API services and report interception |
| shared/billing/ | Company billing and compact staff notices |
| shared/company-logo/ | Two-letter company monogram |
| styles.scss | Workspace controls and surfaces |
| styles/_workspace-navigation.scss | Compact header and dropdown styling |
| environments/ | Backend API URL per build configuration |
| assets/ | Product logo, favicon and existing images |

AppModule configures HTTP, routing, animations, toasts and report interception. Most feature pages are lazy-loaded standalone components. Route guards apply authentication and explicit roles where configured; guard coverage is not identical on every route.

Key paths:

| Frontend path | Purpose |
| --- | --- |
| /signup | Company registration |
| /clogin | Company-owner login |
| /login | Staff login |
| /create-admin | Company workspace |
| /dashboard | Admin operations dashboard |
| /createbranch | Branch management |
| /booking | Admin booking |
| /sub-booking | Subadmin booking |
| /employee-booking | Employee booking |
| /searchgrn | Standalone shipment search |
| /profile | Staff profile |
| /printgrn/:grnNo | Shipment print screen |

## 13. Environment configuration

Use .env.example as the template. Keep actual values private and untracked. Never put signing/payment secrets in Angular source, public files, documents or exported collections.

| Variable | Purpose |
| --- | --- |
| NODE_ENV | Runtime mode |
| PORT | Backend port; default 4000 |
| MONGO_URI | Transaction-capable MongoDB connection |
| JWT_SECRET | Staff JWT signing key |
| COMPANY_SECRET | Separate company JWT signing key |
| CORS_ORIGINS | Allowed frontend origins, comma-separated |
| JSON_BODY_LIMIT | JSON size limit, default 40mb |
| EMAIL_USER / EMAIL_PASS | Existing email credentials |
| SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD | Shiprocket credentials |
| OWNER_EMAIL | Private platform-owner email |
| OWNER_PASSWORD_HASH | Bcrypt owner password hash |
| OWNER_SECRET | Independent owner key, at least 32 characters |
| RAZORPAY_KEY_ID | Provider key identifier |
| RAZORPAY_KEY_SECRET | Server-only API/signature secret |
| RAZORPAY_WEBHOOK_SECRET | Server-only webhook secret |

Startup requires MONGO_URI, JWT_SECRET and COMPANY_SECRET. Owner/payment configuration is validated when those features are used. Empty CORS_ORIGINS currently results in permissive CORS rather than an explicit allowlist.

Set the intended API URL in both Angular environment files. Backend .env changes do not change the Angular URL. Restart/rebuild the relevant process after configuration changes.

## 14. Installation and local operation

### Prerequisites

Use Git, Node.js/npm and MongoDB with transactions. Confirm runtime compatibility with the Angular 16 dependency stack. Some frontend packages have newer major versions, so maintain a tested lockfile rather than upgrading blindly.

For local MongoDB, configure a replica set; alternatively use a suitable managed cluster. Do not initialize or migrate an existing database without understanding its current state.

### Backend setup

```powershell
cd D:\Ciyash-Company\cargo\cargo-logistics
npm.cmd ci
# Create .env from .env.example only if .env does not already exist.
# Configure database and secrets in .env.
npm.cmd start
```

Default backend: http://localhost:4000. Development watch mode is npm.cmd run dev. Confirm /health before using the frontend.

npm.cmd is shown because the Windows PowerShell execution policy may block the npm.ps1 wrapper.

### Frontend setup

```powershell
cd D:\Ciyash-Company\cargo\crm-frontend
npm.cmd ci
npm.cmd start
```

Normal development URL: http://localhost:4200. Check Angular API URL and backend CORS.

```powershell
npm.cmd run build:dev
npm.cmd run typecheck
```

### Platform-owner setup

Configure OWNER_EMAIL, OWNER_PASSWORD_HASH and OWNER_SECRET and restart the backend. scripts/hash-owner-password.mjs reads a password from stdin, requires at least 12 characters and outputs a bcrypt hash. Supply plaintext through a secure local input method, not a shell argument/history entry.

Open http://localhost:4000/owner/. Actual login values are intentionally omitted.

### First-use walkthrough

Register a test company -> company login -> create a branch -> create an admin/subadmin -> staff login -> create a valid test booking -> load/unload/deliver as appropriate -> review reports.

Use a dedicated test tenant/database to test allowance boundaries. Configure genuine Razorpay test credentials before testing Checkout. Verify platform-owner access separately.

## 15. API conventions

Company/staff requests normally use Authorization: Bearer <appropriate-token> and JSON. Company and staff tokens are not interchangeable. Owner APIs use the separate owner cookie.

| Endpoint | Purpose |
| --- | --- |
| POST /company/register | Company registration |
| POST /company/login | Company login |
| GET /company/branding | Authenticated company identity |
| GET/POST /company/branches | Company-managed branches |
| PATCH /company/update | Allowed profile updates |
| POST /subadmin-auth/signup-by-company | Create management accounts |
| POST /subadmin-auth/login | Staff login |
| GET /subadmin-auth/profile | Staff profile |
| POST /subadmin-auth/signup | Admin-created staff |
| POST /booking/ | Booking with allowance enforcement |
| GET /billing/status | Company plan state |
| GET /billing/staff-status | Staff-visible allowance |
| POST /billing/orders | Fixed-price payment order |
| POST /billing/verify | Verify and activate |
| POST /billing/reconcile | Re-check payment |
| GET /billing/history | Latest 50 company orders |
| POST /billing/webhook | Signed provider events |
| POST /api/owner/login | Platform-owner login |
| GET /api/owner/reports | Platform report aggregation |

Typical statuses: 200/201 success; 400 invalid input; 401 authentication required; 402 booking payment required; 403 denied/blocked; 404 unavailable; 409 conflict; 410 retired self-subscription endpoint; 429 owner login limit; 503 unavailable configuration/health.

Older response envelopes differ. Do not assume a universal data/message/success structure. Inspect the controller and collection for payload contracts. The full appendix is a declaration inventory, not an OpenAPI specification.

## 16. Testing and verification

Backend commands:

```powershell
npm.cmd test
npm.cmd run check
npm.cmd run db:check
```

The last recorded backend suite run passed 61 tests. Coverage includes environment/input validation, tenant-scoped updates, pagination, transactional parcel/delivery/voucher flows, onboarding, allowance boundaries, payment signatures/idempotency and company logo validation.

The latest Angular development build passed. Isolated browser checks used dummy frontend accounts and mocked API data. They covered single-header rendering, removal of staff pricing cards, charges layout, compact desktop/mobile sizing, profile/Sign out visibility, Escape and mobile expansion. No real account or payment operations were performed in those checks.

This does not certify a real Razorpay payment, complete production build, full frontend unit/E2E suite, complete security audit, live-database concurrency/load behavior or backup/restore.

The historical AppComponent unit test may still expect CRM16 even though the title is now CargoNest. Reconcile old expectations before treating the entire frontend suite as a release gate.

## 17. Deployment and operations

Required deployment pieces:

- Transaction-capable MongoDB.
- A backend Node process with private runtime secrets.
- An Angular static build with SPA fallback to index.html for deep links.
- HTTPS and secure owner-cookie handling.
- Correct API URLs and explicit frontend CORS origins.
- Genuine payment credentials, capture settings and a public webhook endpoint.
- Data/index migration, backup and restore procedures.

Angular production uses output hashing, optimization and configured bundle/style budgets. Run a production build and resolve its actual results before release: a development build is not production certification.

The configured frontend output is dist/crm16. .frontend-build-check is temporary verification output, not a permanent hosting contract.

Production backend disables autoIndex. The database preflight is read-only: it checks topology, selected records missing company ownership and declared/existing indexes. It does not migrate records or create indexes.

Keep /owner/ on the backend origin. Proxies must forward owner APIs and the payment webhook correctly, preserving raw webhook bytes. Monitor startup failures, health, transaction failures, payment confirmation/webhooks and suspicious authentication attempts.

Back up business data and index definitions, and test restoration. Do not include credentials in logs, screenshots, documentation or exports.

## 18. Troubleshooting

| Symptom | Check/action |
| --- | --- |
| Owner login 503 | Owner email, bcrypt hash and secret length; restart backend |
| Owner reports fail | Database health and valid report dates |
| Checkout unavailable | Dummy/missing keys deliberately disable it |
| Charged but plan inactive | Check payment/reconcile, capture and webhook status before paying again |
| 101st free booking rejected | Expected without active paid access |
| MongoDB transaction errors | Replica-set/sharded topology, not standalone |
| Company token fails on staff API | Use staff login/token |
| Staff cannot renew | Company-owner login initiates payments |
| Duplicate navbar | Set embedded=true on nested search widgets |
| Dropdown/page stops updating | Browser console and empty-value template expressions |
| Deep-link refresh returns 404 | Static-host SPA fallback to index.html |
| Frontend uses wrong API | Both Angular environment files and rebuilt configuration |
| Forgotten password fails without login | Current recovery routes require staff auth; review recovery design |
| Free company cannot access some views | Review legacy companyAccess gates |
| npm blocked in PowerShell | Use npm.cmd or approved shell setup |

## 19. Current limits and follow-up

These are implementation limits or future work, not completed capabilities:

1. Genuine Razorpay test/live completion requires provider credentials and external verification.
2. Monthly renewal is manual; recurring mandates, refunds, chargebacks and tax invoices need separate work.
3. Owner paid-customer metrics need alignment with verified billing.paidUntil; platform-wide subscription revenue reporting remains to be added.
4. Legacy companyAccess/subscription behavior needs reconciliation with the free/paid booking policy across older routes.
5. Recovery endpoints currently require staff authentication, which needs review for public forgotten-password use.
6. Perform a full role/tenant endpoint audit, including subsidiary and legacy paths, before launch.
7. Validate mixed frontend dependency major versions and production build compatibility.
8. Review localStorage sessions and process-local owner login limiting for the hosting/threat model.
9. Directory/CSV exports are not snapshot-isolated during concurrent changes.
10. Complete dedicated concurrency, load, deployment and backup/restore exercises.

Suggested release sequence: genuine payment tests -> multi-company/branch permission tests -> subscription metric/recovery alignment -> production build/E2E checks -> deployment and restore exercise.

## 20. Maintenance guide

Product branding lives in product SVG/favicon assets, auth entry screens and the owner console. Individual company letters are edited in the authenticated company workspace.

For price/allowance changes, review FREE_LIMIT, PRICE_PAISE and PERIOD_MS in services/billing.js, payment validation, UI wording, tests and commercial terms together. Frontend text alone does not change enforcement.

For a new report, define tenant/branch scope, query, pagination, middleware, UI service and empty/error states. Add it to ReportInterceptor only when legacy page merging is intended.

For a role change, update schema, permitted account creation, backend authorization, route guard data and navigation. Hiding a link is not authorization.

Navigation styling lives in src/styles/_workspace-navigation.scss. Behavior/template are in USER/header. Preserve profile-menu interaction, outside-click/Escape and mobile behavior.

When changing booking UI, keep reactive control names and calculation handlers intact. Embedded shipment search must not add another page header.

Historical spellings such as empolyee, expensive and pracel.loading require coordinated path/import/API changes if renamed.

### Supporting references

- docs/billing.md: detailed payment and allowance notes.
- docs/company-branding.md: company branding implementation notes.
- docs/frontend-design.md: shared UI design and browser verification notes.
- docs/owner-dashboard.md: owner setup/report details.
- postman/README.md and postman/REPORT_PAGINATION.md: API tooling and pagination.
- Razorpay integration reference: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
- Razorpay webhook reference: https://razorpay.com/docs/webhooks/validate-test/

This master document reflects the latest requested flow. Older focused documents may describe earlier intermediate behavior; use current source and this document when they differ.

## 21. Mounted API inventory

The inventory below is generated from app.js, routes/index.js and their mounted route files. Commented declarations are excluded. Middleware labels describe direct declarations/inherited router boundaries; they are not a complete authorization audit. Handler behavior must be checked in the controller/service.

### /company

| Method | Path | Authentication boundary |
| --- | --- | --- |
| GET | /company/branding | Company JWT |
| POST | /company/register | No auth middleware in direct declaration |
| POST | /company/login | No auth middleware in direct declaration |
| GET | /company/branches | Company JWT |
| POST | /company/branches | Company JWT |
| POST | /company/subsidiary/register | No auth middleware in direct declaration |
| POST | /company/subsidiary/login | No auth middleware in direct declaration |
| POST | /company/company-access | Company JWT |
| GET | /company/get-companies | Company JWT |
| PATCH | /company/update | Company JWT |
| GET | /company/subsidiaries/:parentCompanyId | Company JWT |
| DELETE | /company/delete/:id | Company JWT |
| POST | /company/subscription | Company JWT |
| GET | /company/check/membership/:companyId | No auth middleware in direct declaration |

Source: routes/company.router.js

### /subadmin-auth

| Method | Path | Authentication boundary |
| --- | --- | --- |
| POST | /subadmin-auth/delete-person | Staff JWT + admin role |
| POST | /subadmin-auth/signup-by-company | Company JWT |
| POST | /subadmin-auth/signup | Staff JWT + admin role |
| POST | /subadmin-auth/login | No auth middleware in direct declaration |
| GET | /subadmin-auth/subadmins | Company JWT |
| GET | /subadmin-auth/employees | Staff JWT |
| GET | /subadmin-auth/profile | Staff JWT |
| PATCH | /subadmin-auth/admin-profile | Staff JWT |
| PATCH | /subadmin-auth/update-profile/:id | Staff JWT |
| POST | /subadmin-auth/change-password | Staff JWT |
| POST | /subadmin-auth/reset-password | Staff JWT |
| POST | /subadmin-auth/forgot-password | Staff JWT |
| DELETE | /subadmin-auth/delete-subadmin | Staff JWT |
| GET | /subadmin-auth/branch-wise/:branchName | Staff JWT |

Source: routes/subadmin.auth.route.js

### /branch

| Method | Path | Authentication boundary |
| --- | --- | --- |
| POST | /branch/ | Staff JWT |
| GET | /branch/ | Staff JWT |
| GET | /branch/branchUniqueId/:branchUniqueId | Staff JWT |
| GET | /branch/subadminUniqueId/:subadminUniqueId | Staff JWT |
| POST | /branch/dateRange | Staff JWT |
| GET | /branch/:id | Staff JWT |
| PATCH | /branch/update/:id | Staff JWT |
| DELETE | /branch/delete/:id | Staff JWT |
| GET | /branch/city/:city | Staff JWT |

Source: routes/branch.route.js

### /booking

| Method | Path | Authentication boundary |
| --- | --- | --- |
| GET | /booking/users | Staff JWT |
| GET | /booking/users/search | Staff JWT |
| GET | /booking/user/:senderMobile | Staff JWT |
| GET | /booking/user/credit | Staff JWT |
| DELETE | /booking/user/delete-phone/:phone | Staff JWT |
| POST | /booking/ | Staff JWT |
| GET | /booking/ | Staff JWT |
| GET | /booking/todaybookings | Staff JWT |
| GET | /booking/grnNo/:grnNo | Staff JWT |
| GET | /booking/adminUniqueId/:adminUniqueId | Staff JWT |
| POST | /booking/search-data | Staff JWT |
| GET | /booking/pages | Staff JWT |
| GET | /booking/fromCity/:fromCity/toCity/:toCity/:vehicalNumber | Staff JWT |
| POST | /booking/get-lrNumber | Staff JWT |
| DELETE | /booking/:id | Staff JWT |
| PATCH | /booking/:id | Staff JWT |
| PATCH | /booking/grnNo/:grnNo | Staff JWT |
| POST | /booking/updateAllGrnNumbers | Staff JWT |
| POST | /booking/delivery-booking | Staff JWT |
| GET | /booking/get-deliveries | Staff JWT |
| PATCH | /booking/update/:id | Staff JWT |
| POST | /booking/cancelBooking/:grnNo | Staff JWT |
| POST | /booking/markParcelAsMissing/:grnNo | Staff JWT |
| POST | /booking/delivery-report | Staff JWT |
| POST | /booking/parcel-booking-report | Staff JWT |
| POST | /booking/all-parcel-booking-report | Staff JWT |
| POST | /booking/parcel-report-serialNo | Staff JWT |
| POST | /booking/parcel-cancel-report | Staff JWT |
| POST | /booking/parcel-booking-summary-report | Staff JWT |
| POST | /booking/parcel-booking-mobileNumber | Staff JWT |
| POST | /booking/regular-customer-booking | Staff JWT |
| POST | /booking/branch-Wise-collection-report | Staff JWT |
| POST | /booking/collection-summary-report | Staff JWT |
| POST | /booking/collection-toPay-report | Staff JWT |
| POST | /booking/all-collection-report | Staff JWT |
| POST | /booking/booking-typew-ise-collection | Staff JWT |
| POST | /booking/parcel-branch-consolidated-report | Staff JWT |
| POST | /booking/consolidated-report-branch | Staff JWT |
| POST | /booking/parcel-branch-wise-gst-report | Staff JWT |
| POST | /booking/sender-receiver-gst-report | Staff JWT |
| POST | /booking/pending-delivery-stock-report | Staff JWT |
| POST | /booking/parcel-status-date-difference-report | Staff JWT |
| POST | /booking/pending-delivery-luggage-report | Staff JWT |
| POST | /booking/parcel-received-stock-report | Staff JWT |
| POST | /booking/delivered-stock-report | Staff JWT |
| POST | /booking/pending-dispatch-stock-report | Staff JWT |
| POST | /booking/dispatched-memo-report | Staff JWT |
| POST | /booking/parcel-incoming-luggages-report | Staff JWT |
| POST | /booking/grnNolrNo | Staff JWT |
| GET | /booking/get-above700 | Staff JWT |
| POST | /booking/sales-summary-branchwise | Staff JWT |
| POST | /booking/summary-report | Staff JWT |
| POST | /booking/branch-account | Staff JWT |
| POST | /booking/acparty-account | Staff JWT |
| GET | /booking/status-wise-summary | Staff JWT |
| GET | /booking/get-total | Staff JWT |

Source: routes/booking.route.js

### /vehicle

| Method | Path | Authentication boundary |
| --- | --- | --- |
| POST | /vehicle/ | Staff JWT |
| GET | /vehicle/ | Staff JWT |
| GET | /vehicle/:id | Staff JWT |
| GET | /vehicle/getVehicleNo/:vehicleNo | Staff JWT |
| PATCH | /vehicle/:id | Staff JWT |
| DELETE | /vehicle/:id | Staff JWT |
| GET | /vehicle/status/:status | Staff JWT |

Source: routes/vehicle.route.js

### /parcel-loading

| Method | Path | Authentication boundary |
| --- | --- | --- |
| POST | /parcel-loading/parcel-loding-load | Staff JWT |
| POST | /parcel-loading/ | Staff JWT |
| GET | /parcel-loading/ | Staff JWT |
| GET | /parcel-loading/:id | Staff JWT |
| GET | /parcel-loading/vocherNoUnique/:vocherNoUnique | Staff JWT |
| GET | /parcel-loading/voucher-details-print/:vocherNoUnique | Staff JWT |
| PATCH | /parcel-loading/:id | Staff JWT |
| DELETE | /parcel-loading/:id | Staff JWT |
| POST | /parcel-loading/updateGrnNumbers | Staff JWT |
| POST | /parcel-loading/get-lrNumber | Staff JWT |
| GET | /parcel-loading/grnNo/:grnNo | Staff JWT |
| GET | /parcel-loading/vehicalNumber/:vehicalNumber | Staff JWT |
| POST | /parcel-loading/offline-parcel-voucher-details | Staff JWT |
| POST | /parcel-loading/parcel-offline-report | Staff JWT |
| POST | /parcel-loading/parcel-status-report | Staff JWT |
| POST | /parcel-loading/parcel-pending-report | Staff JWT |
| POST | /parcel-loading/branch-to-branch-load | Staff JWT |
| POST | /parcel-loading/branch-to-branch-post | Staff JWT |
| POST | /parcel-loading/dispatched-stock-report | Staff JWT |

Source: routes/parcel.loading.route.js

### /multi-router

| Method | Path | Authentication boundary |
| --- | --- | --- |
| POST | /multi-router/cities | Staff JWT |
| GET | /multi-router/cities | Staff JWT |
| PATCH | /multi-router/cities/:id | Staff JWT |
| DELETE | /multi-router/cities/:id | Staff JWT |
| POST | /multi-router/cities/delete-cities | Staff JWT |
| POST | /multi-router/dispatch-types | Staff JWT |
| GET | /multi-router/dispatch-types | Staff JWT |
| GET | /multi-router/dispatch-types/:id | Staff JWT |
| PATCH | /multi-router/dispatch-types/:id | Staff JWT |
| DELETE | /multi-router/dispatch-types/:id | Staff JWT |
| POST | /multi-router/package-types | Staff JWT |
| GET | /multi-router/package-types | Staff JWT |
| GET | /multi-router/package-types/:id | Staff JWT |
| PATCH | /multi-router/package-types/:id | Staff JWT |
| DELETE | /multi-router/package-types/:id | Staff JWT |
| POST | /multi-router/assets | Staff JWT |
| GET | /multi-router/assets | Staff JWT |
| GET | /multi-router/assets/assetType/:assetType | Staff JWT |
| PATCH | /multi-router/assets/:id | Staff JWT |
| DELETE | /multi-router/assets/:id | Staff JWT |
| POST | /multi-router/expenditures | Staff JWT |
| GET | /multi-router/expenditures | Staff JWT |
| GET | /multi-router/expenditures/expenditureType/:expenditureType | Staff JWT |
| POST | /multi-router/expenditures/get-date-range | Staff JWT |
| PATCH | /multi-router/expenditures/:id | Staff JWT |
| DELETE | /multi-router/expenditures/:id | Staff JWT |

Source: routes/multi.router.js

### /extra-charge

| Method | Path | Authentication boundary |
| --- | --- | --- |
| POST | /extra-charge/ | Staff JWT |
| GET | /extra-charge/ | Staff JWT |
| POST | /extra-charge/filter-city-wise | Staff JWT |
| DELETE | /extra-charge/:id | Staff JWT |
| PATCH | /extra-charge/:id | Staff JWT |

Source: routes/extra.charge.route.js

### /parcel-unloading

| Method | Path | Authentication boundary |
| --- | --- | --- |
| POST | /parcel-unloading/parcel-filter-Unloading | Staff JWT |
| GET | /parcel-unloading/grnNo/:grnNo | Staff JWT |
| POST | /parcel-unloading/ | Staff JWT |
| GET | /parcel-unloading/ | Staff JWT |
| GET | /parcel-unloading/:id | Staff JWT |
| GET | /parcel-unloading/voucher/:voucher | Staff JWT |
| POST | /parcel-unloading/filter | Staff JWT |
| PATCH | /parcel-unloading/:id | Staff JWT |
| DELETE | /parcel-unloading/:id | Staff JWT |
| POST | /parcel-unloading/pending-delivery-report | Staff JWT |
| POST | /parcel-unloading/branch-to-branch-unload | Staff JWT |
| POST | /parcel-unloading/branch-to-branch-post | Staff JWT |

Source: routes/parcel.unloading.route.js

### /shiprocket

| Method | Path | Authentication boundary |
| --- | --- | --- |
| POST | /shiprocket/create-order | Staff JWT |

Source: routes/shiprocket.route.js

### /cfmaster

| Method | Path | Authentication boundary |
| --- | --- | --- |
| POST | /cfmaster/ | Staff JWT |
| GET | /cfmaster/ | Staff JWT |
| GET | /cfmaster/search/:name | Staff JWT |
| PATCH | /cfmaster/:id | Staff JWT |
| DELETE | /cfmaster/:id | Staff JWT |
| GET | /cfmaster/city/:city | Staff JWT |

Source: routes/cf.master.router.js

### /cfextra-charge

| Method | Path | Authentication boundary |
| --- | --- | --- |
| POST | /cfextra-charge/ | Staff JWT |
| GET | /cfextra-charge/ | Staff JWT |
| GET | /cfextra-charge/:agentName | Staff JWT |
| PATCH | /cfextra-charge/:id | Staff JWT |
| DELETE | /cfextra-charge/:id | Staff JWT |

Source: routes/cf.extra.charge.router.js

### /voucher-generate

| Method | Path | Authentication boundary |
| --- | --- | --- |
| POST | /voucher-generate/credit-voucher-generate | Staff JWT |
| POST | /voucher-generate/ | Staff JWT |
| GET | /voucher-generate/ | Staff JWT |
| GET | /voucher-generate/:id | Staff JWT |
| PATCH | /voucher-generate/:id | Staff JWT |
| DELETE | /voucher-generate/:id | Staff JWT |
| POST | /voucher-generate/voucher-details | Staff JWT |
| POST | /voucher-generate/voucher-details-print | Staff JWT |

Source: routes/cf.voucher.generate.route.js

### /expensive

| Method | Path | Authentication boundary |
| --- | --- | --- |
| POST | /expensive/expenses | Staff JWT |
| GET | /expensive/expenses | Staff JWT |
| GET | /expensive/expenses/:id | Staff JWT |
| PATCH | /expensive/expenses/:id | Staff JWT |
| DELETE | /expensive/expenses/:id | Staff JWT |
| POST | /expensive/expense-types | Staff JWT |
| GET | /expensive/expense-types | Staff JWT |
| GET | /expensive/expense-types/:id | Staff JWT |
| PATCH | /expensive/expense-types/:id | Staff JWT |
| DELETE | /expensive/expense-types/:id | Staff JWT |
| POST | /expensive/account-cat | Staff JWT |
| GET | /expensive/account-cat | Staff JWT |
| GET | /expensive/account-cat/:id | Staff JWT |
| PATCH | /expensive/account-cat/:id | Staff JWT |
| DELETE | /expensive/account-cat/:id | Staff JWT |
| POST | /expensive/account-subcat | Staff JWT |
| GET | /expensive/account-subcat | Staff JWT |
| GET | /expensive/account-subcat/:id | Staff JWT |
| PATCH | /expensive/account-subcat/:id | Staff JWT |
| DELETE | /expensive/account-subcat/:id | Staff JWT |
| POST | /expensive/customers | Staff JWT |
| GET | /expensive/customers | Staff JWT |
| GET | /expensive/customers/:id | Staff JWT |
| PATCH | /expensive/customers/:id | Staff JWT |
| DELETE | /expensive/customers/:id | Staff JWT |

Source: routes/expensive.route.js

### /bank

| Method | Path | Authentication boundary |
| --- | --- | --- |
| POST | /bank/create | Staff JWT |
| GET | /bank/get | Staff JWT |
| GET | /bank/banks/:id | Staff JWT |
| PATCH | /bank/banks/:id | Staff JWT |
| DELETE | /bank/banks/:id | Staff JWT |

Source: routes/bank.route.js

### /item

| Method | Path | Authentication boundary |
| --- | --- | --- |
| POST | /item/create | Staff JWT |
| GET | /item/get | Staff JWT |
| GET | /item/items/:id | Staff JWT |
| PATCH | /item/items/:id | Staff JWT |
| DELETE | /item/items/:id | Staff JWT |

Source: routes/item.route.js

### /vendor

| Method | Path | Authentication boundary |
| --- | --- | --- |
| POST | /vendor/create | Staff JWT |
| GET | /vendor/get | Staff JWT |
| GET | /vendor/:id | Staff JWT |
| PATCH | /vendor/:id | Staff JWT |
| DELETE | /vendor/:id | Staff JWT |

Source: routes/vendor.route.js

### /branch-report

| Method | Path | Authentication boundary |
| --- | --- | --- |
| GET | /branch-report/:branchCode/live-snapshot | Staff JWT |
| GET | /branch-report/:branchCode/live-status | Staff JWT |

Source: routes/branch.report.route.js

### /billing

| Method | Path | Authentication boundary |
| --- | --- | --- |
| GET | /billing/status | Company JWT (router boundary) |
| GET | /billing/staff-status | Staff JWT |
| GET | /billing/history | Company JWT (router boundary) |
| POST | /billing/orders | Company JWT (router boundary) |
| POST | /billing/verify | Company JWT (router boundary) |
| POST | /billing/reconcile | Company JWT (router boundary) |

Source: routes/billing.route.js

### /api/owner

| Method | Path | Authentication boundary |
| --- | --- | --- |
| POST | /api/owner/login | Owner credentials / login limit |
| GET | /api/owner/session | Owner session cookie |
| POST | /api/owner/logout | Owner session cookie |
| GET | /api/owner/reports | Owner session cookie |

Source: routes/owner.route.js

### Direct application endpoints

| Method | Path | Purpose/boundary |
| --- | --- | --- |
| GET | /health | Public database readiness indicator |
| POST | /billing/webhook | Provider HMAC and payment verification |
| GET | /owner/ | Static login interface; report APIs require owner session |

## 22. Frontend route inventory

Extracted from Angular app-routing.module.ts. The default path is /; ** is the fallback redirect. Individual guard and role declarations remain authoritative.

| Route |
| --- |
| /company-register |
| /login |
| /clogin |
| / |
| /signup |
| /dashboard |
| /booking |
| /parcelloading |
| /bookingreport |
| /printgrn/:grnNo |
| /parcelloadingdata |
| /cancel-booking |
| /parcelunloading |
| /parcelonloadingdata |
| /profile |
| /parcel-branch |
| /barnchtobranchunloading |
| /addpackagestype |
| /searchgrn |
| /gnrnumberstatus |
| /printvouchersdata/:vocherNoUnique |
| /voucherslistoffline |
| /addpackagetype |
| /parcel-delivery |
| /addcfmaster |
| /getcfmasterdata |
| /creditvouchergenerate |
| /voucherdetailscf |
| /voucher-report |
| /dispatchedreport |
| /reportsdashboard |
| /regularcustmer |
| /bookingserial |
| /reports |
| /allpercelbooking |
| /bookingmobile |
| /cancelreport |
| /bookingsummary |
| /collectionreport |
| /Consolidate |
| /gdtreport |
| /gstdata |
| /pending-delivery |
| /collectiondata |
| /parcelstatusdate |
| /datereport |
| /devliveryreport |
| /pendingluggage |
| /receivedstock-report |
| /incoming-report |
| /parcelincomingreport |
| /dispacthed-memo-report |
| /pending-dispatchedStock-report |
| /parcelloading-offlinereport |
| /dispatched-stock-report |
| /report-delivery |
| /create-admin |
| /createemployee |
| /createbranch |
| /adminprofile |
| /createvehicle |
| /createcity |
| /adddispatchtype |
| /addextracharges |
| /employee-dashboard |
| /employee-booking |
| /employee-loading |
| /employee-unloading |
| /employee-branch-loading |
| /employee-parcel-devlivery |
| /employee-parcel-cancel |
| /employee-status |
| /employee-branch-unloading |
| /employee-voucherdetails |
| /todaybooking |
| /employee-printgrn/:grnNo |
| /collection-report |
| /conslidated-report |
| /parcel-status |
| /pending-deliverystock |
| /pending-luggage |
| /dispacthedstock-report |
| /received-stock |
| /deliverystock-report |
| /pendingdispached-stock-report |
| /memo-stock-report |
| /incomingreport |
| /dashboard-report |
| /sub-booking |
| /sub-loading |
| /sub-unloading |
| /sub-branch-loading |
| /sub-branch-unloading |
| /sub-parcelvoucher-details |
| /sub-todaybooking |
| /sub-dashboard |
| /sub-collection |
| /sub-consolidate |
| /sub-datedifferent |
| /sub-pendingdelivery |
| /sub-pendingluaggage |
| /sub-dispatched |
| /sub-received |
| /sub-deliverystock |
| /sub-pendingdispatch |
| /sub-memo-dispathed |
| /sub-incoming-luggage |
| ** (fallback) |

### Inventory totals

- Mounted router endpoint declarations: 234.
- Unique Angular route paths: 108.
- Direct application/static endpoints are listed separately.

End of document.
