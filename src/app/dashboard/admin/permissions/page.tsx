"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheckIcon,
  LockClosedIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface RolePermissionsData {
  rolePermissions: Record<string, string[]>;
  allPermissions: string[];
  rawData: any[];
}

const ROLE_INFO = {
  ADMINISTRATOR: {
    name: "Administrator",
    emoji: "👑",
    color: "purple",
    description:
      "Full system control including user management, role assignment, and security",
  },
  HR_MANAGER: {
    name: "HR Manager",
    emoji: "🧑‍💼",
    color: "blue",
    description: "Employee lifecycle management, onboarding, and HR operations",
  },
  DEPARTMENT_MANAGER: {
    name: "Department Manager",
    emoji: "📊",
    color: "green",
    description:
      "Team oversight with approval authority for leave and attendance",
  },
  EMPLOYEE: {
    name: "Employee",
    emoji: "👩‍💻",
    color: "gray",
    description: "Personal data management and self-service operations",
  },
  PAYROLL_OFFICER: {
    name: "Payroll Officer",
    emoji: "🧮",
    color: "yellow",
    description: "Finance-focused with payroll processing and compliance",
  },
  SYSTEM_AUDITOR: {
    name: "System Auditor",
    emoji: "🔒",
    color: "red",
    description: "Read-only oversight for compliance and audit trails",
  },
};

const PERMISSION_CATEGORIES = {
  employee: "👥 Employee Management",
  department: "🏢 Department Management",
  attendance: "📅 Attendance Management",
  leave: "🌴 Leave Management",
  payroll: "💰 Payroll Management",
  performance: "⭐ Performance Management",
  training: "📚 Training Management",
  reports: "📊 Reports & Analytics",
  settings: "⚙️ System Settings",
  user: "👤 User Management",
  announcements: "📢 Announcements",
  tasks: "✅ Task Management",
  compliance: "🔒 Compliance & Auditing",
  inventory: "📦 Inventory & Assets",
  system: "🛡️ System Administration",
};

