# Delhivery-only courier cleanup

User requested retiring Shiprocket and continuing with Delhivery.

Completed: the old standalone Shiprocket route is unmounted, four Shiprocket-only source files are removed with a verified private restore archive, new courier connections accept Delhivery only, labels/pickups and carrier events reject retired providers, and the old wallet API route is removed. Database preflight found zero Shiprocket bookings, connections or legacy orders; no shipment records were changed or deleted.

Completed with explicit user approval: removed the unreachable retired-provider tracking/cancellation branch from `src/services/shipping.js`, and removed the corresponding old adapter functions from `src/services/couriers.js`. The existing Delhivery state-transition helpers must remain byte-identical:

- `syncDelhiveryTracking`: `dbefbeae7ec4ba2d36263eb464db0ac8975f060d4a43efed82c9d8b003ca4356`
- `cancelDelhiveryShipment`: `0838b550cfaee0563974d96d842ecc22dcd73f6cc450d226a229d847fcef719c`

Before cleanup, both public operations return to those helpers for a Delhivery booking before entering the retired fallback. The connection selector now rejects any provider other than Delhivery. The proposed change removes the retired fallback without changing either helper, own-logistics cancellation, refund/quota transactions, or booking data.

Validation before activation: 18 Delhivery tests and 34 combined courier/logistics regressions passed. Re-run the complete suite after removal; verify both helper hashes are unchanged, unsupported-provider operations fail before writes, and retired routes return 404.

The user explicitly approved the tracking/cancellation cleanup. All 170 backend tests passed after removal, and both Delhivery helper hashes matched their original values. Runtime source contains no Shiprocket integration references. No live courier booking was created during verification.