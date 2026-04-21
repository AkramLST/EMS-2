// Comprehensive Permissions and role-based access control for Employee Management System

// Import prisma for dynamic permission loading
import { prisma } from "./prisma";

export type Permission =
  // Employee Management
  | "employee.create"
  | "employee.read"
  | "employee.update"
  | "employee.delete"
  | "employee.read_all"
  | "employee.onboard"
  | "employee.offboard"
  | "employee.profile_full_access"

  // Department Management
  | "department.create"
  | "department.read"
  | "department.update"
  | "department.delete"
  | "department.manage_team"

  // Attendance Management
  | "attendance.create"
  | "attendance.read"
  | "attendance.update"
  | "attendance.delete"
  | "attendance.read_all"
  | "attendance.approve_team"
  | "attendance.submit_own"

  // Leave Management
  | "leave.create"
  | "leave.read"
  | "leave.update"
  | "leave.delete"
  | "leave.approve"
  | "leave.read_all"
  | "leave.approve_team"
  | "leave.apply_own"

  // Payroll Management
  | "payroll.create"
  | "payroll.read"
  | "payroll.update"
  | "payroll.delete"
  | "payroll.read_all"
  | "payroll.process"
  | "payroll.configure_structures"
  | "payroll.generate_slips"
  | "payroll.view_own_slip"

  // Performance Management
  | "performance.create"
  | "performance.read"
  | "performance.update"
  | "performance.delete"
  | "performance.read_all"
  | "performance.review_team"
  | "performance.view_own"

  // Training Management
  | "training.create"
  | "training.read"
  | "training.update"
  | "training.delete"
  | "training.enroll"
  | "training.manage_programs"
  | "training.assign_team"

  // Reports & Analytics
  | "reports.read"
  | "reports.export"
  | "reports.compliance"
  | "reports.financial"
  | "reports.team_analytics"

  // System Settings & Configuration
  | "settings.read"
  | "settings.update"
  | "settings.company_config"
  | "settings.security"
  | "settings.policies"

  // User Management & Security
  | "user.create"
  | "user.read"
  | "user.update"
  | "user.delete"
  | "user.assign_roles"
  | "user.manage_permissions"
  | "user.reset_passwords"

  // Announcements & Communication
  | "announcements.create"
  | "announcements.read"
  | "announcements.update"
  | "announcements.delete"
  | "announcements.team_only"

  // Task & Project Management
  | "tasks.create"
  | "tasks.read"
  | "tasks.update"
  | "tasks.delete"
  | "tasks.assign_team"

  // Compliance & Auditing
  | "compliance.read_all"
  | "compliance.export_reports"
  | "compliance.audit_trails"
  | "compliance.view_logs"

  // Inventory & Asset Management
  | "inventory.create"
  | "inventory.read"
  | "inventory.update"
  | "inventory.delete"
  | "inventory.read_all"
  | "inventory.assign_assets"
  | "inventory.return_assets"
  | "inventory.manage_categories"
  | "inventory.manage_stock"
  | "inventory.view_assignments"
  | "inventory.schedule_maintenance"
  | "inventory.approve_disposal"
  | "inventory.generate_reports"
  | "inventory.conduct_audits"
  | "inventory.view_depreciation"
  | "inventory.manage_vendors"
  | "inventory.configure_alerts"

  // Super Admin
  | "system.admin";

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  // 👑 Administrator (Super Admin / HR Admin) - Full system control
  ADMINISTRATOR: [
    "system.admin",
    // Employee Management - Full control
    "employee.create",
    "employee.read",
    "employee.update",
    "employee.delete",
    "employee.read_all",
    "employee.onboard",
    "employee.offboard",
    "employee.profile_full_access",
    // Department Management - Full control
    "department.create",
    "department.read",
    "department.update",
    "department.delete",
    "department.manage_team",
    // Attendance Management - Full control
    "attendance.create",
    "attendance.read",
    "attendance.update",
    "attendance.delete",
    "attendance.read_all",
    "attendance.approve_team",
    // Leave Management - Full control
    "leave.create",
    "leave.read",
    "leave.update",
    "leave.delete",
    "leave.approve",
    "leave.read_all",
    "leave.approve_team",
    "leave.apply_own",
    // Payroll Management - Full control
    "payroll.create",
    "payroll.read",
    "payroll.update",
    "payroll.delete",
    "payroll.read_all",
    "payroll.process",
    "payroll.configure_structures",
    "payroll.generate_slips",
    // Performance Management - Full control
    "performance.create",
    "performance.read",
    "performance.update",
    "performance.delete",
    "performance.read_all",
    "performance.review_team",
    // Training Management - Full control
    "training.create",
    "training.read",
    "training.update",
    "training.delete",
    "training.enroll",
    "training.manage_programs",
    "training.assign_team",
    // Reports & Analytics - Full access
    "reports.read",
    "reports.export",
    "reports.compliance",
    "reports.financial",
    "reports.team_analytics",
    // System Settings - Full control
    "settings.read",
    "settings.update",
    "settings.company_config",
    "settings.security",
    "settings.policies",
    // User Management - Full control
    "user.create",
    "user.read",
    "user.update",
    "user.delete",
    "user.assign_roles",
    "user.manage_permissions",
    "user.reset_passwords",
    // Communication - Full control
    "announcements.create",
    "announcements.read",
    "announcements.update",
    "announcements.delete",
    // Tasks - Full control
    "tasks.create",
    "tasks.read",
    "tasks.update",
    "tasks.delete",
    "tasks.assign_team",
    // Compliance - Full access
    "compliance.read_all",
    "compliance.export_reports",
    "compliance.audit_trails",
    "compliance.view_logs",
    // Inventory & Asset Management - Full control
    "inventory.create",
    "inventory.read",
    "inventory.update",
    "inventory.delete",
    "inventory.read_all",
    "inventory.assign_assets",
    "inventory.return_assets",
    "inventory.manage_categories",
    "inventory.manage_stock",
    "inventory.view_assignments",
    "inventory.schedule_maintenance",
    "inventory.approve_disposal",
    "inventory.generate_reports",
    "inventory.conduct_audits",
    "inventory.view_depreciation",
    "inventory.manage_vendors",
    "inventory.configure_alerts",
  ],

  // 🧑‍💼 HR Manager / HR Officer - Employee lifecycle management
  HR_MANAGER: [
    // Employee Management - Full lifecycle
    "employee.create",
    "employee.read",
    "employee.update",
    "employee.read_all",
    "employee.onboard",
    "employee.offboard",
    "employee.profile_full_access",
    // Department Management - Read access
    "department.read",
    "department.update", // Limited to organizational changes
    // Attendance Management - Full management
    "attendance.read",
    "attendance.update",
    "attendance.read_all",
    "attendance.approve_team",
    // Leave Management - Full management
    "leave.read",
    "leave.update",
    "leave.approve",
    "leave.read_all",
    "leave.approve_team",
    // Payroll Management - Setup and management
    "payroll.create",
    "payroll.read",
    "payroll.update",
    "payroll.read_all",
    "payroll.process",
    "payroll.configure_structures",
    // Performance Management - Full management
    "performance.create",
    "performance.read",
    "performance.update",
    "performance.read_all",
    "performance.review_team",
    // Training Management - Full management
    "training.create",
    "training.read",
    "training.update",
    "training.delete",
    "training.enroll",
    "training.manage_programs",
    "training.assign_team",
    // Reports - HR focused
    "reports.read",
    "reports.export",
    "reports.team_analytics",
    // Settings - Limited access
    "settings.read",
    "settings.policies",
    // User Management - Limited
    "user.create",
    "user.read",
    "user.update",
    // Communication
    "announcements.create",
    "announcements.read",
    "announcements.update",
    "announcements.delete",
    // Tasks - Management
    "tasks.create",
    "tasks.read",
    "tasks.update",
    "tasks.assign_team",
    // Inventory & Asset Management - Assignment and tracking
    "inventory.read",
    "inventory.read_all",
    "inventory.assign_assets",
    "inventory.return_assets",
    "inventory.view_assignments",
    "inventory.generate_reports",
  ],

  // 📊 Department Manager / Team Lead - Team oversight
  DEPARTMENT_MANAGER: [
    // Employee Management - Team only
    "employee.read", // Only team members
    "employee.update", // Limited to team members
    // Department Management - Own team
    "department.read",
    "department.manage_team",
    // Attendance Management - Team approval
    "attendance.read", // Team members only
    "attendance.approve_team",
    // Leave Management - Team approval
    "leave.read", // Team members only
    "leave.read_all",
    "leave.create", // Apply for own leave
    "leave.apply_own",
    "leave.approve_team",
    // Payroll - View team summaries
    "payroll.read", // Team summaries only
    // Performance Management - Team reviews
    "performance.create",
    "performance.read", // Team members only
    "performance.update", // Team members only
    "performance.review_team",
    // Training - Team assignment
    "training.read",
    "training.enroll",
    "training.assign_team",
    // Reports - Team level
    "reports.read", // Team level only
    "reports.team_analytics",
    // Communication - Team announcements
    "announcements.read",
    "announcements.team_only",
    // Tasks - Team management
    "tasks.create",
    "tasks.read",
    "tasks.update",
    "tasks.assign_team",
    // Inventory & Asset Management - Team assets
    "inventory.read",
    "inventory.view_assignments", // Only team members
    "inventory.assign_assets", // Team members only
    "inventory.return_assets", // Team members only
  ],

  // 👩‍💻 Employee (Staff / Team Member) - Personal data management
  EMPLOYEE: [
    // Employee Management - Own data only
    "employee.read", // Own profile only
    "employee.update", // Limited personal info
    // Department - View only
    "department.read",
    // Attendance - Own records
    "attendance.create", // Submit own attendance
    "attendance.read", // Own records only
    "attendance.submit_own",
    // Leave - Own applications
    "leave.create", // Apply for leave
    "leave.read", // Own leave records
    "leave.apply_own",
    // Payroll - Own data
    "payroll.read", // Own salary slip only
    "payroll.view_own_slip",
    // Performance - Own reviews
    "performance.read", // Own performance only
    "performance.view_own",
    // Training - Enrollment
    "training.read",
    "training.enroll",
    // Reports - Personal only
    "reports.read", // Personal reports only
    // Communication - Read only
    "announcements.read",
    // Tasks - Own tasks
    "tasks.read", // Own tasks only
    "tasks.update", // Own task status
    // Inventory & Asset Management - Personal assets only
    "inventory.read", // Own assignments only
    "inventory.view_assignments", // Own assignments only
  ],

  // 🧮 Payroll Officer / Accountant - Finance focused role
  PAYROLL_OFFICER: [
    // Employee Management - Financial data access
    "employee.read", // For payroll purposes
    "employee.read_all", // Financial data access
    // Department - Read for payroll
    "department.read",
    // Attendance - For payroll calculation
    "attendance.read",
    "attendance.read_all",
    // Leave - For payroll impact
    "leave.read",
    "leave.read_all",
    // Payroll - Full financial control
    "payroll.create",
    "payroll.read",
    "payroll.update",
    "payroll.delete",
    "payroll.read_all",
    "payroll.process",
    "payroll.configure_structures",
    "payroll.generate_slips",
    // Performance - For bonus/increment
    "performance.read",
    "performance.read_all",
    // Training - Cost analysis
    "training.read",
    // Reports - Financial focus
    "reports.read",
    "reports.export",
    "reports.financial",
    "reports.compliance",
    // Settings - Financial configurations
    "settings.read",
    // Communication - Read only
    "announcements.read",
    // Compliance - Financial auditing
    "compliance.read_all",
    "compliance.export_reports",
    "compliance.audit_trails",
    // Inventory & Asset Management - Financial tracking
    "inventory.read",
    "inventory.read_all",
    "inventory.view_depreciation",
    "inventory.generate_reports", // Financial reports
    "inventory.manage_vendors", // Cost management
  ],

  // 🔒 System Auditor / Compliance Officer - Read-only oversight
  SYSTEM_AUDITOR: [
    // Employee Management - Read-only access
    "employee.read",
    "employee.read_all",
    // Department - Read-only
    "department.read",
    // Attendance - Read-only for compliance
    "attendance.read",
    "attendance.read_all",
    // Leave - Read-only for audit
    "leave.read",
    "leave.read_all",
    // Payroll - Read-only for audit
    "payroll.read",
    "payroll.read_all",
    // Performance - Read-only
    "performance.read",
    "performance.read_all",
    // Training - Read-only
    "training.read",
    // Reports - Full compliance access
    "reports.read",
    "reports.export",
    "reports.compliance",
    "reports.financial",
    "reports.team_analytics",
    // Settings - Read-only
    "settings.read",
    // Communication - Read-only
    "announcements.read",
    // Tasks - Read-only
    "tasks.read",
    // Compliance - Full audit access
    "compliance.read_all",
    "compliance.export_reports",
    "compliance.audit_trails",
    "compliance.view_logs",
    // Inventory & Asset Management - Audit and compliance
    "inventory.read",
    "inventory.read_all",
    "inventory.view_assignments",
    "inventory.generate_reports",
    "inventory.conduct_audits",
    "inventory.view_depreciation",
  ],
};

