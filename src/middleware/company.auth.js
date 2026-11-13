
import dotenv from "dotenv";
import { workspaceAuth, requireManager } from './workspace.auth.js';

dotenv.config();

const companyAuth = (req, res, next) => {
  // Company registration accounts and delegated Company Admin accounts share access.
  // workspaceAuth verifies the current DB role and blocked state (test/roles.test.js).
  return workspaceAuth(req, res, error => error ? next(error) : requireManager(req, res, next));
};

// Activated with explicit user approval after the company-admin boundary tests passed.
export default companyAuth;
export { companyAuth as proposedCompanyAdminAuth };
