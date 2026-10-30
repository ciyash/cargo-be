# CargoNest billing

Each company receives 100 free bookings once, shared across its branches and staff. Existing bookings count toward this initial allowance. Cancelled bookings remain counted. The free allowance does not reset each month.

A verified Razorpay payment of INR 1,000 (100000 paise) enables unlimited bookings for 30 days. Renewals extend from the later of now or existing expiry. There is no automatic debit. Expiry blocks new bookings once the free allowance is exhausted; existing reports and operations remain available. Company blocking still overrides booking access.

## Configuration

Dummy values are present in .env and .env.example:

- RAZORPAY_KEY_ID=rzp_test_dummy_replace_me
- RAZORPAY_KEY_SECRET=dummy_replace_with_razorpay_test_secret
- RAZORPAY_WEBHOOK_SECRET=dummy_replace_with_webhook_secret

Replace them with valid Razorpay test credentials and restart the backend to test Checkout. Dummy values deliberately disable checkout and cannot activate plans. Secret keys stay on the backend. No internal company ID is sent in Razorpay order metadata.

Set automatic payment capture in Razorpay. Configure payment.captured and order.paid webhooks at your public HTTPS backend URL /billing/webhook, using the same RAZORPAY_WEBHOOK_SECRET. Localhost cannot directly receive Razorpay webhooks. Callback verification and the Check payment action can also confirm captured payments. Test and live credentials must belong to the same Razorpay account as their orders.

## UI

Company login -> Company workspace (/create-admin) -> booking plan and payment history. Only company accounts initiate checkout. Staff booking screen shows usage and directs staff to their company owner for payment. Refresh plan reloads the allowance; successful bookings refresh it automatically.

## Backend

- GET /billing/status: company plan and usage.
- GET /billing/staff-status: staff view of its company's allowance.
- GET /billing/history: latest 50 company payment orders.
- POST /billing/orders: creates fixed INR 1000 order; client cannot set the amount.
- POST /billing/verify: verifies signature against the stored company order, fetches the payment from Razorpay, and requires captured INR 1000 payment.
- POST /billing/reconcile: checks a stored company order after interrupted checkout.
- POST /billing/webhook: validates HMAC against raw bytes and re-fetches the payment.
- POST /company/subscription: retired with 410; self-activation is disallowed.

Booking saves and usage increments share a MongoDB transaction and a company document write so concurrent free bookings cannot exceed 100. Payment activation and order status share a transaction; duplicate callbacks and webhooks do not extend validity twice. MongoDB must support transactions (replica set or sharded cluster), as already required by parcel workflows.

Legacy subscription dates and general access defaults remain unchanged for compatibility. New booking entitlements use billing.paidUntil and billing.freeBookingsUsed; legacy dates do not grant paid unlimited bookings.

Refund automation and automatic recurring mandates are not part of this monthly manual-renewal flow. Razorpay test checkout still requires genuine test credentials; no successful payment is fabricated using dummy keys.

Validation: node --test; Angular development build. Source guidance: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/ and https://razorpay.com/docs/webhooks/validate-test/.
