# Company and franchise logistics implementation

The production backend is this repository. The Angular frontend is `../crm-frontend`.
The old public HTML demo is a separate demonstration and does not run these APIs.

## Open locally

1. Configure backend `.env` using `.env.example`. Use a MongoDB replica set or sharded cluster; standalone MongoDB cannot execute atomic booking/quota transactions.
2. Run `npm install`, `npm run check`, `npm test`, then `npm start` here.
3. In `../crm-frontend`, run `npm install` and `npm start`. Development API base is `http://localhost:4000`; set CORS for the frontend origin.
4. Company login opens the workspace. Direct authenticated route: `/workspace/dashboard`. Booking route: `/workspace-booking`.

## Screens and navigation

Company login → company settings (domestic/international/both) → subscription & quota → branches & franchises → admins & staff → courier services → new booking.

New booking: Route → sender and receiver → packages and international declaration → coverage and rates → review and confirm → shipments & tracking.

An exact destination postal coverage match in the company network offers own logistics first. The company branch directory supplies pickup/destination branch IDs; the caller cannot submit an unrelated company branch. If no complete own route exists, only the company's purchased, connected supported external provider can return rates. Staff use their assigned origin. International own routes require a destination in another country, declaration, invoice/HS code and document attachments.

Own logistics: booked → loaded → dispatched → unloaded → delivered. The origin operates loading/dispatch; the destination operates unloading/delivery. Loading locks cancellation. To Pay delivery requires the complete freight amount.

Shipments & tracking includes provider reconciliation, AWB assignment, API tracking refresh, pickup request, label and pre-pickup cancellation. An ambiguous provider result stays pending: check/reconcile the existing CRM booking; do not create a replacement. Tracking webhooks re-query the provider and never accept a supplied delivery/cancellation status as authoritative.

Reports share company/branch scope and support booking-date range, category, own/external service, branch, status and search. Totals cover the full filtered result, not just the visible page. CSV exports all filtered pages (up to 100,000 records). The quota ledger records purchases, reservations, consumption, releases, restoration and franchise allocations. Subscription payment history is separate from customer freight and provider wallet balances. Existing detailed CRM reports remain available to staff.

## Quota and payment rules

- Default example pack: ₹5,000 buys 10,000 company bookings. Server environment config controls price/count. An order stores its own immutable price/count; changing config does not alter a pending order.
- Only verified, captured Razorpay payments grant quota or enable a company courier service. Checkout callbacks and webhooks are idempotent. Company staff cannot purchase using a staff token.
- Franchise allocation records manual amount/reference and arbitrary booking allowance. It does not consume company quota. A franchise booking consumes both shared company quota and franchise allowance.
- External creation reserves capacity before the network request. Confirmed creation consumes the reservation; a definitive rejection releases it. Unknown results hold it until reconciled.
- Pre-load own cancellation and provider-confirmed pre-pickup external cancellation restore once. Pending cancellation does not restore. Cancellations after loading/pickup are blocked.
- No quota means no new bookings; processing existing parcels remains possible.

## Shiprocket test-account configuration

Create/use a Shiprocket API user for each company's account. Set `COURIER_ENCRYPTION_KEY` to a securely generated 32-byte hex key before connecting. Credentials and authentication tokens are stored using AES-256-GCM and are excluded from normal API responses. Keep the encryption key stable and backed up; changing it requires reconnecting accounts.

Configure `SHIPROCKET_ENABLEMENT_PAISE` with Ciyash's actual separate enablement fee. Use Razorpay test keys for test purchases; the fee has no invented default. After purchase, company Services → Connect accepts the API-user email/password. Do not send credentials through chat or commit them. Each origin branch needs its exact registered Shiprocket pickup-location name. Domestic quotes/creation currently support one physical parcel per external shipment, with total weight and outer dimensions.

The adapter follows the [official Shiprocket API documentation](https://apidocs.shiprocket.in/) for authentication, serviceability, adhoc order creation, order reconciliation, AWB assignment, tracking, wallet balance, pickup, labels and cancellation. Provider reference includes company identity to separate company records. Wallet shows the last retrieved actual balance and timestamp; recharge opens the provider portal. There is no simulated wallet or local deduction of provider funds.

Set a random `CARRIER_WEBHOOK_SECRET` of at least 32 characters; configure provider tracking callbacks to `/carrier-events/<companyId>` with `x-api-key`. Use public HTTPS for provider callbacks. Razorpay webhook remains `/billing/webhook` if that is the mount configured in `app.js`; confirm the deployed route before configuring the provider.

Important: a test account is not evidence that Shiprocket supplies an isolated sandbox for every endpoint. Confirm its test-order procedures before creating orders or requesting pickups. No live account request or shipment/payment has been made during implementation. DTDC direct APIs and Shiprocket international rates/creation remain explicitly unavailable until their account-specific API documentation and capabilities are verified. International own-network bookings are implemented.

## Existing-data rollout

Back up both repositories and the database. Run `node scripts/logistics-preflight.mjs` against the deployment database to inspect topology, legacy records and indexes without modifying data. After reviewing duplicates, `node scripts/logistics-preflight.mjs --create-indexes` creates declared indexes; it does not drop indexes. Review collection/index sizes before deploying.

Existing billing expiry/free-booking fields never grant an unlimited plan or silently convert into a booking pack. Existing companies require reviewed opening quota or a verified pack purchase. Decide opening balances from the actual commercial agreement before deploying; this implementation does not invent credits or alter the production database. Historical bookings without a quota state must not restore credits on cancellation. Defaults treat old branches as own branches; confirm postal coverage and operating categories with each company before routing new shipments. Do not retroactively count old shipments without an agreed reconciliation.

Unique company/request-key, quota-event operation-key and company/provider indexes are required for replay protection. Never drop them. Deploy backend and frontend together; the old external create-order endpoint returns 410 to prevent bypassing the new quota workflow.

## Validation

`npm test` passes 78 checks covering transactional quota transitions, franchise allocations, payment replay, credential encryption, input validation, actual cancellation/loading locks, numeric provider tracking status and existing CRM workflow/report boundaries. Mocks verify application behavior; they do not prove database rollback or a live provider contract. Run the preflight, a disposable replica-set end-to-end suite, and approved test-account scenarios before production rollout. Frontend typechecking and the production Angular build pass (non-blocking stylesheet-size and existing CommonJS warnings remain).

`node scripts/qa-logistics-ui.mjs` serves the production build in hidden Chrome and uses explicitly mocked API responses. It checks ten workspace pages, wallet display, own FOC/external booking, request keys, report rows and mobile widths. It does not call the live backend or Shiprocket. Screenshots: `docs/logistics-workspace.png` and `docs/logistics-booking-mobile.png`.
