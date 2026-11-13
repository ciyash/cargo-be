import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entitlement } from "../src/services/billing.js";
test('legacy paid-until never grants unlimited quota',()=>assert.equal(entitlement({billing:{paidUntil:'2099-01-01'}}).canBook,false));
