const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { buildScopeFilter, canAccessResource } = require('../src/services/orgScope');

const deptA = new mongoose.Types.ObjectId();
const deptB = new mongoose.Types.ObjectId();
const branchX = new mongoose.Types.ObjectId();
const branchY = new mongoose.Types.ObjectId();
const empUser = new mongoose.Types.ObjectId();
const otherUser = new mongoose.Types.ObjectId();

const LOAN_FIELDS = { branchField: 'branch', departmentField: 'department' };
const CASE_FIELDS = { branchField: 'branch', departmentField: 'department', assigneeField: 'assignedEmployee' };

test('bank_head sees everything, unrestricted', async () => {
  const bankHead = { orgRole: 'bank_head', department: deptA, allDepartmentAccess: false };
  assert.deepEqual(await buildScopeFilter(bankHead, LOAN_FIELDS), {});
});

test('department_head is scoped to their department only', async () => {
  const deptHead = { orgRole: 'department_head', department: deptA, allDepartmentAccess: false };
  const filter = await buildScopeFilter(deptHead, LOAN_FIELDS);
  assert.equal(filter.department, deptA);
  assert.equal(await canAccessResource(deptHead, { department: deptA, branch: branchX }, LOAN_FIELDS), true);
  assert.equal(await canAccessResource(deptHead, { department: deptB, branch: branchX }, LOAN_FIELDS), false);
});

test('plain employee is scoped to their branch (regression: Phase 3/4 loan behavior)', async () => {
  const branchEmp = { orgRole: 'employee', department: null, branch: branchX, allBranchAccess: false, user: empUser };
  assert.equal(await canAccessResource(branchEmp, { branch: branchX, department: null }, LOAN_FIELDS), true);
  assert.equal(await canAccessResource(branchEmp, { branch: branchY, department: null }, LOAN_FIELDS), false);
});

test('branchless department employee falls back to department scope (the Phase 2->3 gap that was fixed)', async () => {
  const branchless = { orgRole: 'employee', department: deptA, branch: null, allBranchAccess: false, user: empUser };
  const filter = await buildScopeFilter(branchless, LOAN_FIELDS);
  assert.equal(filter.department, deptA);
  assert.equal(filter.branch, undefined);
});

test('assigneeField: directly-assigned resource is always accessible regardless of branch (the Phase 6 bug fix)', async () => {
  const assignedEmp = { orgRole: 'employee', department: deptA, branch: null, allBranchAccess: false, user: empUser };
  const otherEmp = { orgRole: 'employee', department: deptA, branch: null, allBranchAccess: false, user: otherUser };
  const caseAssignedToMe = { branch: null, department: deptA, assignedEmployee: empUser };

  assert.equal(await canAccessResource(assignedEmp, caseAssignedToMe, CASE_FIELDS), true);
  assert.equal(await canAccessResource(otherEmp, caseAssignedToMe, CASE_FIELDS), false);
});

test('assigneeField: unassigned resource still visible to a matching-branch employee', async () => {
  const branchEmp = { orgRole: 'employee', department: deptA, branch: branchX, allBranchAccess: false, user: otherUser };
  const unassignedInBranch = { branch: branchX, department: deptA, assignedEmployee: null };
  assert.equal(await canAccessResource(branchEmp, unassignedInBranch, CASE_FIELDS), true);
});

test('allDepartmentAccess bypasses department scoping even for a plain employee flag', async () => {
  const superEmp = { orgRole: 'employee', department: deptA, allDepartmentAccess: true };
  assert.deepEqual(await buildScopeFilter(superEmp, LOAN_FIELDS), {});
});

// NOTE: the 'manager' orgRole path (getTeamUserIds) queries EmployeeProfile
// via Mongoose and needs a live MongoDB connection — not covered here.
// Run against a real/in-memory Mongo instance to exercise it.