// Cache for database permissions (refreshed periodically or on-demand)
let permissionCache: Record<string, Permission[]> | null = null;
let lastCacheUpdate: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load permissions from database
 * Falls back to hardcoded ROLE_PERMISSIONS if database is unavailable
 */
export async function loadRolePermissionsFromDB(): Promise<
  Record<string, Permission[]>
> {
  try {
    // The rolePermission model doesn't exist in the schema
    // Always use hardcoded permissions
    console.warn(
      "rolePermission model not found in schema, using hardcoded ROLE_PERMISSIONS",
    );
    return ROLE_PERMISSIONS;
  } catch (error) {
    console.warn(
      "Failed to load permissions from database, using hardcoded defaults:",
      error,
    );
    // Fallback to hardcoded permissions
    return ROLE_PERMISSIONS;
  }
}

/**
 * Clear the permission cache (useful after updating permissions)
 */
export function clearPermissionCache() {
  permissionCache = null;
  lastCacheUpdate = 0;
}

/**
 * Check if user has a specific permission (async version with DB support)
 */
export async function hasPermissionAsync(
  userRole: string,
  permission: Permission,
): Promise<boolean> {
  const rolePermissions = await loadRolePermissionsFromDB();
  const perms = rolePermissions[userRole] || [];
  return (
    perms.includes(permission) || perms.includes("system.admin" as Permission)
  );
}

