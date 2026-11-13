# Booking and financial logic review

The findings below describe the original review, before fixes. See [LOGIC-FIXES.md](LOGIC-FIXES.md) for the implementation, confirmed cancellation policy, verification and remaining operational limits. The audit script now runs regression checks rather than expecting the bugs to remain present.

## Outcome and scope

The reviewed code has material calculation and authorization gaps. Passing existing tests does not establish that all business flows are correct. This review covered booking creation and editing, role checks, branch isolation, credit statements, branch balances, and the boundary between legacy booking and the newer shipping workflow. No application business logic was changed during this review.

## Priority findings

### 1. High: legacy booking totals are controlled by the request

`controllers/booking.controller.js:275` checks only that grandTotal is a nonnegative number. The legacy create path does not derive the payable total from authoritative package quantities, prices, and charges. A mocked call to the real controller saved grandTotal 1 for packages totaling 200. A FOC booking also saved a nonzero total of 200. `utils/update-fields.js` also allows financial fields through generic updates (`controllers/booking.controller.js:667`).

Use one server-side calculation policy for both booking paths, explicitly define FOC behavior, and restrict financial edits according to shipment and collection state.

### 2. High: cancellation route receives the wrong permission classification

`services/roles.js:61` matches lowercase cancelbooking against the original case-sensitive route. The registered route is `/cancelBooking/:grnNo` (`routes/booking.route.js:67`). It falls back to shipment-read, which accepts any work permission. A reports-only Staff account passed this authorization gate in the probe. Shipment scope and stage checks still apply later; this finding is about the work-permission gate, not an arbitrary cross-company cancellation.

Normalize the route before classification and add a regression check for the actual registered HTTP method and path.

### 3. High: legacy endpoints do not consistently restrict branches

`controllers/booking.controller.js:398` lists bookings with companyId only. Generic updates also use company/id without consistent branch scope. A Staff account assigned to ORIGIN received an OTHER branch booking through the real list controller with mocked persistence. This is a within-company branch isolation issue; the probe did not demonstrate cross-company access.

Apply the shared shipment visibility and mutation scope to legacy endpoints as well as the newer shipping endpoints.

### 4. High: cancelled bookings can be billed in Credit Statements

`services/voucher-workflow.js:17` rejects already-vouchered bookings and missing agents, but does not reject cancelled bookings or require the credit booking type. Line 29 sums every selected grandTotal. A cancelled credit booking generated a statement charge of 200 in the probe.

Define eligible booking states and types, enforce them inside the transaction, and define how cancellation affects a previously issued statement.

### 5. Medium: Credit Statement screen submits only the first displayed booking

`../crm-frontend/src/app/Branch/Cfmaster/credit-voucher-generate/credit-voucher-generate.component.ts:76` chooses `vldata[0]?.grnNo`; line 101 submits that single value. The table displays the loaded rows, while the backend supports a GRN array. Users can interpret the action as covering the displayed batch although only its first booking is sent.

Provide explicit row selection and submit the selected GRN array, with the selected count and charge shown before generation.

### 6. High: branch closing balance treats booking value as income

`controllers/branch.report.controller.js:17-18` sums grandTotal for today's branch bookings without excluding cancelled bookings or distinguishing uncollected ToPay/credit amounts. Line 28 uses that sum directly in closingBalance. The query does not derive income from actual payment/collection records. This makes a cash balance unreliable.

Separate booked revenue from actual collections. Calculate cash closing balance from the opening balance plus recorded receipts minus expenses, with defined payment modes and reversal behavior.

## Additional static findings

- Receiver GST can be lost in the old parcel form: the control is receiverGst, but payload construction reads receiverGST (`parcelbooking.component.ts:378,435`), and the same-as-sender patch uses the mismatched key too.
- The newer own-shipment delivery creation in `services/shipping.js` omits deliveryBranchName, while legacy branch collection reports group deliveries by that field. Such deliveries can appear under a missing/unknown branch.
- External booking reserves quota before fetching the courier connection in `services/shipping.js`. The connection lookup occurs outside the following provider-call try/catch. If it fails after reservation, a pending shipment and held quota can remain. Reconciliation/cancellation paths need an explicit safe resolution for a confirmed pre-provider failure. This was identified by control-flow inspection, not a live provider failure test.
- Legacy and newer booking paths do not share all calculation and validation rules. They need a common policy rather than separate fixes to each screen.

## Verification and limits

- Existing backend suite: 91 tests passed.
- Backend source checks: 148 checked, zero failures.
- Frontend `npm run typecheck`: passed.
- `node scripts/audit-logic-probes.mjs`: reproduces six observations using real functions/controllers with mocked model operations: cancellation permission classification, writable financial fields, branch listing scope, client grandTotal trust, nonzero legacy FOC, and cancelled-booking statement charges. The script never connects to the live database.
- No live MongoDB transaction/concurrency test, live Shiprocket booking, live payment, or full browser acceptance run was performed. Static findings are distinguished from reproduced issues above. This is a targeted review of important flows, not a claim that every code path has been verified.

Recommended order: close permission and branch gaps; centralize server-side totals; correct statement eligibility and cash balances; then fix statement selection and remaining legacy/new-flow differences.
