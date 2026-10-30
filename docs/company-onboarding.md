# Company onboarding

1. `POST /company/register` (public): send `name`, `email`, `password` (at least 8 characters). Optional fields: `phone`, `address`, `state`, `customerName`, and multipart `logo`. Creates an independent company; supplied parent company IDs are ignored. The existing monthly trial applies.
2. `POST /company/login` (public): send `email`, `password`. Save the returned `token`; the response also includes the company profile without its password.
3. `POST /subadmin-auth/signup-by-company`: use `Authorization: Bearer <company token>`. Send `name`, `email`, `password`, and `role` (`admin` or `subadmin`). Optional: `username`, `phone`, `address`, `location`, `documents`. A subadmin requires a `branchId` belonging to this company; create the branch first using the existing branch API. Admins do not require a branch. Company ownership comes from the token.
4. `GET /subadmin-auth/subadmins`: use the company token to list the company's admins and subadmins.
5. Staff sign in using `POST /subadmin-auth/login` with `identifier` (email, phone or username) and `password`. Use the returned staff token for staff APIs. Admins can create more staff using `POST /subadmin-auth/signup`.

Existing `/company/subsidiary/register` and `/company/subsidiary/login` endpoints remain available.