export function hasPermission(
  userRole: string,
  permission: Permission,
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return (
    rolePermissions.includes(permission) ||
    rolePermissions.includes("system.admin")
  );
}

export function canAccessResource(
  userRole: string,
  permission: Permission,
  resourceUserId?: string,
  currentUserId?: string,
  resourceDepartmentId?: string,
  currentUserDepartmentId?: string,
): boolean {
  // Fix: Use the correct hasPermission function signature
  // This function is called with a role string, not a user object
  if (!hasPermission(userRole, permission)) {
    return false;
  }

  // Administrator and system admins can access everything
  if (userRole === "ADMINISTRATOR" || hasPermission(userRole, "system.admin")) {
    return true;
  }

  // HR_MANAGER can access all employee data
  if (userRole === "HR_MANAGER") {
    return true;
  }

  // PAYROLL_OFFICER can access all financial data
  if (userRole === "PAYROLL_OFFICER") {
    return true;
  }

  // SYSTEM_AUDITOR has read-only access to all data
  if (userRole === "SYSTEM_AUDITOR") {
    return true;
  }

  // If no specific user check needed, return true
  if (!resourceUserId || !currentUserId) {
    return true;
  }

  // For EMPLOYEE role, only allow access to their own data
  if (userRole === "EMPLOYEE") {
    return resourceUserId === currentUserId;
  }

  // For DEPARTMENT_MANAGER, allow access to own data and team members
  if (userRole === "DEPARTMENT_MANAGER") {
    // If it's their own data, allow access
    if (resourceUserId === currentUserId) {
      return true;
    }
    // If department IDs are provided, check if they're in the same department
    if (resourceDepartmentId && currentUserDepartmentId) {
      return resourceDepartmentId === currentUserDepartmentId;
    }
  }

  return true;
}

