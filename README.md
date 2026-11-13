# CargoNest backend

The active logistics backend lives in `src/`. The Angular frontend remains in the sibling `../crm-frontend` project.

```text
cargo-logistics/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app.js          Express setup, middleware order and route mounting
â”‚   â”œâ”€â”€ server.js       Configuration, database startup and graceful shutdown
â”‚   â”œâ”€â”€ config/         Environment validation and configuration
â”‚   â”œâ”€â”€ middleware/     Authentication, company access and request scope
â”‚   â”œâ”€â”€ routes/         Existing HTTP endpoints
â”‚   â”œâ”€â”€ controllers/    Request validation and HTTP responses
â”‚   â”œâ”€â”€ services/       Booking, parcel, billing, courier and role workflows
â”‚   â”œâ”€â”€ models/         Mongoose schemas, references and indexes
â”‚   â””â”€â”€ utils/          Shared validation, pagination and response helpers
â”œâ”€â”€ test/               Automated backend tests
â”œâ”€â”€ scripts/            Checks, migrations and read-only verification tools
â”œâ”€â”€ public/             Owner portal static assets
â”œâ”€â”€ postman/            API collection generation and artifacts
â”œâ”€â”€ docs/               Workflow, implementation and migration documentation
â”œâ”€â”€ prototypes/         Existing demo workflows
â”œâ”€â”€ app.js              Compatibility export for existing imports
```

HTTP requests follow `routes â†’ middleware â†’ controllers â†’ services â†’ models`. New business rules should live in services so they can be checked without duplicating request handlers. Existing large report controllers remain in place; this structure change does not change their calculations or endpoints.

## Run and check

Use the project root as the working directory. Configure the existing root `.env` using `.env.example`; never commit credentials.

```powershell
npm.cmd start        # nodemon src/server.js
npm.cmd run dev      # nodemon src/server.js
npm.cmd run start:prod # node src/server.js
npm.cmd run check    # syntax and relative imports
npm.cmd test         # backend behavior and authorization tests
```

Start with `npm.cmd start` or `node src/server.js`. `/health` reports database readiness. Frontend/API URLs and MongoDB collection names are preserved.

## Roles

| Persisted role | Display name | Scope |
| --- | --- | --- |
| company_admin | Company Admin | Company administration and operations |
| admin | Branch Admin | Assigned branch and permitted Staff management |
| staff | Staff | Bookings, loading, unloading/delivery, accounts and reports |

The account model is `src/models/admin.auth.model.js`, and its MongoDB collection is exactly `Admin`. Role policy is in `src/services/roles.js`. Database-backed authentication is in `src/middleware/workspace.auth.js`; session role claims cannot override the current account role.

## Compatibility and cleanup

- Current endpoint paths, including historical spellings, remain stable for the CRM.
- Loading source filenames now use `parcel.loading` rather than `pracel.loading`; collection/model names are unchanged.
- Unmounted historical account/admin/product/user modules, duplicate voucher-collection handlers, orphaned DB/terms files and obsolete patch scripts have been removed from the working tree after import/reference checks.
- The removed files have a verified restorable archive at `.private-db-backups/code-cleanup/unused-code-before-cleanup.zip`; its manifest records the original paths and SHA256 hashes. Private backups are excluded from version control and application imports.
- Report/demo documents and private database backup manifests remain in their existing locations. A source-folder change does not require a database migration.

See `docs/CODE-STRUCTURE.md` for the main workflows and important entry points.
