"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  UserGroupIcon,
  ShieldCheckIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
  ROLE_DISPLAY_NAMES,
  ROLE_DESCRIPTIONS,
  ROLE_HIERARCHY,
} from "@/lib/permissions";

interface User {
  id: string;
  email: string;
  role: string;
  roleDisplayName: string;
  roleDescription: string;
  canEditRole: boolean;
  employee?: {
    firstName: string;
    lastName: string;
    department?: {
      name: string;
    };
  };
}

interface RoleStats {
  role: string;
  count: number;
  displayName: string;
  description: string;
}

interface MigrationStatus {
  roleDistribution: Array<{ role: string; _count: { role: number } }>;
  legacyRoles: Array<{ role: string; _count: { role: number } }>;
  needsMigration: boolean;
  legacyUserCount: number;
}

export default function RoleManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roleStats, setRoleStats] = useState<RoleStats[]>([]);
  const [assignableRoles, setAssignableRoles] = useState<string[]>([]);
  const [migrationStatus, setMigrationStatus] =
    useState<MigrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchData();
    fetchMigrationStatus();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/user-roles");

      if (!response.ok) {
        throw new Error("Failed to fetch role data");
      }

      const data = await response.json();
      setUsers(data.users || []);
      setRoleStats(data.roleStats || []);
      setAssignableRoles(data.assignableRoles || []);
    } catch (error) {
      console.error("Error fetching role data:", error);
      toast.error("Failed to load role management data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMigrationStatus = async () => {
    try {
      const response = await fetch("/api/admin/migrate-roles");

      if (response.ok) {
        const data = await response.json();
        setMigrationStatus(data);
      }
    } catch (error) {
      console.error("Error fetching migration status:", error);
    }
  };

  const handleRoleMigration = async () => {
    if (
      !window.confirm(
        "Are you sure you want to migrate all users from legacy roles to the new role system? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setIsMigrating(true);
      const response = await fetch("/api/admin/migrate-roles", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        await fetchData();
        await fetchMigrationStatus();
      } else {
        toast.error(data.message || "Migration failed");
      }
    } catch (error) {
      console.error("Migration error:", error);
      toast.error("Failed to perform role migration");
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRoleUpdate = async () => {
    if (!selectedUser || !selectedRole) {
      toast.error("Please select both a user and a role");
      return;
    }

    try {
      setIsUpdating(true);
      const response = await fetch("/api/admin/user-roles", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser,
          newRole: selectedRole,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setSelectedUser("");
        setSelectedRole("");
        await fetchData();
      } else {
        toast.error(data.message || "Role update failed");
      }
    } catch (error) {
      console.error("Role update error:", error);
      toast.error("Failed to update user role");
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleHierarchyLevel = (role: string): number => {
    return ROLE_HIERARCHY[role] || 0;
  };

  const getRoleBadgeColor = (role: string): string => {
    const level = getRoleHierarchyLevel(role);
    if (level >= 6) return "bg-purple-100 text-purple-800";
    if (level >= 4) return "bg-blue-100 text-blue-800";
    if (level >= 2) return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Settings
            </Link>
            <div className="border-l border-gray-300 h-6 mx-4"></div>
            <ShieldCheckIcon className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Role Management
              </h1>
              <p className="text-gray-600">
                Manage user roles and permissions in your organization
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Migration Alert */}
      {migrationStatus?.needsMigration && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-800">
                Legacy Roles Detected
              </h3>
              <p className="mt-1 text-sm text-amber-700">
                {migrationStatus.legacyUserCount} users still have legacy roles.
                Migrate them to the new comprehensive role system for better
                access control.
              </p>
              <button
                onClick={handleRoleMigration}
                disabled={isMigrating}
                className="mt-3 btn-primary text-sm"
              >
                {isMigrating ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                    Migrating...
                  </>
                ) : (
                  "Migrate Legacy Roles"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Role Statistics */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserGroupIcon className="h-5 w-5 mr-2" />
              Role Distribution
            </h2>
            <div className="space-y-3">
              {roleStats
                .sort(
                  (a, b) =>
                    getRoleHierarchyLevel(b.role) -
                    getRoleHierarchyLevel(a.role)
                )
                .map((stat) => (
                  <div
                    key={stat.role}
                    className="flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(
                          stat.role
                        )}`}
                      >
                        {stat.displayName}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {stat.description}
                      </p>
                    </div>
                    <span className="ml-2 text-sm font-semibold text-gray-900">
                      {stat.count}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Role Assignment */}
          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CogIcon className="h-5 w-5 mr-2" />
              Assign Role
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select User
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="input text-sm"
                >
                  <option value="">Choose a user...</option>
                  {users
                    .filter((user) => user.canEditRole)
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.employee
                          ? `${user.employee.firstName} ${user.employee.lastName} (${user.email})`
                          : user.email}{" "}
                        - {user.roleDisplayName}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="input text-sm"
                  disabled={!selectedUser}
                >
                  <option value="">Choose a role...</option>
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_DISPLAY_NAMES[role] || role}
                    </option>
                  ))}
                </select>
                {selectedRole && (
                  <p className="mt-1 text-xs text-gray-600">
                    {ROLE_DESCRIPTIONS[selectedRole]}
                  </p>
                )}
              </div>

              <button
                onClick={handleRoleUpdate}
                disabled={!selectedUser || !selectedRole || isUpdating}
                className="w-full btn-primary text-sm"
              >
                {isUpdating ? "Updating..." : "Update Role"}
              </button>
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
              <p className="text-sm text-gray-600">
                {users.length} total users across all roles
              </p>
            </div>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={
                        user.canEditRole ? "hover:bg-gray-50" : "bg-gray-25"
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.employee
                              ? `${user.employee.firstName} ${user.employee.lastName}`
                              : "No employee record"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.roleDisplayName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.employee?.department?.name || "No department"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.canEditRole ? (
                          <span className="flex items-center text-green-600">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Editable
                          </span>
                        ) : (
                          <span className="text-gray-400">Protected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
