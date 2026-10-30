import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { ownerAuth } from '../routes/owner.route.js';
test('owner access rejects company and wrong-role tokens, permits owner', () => {
  const original = { ...process.env };
  process.env.OWNER_EMAIL = 'owner@example.com';
  process.env.OWNER_PASSWORD_HASH = 'configured';
  process.env.OWNER_SECRET = 'a-separate-owner-secret-at-least-32-characters';
  try {
    const sign = role => jwt.sign({ sub: process.env.OWNER_EMAIL, role }, process.env.OWNER_SECRET, { audience: 'cargo-owner', issuer: 'cargo-platform' });
    for (const [token, expected] of [['', false], [jwt.sign({ companyId: 'customer' }, 'company-secret'), false], [sign('admin'), false], [sign('platform-owner'), true]]) {
      let passed = false;
      const res = { code: 200, status(code) { this.code = code; return this; }, json() { return this; } };
      ownerAuth({ headers: { cookie: `cargo_owner=${token}` } }, res, () => { passed = true; });
      assert.equal(passed, expected);
      if (!passed) assert.equal(res.code, 401);
    }
  } finally { for (const key of ['OWNER_EMAIL', 'OWNER_PASSWORD_HASH', 'OWNER_SECRET']) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; } }
});
