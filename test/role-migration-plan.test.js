import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planRoleMigration} from "../src/services/role-migration-plan.js";
test('old company admin and branch admin are mapped separately without changing branch assignment',()=>{
 const accounts=[{_id:'owner',role:'admin'},{_id:'branch',role:'subadmin',branchId:'branch-a'},{_id:'worker',role:'employee',branchId:'branch-a'}];
 const plan=planRoleMigration(accounts);assert.equal(plan.ready,true);
 assert.deepEqual(plan.changes.map(row=>[row.from,row.to]),[['admin','company_admin'],['subadmin','admin'],['employee','staff']]);
 assert.equal(accounts[1].role,'subadmin');assert.equal(accounts[1].branchId,'branch-a');
});
test('version marker prevents an already migrated Branch Admin from becoming Company Admin',()=>{
 const plan=planRoleMigration([{_id:'branch',role:'admin',branchId:'branch-a',roleVersion:2}]);
 assert.equal(plan.ready,true);assert.equal(plan.changes.length,0);assert.equal(plan.counts.after.admin,1);
});
test('unknown roles, missing branch assignments and restricted legacy roles block activation',()=>{
 for(const account of [{role:'unknown'},{role:'employee'},{role:'accountant',branchId:'branch-a'}])assert.equal(planRoleMigration([{_id:'test',...account}]).ready,false);
});
