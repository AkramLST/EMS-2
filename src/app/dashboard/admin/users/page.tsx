"use client";

import { useEffect, useState } from "react";
import {
  UserIcon,
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Link from "next/link";
import Table from "@/components/ui/Table";
import UserMetrics from "@/components/dashboard/UserMetrics";
import StatusIndicator from "@/components/ui/StatusIndicator";
import Avatar from "@/components/ui/Avatar";
import { useUserStatuses } from "@/hooks/useUserStatuses";

interface User {
  id: string;
  email: string;
  role: string;
  roles: { role: string }[];
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    profileImage?: string | null; // Add profile image
    designation:
      | {
          id: string;
          title: string;
        }
      | string; // Support both object and string for backward compatibility
    status: string;
    employmentType: string;
    joinDate: string;
    department?: {
      id: string;
      name: string;
    };
  };
}

interface Department {
  id: string;
  name: string;
}

interface UserMetricsData {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsers: number;
  avgAccountAge: number;
  growthPercentage: number;
  usersByRole?: {
    role: string;
    count: number;
  }[];
  roleDistribution?: {
    administrators: number;
    hrManagers: number;
    departmentManagers: number;
    employees: number;
    payrollOfficers: number;
    systemAuditors: number;
  };
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Online/Offline Status Management
  const { getUserStatus } = useUserStatuses();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalUsers, setTotalUsers] = useState(0);

  // Available roles in the system
  const availableRoles = [
    { id: "ADMINISTRATOR", name: "Administrator" },
    { id: "HR_MANAGER", name: "HR Manager" },
    { id: "DEPARTMENT_MANAGER", name: "Department Manager" },
    { id: "EMPLOYEE", name: "Employee" },
    { id: "PAYROLL_OFFICER", name: "Payroll Officer" },
    { id: "SYSTEM_AUDITOR", name: "System Auditor" },
  ];

  // Define table columns with fixed widths
  const columns = [
    {
      header: "User",
      accessor: "user",
      className: "w-2/5", // 40% width
      render: (_: any, row: User) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            {row.employee ? (
              <Avatar
                employeeId={row.employee.id}
                employeeName={`${row.employee.firstName} ${row.employee.lastName}`}
                profileImage={row.employee.profileImage}
                size="md"
                showLink={true}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-primary-600" />
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900 flex items-center space-x-2">
              <button
                onClick={() => {
                  // Navigate to user profile page if employee exists
                  if (row.employee?.id) {
                    window.open(`/dashboard/user/${row.employee.id}`, "_blank");
                  }
                }}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {row.employee?.firstName} {row.employee?.lastName}
              </button>
              {/* Online/Offline Status Indicator */}
              {(() => {
                const userStatus = getUserStatus(row.id);
                return userStatus ? (
                  <StatusIndicator
                    status={userStatus.status}
                    size="sm"
                    className="ml-2"
                  />
                ) : null;
              })()}
            </div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Employee ID",
      accessor: "employeeId",
      className: "w-1/5", // 20% width
      render: (_: any, row: User) => row.employee?.employeeId || "-",
    },
    {
      header: "Department",
      accessor: "department",
      className: "w-1/5", // 20% width
      render: (_: any, row: User) => row.employee?.department?.name || "-",
    },
    {
      header: "Designation",
      accessor: "designation",
      className: "w-1/5", // 20% width
      render: (_: any, row: User) => {
        const designation = row.employee?.designation;
        if (!designation) return "-";
        return typeof designation === "string"
          ? designation
          : designation.title;
      },
    },
    {
      header: "Status",
      accessor: "status",
      className: "w-1/12", // ~8% width
      render: (_: any, row: User) => {
        const status = row.employee?.status || "";
        let statusClass = "bg-gray-100 text-gray-800";
        if (status === "ACTIVE") statusClass = "bg-green-100 text-green-800";
        if (status === "INACTIVE") statusClass = "bg-red-100 text-red-800";
        if (status === "ON_LEAVE")
          statusClass = "bg-yellow-100 text-yellow-800";

        return (
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}
          >
            {status || "-"}
          </span>
        );
      },
    },
    {
      header: "Roles",
      accessor: "roles",
      className: "w-1/12", // ~8% width
      render: (_: any, row: User) => (
        <div className="flex flex-wrap gap-1">
          {(row.roles?.length > 0
            ? row.roles.map((r) => r.role)
            : [row.role]
          ).map((role) => (
            <span
              key={role}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
            >
              {role}
            </span>
          ))}
        </div>
      ),
    },
  ];

  useEffect(() => {
    const checkUserRoleAndFetchData = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const { user } = await response.json();
          if (user && user.role === 'ADMINISTRATOR') {
            setAccessDenied(false);
            fetchData();
          } else {
            setAccessDenied(true);
            setLoading(false);
            setMetricsLoading(false);
          }
        } else {
          setAccessDenied(true);
          setLoading(false);
          setMetricsLoading(false);
        }
      } catch (error) {
        setAccessDenied(true);
        setLoading(false);
        setMetricsLoading(false);
      } finally {
        setAuthChecked(true);
      }
    };

    checkUserRoleAndFetchData();
  }, []);

  useEffect(() => {
    if (!accessDenied) {
      fetchData();
    }
  }, [currentPage, itemsPerPage, searchTerm, filterStatus]);

  const fetchData = async () => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());

      // Add search term if present
      if (searchTerm) {
        params.append("search", searchTerm);
      }

      // Add status filter if not "ALL"
      if (filterStatus !== "ALL") {
        params.append("status", filterStatus);
      }

      const [usersRes, departmentsRes, metricsRes] = await Promise.all([
        fetch(`/api/users?${params.toString()}`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }),
        fetch("/api/departments", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }),
        fetch("/api/dashboard/users/metrics", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        const total = data.pagination?.total || data.users?.length || 0;
        const totalPages = total > 0 ? Math.ceil(total / itemsPerPage) : 1;

        if (total > 0 && currentPage > totalPages) {
          setCurrentPage(totalPages);
          return;
        }

        if (total === 0 && currentPage !== 1) {
          setCurrentPage(1);
          return;
        }

        setUsers(data.users || []);
        setTotalUsers(total);
      }

      if (departmentsRes.ok) {
        const data = await departmentsRes.json();
        setDepartments(data.departments || []);
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setUserMetrics(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
      setMetricsLoading(false);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setDeleteTarget(userId);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/users/${deleteTarget}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("User deleted successfully");
        fetchData();
        setShowDeleteModal(false);
        setDeleteTarget(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("Failed to delete user");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  if (!authChecked || loading || metricsLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>

        {/* Metrics Cards Skeleton */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="h-8 bg-gray-200 rounded w-full mb-4"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Access Denied</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                User Management Access Restricted
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  You do not have permission to access user management features.
                </p>
                <p className="mt-1">
                  This section is restricted to Administrators only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage user accounts and permissions</p>
        </div>
        <Link
          href="/dashboard/admin/users/add"
          className="btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add User
        </Link>
      </div>

      {/* User Metrics Dashboard */}
      {userMetrics && (
        <UserMetrics
          totalUsers={userMetrics.totalUsers}
          activeUsers={userMetrics.activeUsers}
          inactiveUsers={userMetrics.inactiveUsers}
          newUsers={userMetrics.newUsers}
          avgAccountAge={userMetrics.avgAccountAge}
          growthPercentage={userMetrics.growthPercentage}
          usersByRole={userMetrics.usersByRole}
          roleDistribution={userMetrics.roleDistribution}
        />
      )}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page when searching
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              className="input"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1); // Reset to first page when filtering
              }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <Table
        columns={[
          ...columns,
          {
            header: "Actions",
            accessor: "actions",
            render: (_: any, row: User) => (
              <div className="flex space-x-2">
                <Link
                  href={`/dashboard/admin/users/${row.id}`}
                  className="text-blue-600 hover:text-blue-900"
                  title="Edit User"
                >
                  <PencilIcon className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => {
                    // Navigate to user profile page if employee exists
                    if (row.employee?.id) {
                      window.open(
                        `/dashboard/user/${row.employee.id}`,
                        "_blank"
                      );
                    }
                  }}
                  className="text-blue-600 hover:text-blue-900"
                  title="View Profile"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteUser(row.id)}
                  className="text-red-600 hover:text-red-900"
                  title="Delete User"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        data={users}
        showPagination={true}
        currentPage={currentPage}
        totalPages={Math.ceil(totalUsers / itemsPerPage)}
        totalItems={totalUsers}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">
                Delete user
              </h2>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete this user account? This action cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!deleteLoading) {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                  }
                }}
                className="btn-outline"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="btn-danger"
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