export function getAccessibleEmployeeFilter(
  userRole: string,
  currentEmployeeId?: string,
  managedEmployeeIds?: string[],
  currentUserDepartmentId?: string,
) {
  // Administrator, HR_MANAGER, PAYROLL_OFFICER, and SYSTEM_AUDITOR can see all
  if (
    userRole === "ADMINISTRATOR" ||
    userRole === "HR_MANAGER" ||
    userRole === "PAYROLL_OFFICER" ||
    userRole === "SYSTEM_AUDITOR"
  ) {
    return {}; // No filter - can see all
  }

  // Department Manager can see their team members
  if (userRole === "DEPARTMENT_MANAGER") {
    const filters: any[] = [];

    // Always include their own data
    if (currentEmployeeId) {
      filters.push({ id: currentEmployeeId });
    }

    // Include managed employees if provided
    if (managedEmployeeIds && managedEmployeeIds.length > 0) {
      filters.push({ id: { in: managedEmployeeIds } });
    }

    // Include department members if department ID is provided
    if (currentUserDepartmentId) {
      filters.push({ departmentId: currentUserDepartmentId });
    }

    return filters.length > 0 ? { OR: filters } : { id: "never" };
  }

  // Employee can only see their own data
  if (userRole === "EMPLOYEE" && currentEmployeeId) {
    return { id: currentEmployeeId };
  }

  return { id: "never" }; // No access by default
}

