const EmployeeProfile = require('../models/EmployeeProfile');
const ApiError = require('../utils/ApiError');

/**
 * Loads the acting employee's org context (branch, department, orgRole,
 * manager chain position). Throws 403 if there's no active profile —
 * mirrors the existing getEmployeeScope() pattern controllers already use.
 */
const loadEmployeeContext = async (userId) => {
  const profile = await EmployeeProfile.findOne({ user: userId, status: 'active' });
  if (!profile) throw new ApiError(403, 'Employee profile not found or inactive');
  return profile;
};

const requirePermissions = (profile, ...permissions) => {
  const missing = permissions.filter((p) => !profile.permissions.includes(p));
  if (missing.length > 0) {
    throw new ApiError(403, `Permission denied. Required permission(s): ${missing.join(', ')}`);
  }
};

/** User IDs of this manager's direct reports, plus the manager themself. */
const getTeamUserIds = async (employeeProfile) => {
  const reports = await EmployeeProfile.find({ manager: employeeProfile._id }).select('user');
  return [employeeProfile.user, ...reports.map((r) => r.user)];
};

/**
 * Builds a Mongo filter restricting a list query to what this employee may
 * see. Precedence: bank_head/allDepartmentAccess (everything) >
 * department_head (whole department) > manager (their team) > employee
 * (their branch and/or their own assignments).
 *
 * Field names differ per module (loan uses 'branch'/'department', a future
 * module might use different names) so they're passed in per call.
 */
const buildScopeFilter = async (employeeProfile, { branchField, departmentField, assigneeField } = {}) => {
  if (employeeProfile.orgRole === 'bank_head' || employeeProfile.allDepartmentAccess) {
    return {};
  }

  const filter = {};
  if (departmentField && employeeProfile.department) {
    filter[departmentField] = employeeProfile.department;
  }

  if (employeeProfile.orgRole === 'department_head') {
    return filter;
  }

  if (employeeProfile.orgRole === 'manager') {
    if (assigneeField) {
      filter[assigneeField] = { $in: await getTeamUserIds(employeeProfile) };
    }
    return filter;
  }

  // plain employee: a resource directly assigned to them is always visible,
  // branch scoping is a secondary factor only for unassigned/branch-general
  // resources (not used at all by modules that don't pass assigneeField,
  // e.g. loans — that path is unchanged from before this fix).
  if (assigneeField) {
    const orConditions = [{ [assigneeField]: employeeProfile.user }];
    if (branchField && !employeeProfile.allBranchAccess && employeeProfile.branch) {
      orConditions.push({ [assigneeField]: null, [branchField]: employeeProfile.branch });
    }
    filter.$or = orConditions;
    return filter;
  }

  if (branchField && !employeeProfile.allBranchAccess && employeeProfile.branch) {
    filter[branchField] = employeeProfile.branch;
  }
  return filter;
};

/**
 * Same precedence rules as buildScopeFilter, applied to one already-loaded
 * document instead of a query filter — used for single-resource GETs.
 */
const canAccessResource = async (employeeProfile, resource, { branchField, departmentField, assigneeField } = {}) => {
  if (employeeProfile.orgRole === 'bank_head' || employeeProfile.allDepartmentAccess) return true;

  if (departmentField && employeeProfile.department) {
    const resourceDept = resource[departmentField];
    if (resourceDept && !employeeProfile.department.equals(resourceDept)) return false;
  }

  if (employeeProfile.orgRole === 'department_head') return true;

  if (employeeProfile.orgRole === 'manager') {
    if (!assigneeField) return true;
    const resourceAssignee = resource[assigneeField];
    if (!resourceAssignee) return true; // unassigned yet — manager can still triage
    const teamUserIds = await getTeamUserIds(employeeProfile);
    return teamUserIds.some((id) => id.equals(resourceAssignee));
  }

  // plain employee
  if (assigneeField && resource[assigneeField] && employeeProfile.user.equals(resource[assigneeField])) {
    return true; // directly assigned to them — always allowed
  }

  if (branchField && !employeeProfile.allBranchAccess) {
    const resourceBranch = resource[branchField];
    if (!resourceBranch || !employeeProfile.branch || !resourceBranch.equals(employeeProfile.branch)) {
      return false;
    }
  }

  if (assigneeField && resource[assigneeField] && !employeeProfile.user.equals(resource[assigneeField])) {
    return false; // assigned to someone else specifically — branch match isn't enough
  }
  return true;
};

module.exports = { loadEmployeeContext, requirePermissions, getTeamUserIds, buildScopeFilter, canAccessResource };
