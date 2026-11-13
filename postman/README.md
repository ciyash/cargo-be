# Cargo Logistics API testing

Import `cargo-logistics.postman_collection.json` into Postman. It contains the current 17 routers mounted by `src/routes/index.js`, plus `/health` (225 generated requests total). Requests contain sample JSON, URL parameters, query parameters where used, and the authentication required by their route. Unmounted routers such as `all.route.js`, admin/user modules and voucher collection are excluded because the server does not expose them.

## Setup

1. Start the backend with `npm.cmd start`. It needs your existing MongoDB connection and JWT secrets configured. The default URL is `http://localhost:4000`; there is no `/api` prefix. If your server uses a different port, change the collection variable `baseUrl`.
2. Open the imported collection's **Variables** tab. Set `companyEmail`, `companyPassword`, `identifier` (staff email, username or phone), and `password` to your test credentials.
3. Send **POST /company/subsidiary/login**. Its post-response script saves `companyToken` into collection variables.
4. Send **POST /subadmin-auth/login**. Its post-response script saves the staff `token`. Company tokens and staff tokens are different and cannot be interchanged.
5. Fill in IDs and sample fields before sending the remaining requests. Send individual requests: the collection includes deletes, password changes, subscription changes, booking updates.

For a new test account, register a company, log in as that company, then use `POST /subadmin-auth/signup-by-company` to create an `admin`. Log in as the admin to create branches and employees. For employee signup, set `role` to `employee` and supply `branchId`. Some operations require an employee with a branch or a specific role.

## IDs and request data

- `id`, `companyId`, `branchId`, `agentName` (CF charge creation), and category IDs must be real MongoDB ObjectIds. The generic `id` variable must be changed to the record relevant to each request.
- `pickUpBranch` and `dropBranch` in booking creation are **branchUniqueId values**, not MongoDB IDs. Use two existing branches. `branchId` in staff signup is the branch MongoDB `_id`.
- Replace `grnNo`, `lrNumber`, voucher numbers, branch names/codes, dates and city values with existing test data. Array bodies contain numeric `1001` as an example GRN; edit it directly before sending.
- Dates default to October 2026. Change the date variables to match your records.
- Booking types are `paid`, `toPay`, `credit` and `FOC`. Credit bookings require an agent. Package arrays include their own quantity and pricing.
- Company registration and update accept JSON without a logo. To upload a logo, switch to **Body > form-data**, add the same text fields, add `logo` as a **File**, and remove the explicit `Content-Type` header so Postman supplies the multipart boundary. Omit `parentCompanyId` for a top-level company.
- The optional environment file sets only `baseUrl`; tokens and other settings are collection variables. Avoid creating empty environment variables with the same names, which would override collection values.

## cURL

Report requests now include `page=1&limit=25`. See [report pagination](REPORT_PAGINATION.md) for metadata, grouped reports, limits and response changes.

`curl-commands.md` contains one importable cURL command for each request. Copy a command into **Postman > Import > Raw text**, replacing `REPLACE_...` values first. Commands use Bash quoting; import them into Postman on Windows. JSON bodies in the collection are the easier way to work with Postman variables.

## Backend behavior relevant to testing

- `POST /subadmin-auth/delete-person` requires a staff admin token and an explicit `id` in the JSON body.
- `GET /subadmin-auth/branch-wise/:branchName` accepts the URL parameter.
- Bank, item, vendor, branch reports and Shiprocket now require a staff token. Company-management listing/deletion requires a company token.
- Loading/unloading require distinct GRN arrays with matching LR arrays and an appropriate current booking status. Branch transfer loading supports booked or unloaded stock. Delivery requires an unloaded booking at the authenticated branch.
- Parcel, delivery and voucher writes require MongoDB transactions: use a replica set or sharded cluster.
- `DELETE /subadmin-auth/delete-subadmin` deletes the currently authenticated staff account, taking its ID from the token.
- Shiprocket forwards the JSON to the external provider. Its sample is a starting template and needs a configured Shiprocket account and valid pickup location; provider validation may require further fields.

The collection reflects the backend fixes described in `../BACKEND_REVIEW.md`. It has not been executed against a running database or Shiprocket. Legacy financial records need a reviewed `companyId` backfill before the scoped endpoints will return them.

## Regenerate

Run `node postman/generate.mjs` from the repository root after changing routes. Review generated examples against controller validation when updating APIs.
