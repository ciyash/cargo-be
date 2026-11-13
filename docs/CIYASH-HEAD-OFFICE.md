# Ciyash head office dashboard

Open `http://localhost:4000/owner/` with the backend running. This uses the existing private owner login (`OWNER_EMAIL`, `OWNER_PASSWORD_HASH`, `OWNER_SECRET`), not a logistics company's Admin account. No new role is added to the company account enum.

The page reads `/api/owner/reports` after owner authentication. It does not create or alter company, payment, booking or quota records.

- Overview: registered companies, companies with usable quota, exhausted/blocked companies, booking activity and current quota totals.
- Companies: search, booking-access filter, pagination and CSV with purchased/granted, used, held and available bookings; own/franchise network counts.
- Network: own and franchise branch totals, franchise allocated/used quota, external/international/cancelled booking activity.
- Courier service: Delhivery staging and production connections, with service enablement tracked separately.
- Payments: captured platform booking-pack/service payments by currency and recent orders. Pending/uncaptured orders do not count as captured payments. Franchise commercial amounts and customer freight do not count as platform revenue.

Dates are UTC. Company/network/quota balances are current totals; activity and payments use the date range. Search/status filters affect the company directory and its CSV. Payment totals use `paidAt`, even if the order was created before the selected range. Collections are before payment fees/refunds. The current Razorpay configuration is labelled; historical records do not store a reliable test/live environment, so changing keys does not reclassify past payments.

Verification: `node --test test/owner-dashboard.test.js`, `node scripts/run-tests.mjs`, `node scripts/check-source.mjs`, `node scripts/qa-owner-ui.mjs` (isolated mocked APIs, desktop/mobile/login/search/logout). `docs/ciyash-owner-dashboard-preview.png` is a visual preview with mocked data, not production figures.
