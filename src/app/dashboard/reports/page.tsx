"use client";

import { useEffect, useState } from "react";
import {
  ChartBarIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  UsersIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { use } from "react";

interface ReportData {
  attendanceReport?: {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
  };
  departmentReport?: {
    name: string;
    employeeCount: number;
    presentCount: number;
  }[];
  leaveReport?: {
    pending: number;
    approved: number;
    rejected: number;
  };
  employeeReport?: {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    terminatedEmployees: number;
    recentHires: number;
  };
  departmentStats?: {
    name: string;
    employeeCount: number;
  }[];
  payrollReport?: {
    totalPayroll: number;
    totalEmployees: number;
    averageSalary: number;
    recordsProcessed: number;
  };
  departmentPayroll?: {
    name: string;
    totalAmount: number;
    employeeCount: number;
  }[];
}

export default function ReportsPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState("attendance");
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    // Fetch user role from auth API
    const fetchUserRole = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUserRole(userData.user.role);
          setUserDepartment(userData.user.employee?.department?.name || null);

          console.log("Reports page - User authentication successful:", {
            userId: userData.user.id,
            userRole: userData.user.role,
            userDepartment: userData.user.employee?.department?.name,
            hasLeaveRead: userData.user.role === "DEPARTMENT_MANAGER" || userData.user.role === "HR_MANAGER" || userData.user.role === "ADMINISTRATOR",
            hasLeaveReadAll: userData.user.role === "HR_MANAGER" || userData.user.role === "ADMINISTRATOR"
          });

          // Redirect if user is an employee
          if (userData.user.role === "EMPLOYEE") {
            router.push("/dashboard");
          }
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };

    fetchUserRole();
  }, [router]);

  useEffect(() => {
    fetchReportData();
  }, [selectedReport, dateRange]);

  const fetchReportData = async () => {
    try {
      let apiUrl = "";
      switch (selectedReport) {
        case "attendance":
          apiUrl = `/api/reports/attendance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
          break;
        case "employee":
          console.log("Fetching employee report...");
          apiUrl = `/api/reports/employee?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
          break;
        case "leave":
          console.log("Fetching leave report...");
          apiUrl = `/api/reports/leave?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
          break;
        case "payroll":
          console.log("Fetching payroll report...");
          apiUrl = `/api/reports/payroll?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
          break;
        default:
          return;
      }

      const response = await fetch(apiUrl, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Employee report data received:", data);
        setReportData(data);
      } else {
        const errorData = await response.json();
        console.error("Employee report error:", errorData);
        toast.error(`Failed to fetch report data: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      toast.error("Failed to fetch report data");
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format: "pdf" | "excel") => {
    try {
      const response = await fetch(`/api/reports/export`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportType: selectedReport,
          format,
          dateRange,
        }),
      });

      if (response.ok) {
        toast.success(`Report exported as ${format.toUpperCase()}`);
      } else {
        toast.error("Failed to export report");
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export report");
    }
  };

  const reportTypes = [
    { id: "attendance", name: "Attendance Report", icon: ClockIcon },
    { id: "employee", name: "Employee Report", icon: UsersIcon },
    { id: "leave", name: "Leave Report", icon: CalendarDaysIcon },
    { id: "payroll", name: "Payroll Report", icon: DocumentTextIcon },
  ];

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Reports & Analytics
          </h1>
          {userRole === "DEPARTMENT_MANAGER" && userDepartment && (
            <p className="text-sm text-blue-600 mt-1">
              📊 Showing data for {userDepartment} department only
            </p>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => handleExportReport("excel")}
            className="btn-outline"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export Excel
          </button>
          <button
            onClick={() => handleExportReport("pdf")}
            className="btn-primary"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Select Report Type
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reportTypes.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`p-4 border rounded-lg text-left transition-colors ${
                selectedReport === report.id
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <report.icon className="h-6 w-6 mb-2" />
              <div className="font-medium">{report.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Date Range</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              className="input"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              className="input"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">
          {reportTypes.find((r) => r.id === selectedReport)?.name}
        </h3>

        {selectedReport === "attendance" && reportData?.attendanceReport && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <UsersIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">
                      Total Employees
                    </p>
                    <p className="text-2xl font-semibold text-blue-900">
                      {reportData.attendanceReport.totalEmployees}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <ClockIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">
                      Present Today
                    </p>
                    <p className="text-2xl font-semibold text-green-900">
                      {reportData.attendanceReport.presentToday}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <ClockIcon className="h-8 w-8 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-600">
                      Absent Today
                    </p>
                    <p className="text-2xl font-semibold text-red-900">
                      {reportData.attendanceReport.absentToday}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <ClockIcon className="h-8 w-8 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-600">
                      Late Today
                    </p>
                    <p className="text-2xl font-semibold text-yellow-900">
                      {reportData.attendanceReport.lateToday}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Department-wise Attendance */}
            {reportData.departmentReport && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">
                  Department-wise Attendance
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Employees
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Present
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Attendance Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.departmentReport.map((dept, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {dept.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {dept.employeeCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {dept.presentCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {dept.employeeCount > 0
                              ? `${Math.round(
                                  (dept.presentCount / dept.employeeCount) * 100
                                )}%`
                              : "0%"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedReport === "employee" && reportData?.employeeReport && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <UsersIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">
                      Total Employees
                    </p>
                    <p className="text-2xl font-semibold text-blue-900">
                      {reportData.employeeReport.totalEmployees}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <UsersIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">Active</p>
                    <p className="text-2xl font-semibold text-green-900">
                      {reportData.employeeReport.activeEmployees}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <UsersIcon className="h-8 w-8 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-600">
                      Inactive
                    </p>
                    <p className="text-2xl font-semibold text-yellow-900">
                      {reportData.employeeReport.inactiveEmployees}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <UsersIcon className="h-8 w-8 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-600">
                      Terminated
                    </p>
                    <p className="text-2xl font-semibold text-red-900">
                      {reportData.employeeReport.terminatedEmployees}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Stats */}
            {reportData.departmentStats && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">
                  Department-wise Employee Count
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee Count
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.departmentStats.map(
                        (dept: any, index: number) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {dept.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {dept.employeeCount}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedReport === "payroll" && reportData?.payrollReport && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">
                      Total Payroll
                    </p>
                    <p className="text-2xl font-semibold text-green-900">
                      PKR{" "}
                      {reportData.payrollReport.totalPayroll.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <UsersIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">
                      Employees Paid
                    </p>
                    <p className="text-2xl font-semibold text-blue-900">
                      {reportData.payrollReport.totalEmployees}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-8 w-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">
                      Average Salary
                    </p>
                    <p className="text-2xl font-semibold text-purple-900">
                      PKR{" "}
                      {reportData.payrollReport.averageSalary.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-8 w-8 text-gray-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">
                      Records Processed
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {reportData.payrollReport.recordsProcessed}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Payroll */}
            {reportData.departmentPayroll && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">
                  Department-wise Payroll
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Average per Employee
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.departmentPayroll.map(
                        (dept: any, index: number) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {dept.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              PKR {dept.totalAmount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {dept.employeeCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              PKR
                              {dept.employeeCount > 0
                                ? (
                                    dept.totalAmount / dept.employeeCount
                                  ).toLocaleString()
                                : 0}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedReport === "leave" && reportData?.leaveReport && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center">
                <CalendarDaysIcon className="h-8 w-8 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-600">
                    Pending Requests
                  </p>
                  <p className="text-2xl font-semibold text-yellow-900">
                    {reportData.leaveReport.pending}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <CalendarDaysIcon className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-600">Approved</p>
                  <p className="text-2xl font-semibold text-green-900">
                    {reportData.leaveReport.approved}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center">
                <CalendarDaysIcon className="h-8 w-8 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-600">Rejected</p>
                  <p className="text-2xl font-semibold text-red-900">
                    {reportData.leaveReport.rejected}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!reportData && (
          <div className="text-center py-12">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">
              Select a report type and date range to view data
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
