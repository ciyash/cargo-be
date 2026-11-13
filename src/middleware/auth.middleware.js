
import dotenv from 'dotenv';
import { workspaceAuth } from './workspace.auth.js';
import { authorizeLegacy } from '../services/roles.js';
import { withLegacyDataScope } from '../services/legacy-data-scope.js';

dotenv.config();

const auth = (req, res, next) => {
  // Covered by test/roles.test.js: existing company credentials, stale JWT roles,
  // branch assignment, blocked/deleted accounts and expired sessions.
  return workspaceAuth(req, res, error => error ? next(error) : withLegacyDataScope(req.user, () => authorizeLegacy(req, res, next)));
};

export default auth;

