# Security review — 12 November 2026

## Result

**Not yet ready to describe as fully secure or production-ready.** The authentication, tenant/branch isolation, payment, courier and upload controls have regression coverage, but important deployment and dependency risks remain. This was a source/dependency review with mocked security tests, not an independent penetration test or an infrastructure audit.

No existing account passwords or signing keys were rotated. No real password reset emails, payments, courier orders or test bookings were submitted during this review.

## Changes completed

| Finding | Change | Verification |
| --- | --- | --- |
| Public company/staff login endpoints lacked a shared attempt limit. | Added shared login identity/IP limits across the existing login aliases, recovery limits and Retry-After responses. Successful login releases its identity counter. | HTTP tests exercise all four login aliases and rejection after the threshold. |
| Recovery inputs and legacy staff login accepted non-string values. | Reject object/operator-shaped inputs before database queries; enforce a six-digit recovery code and minimum new password length. | Malformed input tests assert no database access. |
| OTPs used Math.random and had no persistent guess budget. | Use crypto.randomInt; atomically limit each issued OTP to five guesses across clients. | Five failed guesses block even a subsequent correct code. |
| Password reset used a read/compare/save sequence that could reuse a code concurrently. | Atomically compare the OTP and previous password hash while updating the password and removing recovery fields. | Concurrent reset and replay tests permit only one password update. |
| Recovery disclosed whether a requested email existed. | Use the same generic recovery response for missing and existing accounts. | Source review; recovery tests do not send actual email. |
| Public subsidiary registration accepted an arbitrary parent company. | Reject public requests attaching a company to another tenant; independent public registration remains supported. | Rejection occurs before company database access. |
| Some password update paths accepted short passwords. | Added minimum length/type checks to recovery, password change, company settings and Admin profile password updates. | Regression tests plus weak company password test. |
| Account creation/update forms logged submitted passwords in console payloads. | Removed the active payload logging statements from the existing Admin/team forms. | Angular compilation check. |
| Production could start with weak signing secrets and an unrestricted default CORS policy. | Production startup now requires distinct signing secrets of at least 32 characters and an explicit list of exact allowed origins. Local development remains supported. | Tests cover short/shared secrets and missing/wildcard origins. |

## Important unresolved findings

### High: current signing secrets need replacement

Presence/length-only checks found that both current JWT_SECRET and COMPANY_SECRET are shorter than 32 characters. Values were not printed or copied into this report. The application currently runs outside production mode, so the new production guard does not rotate or replace these development settings.

Prepare separate cryptographically random secrets and coordinate replacement with the running service. Existing staff/company sessions will require signing in again. A configuration length check alone does not establish sufficient randomness.

### High: `.env` is already tracked by Git

`git ls-files -- .env` confirms tracking despite the ignore rule. Stop tracking environment secrets, assess whether they reached a remote repository or shared copies, and rotate exposed credentials through their owning services as appropriate. Removing the current tracked file does not erase Git history or invalidate an already disclosed credential.

Do not replace COURIER_ENCRYPTION_KEY casually: existing encrypted courier credentials and encrypted database backups depend on it. Encryption-key rotation requires a reviewed decrypt/re-encrypt and backup recovery plan.

### High: dependency security advisories remain

Production dependency audit results from `npm audit --omit=dev`:

| Package tree | Critical | High | Moderate | Total affected package entries |
| --- | ---: | ---: | ---: | ---: |
| Backend | 2 | 7 | 4 | 13 |
| Frontend | 1 | 7 | 10 | 18 |

These are package advisory counts, not 31 independently demonstrated application exploits. Reachability and exploit conditions vary. Backend alerts include the HTTP/upload/mail dependency trees. Frontend alerts include Angular, PDF generation and spreadsheet dependencies. The installed `xlsx` package has no fix available through the current npm audit recommendation.

Dependencies were not changed automatically: several direct fixes require major-version migrations, including Angular and related UI libraries, upload/mail packages, and PDF tooling. Upgrade in isolated steps and verify existing forms, multipart uploads, exports, authentication and payment flows. Development/build-only dependencies were not included in these counts.

### High: password changes do not revoke existing JWT sessions

Current authentication re-reads account existence, role, branch and company block status, which prevents trusting stale elevated role claims. However, there is no account token version or password-change cutoff check. A previously issued stolen token can remain valid until expiry after a password reset. Add tested account-wide session invalidation to every password-changing path before treating recovery as complete incident containment.

### Medium: distributed abuse and production infrastructure

- The new IP/identity rate limiter is per process and resets on restart. A multi-instance deployment needs shared limits or a correctly configured gateway. Do not trust arbitrary forwarded client-IP headers.
- Local configuration has no CORS allowlist. Configure exact deployed origins before production; CORS is not a substitute for authorization.
- Public registration grants free booking allowance without verified email ownership. Consider signup verification/abuse controls before public rollout; the authorized free-booking business rule was not changed.
- HTTPS termination, database network access, database user privileges, backup restore procedures, hosting access and secret distribution were not independently verified here.
- Browser JWT storage remains in localStorage. XSS prevention, dependency updates and avoiding unsafe HTML remain important; this review did not prove every frontend rendering path safe.

## Controls checked and retained

- Staff/Branch Admin cannot use company administration, billing or account creation APIs merely by changing frontend navigation or JWT role claims.
- Authentication re-reads database role/permissions; missing branch assignments for branch roles and blocked/deleted companies/accounts are rejected.
- Booking/report operations retain company and assigned-branch scopes, including the legacy data-scope hooks and historical statement ownership checks.
- Payment verification checks signed webhook bodies, captured status, order ownership, amount/currency and replay-safe quota activation.
- Courier connections remain company-scoped and AES-256-GCM encrypted. Delhivery request hosts are fixed and redirects disabled.
- Logo validation rejects active SVG and checks allowed file signatures and size. Shipment document paths validate content, size and ownership.
- Account JSON serialization removes password/OTP data, including the new OTP attempt counter.

## Validation and release order

156 backend tests pass. Syntax/relative import checks pass for 170 source files. Angular application/template compilation passes after removing sensitive console logging.

Recommended order: remove tracked secrets and assess exposure; coordinate signing/credential rotation; add JWT session revocation; migrate vulnerable dependencies in tested steps; configure HTTPS/CORS/shared abuse controls; then perform staging penetration and recovery testing. No claim is made that this review closes every vulnerability.