export const MENU_PERMISSIONS = {
  dashboard: ["employee.read"],
  employees: ["employee.read_all", "employee.read"],
  attendance: ["attendance.read_all", "attendance.read"],
  leave: ["leave.read_all", "leave.read"],
  payroll: ["payroll.read_all", "payroll.read"],
  performance: ["performance.read_all", "performance.read"],
  training: ["training.read"],
  reports: ["reports.read"],
  settings: ["settings.read", "system.admin"],
  announcements: ["announcements.read"],
  tasks: ["tasks.read"],
  compliance: ["compliance.read_all"],
};

// Role hierarchy levels for comparison (higher number = higher privilege)
export const ROLE_HIERARCHY: Record<string, number> = {
  EMPLOYEE: 1,
  DEPARTMENT_MANAGER: 2,
  PAYROLL_OFFICER: 3,
  HR_MANAGER: 4,
  SYSTEM_AUDITOR: 5,
  ADMINISTRATOR: 6,
  // Legacy roles
  MANAGER: 2,
  HR_ADMIN: 4,
  SUPER_ADMIN: 6,
};

// Role display names with emojis
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  ADMINISTRATOR: "👑 Administrator (Super Admin / HR Admin)",
  HR_MANAGER: "🧑‍💼 HR Manager / HR Officer",
  DEPARTMENT_MANAGER: "📊 Department Manager / Team Lead",
  EMPLOYEE: "👩‍💻 Employee (Staff / Team Member)",
  PAYROLL_OFFICER: "🧮 Payroll Officer / Accountant",
  SYSTEM_AUDITOR: "🔒 System Auditor / Compliance Officer",
  // Legacy roles
  SUPER_ADMIN: "👑 Super Admin",
  HR_ADMIN: "🧑‍💼 HR Admin",
  MANAGER: "📊 Manager",
};

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMINISTRATOR:
    "Full control over the system including user management, role assignment, company configuration, and security management.",
  HR_MANAGER:
    "Manages employee lifecycle including onboarding, profile maintenance, leave/attendance management, performance reviews, and payroll setup.",
  DEPARTMENT_MANAGER:
    "Oversees department/team with approval authority for leave and attendance requests, task assignment, and team performance tracking.",
  EMPLOYEE:
    "Regular staff with access to personal data management, leave applications, attendance submission, and salary slip viewing.",
  PAYROLL_OFFICER:
    "Finance-focused role with salary structure configuration, payroll processing, compliance reports, and financial auditing capabilities.",
  SYSTEM_AUDITOR:
    "Read-only oversight role with access to employee records, payroll logs, compliance reporting, and audit trails.",
};

/**
 * Check if a role has higher or equal privilege than another role
 */
export function hasHigherOrEqualRole(
  userRole: string,
  requiredRole: string,
): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Get all roles that are lower in hierarchy than the given role
 */
export function getLowerRoles(userRole: string): string[] {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level < userLevel)
    .map(([role, _]) => role);
}

/**
 * Check if user can assign a specific role
 */
export function canAssignRole(userRole: string, targetRole: string): boolean {
  // Only administrators can assign roles
  // Fix: Use the correct hasPermission function signature
  // This function is called with a role string, not a user object
  if (!hasPermission(userRole, "user.assign_roles")) {
    return false;
  }

  // Cannot assign a role higher than or equal to your own
  return hasHigherOrEqualRole(userRole, targetRole);
}

/**
 * Get the display name for a role
 */
export function getRoleDisplayName(role: string): string {
  return ROLE_DISPLAY_NAMES[role] || role;
}

/**
 * Get the description for a role
 */
export function getRoleDescription(role: string): string {
  return ROLE_DESCRIPTIONS[role] || "No description available.";
}

/**
 * Get all available roles for a user to assign (based on their role)
 */
export function getAssignableRoles(userRole: string): string[] {
  // Fix: Use the correct hasPermission function signature
  // This function is called with a role string, not a user object
  if (!hasPermission(userRole, "user.assign_roles")) {
    return [];
  }

  return Object.keys(ROLE_HIERARCHY).filter((role) =>
    canAssignRole(userRole, role),
  );
}

/**
 * Check if a role is a financial role (has access to payroll data)
 */
export function isFinancialRole(role: string): boolean {
  return ["ADMINISTRATOR", "PAYROLL_OFFICER", "SYSTEM_AUDITOR"].includes(role);
}

/**
 * Check if a role is a management role (can manage other employees)
 */
export function isManagementRole(role: string): boolean {
  return ["ADMINISTRATOR", "HR_MANAGER", "DEPARTMENT_MANAGER"].includes(role);
}

/**
 * Check if a role has audit capabilities
 */
export function hasAuditCapabilities(role: string): boolean {
  return ["ADMINISTRATOR", "SYSTEM_AUDITOR"].includes(role);
}
