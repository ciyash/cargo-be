# Logic fixes

This change updates the existing backend and Angular frontend. It does not replace the frontend or modify existing accounts, subscriptions or live shipment records.

## Financial rules

- Both booking APIs derive package totals from quantity × unit price, round monetary inputs and totals to two decimal places, and include service, hamali, pickup, delivery and entered GST amounts. Client-supplied totals are ignored. FOC payable freight is zero; declared goods value is separate.
- The existing parcel form sends receiver GST with the correct control name and API property. Its GST amount field is bound to the form and included in the payload and displayed total. Tax rates are not invented; this field records the entered tax amount.
- Generic edits can change permitted contact details or remarks before loading. They cannot change freight, booking type, credit party, package prices, collection/refund amounts or statement flags. Issued statements cannot be directly overwritten or deleted.
- Only To Pay freight is collected during delivery, and full freight must match. Paid, credit and FOC delivery collection is zero. Delivery records include destination branch metadata. Branchless Company Admin accounts can use legacy delivery with the parcel's actual branch.

## Confirmed cancellation policy

- Before loading/pickup, cancellation restores consumed quota or releases a pending hold once. Repeated cancellation does not restore it again. Loading/pickup locks cancellation.
- Paid cancellation records full freight as refundAmount automatically. The UI shows a full prepaid reversal rather than asking the operator to invent a cancellation fee.
- A billed credit booking is removed from its statement in the cancellation transaction. Its charge is reduced, cancelled GRNs remain as history, and an empty statement is marked void. Inconsistent statement history blocks cancellation for reconciliation rather than silently destroying it.
- This is the logistics accounting reversal. No bank/payment-provider refund is initiated by this change.

## Branch access and statements

- Mixed-case legacy routes are normalized before permission classification; reports permission cannot authorize cancellation.
- Legacy booking/delivery queries and aggregations carry company and branch scope through authenticated request context. Search OR clauses remain intact. Company Admin remains company-wide; Branch Admin and Staff see their branch's relevant shipments.
- Loading, unloading and expenses receive branch scope. Expenses reject invalid amounts and invalid/cross-company branch reassignment.
- Statements accept only eligible confirmed credit bookings belonging to the operator's booking branch. New statements group by party and origin branch. The screen selects rows, displays their count/total and submits all selected GRNs as an array.
- Historical statements without originBranch are resolved through their bookings, never duplicated display names. Historical mixed-origin statements remain visible to Company Admin; authorized cancellation can reverse its own line without exposing other branches' contents.

## Balances and provider failures

- Branch net receipts = prepaid receipts + delivered To Pay receipts − full prepaid cancellation reversals. Uncollected credit/ToPay booking value is not income.
- Cancellation reverses on its cancellation day. Opening balance derives from recorded prior movements and the branch starting balance, so missing/stale daily snapshots do not lose movements. Day boundaries use India time.
- A statement is a receivable, not a cash receipt. There is no monetary credit-settlement ledger in the existing codebase; reports do not fabricate credit receipts from statement generation.
- Courier connection is checked before reservation. Known authentication/detail rejection releases held capacity. An order timeout retains its hold for reconciliation to prevent duplicates. These outcomes have mocked adapter regression coverage.

## Verification and limits

Verified: 107 backend tests passed; Angular production build passed. Browser checks against that production build verified selected-GRN statement submission, correct To Pay delivery endpoint/amount, and full prepaid cancellation display, using mocked APIs. Existing style-size/CommonJS build warnings remain nonblocking.

`node scripts/audit-logic-probes.mjs` runs the added logic regression checks using mocked DB/HTTP operations.

Live MongoDB transaction/concurrency validation, real courier orders/wallets and payment refunds were not exercised. Historical incorrect amounts are not silently rewritten; those require reconciliation against source receipts and issued statements.
