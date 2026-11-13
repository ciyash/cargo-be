# Three-role activation review

Implemented business roles: **Company Admin**, **Branch Admin**, **Staff**. Existing accounts and password hashes are retained. Historical Accountant/Driver/Supervisor roles map to Staff with their work permissions preserved. The user explicitly approved activation; the Company Admin authorization handler and unified `/auth/login` endpoint are active in source.

Activated changes:

1. In `config/company.auth.js`, export `companyAuth` instead of `legacyCompanyTokenAuth`. The reviewed handler uses `workspaceAuth` to re-read the current account role and company blocked state, then requires Company Admin. This allows delegated Company Admin accounts to use company settings/subscription endpoints. Branch Admin and Staff remain denied. Existing company registration accounts remain Company Admin.
2. In `app.js`, import `unifiedLogin` from `controllers/unified-login.controller.js` and mount `app.post('/auth/login', unifiedLogin)` after JSON parsing. Existing login URLs remain available for compatibility. No data migration or passwords are changed.

Risk: switching a shared company authorization boundary can affect access to existing company pages and payments. Tests in `test/roles.test.js` cover existing company login, legacy staff role mapping, stale elevated JWT claims, branch assignment, company blocking, deleted users, expired sessions, login account selection, and Branch Admin denial versus Company Admin acceptance. The current default company auth can be restored by reverting the export line. Rollout should use a staging replica set and actual existing-account smoke checks before production deployment.

## Usage

- Latest approved UI flow: company registration credentials use the separate `/clogin` page and open the company setup portal at `/create-admin`. Company logo, subscription/payments, branch creation and admin/team creation are organized into focused sections. Admin/Staff accounts use `/login` for daily work. The unified backend endpoint remains available for compatibility; the frontend now chooses the explicit company/staff endpoints to avoid confusing the two entry points.
- Company Admin lands on the existing `/dashboard`. Branch Admin and Staff land on `/workspace/dashboard` with their role name and permitted menus.
- Existing Settings → Team & permissions (`/createemployee`) and Workspace → Team & permissions (`/workspace/team`) expose the same three role names. Staff permissions cover bookings/cancellation, loading/dispatch, unloading/delivery, accounts and reports.
- Company Admin can create all three roles. Branch Admin can create/edit Staff only in their own branch and can grant only work permissions they have. Role, branch and permission changes are checked on the server.
- Branch Admin and Staff assignments use **City → Assigned branch** in company setup and team create/edit forms. City options come from the accessible company branch directory. Changing city clears the previous branch; the dropdown includes every accessible branch in that city. Branch Admin creating Staff still sees only their own assigned branch. Company Admin needs no branch assignment. Submitted `branchCity` is validated against the chosen branch and company on the backend; the city is derived from the branch rather than stored twice on the Staff account.
- Permissions are read from the database on authenticated API calls. A stale token cannot retain an old admin role. Workspace context refreshes the frontend's current permission state.
- Storage keys `admin`, `subadmin`, `employee` are retained for compatibility. Old stored roles remain readable; new accounts are normalized into those three keys. `company` in existing company JWTs describes the credential store, not a fourth business role. There is no bulk production database migration in this change.
- Existing booking form and operations pages are preserved. Company registration accounts can also create bookings as a company actor; no fictional staff ID is used.

Validation: 89 backend tests pass; syntax/import checks pass; production Angular build passes with existing non-blocking style/CommonJS warnings. Browser checks use explicitly mocked APIs, not production credentials or live courier/payment transactions. A live database/account smoke test remains a deployment check.
