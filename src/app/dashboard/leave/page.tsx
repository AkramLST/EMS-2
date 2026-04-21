"use client";

import { useEffect, useState, useRef } from "react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Pagination from "@/components/ui/Pagination";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import { usePermissions } from "@/hooks/usePermission";

interface LeaveType {
  id: string;
  name: string;
  maxDaysPerYear: number;
  carryForward: boolean;
  encashable: boolean;
}

interface LeaveApplication {
  id: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  appliedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  comments?: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    designation:
      | {
          id: string;
          title: string;
        }
      | string; // Support both object and string for backward compatibility
    manager?: {
      firstName: string;
      lastName: string;
    };
  };
  approvedByEmployee?: {
    firstName: string;
    lastName: string;
  };
}

interface LeaveBalance {
  leaveType: LeaveType;
  allocated: number;
  used: number;
  remaining: number;
  carryForward: number;
}

interface User {
  id: string;
  email: string;
  role: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    designation:
      | {
          id: string;
          title: string;
        }
      | string; // Support both object and string for backward compatibility
  };
}

export default function LeavePage() {
  const [leaveApplications, setLeaveApplications] = useState<
    LeaveApplication[]
  >([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]); // Add holidays state
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingLeave, setViewingLeave] = useState<LeaveApplication | null>(
    null,
  );
  // Replace individual state variables with a single state for all dialogs
  const [dialogState, setDialogState] = useState({
    type: "" as "delete" | "approve" | "reject" | "",
    open: false,
    applicationId: "",
    comments: "",
  });
  // Restore necessary states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalLeaveApplications, setTotalLeaveApplications] = useState(0);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const { permissions } = usePermissions(currentUser?.role || "");

  // Form states
  const [formData, setFormData] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentPage, itemsPerPage]);
  const hasPermission = (perm: string) => {
    if (currentUser?.role === "ADMINISTRATOR") return true;
    return permissions.includes(perm);
  };
  // Close filters when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filtersRef.current &&
        !filtersRef.current.contains(event.target as Node)
      ) {
        setShowFilters(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch holidays when component mounts
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const response = await fetch("/api/holidays", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (response.ok) {
          const data = await response.json();
          setHolidays(data.holidays || []);
        }
      } catch (error) {
        console.error("Failed to fetch holidays:", error);
      }
    };

    fetchHolidays();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData.user);
        setCurrentUserRole(userData.user.role);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch user data first
      await fetchUserData();

      // Fetch leave applications with pagination
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());

      const leaveResponse = await fetch(
        `/api/leave/applications?${params.toString()}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (leaveResponse.ok) {
        const leaveData = await leaveResponse.json();
        setLeaveApplications(leaveData.applications || []);
        setTotalLeaveApplications(
          leaveData.pagination?.total || leaveData.applications?.length || 0,
        );

        // Remove leaveStats calculation
      }

      // Fetch leave types
      const typesResponse = await fetch("/api/leave/types", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (typesResponse.ok) {
        const typesData = await typesResponse.json();
        setLeaveTypes(typesData.leaveTypes || []);
      }

      // Fetch leave balances
      const balancesResponse = await fetch("/api/leave/balances", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (balancesResponse.ok) {
        const balancesData = await balancesResponse.json();
        setLeaveBalances(balancesData.balances || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load leave data");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Calculate working days between two dates, excluding weekends and holidays
  const calculateWorkingDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return 0;
    }

    let workingDays = 0;
    const currentDate = new Date(start);

    // Convert holidays to a Set for faster lookup
    const holidayDates = new Set(
      holidays.map(
        (holiday: any) => new Date(holiday.date).toISOString().split("T")[0],
      ),
    );

    // Iterate through each day
    while (currentDate <= end) {
      // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
      const dayOfWeek = currentDate.getDay();

      // Check if it's a weekday (Monday to Friday)
      if (dayOfWeek > 0 && dayOfWeek < 6) {
        // Check if it's not a holiday
        const currentDateStr = currentDate.toISOString().split("T")[0];
        if (!holidayDates.has(currentDateStr)) {
          workingDays++;
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Use the working days calculation instead of simple day difference
      const totalDays = calculateWorkingDays(
        formData.startDate,
        formData.endDate,
      );

      const response = await fetch("/api/leave/applications", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          totalDays,
        }),
      });

      if (response.ok) {
        toast.success("Leave application submitted successfully");
        setShowModal(false);
        setFormData({
          leaveTypeId: "",
          startDate: "",
          endDate: "",
          reason: "",
        });
        fetchData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to submit leave application");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit leave application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/leave/applications/${id}/approve`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Leave application approved");
        fetchData();
      } else {
        const errorData = await response.json();
        console.error("Approve error:", errorData);
        toast.error(errorData.message || "Failed to approve leave request");
      }
    } catch (error) {
      console.error("Approve error:", error);
      toast.error("Failed to approve leave request");
    }
  };

  const handleReject = async (id: string, comments: string) => {
    try {
      const response = await fetch(`/api/leave/applications/${id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comments }),
      });

      if (response.ok) {
        toast.success("Leave application rejected");
        fetchData();
      } else {
        const errorData = await response.json();
        console.error("Reject error:", errorData);
        toast.error(errorData.message || "Failed to reject leave request");
      }
    } catch (error) {
      console.error("Reject error:", error);
      toast.error("Failed to reject leave request");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/leave/applications/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Leave application deleted");
        fetchData();
      } else {
        const errorData = await response.json();
        console.error("Delete error:", errorData);
        toast.error(errorData.message || "Failed to delete leave request");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete leave request");
    }
  };

  // Updated function to handle all confirmation dialogs
  const openConfirmDialog = (
    type: "delete" | "approve" | "reject",
    id: string,
  ) => {
    setDialogState({
      type,
      open: true,
      applicationId: id,
      comments: "",
    });
  };

  const closeConfirmDialog = () => {
    setDialogState({
      type: "",
      open: false,
      applicationId: "",
      comments: "",
    });
  };

  // Updated functions to proceed with actions
  const proceedWithAction = async () => {
    switch (dialogState.type) {
      case "delete":
        await handleDelete(dialogState.applicationId);
        break;
      case "approve":
        await handleApprove(dialogState.applicationId);
        break;
      case "reject":
        await handleReject(dialogState.applicationId, dialogState.comments);
        break;
    }
    closeConfirmDialog();
  };

  const filteredApplications = leaveApplications.filter((application) => {
    const matchesSearch =
      application.employee.firstName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      application.employee.lastName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      application.employee.employeeId
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      application.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || application.status === statusFilter;
    const matchesType = !typeFilter || application.leaveType.id === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
      CANCELLED: "bg-gray-100 text-gray-800",
    };
    return (
      statusConfig[status as keyof typeof statusConfig] ||
      "bg-gray-100 text-gray-800"
    );
  };

  // Add function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case "APPROVED":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "REJECTED":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="bg-gray-200 h-96 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          Leave Management
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Apply Leave</span>
        </button>
      </div>

      {/* Stats Cards - Remove this entire section */}

      {/* Leave Balances - Improve this section */}
      {leaveBalances.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Your Leave Balances
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaveBalances.map((balance) => (
              <div
                key={balance.leaveType.id}
                className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">
                    {balance.leaveType.name}
                  </h3>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {balance.remaining} days
                    </span>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Allocated:</span>
                    <span className="text-gray-900 font-medium">
                      {balance.allocated} days
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Used:</span>
                    <span className="text-gray-900 font-medium">
                      {balance.used} days
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-gray-500">Remaining:</span>
                    <span
                      className={`font-bold ${
                        balance.remaining === 0
                          ? "text-red-600"
                          : (balance.used / balance.allocated) * 100 < 50
                            ? "text-green-600"
                            : (balance.used / balance.allocated) * 100 < 80
                              ? "text-yellow-600"
                              : "text-red-600"
                      }`}
                    >
                      {balance.remaining} days
                    </span>
                  </div>
                  {balance.carryForward > 0 && (
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                      <span className="text-gray-500">Carry Forward:</span>
                      <span className="text-blue-600 font-medium">
                        {balance.carryForward} days
                      </span>
                    </div>
                  )}
                </div>
                {/* Progress bar for visual representation */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={
                        balance.remaining === 0
                          ? "bg-red-600 h-2 rounded-full"
                          : (balance.used / balance.allocated) * 100 < 50
                            ? "bg-green-600 h-2 rounded-full"
                            : (balance.used / balance.allocated) * 100 < 80
                              ? "bg-yellow-600 h-2 rounded-full"
                              : "bg-red-600 h-2 rounded-full"
                      }
                      style={{
                        width: `${Math.min(
                          100,
                          (balance.used / balance.allocated) * 100,
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="relative" ref={filtersRef}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center space-x-2"
              >
                <FunnelIcon className="h-5 w-5" />
                <span>Filters</span>
              </button>

              {showFilters && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Leave Type
                      </label>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">All Types</option>
                        {leaveTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setStatusFilter("");
                          setTypeFilter("");
                        }}
                        className="flex-1 btn-secondary text-sm"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => setShowFilters(false)}
                        className="flex-1 btn-primary text-sm"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* Hide employee column for employees */}
                {currentUserRole !== "EMPLOYEE" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leave Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredApplications.map((application) => (
                <tr key={application.id} className="hover:bg-gray-50">
                  {/* Hide employee column for employees */}
                  {currentUserRole !== "EMPLOYEE" && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {application.employee.firstName}{" "}
                          {application.employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {application.employee.employeeId} •{" "}
                          {typeof application.employee.designation === "string"
                            ? application.employee.designation
                            : application.employee.designation.title}
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {application.leaveType.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(application.startDate).toLocaleDateString()} -
                      <br />
                      {new Date(application.endDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {application.totalDays} days
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(application.status)}
                      <span
                        className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                          application.status,
                        )}`}
                      >
                        {application.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(application.appliedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setViewingLeave(application);
                          setShowViewModal(true);
                        }}
                        className="text-gray-600 hover:text-gray-900"
                        title="View Details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      {/* Delete button for employees to delete their own pending applications */}
                      {currentUser?.employee?.id === application.employee.id &&
                        application.status === "PENDING" && (
                          <button
                            onClick={() =>
                              openConfirmDialog("delete", application.id)
                            }
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      {application.status === "PENDING" && (
                        <>
                          {hasPermission("leave.approve") && (
                            <button
                              onClick={() =>
                                openConfirmDialog("approve", application.id)
                              }
                              className="text-green-600 hover:text-green-900"
                              title="Approve"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                          )}
                          {hasPermission("leave.reject") && (
                            <button
                              onClick={() =>
                                openConfirmDialog("reject", application.id)
                              }
                              className="text-red-600 hover:text-red-900"
                              title="Reject"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredApplications.length === 0 && (
            <div className="text-center py-12">
              <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No leave applications
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {leaveApplications.length === 0
                  ? "No leave applications have been submitted yet."
                  : "No leave applications match your current filters."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalLeaveApplications / itemsPerPage)}
        totalItems={totalLeaveApplications}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        itemsPerPage={itemsPerPage}
      />

      {/* Apply Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Apply for Leave
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type *
                  </label>
                  <select
                    value={formData.leaveTypeId}
                    onChange={(e) =>
                      setFormData({ ...formData, leaveTypeId: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} (Max: {type.maxDaysPerYear} days/year)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                {formData.startDate && formData.endDate && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm text-blue-700">
                      Working days (excluding weekends and holidays):{" "}
                      {calculateWorkingDays(
                        formData.startDate,
                        formData.endDate,
                      )}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason *
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Please provide reason for leave..."
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 btn-secondary"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Leave Modal */}
      {showViewModal && viewingLeave && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Leave Application Details
                </h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="detail-label">Employee</label>
                  <p className="detail-value">
                    {viewingLeave.employee.firstName}{" "}
                    {viewingLeave.employee.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {viewingLeave.employee.employeeId} •{" "}
                    {typeof viewingLeave.employee.designation === "string"
                      ? viewingLeave.employee.designation
                      : viewingLeave.employee.designation.title}
                  </p>
                </div>

                {viewingLeave.employee.manager && (
                  <div>
                    <label className="detail-label">Reporting Manager</label>
                    <p className="detail-value">
                      {viewingLeave.employee.manager.firstName}{" "}
                      {viewingLeave.employee.manager.lastName}
                    </p>
                  </div>
                )}

                <div>
                  <label className="detail-label">Leave Type</label>
                  <p className="detail-value">{viewingLeave.leaveType.name}</p>
                </div>

                <div>
                  <label className="detail-label">Duration</label>
                  <p className="detail-value">
                    {new Date(viewingLeave.startDate).toLocaleDateString()} -{" "}
                    {new Date(viewingLeave.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {viewingLeave.totalDays} days
                  </p>
                </div>

                <div>
                  <label className="detail-label">Status</label>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                      viewingLeave.status,
                    )}`}
                  >
                    {viewingLeave.status}
                  </span>
                </div>

                <div>
                  <label className="detail-label">Reason</label>
                  <p className="detail-value">{viewingLeave.reason}</p>
                </div>

                <div>
                  <label className="detail-label">Applied Date</label>
                  <p className="detail-value">
                    {new Date(viewingLeave.appliedAt).toLocaleString()}
                  </p>
                </div>

                {viewingLeave.approvedAt && (
                  <div>
                    <label className="detail-label">Approved Date</label>
                    <p className="detail-value">
                      {new Date(viewingLeave.approvedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {viewingLeave.approvedByEmployee && (
                  <div>
                    <label className="detail-label">Approved By</label>
                    <p className="detail-value">
                      {viewingLeave.approvedByEmployee.firstName}{" "}
                      {viewingLeave.approvedByEmployee.lastName}
                    </p>
                  </div>
                )}

                {viewingLeave.comments && (
                  <div>
                    <label className="detail-label">Comments</label>
                    <p className="detail-value">{viewingLeave.comments}</p>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="w-full btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={dialogState.open}
        onClose={closeConfirmDialog}
        onConfirm={proceedWithAction}
        title={
          dialogState.type === "delete"
            ? "Confirm Deletion"
            : dialogState.type === "approve"
              ? "Confirm Approval"
              : dialogState.type === "reject"
                ? "Confirm Rejection"
                : ""
        }
        message={
          dialogState.type === "delete"
            ? "Are you sure you want to delete this leave request? This action cannot be undone."
            : dialogState.type === "approve"
              ? "Are you sure you want to approve this leave request?"
              : dialogState.type === "reject"
                ? "Are you sure you want to reject this leave request?"
                : ""
        }
        type={
          dialogState.type === "delete" || dialogState.type === "reject"
            ? "danger"
            : "success"
        }
        confirmText={
          dialogState.type === "delete"
            ? "Delete"
            : dialogState.type === "approve"
              ? "Approve"
              : dialogState.type === "reject"
                ? "Reject"
                : "Confirm"
        }
      >
        {dialogState.type === "reject" && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason (Optional)
            </label>
            <textarea
              value={dialogState.comments}
              onChange={(e) =>
                setDialogState({
                  ...dialogState,
                  comments: e.target.value,
                })
              }
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Please provide reason for rejection..."
            />
          </div>
        )}
      </ConfirmationDialog>
    </div>
  );
}
