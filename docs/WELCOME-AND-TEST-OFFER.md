# Welcome bookings and temporary checkout offer

- Each newly registered independent/subsidiary company receives 100 free bookings, once. Company creation, quota initialization and a unique zero-value `grant` event commit in one MongoDB transaction. Request-supplied quota cannot change this allowance.
- `bookingQuota.freeGranted` and `welcomeGrantedAt` distinguish free capacity from paid purchases. Own/franchise booking counts continue to share the company's total allowance.
- The idempotent backfill command `node scripts/grant-welcome-bookings.mjs` grants 100 free bookings to eligible existing companies while preserving purchases, usage and held capacity. The execution for this change found zero existing companies needing a grant after the fresh database reset.
- Current temporary configuration: `BOOKING_PACK_PRICE_PAISE=100`, `BOOKING_PACK_BOOKINGS=1000`, `BOOKING_PACK_TEST_OFFER=true`. Thus INR 1 buys 1,000 additional bookings; an unused welcome allowance plus one successful purchase totals 1,100.
- Checkout creates its amount/count from server configuration. The order stores that snapshot. Only verified captured payment activates it, once; callbacks/retries do not duplicate credit. Previously created orders retain their original price/count.
- The current configured Razorpay credentials are LIVE credentials. They were preserved. Actual checkout charges INR 1; this is not sandbox simulation. Use actual Razorpay test keys locally for sandbox testing. Company billing screens identify this distinction. No payment was submitted during implementation.
- Service-enablement fees remain separate from booking-pack pricing.

Validation covers transactional registration, audit failure rollback, idempotent existing-company grants, server-controlled checkout pricing and captured-payment replay. The database is not populated with artificial test companies/orders by these tests.
