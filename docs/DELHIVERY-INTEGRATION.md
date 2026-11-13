# Delhivery integration

## Where to configure

Sign in as Company Admin and open **Company setup → Courier Services** (`/workspace/services`). This screen is also linked from the existing company setup navigation. Branch Admin and Staff cannot change provider credentials or branch mappings.

1. Obtain an API token through Delhivery One **Settings → API Setup**. The portal login password is not an API token; no portal password is saved in this integration.
2. Choose the token's environment: staging or production. Enter the registered Delhivery client name, seller GSTIN and a valid origin PIN. **Test & save connection** verifies authenticated shipping-rate access and stores the token encrypted under the signed-in company.
3. Under **Branch pickup locations**, map each CRM branch to the exact case-sensitive warehouse name already registered in Delhivery One. The branch city, PIN and address must match that registered pickup location. Saving a mapping does not create a warehouse at Delhivery.
4. Company service enablement remains separate from credential setup. Configure `DELHIVERY_ENABLEMENT_PAISE` with the approved platform fee and complete the existing verified service payment flow before enabling bookings. No fee amount or successful payment is fabricated. Connecting an account does not automatically grant paid entitlement.

The local missing `COURIER_ENCRYPTION_KEY` was initialized securely. Its value was not printed. Preserve/back up this key; changing it makes saved courier credentials unreadable. No Delhivery account was connected and no live orders were submitted during implementation: an API token and account-specific warehouse/client/GST details are still required.

## Booking and operational flow

- The existing own-network branch coverage check runs first. A complete own route uses own logistics. Without own coverage, new domestic external bookings offer **Delhivery Surface / Express**, ordered by the returned estimate. Other couriers are not offered for new bookings. Existing Shiprocket records retain their historical tracking adapter.
- The current verified adapter supports domestic India and one physical parcel per booking. Enter its actual total weight in kg and outer dimensions in cm. Multiple products may be combined inside that physical parcel. Multi-piece consignments and international external shipments return a clear unsupported message.
- Prepaid destination serviceability is checked before rates. API rate estimates are based on entered weight; final billed/volumetric weight and provider adjustments may differ. Quote amount, time, quoted weight and estimate flag are saved with the shipment.
- Enter HSN and seller invoice reference. For declared goods value above INR 50,000, supply the actual 12-digit goods e-waybill. The CRM's legacy generated EWB reference is never substituted for a statutory goods e-waybill.
- Booking allocates and saves a provider AWB before manifestation. Company/franchise capacity is held transactionally before the external request. Confirmation consumes the hold; known auth rejection releases it. A timeout or potentially partial provider rejection retains the existing AWB and hold for reconciliation rather than creating a duplicate shipment.
- Shipment details provide confirmation check, tracking timeline, packing-slip-based printable Code 128 label, scheduled pickup, and cancellation. Pickup needs an explicit future date/time. Duplicate pickup requests are blocked until the recorded outcome is checked; ambiguous outcomes direct the operator to Delhivery One.
- Cancellation refreshes provider tracking first and blocks parcels already picked up/in movement. A pre-pickup carrier cancellation restores booking quota and reverses full paid freight once. A provider request acknowledgement alone is insufficient: cancellation must be visible in provider tracking before local restoration.
- Reports retain existing shipment navigation and add Delhivery filtering, courier/AWB columns, pagination and CSV export. Each company and branch keeps its existing access restrictions.

## Wallet and labels

No unverified wallet endpoint or artificial balance is shown. **Open wallet / recharge in Delhivery One** opens the official portal. Provider packing-slip JSON is rendered as an escaped printable HTML label with a local Code 128 barcode. No token or raw provider response is exposed in the label. Validate the account's label/layout and operational contract during live UAT.

## Verification

The repository-owned backend test runner excludes temporary Chrome profile/extension test files. New tests cover encrypted tenant connections, fixed provider hosts, secret redaction, PIN serviceability, estimates, units, encoding, AWB/reference checks, document requirements, partial failures, pending quota reconciliation, pickup locking, cancellation and label escaping. Browser QA uses explicit mocked API fixtures; it does not log in to the user's Delhivery account or send real orders.

Verified: 125 repository tests passed, Angular production build passed, and the mocked browser suite covered connection setup, warehouse mapping, own/Delhivery booking, reports and mobile layouts. Existing style-size/CommonJS warnings are nonblocking.

Production token verification, real warehouse validation, actual rates, pick-up operations and real cancellation/label acceptance remain account UAT steps. Neither existing CRM data nor provider tokens were rotated or migrated.

## Official contracts used

- [API token setup](https://help.delhivery.com/docs/api-token-generation)
- [Client developer portal](https://help.delhivery.com/home/docs/client-developer-portal-1)
- [PIN serviceability](https://delhivery-express-api-doc.readme.io/reference/testpin-codes)
- [Shipping charge estimates](https://delhivery-express-api-doc.readme.io/reference/invoice-shipping-charge-api)
- [Waybill allocation](https://delhivery-express-api-doc.readme.io/reference/fetch-waybill)
- [Manifestation](https://delhivery-express-api-doc.readme.io/reference/order-creation-api)
- [Tracking](https://delhivery-express-api-doc.readme.io/reference/order-tracking-api)
- [Cancellation](https://delhivery-express-api-doc.readme.io/reference/cancel-order-api)
- [Pickup requests](https://delhivery-express-api-doc.readme.io/reference/pickup-request-creation-api)
- [Packing slip](https://delhivery-express-api-doc.readme.io/reference/packing-slip-api)
