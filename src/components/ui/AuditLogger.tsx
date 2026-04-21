"use client";

import { useEffect, useRef, useState } from "react";
import {
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  FunnelIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Table from "@/components/ui/Table";
import toast from "react-hot-toast";

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  user: {
    id: string;
  };
}

export default function AuditLogger() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [resourceFilter, setResourceFilter] = useState("ALL");
  const [resourceIdFilter, setResourceIdFilter] = useState("");
  const [ipFilter, setIpFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState("");
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalLogs, setTotalLogs] = useState(0);

  // Fetch employees for the employee filter dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("/api/employees", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setEmployees(data.employees || []);
        }
      } catch (error) {
        console.error("Failed to fetch employees:", error);
      }
    };

    fetchEmployees();
  }, []);

  // Fetch audit logs when filters change (initial load or filter updates)
  useEffect(() => {
    fetchAuditLogs(false);
  }, [actionFilter, employeeFilter, resourceFilter, resourceIdFilter, ipFilter, startDate, endDate]);

  // Fetch audit logs when pagination changes (no loading indicator)
  useEffect(() => {
    if (!initialLoading) {
      fetchAuditLogs(true);
    }
  }, [currentPage, itemsPerPage]);

  const fetchAuditLogs = async (isPaginationUpdate = false) => {
    try {
      // Only show loading for initial load or filter updates, not pagination
      if (!isPaginationUpdate) {
        setInitialLoading(true);
      }

      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());

      if (actionFilter !== "ALL") params.append("action", actionFilter);
      if (employeeFilter !== "ALL") params.append("employee", employeeFilter);
      if (resourceFilter !== "ALL") params.append("resource", resourceFilter);
      if (resourceIdFilter) params.append("resourceId", resourceIdFilter);
      if (ipFilter) params.append("ipAddress", ipFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/audit-logs?${params.toString()}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotalLogs(data.pagination?.totalItems || data.logs?.length || 0);
        setSelectedLogIds([]);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      // Only hide loading for initial load or filter updates, not pagination
      if (!isPaginationUpdate) {
        setInitialLoading(false);
      }
    }
  };

  const toggleLogSelection = (logId: string) => {
    setSelectedLogIds((prev) =>
      prev.includes(logId)
        ? prev.filter((id) => id !== logId)
        : [...prev, logId]
    );
  };

  const handleSelectAllOnPage = (checked: boolean) => {
    const pageLogIds = logs.map((log) => log.id);

    if (checked) {
      setSelectedLogIds((prev) => {
        const merged = new Set([...prev, ...pageLogIds]);
        return Array.from(merged);
      });
    } else {
      const pageIdSet = new Set(pageLogIds);
      setSelectedLogIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    }
  };

  const isAllSelectedOnPage =
    logs.length > 0 && logs.every((log) => selectedLogIds.includes(log.id));

  const isPartiallySelectedOnPage =
    logs.some((log) => selectedLogIds.includes(log.id)) && !isAllSelectedOnPage;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isPartiallySelectedOnPage;
    }
  }, [isPartiallySelectedOnPage, isAllSelectedOnPage]);

  const handleDeleteSelected = async () => {
    if (selectedLogIds.length === 0) {
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${selectedLogIds.length} audit log(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeleteLoading(true);

    try {
      const response = await fetch("/api/audit-logs", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ logIds: selectedLogIds }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        const deletedCount = data?.deleted ?? selectedLogIds.length;
        toast.success(
          deletedCount === 1
            ? "Deleted 1 audit log"
            : `Deleted ${deletedCount} audit logs`
        );
        setSelectedLogIds([]);
        await fetchAuditLogs(false);
      } else {
        const errorData = await response.json().catch(() => null);
        toast.error(errorData?.message || "Failed to delete audit logs");
      }
    } catch (error) {
      console.error("Failed to delete audit logs:", error);
      toast.error("Failed to delete audit logs");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (
      !confirm(
        "This will permanently delete all audit logs. Are you sure you want to continue?"
      )
    ) {
      return;
    }

    setDeleteLoading(true);

    try {
      const response = await fetch("/api/audit-logs", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deleteAll: true }),
      });

      if (response.ok) {
        const data = await response.json().catch(() => null);
        const deletedCount = data?.deleted ?? 0;
        toast.success(
          deletedCount === 1
            ? "Deleted 1 audit log"
            : `Deleted ${deletedCount} audit logs`
        );
        setSelectedLogIds([]);
        await fetchAuditLogs(false);
      } else {
        const errorData = await response.json().catch(() => null);
        toast.error(errorData?.message || "Failed to delete audit logs");
      }
    } catch (error) {
      console.error("Failed to delete audit logs:", error);
      toast.error("Failed to delete audit logs");
    } finally {
      setDeleteLoading(false);
    }
  };

  const clearFilters = () => {
    setActionFilter("ALL");
    setEmployeeFilter("ALL");
    setResourceFilter("ALL");
    setResourceIdFilter("");
    setIpFilter("");
    setStartDate("");
    setEndDate("");
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
        return "bg-green-100 text-green-800";
      case "update":
        return "bg-blue-100 text-blue-800";
      case "delete":
        return "bg-red-100 text-red-800";
      case "login":
        return "bg-purple-100 text-purple-800";
      case "logout":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "login":
      case "logout":
        return <UserIcon className="h-4 w-4" />;
      case "create":
      case "update":
      case "delete":
        return <DocumentTextIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const showFullDetails = (details: string) => {
    setSelectedDetails(details);
    setShowDetailsModal(true);
  };

  const selectionColumn = {
    header: (
      <input
        ref={selectAllRef}
        type="checkbox"
        className="h-4 w-4 text-primary-600 border-gray-300 rounded"
        checked={isAllSelectedOnPage}
        onChange={(event) => handleSelectAllOnPage(event.target.checked)}
        aria-label="Select all audit logs on this page"
        disabled={logs.length === 0}
      />
    ),
    accessor: "selection",
    className: "w-12 text-center align-middle",
    primary: false,
    render: (_: any, row: AuditLog) => (
      <input
        type="checkbox"
        className="h-4 w-4 text-primary-600 border-gray-300 rounded"
        checked={selectedLogIds.includes(row.id)}
        onChange={(event) => {
          event.stopPropagation();
          toggleLogSelection(row.id);
        }}
        aria-label={`Select audit log ${row.id}`}
      />
    ),
  };

  // Define table columns with fixed widths
  const columns = [
    {
      header: "User",
      accessor: "userName",
      className: "w-[20%] min-w-[180px]", // 20% width with minimum width
      primary: true,
      render: (_: any, row: AuditLog) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center ${getActionColor(
                row.action
              )}`}
            >
              {getActionIcon(row.action)}
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              <button
                onClick={() => {
                  // Navigate to user profile page if userId is available
                  if (row.userId) {
                    window.open(`/dashboard/user/${row.userId}`, "_blank");
                  }
                }}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {row.userName}
              </button>
            </div>
            <div className="text-sm text-gray-500">{row.ipAddress}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Action",
      accessor: "action",
      className: "w-[10%] min-w-[90px]", // 10% width with minimum width
      render: (value: string) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(
            value
          )}`}
        >
          {value}
        </span>
      ),
    },
    {
      header: "Resource",
      accessor: "resource",
      className: "w-[20%] min-w-[150px]", // 20% width with minimum width
      render: (_: any, row: AuditLog) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {row.resource}
          </div>
          <div className="text-sm text-gray-500">{row.resourceId}</div>
        </div>
      ),
    },
    {
      header: "Details",
      accessor: "details",
      className: "w-[35%] min-w-[200px]",
      render: (value: string) => {
        // Show a preview with a "Show More" link for long texts
        const isLongText = value && value.length > 100;
        const previewText = isLongText
          ? value.substring(0, 100) + "..."
          : value;

        return (
          <div className="text-sm text-gray-900 break-words">
            {isLongText ? (
              <div className="w-full">
                <div
                  className="w-full overflow-hidden text-ellipsis pr-2"
                  title={value}
                >
                  {previewText}
                </div>
                <button
                  onClick={() => {
                    setSelectedDetails(value);
                    setShowDetailsModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-xs mt-1"
                >
                  Show Full Details
                </button>
              </div>
            ) : (
              <div className="w-full">{value}</div>
            )}
          </div>
        );
      },
    },
    {
      header: "Timestamp",
      accessor: "timestamp",
      className: "w-[15%] min-w-[150px] whitespace-nowrap",
      render: (value: string) => {
        const date = new Date(value);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const formatDate = (dateToFormat: Date) => {
          const isToday = dateToFormat.toDateString() === today.toDateString();
          const isYesterday =
            dateToFormat.toDateString() === yesterday.toDateString();

          let dateStr = "";

          if (isToday) {
            dateStr = "Today";
          } else if (isYesterday) {
            dateStr = "Yesterday";
          } else {
            dateStr = dateToFormat.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
          }

          const timeStr = dateToFormat.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });

          return `${dateStr}, ${timeStr}`;
        };

        return (
          <div
            className="text-sm text-gray-500 whitespace-nowrap"
            title={date.toLocaleString()}
          >
            {formatDate(date)}
          </div>
        );
      },
    },
  ];

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Audit Logs</h1>
          <button className="flex items-center gap-2 btn-secondary">
            <FunnelIcon className="h-5 w-5" />
            Show Filters
          </button>
        </div>

        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Audit Logs</h1>
          {selectedLogIds.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {selectedLogIds.length} selected
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 btn-secondary"
          >
            <FunnelIcon className="h-5 w-5" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedLogIds.length === 0 || deleteLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrashIcon className="h-5 w-5" />
            Delete Selected
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={deleteLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrashIcon className="h-5 w-5" />
            Delete All
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="input w-full"
              >
                <option value="ALL">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
              </select>
            </div>

            {/* Employee Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee
              </label>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="input w-full"
              >
                <option value="ALL">All Employees</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.user.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Resource Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource Type
              </label>
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
                className="input w-full"
              >
                <option value="ALL">All Resources</option>
                <option value="employee">Employee</option>
                <option value="user">User</option>
                <option value="department">Department</option>
                <option value="designation">Designation</option>
                <option value="leave">Leave</option>
                <option value="attendance">Attendance</option>
                <option value="payroll">Payroll</option>
                <option value="performance">Performance</option>
                <option value="training">Training</option>
                <option value="asset">Asset</option>
                <option value="inventory">Inventory</option>
                <option value="announcement">Announcement</option>
                <option value="holiday">Holiday</option>
                <option value="session">Session</option>
              </select>
            </div>

            {/* Resource ID Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource ID
              </label>
              <input
                type="text"
                value={resourceIdFilter}
                onChange={(e) => setResourceIdFilter(e.target.value)}
                placeholder="Enter resource ID..."
                className="input w-full"
              />
            </div>

            {/* IP Address Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IP Address
              </label>
              <input
                type="text"
                value={ipFilter}
                onChange={(e) => setIpFilter(e.target.value)}
                placeholder="Enter IP address..."
                className="input w-full"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input w-full"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input w-full"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4 space-x-2">
            <button onClick={clearFilters} className="btn-secondary">
              Clear Filters
            </button>
            <button
              onClick={() => fetchAuditLogs(false)}
              className="btn-primary"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <Table
        columns={[selectionColumn, ...columns]}
        data={logs}
        showPagination={true}
        currentPage={currentPage}
        totalPages={Math.ceil(totalLogs / itemsPerPage)}
        totalItems={totalLogs}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        emptyMessage="No audit logs found"
      />

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Audit Log Details
              </h3>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <pre className="whitespace-pre-wrap break-words text-sm text-gray-800">
                {selectedDetails}
              </pre>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