export default function RolePermissionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<RolePermissionsData | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("ADMINISTRATOR");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set()
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchRolePermissions();
  }, []);

  useEffect(() => {
    if (data && selectedRole) {
      const rolePerms = data.rolePermissions[selectedRole] || [];
      setSelectedPermissions(new Set(rolePerms));
      setHasChanges(false);
    }
  }, [selectedRole, data]);

  const fetchRolePermissions = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/admin/role-permissions");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch permissions");
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to load role permissions");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permission: string) => {
    const newPermissions = new Set(selectedPermissions);
    if (newPermissions.has(permission)) {
      newPermissions.delete(permission);
    } else {
      newPermissions.add(permission);
    }
    setSelectedPermissions(newPermissions);
    setHasChanges(true);
    setError("");
    setSuccess("");
  };

  const handleSavePermissions = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/admin/role-permissions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: selectedRole,
          permissions: Array.from(selectedPermissions),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update permissions");
      }

      const result = await response.json();
      setSuccess(
        `Successfully updated permissions for ${
          ROLE_INFO[selectedRole as keyof typeof ROLE_INFO].name
        }`
      );
      setHasChanges(false);

      // Refresh data
      await fetchRolePermissions();
    } catch (err: any) {
      setError(err.message || "Failed to save permissions");
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (
      !confirm(
        `Are you sure you want to reset ${
          ROLE_INFO[selectedRole as keyof typeof ROLE_INFO].name
        } permissions to default? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/admin/role-permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: selectedRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reset permissions");
      }

      const result = await response.json();
      setSuccess(
        `Successfully reset ${
          ROLE_INFO[selectedRole as keyof typeof ROLE_INFO].name
        } permissions to default`
      );
      setHasChanges(false);

      // Refresh data
      await fetchRolePermissions();
    } catch (err: any) {
      setError(err.message || "Failed to reset permissions");
      console.error("Reset error:", err);
    } finally {
      setSaving(false);
    }
  };

  const categorizePermissions = (permissions: string[]) => {
    const categorized: Record<string, string[]> = {};

    permissions.forEach((permission) => {
      const category = permission.split(".")[0];
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(permission);
    });

    return categorized;
  };

  const filteredPermissions =
    data?.allPermissions.filter((permission) =>
      permission.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const categorizedPermissions = categorizePermissions(filteredPermissions);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading role permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            Role Permissions Management
          </h1>
        </div>
        <p className="text-gray-600">
          Configure dynamic role-based access control. Changes take effect
          immediately.
        </p>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900">Success</h3>
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Role Selector Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Select Role
            </h2>
            <div className="space-y-2">
              {Object.entries(ROLE_INFO).map(([role, info]) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedRole === role
                      ? `bg-${info.color}-50 border-2 border-${info.color}-500 text-${info.color}-900`
                      : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{info.emoji}</span>
                    <span className="font-semibold text-sm">{info.name}</span>
                  </div>
                  <p className="text-xs text-gray-600 ml-7">
                    {info.description}
                  </p>
                  {data?.rolePermissions[role] && (
                    <div className="mt-2 ml-7">
                      <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                        {data.rolePermissions[role].length} permissions
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Permissions Configuration */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">
                      {ROLE_INFO[selectedRole as keyof typeof ROLE_INFO].emoji}
                    </span>
                    <h2 className="text-xl font-bold text-gray-900">
                      {ROLE_INFO[selectedRole as keyof typeof ROLE_INFO].name}
                    </h2>
                  </div>
                  <p className="text-sm text-gray-600">
                    {
                      ROLE_INFO[selectedRole as keyof typeof ROLE_INFO]
                        .description
                    }
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleResetToDefault}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Reset to Default
                  </button>
                  <button
                    onClick={handleSavePermissions}
                    disabled={!hasChanges || saving}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search permissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Stats */}
              <div className="flex gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">
                    <span className="font-semibold">
                      {selectedPermissions.size}
                    </span>{" "}
                    Enabled
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span className="text-gray-600">
                    <span className="font-semibold">
                      {(data?.allPermissions.length || 0) -
                        selectedPermissions.size}
                    </span>{" "}
                    Disabled
                  </span>
                </div>
              </div>
            </div>

            {/* Permissions List */}
            <div className="p-6">
              {hasChanges && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-sm text-yellow-800">
                  <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                  <span>
                    You have unsaved changes. Click "Save Changes" to apply
                    them.
                  </span>
                </div>
              )}

              <div className="space-y-6">
                {Object.entries(categorizedPermissions).map(
                  ([category, permissions]) => (
                    <div
                      key={category}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-900">
                          {PERMISSION_CATEGORIES[
                            category as keyof typeof PERMISSION_CATEGORIES
                          ] || category}
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {
                            permissions.filter((p) =>
                              selectedPermissions.has(p)
                            ).length
                          }{" "}
                          of {permissions.length} enabled
                        </p>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {permissions.map((permission) => (
                          <label
                            key={permission}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.has(permission)}
                              onChange={() =>
                                handlePermissionToggle(permission)
                              }
                              className="h-5 w-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                                  {permission}
                                </code>
                                {selectedPermissions.has(permission) && (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {getPermissionDescription(permission)}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getPermissionDescription(permission: string): string {
  const descriptions: Record<string, string> = {
    "system.admin": "Full system administration access",
    "employee.create": "Create new employee records",
    "employee.read": "View employee information",
    "employee.update": "Modify employee records",
    "employee.delete": "Remove employee records",
    "employee.read_all": "View all employee records across the system",
    "user.create": "Create new user accounts",
    "user.assign_roles": "Assign and modify user roles",
    "payroll.process": "Process payroll and generate salary slips",
    "leave.approve": "Approve or reject leave applications",
    "attendance.read_all": "View attendance records of all employees",
    // Add more descriptions as needed
  };

  return (
    descriptions[permission] || `Permission for ${permission.replace(".", " ")}`
  );
}
