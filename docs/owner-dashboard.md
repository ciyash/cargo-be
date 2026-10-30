# Platform owner dashboard

Open `/owner/` on the backend origin (for example `http://localhost:4000/owner/`). The dashboard frontend is served directly by Express, so no Angular build or separate frontend deployment is needed.

Set these values in the backend runtime environment, then restart:

- `OWNER_EMAIL`: your private owner email.
- `OWNER_PASSWORD_HASH`: bcrypt password hash. Run `node scripts/hash-owner-password.mjs`, supply a password of at least 12 characters through stdin and end input; copy the resulting hash. Avoid putting plaintext passwords in shell arguments or history.
- `OWNER_SECRET`: a separate random secret of at least 32 characters. For example, generate with `node --input-type=module -e "import {randomBytes} from 'node:crypto'; console.log(randomBytes(48).toString('hex'))"`.

There is no public owner registration. Missing configuration disables owner APIs. Production requires HTTPS for the secure session cookie. Sessions expire after one hour. Sign out clears the cookie. Owner credentials and signing keys are separate from company and staff credentials.

Reports provide all-time company counts, independent versus subsidiary counts, active and blocked subscription counts, all-time branches, registrations and bookings within a UTC date range, booking freight value, registration trend, searchable company directory with pagination, and CSV export of all matching companies. Date ranges are limited to 366 days. Directory date filters apply to booking usage, while the directory includes companies registered at any time. Subscription status reflects the current time. Freight value is not platform revenue; billing revenue is not available in the existing model.

Endpoints: `POST /api/owner/login`, `GET /api/owner/session`, `POST /api/owner/logout`, `GET /api/owner/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&search=&status=active&page=1`. Status may be active, expired or blocked. Reports require the owner session cookie and exclude company passwords and logos. Login permits five attempts per IP per 15-minute window in each server process; clustered deployments should enforce a shared login limit at the gateway.

CSV exports fetch pages sequentially; concurrent registrations may change the directory while an export is running. No subscription payment totals are inferred.
