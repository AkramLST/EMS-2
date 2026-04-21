"use client";

import { useState, useEffect } from "react";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
  status: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: {
      name: string;
    };
  };
  createdAt: string;
}

interface LeaveRequestsListProps {
  userRole: string;
  refreshTrigger?: number;
}

export default function LeaveRequestsList({
  userRole,
  refreshTrigger,
}: LeaveRequestsListProps) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");

  useEffect(() => {
    fetchLeaveRequests();
  }, [refreshTrigger, filter]);

  const fetchLeaveRequests = async () => {
    try {
      const response = await fetch(`/api/leave/applications?status=${filter}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data.applications || []);
      }
    } catch (error) {
      console.error("Failed to fetch leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (
    requestId: string,
    action: "approve" | "reject"
  ) => {
    try {
      const response = await fetch(`/api/leave/applications/${requestId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: action === "approve" ? "APPROVED" : "REJECTED",
        }),
      });

      if (response.ok) {
        toast.success(
          `Leave request ${
            action === "approve" ? "approved" : "rejected"
          } successfully!`
        );
        fetchLeaveRequests();
      } else {
        const data = await response.json();
        toast.error(data.message || `Failed to ${action} leave request`);
      }
    } catch (error) {
      console.error(`Failed to ${action} leave request:`, error);
      toast.error(`Failed to ${action} leave request`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "REJECTED":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case "PENDING":
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const canManageRequests = [
    "ADMINISTRATOR",
    "HR_MANAGER",
    "DEPARTMENT_MANAGER",
  ].includes(userRole);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      {canManageRequests && (
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {["PENDING", "APPROVED", "REJECTED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                filter === status
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {/* Leave Requests List */}
      {leaveRequests.length === 0 ? (
        <div className="text-center py-8">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">
            No {filter.toLowerCase()} leave requests found
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaveRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(request.status)}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {request.employee.firstName} {request.employee.lastName}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {request.employee.employeeId}
                        {request.employee.department && (
                          <span className="ml-2">
                            • {request.employee.department.name}
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {request.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Type:</span>
                      <p className="text-gray-900">
                        {request.leaveType}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Duration:
                      </span>
                      <p className="text-gray-900">
                        {calculateDays(request.startDate, request.endDate)}{" "}
                        day(s)
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">From:</span>
                      <p className="text-gray-900">
                        {new Date(request.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">To:</span>
                      <p className="text-gray-900">
                        {new Date(request.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {request.reason && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-700">Reason:</span>
                      <p className="text-gray-900 text-sm mt-1">
                        {request.reason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {canManageRequests && request.status === "PENDING" && (
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleApproval(request.id, "approve")}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleApproval(request.id, "reject")}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
                    >
                      <XCircleIcon className="h-4 w-4 mr-1" />
                      Reject
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Submitted on {new Date(request.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
