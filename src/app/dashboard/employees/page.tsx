"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Table from "../../../components/ui/Table";
import EmployeeMetrics from "../../../components/dashboard/EmployeeMetrics";
import StatusIndicator from "../../../components/ui/StatusIndicator";
import { usePermissions } from "@/hooks/usePermission";

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string | null; // Profile image URL or path
  designation:
    | {
        id: string;
        title: string;
      }
    | string; // Support both object and string for backward compatibility
  department: {
    name: string;
  };
  status: string;
  joinDate: string;
  user: {
    id: string;
    role: string;
    sessions: {
      status: "ONLINE" | "AWAY" | "BUSY" | "OFFLINE";
      lastActivity: string;
    }[];
  };
}

interface DashboardMetrics {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees?: number;
  newHires: number;
  departments: {
    name: string;
    count: number;
  }[];
  turnoverRate: number;
  avgTenure: number;
  openPositions?: number;
  genderDiversity?: {
    male: number;
    female: number;
    other: number;
  };
  growthPercentage?: number;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [showUserModal, setShowUserModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    employeeId: "",
    designation: "",
    departmentId: "",
    status: "ACTIVE",
    employmentType: "FULL_TIME",
    joinDate: new Date().toISOString().split("T")[0],
  });
  const [emailValidation, setEmailValidation] = useState({
    isChecking: false,
    isValid: true,
    message: "",
  });
  const [selectedRoles, setSelectedRoles] = useState(["EMPLOYEE"]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    employeeId: string | null;
    employeeName: string | null;
  }>({ open: false, employeeId: null, employeeName: null });
  const selectAllRef = useRef<HTMLInputElement>(null);
  const { permissions } = usePermissions(userRole || "");
  const hasPermission = (perm: string) => {
    if (userRole === "ADMINISTRATOR") return true;
    return permissions.includes(perm);
  };
  useEffect(() => {
    fetchData();
  }, [currentPage, itemsPerPage, searchTerm, filterStatus]);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserRole(data.user?.role ?? null);
        }
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      }
    };

    fetchUserRole();
  }, []);

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

      const [employeesRes, metricsRes] = await Promise.all([
        fetch(`/api/employees?${params.toString()}`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }),
        fetch("/api/dashboard/employees/metrics", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (employeesRes.status === 403) {
        const errorData = await employeesRes.json();
        setAccessDenied(true);
        // We can't know the role from the 403, so we'll just show a generic message
        // or we can try to get the user from /api/auth/me if needed.
        // For now, just denying access is enough.
        toast.error(
          errorData.message || "Access denied to employee management",
        );
        setLoading(false);
        setMetricsLoading(false);
        return;
      }

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.employees);
        setTotalEmployees(data.pagination?.total || data.employees.length);
        setSelectedEmployeeIds([]);
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
      setMetricsLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Employee deleted successfully");
        fetchData();
      } else {
        toast.error("Failed to delete employee");
      }
    } catch (error) {
      console.error("Failed to delete employee:", error);
      toast.error("Failed to delete employee");
    }
  };

  const openDeleteDialog = (employee: Employee) => {
    const fullName = `${employee.firstName ?? ""} ${employee.lastName ?? ""}`
      .trim()
      .replace(/\s+/g, " ");
    setConfirmDialog({
      open: true,
      employeeId: employee.id,
      employeeName: fullName || employee.email,
    });
  };

  const closeDeleteDialog = () => {
    setConfirmDialog({ open: false, employeeId: null, employeeName: null });
  };

  const confirmDelete = async () => {
    if (!confirmDialog.employeeId) return;
    const idToDelete = confirmDialog.employeeId;
    closeDeleteDialog();
    await handleDeleteEmployee(idToDelete);
  };

  const handleBulkDelete = async () => {
    if (selectedEmployeeIds.length === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedEmployeeIds.length} selected employee(s)?`,
      )
    ) {
      return;
    }

    try {
      const responses = await Promise.all(
        selectedEmployeeIds.map((employeeId) =>
          fetch(`/api/employees/${employeeId}`, {
            method: "DELETE",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }),
        ),
      );

      const failedResponses = responses.filter((response) => !response.ok);

      if (failedResponses.length === 0) {
        toast.success("Selected employees deleted successfully");
      } else {
        toast.error(
          `Failed to delete ${failedResponses.length} employee(s). Some records may remain.`,
        );
      }

      setSelectedEmployeeIds([]);
      await fetchData();
    } catch (error) {
      console.error("Failed to delete selected employees:", error);
      toast.error("Failed to delete selected employees");
    }
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId],
    );
  };

  const handleSelectAllOnPage = (checked: boolean) => {
    const pageEmployeeIds = employees.map((employee) => employee.id);

    if (checked) {
      setSelectedEmployeeIds((prev) => {
        const merged = new Set([...prev, ...pageEmployeeIds]);
        return Array.from(merged);
      });
    } else {
      const pageIdSet = new Set(pageEmployeeIds);
      setSelectedEmployeeIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    }
  };

  const isAllSelectedOnPage =
    employees.length > 0 &&
    employees.every((employee) => selectedEmployeeIds.includes(employee.id));

  const isPartiallySelectedOnPage =
    employees.some((employee) => selectedEmployeeIds.includes(employee.id)) &&
    !isAllSelectedOnPage;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isPartiallySelectedOnPage;
    }
  }, [isPartiallySelectedOnPage, isAllSelectedOnPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Define table columns with fixed widths
  const selectionColumn = {
    header: (
      <input
        ref={selectAllRef}
        type="checkbox"
        className="h-4 w-4 text-primary-600 border-gray-300 rounded"
        checked={isAllSelectedOnPage}
        onChange={(event) => handleSelectAllOnPage(event.target.checked)}
        aria-label="Select all employees on this page"
        disabled={employees.length === 0}
      />
    ),
    accessor: "selection",
    className: "w-12 text-center align-middle",
    primary: false,
    render: (_: any, row: Employee) => (
      <input
        type="checkbox"
        className="h-4 w-4 text-primary-600 border-gray-300 rounded"
        checked={selectedEmployeeIds.includes(row.id)}
        onChange={(event) => {
          event.stopPropagation();
          toggleEmployeeSelection(row.id);
        }}
        aria-label={`Select employee ${row.firstName} ${row.lastName}`}
      />
    ),
  };

  const columns = [
    {
      header: "Employee",
      accessor: "employee",
      className: "w-2/5",
      render: (_: any, row: Employee) => {
        const sessionStatus = row.user?.sessions?.[0]?.status ?? "OFFLINE";
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12">
              <Avatar
                employeeId={row.id}
                employeeName={`${row.firstName} ${row.lastName}`}
                profileImage={row.profileImage}
                size="md"
                showLink={true}
              />
            </div>
            <div className="ml-4">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-gray-900">
                  {row.firstName} {row.lastName}
                </div>
                <StatusIndicator
                  status={
                    sessionStatus as "ONLINE" | "AWAY" | "BUSY" | "OFFLINE"
                  }
                  size="sm"
                  showLabel={false}
                />
              </div>
              <div className="text-sm text-gray-500">{row.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Employee ID",
      accessor: "employeeId",
      className: "w-1/5",
      render: (_: any, row: Employee) => row.employeeId || "-",
    },
    {
      header: "Department",
      accessor: "department",
      className: "w-1/5",
      render: (_: any, row: Employee) => row.department?.name || "-",
    },
    {
      header: "Designation",
      accessor: "designation",
      className: "w-1/5",
      render: (_: any, row: Employee) => {
        const designation = row.designation;
        if (!designation) return "-";
        return typeof designation === "string"
          ? designation
          : designation.title;
      },
    },
    {
      header: "Status",
      accessor: "status",
      className: "w-1/12",
      render: (_: any, row: Employee) => {
        let statusClass = "bg-gray-100 text-gray-800";
        if (row.status === "ACTIVE")
          statusClass = "bg-green-100 text-green-800";
        if (row.status === "INACTIVE") statusClass = "bg-red-100 text-red-800";
        if (row.status === "TERMINATED")
          statusClass = "bg-yellow-100 text-yellow-800";

        return (
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}
          >
            {row.status}
          </span>
        );
      },
    },
    {
      header: "Role",
      accessor: "role",
      className: "w-1/12",
      render: (_: any, row: Employee) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          {row.user?.role ?? "EMPLOYEE"}
        </span>
      ),
    },
  ];

  const actionsColumn = {
    header: "Actions",
    accessor: "actions",
    className: "w-28 whitespace-nowrap text-right",
    render: (_: any, row: Employee) => (
      <div className="flex justify-end items-center gap-3 text-lg">
        <Link
          href={`/dashboard/profile?id=${encodeURIComponent(row.id)}`}
          className="text-indigo-500 hover:text-indigo-700 transition-colors"
          aria-label="View profile"
        >
          <EyeIcon className="h-5 w-5" />
        </Link>
        {hasPermission("user.update") && (
          <>
            <Link
              href={`/dashboard/employees/${row.id}/edit`}
              className="text-indigo-500 hover:text-indigo-700 transition-colors"
              aria-label="Edit employee"
            >
              <PencilIcon className="h-5 w-5" />
            </Link>
          </>
        )}
        {hasPermission("user.delete") && (
          <button
            type="button"
            className="text-red-500 hover:text-red-600 transition-colors"
            onClick={(event) => {
              event.stopPropagation();
              openDeleteDialog(row);
            }}
            aria-label="Delete employee"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    ),
  };

  const tableColumns = [...columns, actionsColumn];

  if (loading || metricsLoading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {hasPermission("user.create") && (
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
          <Link href="/dashboard/employees/add" className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Employee
          </Link>
        </div>
      )}

      {/* Metrics Dashboard */}
      {metrics && (
        <EmployeeMetrics
          totalEmployees={metrics.totalEmployees}
          activeEmployees={metrics.activeEmployees}
          inactiveEmployees={metrics.inactiveEmployees ?? 0}
          newHires={metrics.newHires}
          avgTenure={metrics.avgTenure}
          openPositions={metrics.openPositions ?? 0}
          genderDiversity={
            metrics.genderDiversity ?? { male: 0, female: 0, other: 0 }
          }
          growthPercentage={metrics.growthPercentage ?? 0}
        />
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
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
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <span className="text-sm text-gray-600">
          {selectedEmployeeIds.length} selected
        </span>
        <button
          onClick={handleBulkDelete}
          disabled={selectedEmployeeIds.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <TrashIcon className="h-5 w-5" />
          Delete Selected
        </button>
      </div>

      <Table
        columns={[selectionColumn, ...tableColumns]}
        data={employees}
        showPagination={true}
        currentPage={currentPage}
        totalPages={Math.ceil(totalEmployees / itemsPerPage)}
        totalItems={totalEmployees}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        emptyMessage="No employees found"
        paginationClassName="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4"
        itemsPerPageTextClassName="whitespace-nowrap"
      />

      <ConfirmationDialog
        open={confirmDialog.open}
        onClose={closeDeleteDialog}
        onConfirm={confirmDelete}
        title="Delete Employee"
        message={`Are you sure you want to delete ${confirmDialog.employeeName ?? "this employee"}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
