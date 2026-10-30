# Report pagination

42 report and loading-list handlers support pagination by default. Existing filter fields remain in the JSON body. Add `page` and `limit` in the query string:

```text
POST {{baseUrl}}/booking/parcel-booking-report?page=2&limit=25
POST {{baseUrl}}/booking/pending-delivery-stock-report?page=2&limit=25
POST {{baseUrl}}/parcel-loading/parcel-offline-report?page=2&limit=25
```

You can also send numeric `page` and `limit` in the JSON body. Query parameters take precedence. Defaults: `page=1`, `limit=25`. The maximum limit is 100; larger limits are capped. Zero, negative, fractional, repeated/array, and nonnumeric values return HTTP 400 before the report queries run. Changing filters should reset the frontend to page 1.

Every successful paginated response includes:

```json
{
  "pagination": {
    "page": 2,
    "limit": 25,
    "totalRecords": 62,
    "totalPages": 3,
    "returnedRecords": 25,
    "hasNextPage": true,
    "hasPrevPage": true,
    "nextPage": 3,
    "prevPage": 1
  }
}
```

The existing report rows keep their field name: `data`, `bookings`, `branches`, `branchwise`, `parties`, `summary`, or the existing nested detail property. Reports that previously returned a raw array now return `{ "data": [...], "pagination": {...} }`. Frontends using those endpoints must read `response.data` instead of treating the complete response as the array.

## Totals and groups

Amount, GST, quantity, booking-type, branch and final-summary totals cover the **complete filtered result**, not just the visible page. Existing `count` fields also keep their full-result meaning. Use `pagination.returnedRecords` for the number of rows displayed now.

For booking-type reports, one page window spans the detail lists in alphabetical group-key order (for example `credit`, then `paid`, then `toPay`). The combined number of detail rows on a page is at most `limit`, not `limit` per group. Group objects and their full totals remain present even when that group has no rows on the current page. Vehicle reports retain their vehicle containers and paginate the contained bookings. A page may therefore contain empty detail arrays in other groups.

For consolidated reports, the page window applies to `BookingTypes` detail rows. City/category breakdowns are full-result summaries. The independent `deliverToPayDetails` table has its own page and navigation metadata under `pagination.sections.deliverToPayDetails` using the same requested page/limit.

Pure scalar reports such as `/booking/parcel-branch-wise-gst-report` and live branch snapshots have no row list to page. Dedicated print endpoints retain their complete printable data.

No matches and pages past the end return HTTP 200 with empty rows. `totalPages` is zero when nothing matches. Going past the last page does not reset full-result totals to zero. For a report with no matches, the response includes `data: []` and empty pagination; existing endpoint-specific empty fields may also be present.

## Database behavior

Booking-type, serial, cancellation, booking-summary, mobile/customer, sender/receiver GST, date-difference, incoming luggage, pending-stock, loading-selection, loading-status, loading-stock and unloading-list reports page their record queries in MongoDB. Full-result sums/counts use separate aggregates or facets. Queries retain company/employee filters and an `_id` tie-breaker in their sort.

Legacy reports that calculate composite branch/vehicle/financial breakdowns in JavaScript calculate those breakdowns first, then page the finished detail rows. Their response size is bounded, but their complete calculation can still use memory proportional to matching records. Pagination does not claim to eliminate all report-processing memory use.

Offset pagination is deterministic for a fixed dataset. Records added or changed between requests can move across pages; counts and page queries are not a transactional snapshot. Financial exports needing an immutable view require a separate snapshot/export workflow.

## Postman

Reimport `cargo-logistics.postman_collection.json` to get `page=1&limit=25` on all covered requests. Each request includes a post-response pagination contract check. Keep using the existing login/token variables. The collection contains 220 requests in total.
