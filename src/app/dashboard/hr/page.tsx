"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UsersIcon,
  ClockIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserPlusIcon,
  AcademicCapIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface HRStats {
  totalEmployees: number;
  pendingLeaves: number;
  newHires: number;
  performanceReviews: number;
  trainingPrograms: number;
  presentToday: number;
  absentToday: number;
}

interface LeaveRequest {
  id: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
}

export default function HRDashboard() {
  const [stats, setStats] = useState<HRStats>({
    totalEmployees: 0,
    pendingLeaves: 0,
    newHires: 0,
    performanceReviews: 0,
    trainingPrograms: 0,
    presentToday: 0,
    absentToday: 0,
  });
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHRData();
  }, []);

  const fetchHRData = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const [statsRes, leavesRes] = await Promise.all([
        fetch("/api/dashboard/hr-stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/leave-requests?status=PENDING&limit=5", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (leavesRes.ok) {
        const data = await leavesRes.json();
        setLeaveRequests(data.leaveRequests || []);
      }
    } catch (error) {
      console.error("Failed to fetch HR data:", error);
      toast.error("Failed to load HR dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveAction = async (leaveId: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch(`/api/leave-requests/${leaveId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: action }),
      });

      if (response.ok) {
        toast.success(`Leave request ${action.toLowerCase()}`);
        fetchHRData();
      } else {
        toast.error("Failed to update leave request");
      }
    } catch (error) {
      console.error("Failed to update leave request:", error);
      toast.error("Failed to update leave request");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            👥 HR Dashboard
          </h1>
          <p className="text-gray-600">
            Human Resources management and employee relations
          </p>
        </div>
        <div className="flex space-x-3">
          <Link href="/dashboard/employees/add" className="btn-primary flex items-center">
            <UserPlusIcon className="h-5 w-5 mr-2" />
            Add Employee
          </Link>
          <Link href="/dashboard/leave" className="btn-outline flex items-center">
            <CalendarDaysIcon className="h-5 w-5 mr-2" />
            Manage Leaves
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalEmployees}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Present Today</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.presentToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Absent Today</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.absentToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <CalendarDaysIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Leaves</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingLeaves}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/dashboard/employees"
              className="btn-primary p-4 text-center block hover:scale-105 transition-transform"
            >
              <UsersIcon className="h-6 w-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Manage Employees</div>
            </Link>
            <Link
              href="/dashboard/leave"
              className="btn-secondary p-4 text-center block hover:scale-105 transition-transform"
            >
              <CalendarDaysIcon className="h-6 w-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Leave Management</div>
            </Link>
            <Link
              href="/dashboard/performance"
              className="btn-outline p-4 text-center block hover:scale-105 transition-transform"
            >
              <ChartBarIcon className="h-6 w-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Performance Reviews</div>
            </Link>
            <Link
              href="/dashboard/training"
              className="btn-outline p-4 text-center block hover:scale-105 transition-transform"
            >
              <AcademicCapIcon className="h-6 w-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Training Programs</div>
            </Link>
          </div>
        </div>

        {/* Pending Leave Requests */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Leave Requests</h3>
          <div className="space-y-3">
            {leaveRequests.length > 0 ? (
              leaveRequests.map((leave) => (
                <div key={leave.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {leave.employee.firstName} {leave.employee.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {leave.employee.employeeId} • {leave.type}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleLeaveAction(leave.id, 'APPROVED')}
                        className="text-green-600 hover:text-green-900 text-xs px-2 py-1 rounded bg-green-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleLeaveAction(leave.id, 'REJECTED')}
                        className="text-red-600 hover:text-red-900 text-xs px-2 py-1 rounded bg-red-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <CalendarDaysIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No pending leave requests</p>
              </div>
            )}
          </div>
          {leaveRequests.length > 0 && (
            <Link
              href="/dashboard/leave"
              className="mt-4 text-primary-600 hover:text-primary-900 text-sm font-medium flex items-center"
            >
              View All Leave Requests
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
