"use client";

import { useEffect, useState } from "react";
import {
  PlayIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  UsersIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Avatar from "@/components/ui/Avatar";

interface PayrollRecord {
  id: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    email: string;
    department: { name: string };
  };
  salaryStructure: {
    id: string;
    name: string;
    basicSalary: number;
    grossSalary: number;
    netSalary: number;
  };
  month: string;
  year: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  overtimeHours: number;
  grossPay: number;
  netPay: number;
  status: string;
  processedAt?: string;
  payslipGenerated: boolean;
  payslipUrl?: string;
}

export default function PayrollProcessingPage() {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [payslipHtml, setPayslipHtml] = useState("");

  useEffect(() => {
    fetchPayrollRecords();
  }, [selectedMonth, selectedYear]);

  const fetchPayrollRecords = async () => {
    setLoading(true);
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch(
        `/api/payroll/records?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPayrollRecords(data.payrollRecords || []);
      } else {
        toast.error("Failed to fetch payroll records");
      }
    } catch (error) {
      toast.error("Failed to fetch payroll records");
    } finally {
      setLoading(false);
    }
  };

  const handleMonthlyRun = async () => {
    setProcessing(true);
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/payroll/monthly-run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        fetchPayrollRecords();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to process monthly payroll");
      }
    } catch (error) {
      toast.error("Failed to process monthly payroll");
    } finally {
      setProcessing(false);
    }
  };

  const handleGeneratePayslip = async (payrollRecordId: string) => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/payroll/payslip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payrollRecordId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setPayslipHtml(data.payslipHtml);
        setShowPayslipModal(true);
        fetchPayrollRecords();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to generate payslip");
      }
    } catch (error) {
      toast.error("Failed to generate payslip");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PROCESSED":
        return "bg-green-100 text-green-800";
      case "GENERATED":
        return "bg-blue-100 text-blue-800";
      case "DRAFT":
        return "bg-yellow-100 text-yellow-800";
      case "PENDING":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
    }).format(amount);
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const totalPayroll = payrollRecords.reduce(
    (sum, record) => sum + record.netPay,
    0
  );
  const processedCount = payrollRecords.filter(
    (r) => r.status === "PROCESSED"
  ).length;
  const pendingCount = payrollRecords.filter(
    (r) => r.status === "PENDING" || r.status === "GENERATED"
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                💰 Payroll Processing
              </h1>
              <p className="mt-2 text-gray-600">
                Process monthly payroll and generate payslips
              </p>
            </div>
            <div className="flex space-x-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <button
                onClick={handleMonthlyRun}
                disabled={processing}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                <PlayIcon className="h-5 w-5" />
                <span>
                  {processing ? "Processing..." : "Run Monthly Payroll"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-semibold">
                  {payrollRecords.length}
                </p>
                <p className="text-gray-600">Total Employees</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-semibold">{processedCount}</p>
                <p className="text-gray-600">Processed</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-2xl font-semibold">{pendingCount}</p>
                <p className="text-gray-600">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <BanknotesIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-2xl font-semibold">
                  {formatCurrency(totalPayroll)}
                </p>
                <p className="text-gray-600">Total Payroll</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payroll Records Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium">
              Payroll Records - {monthNames[selectedMonth - 1]} {selectedYear}
            </h2>
          </div>
          <div className="overflow-x-auto">
            {payrollRecords.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">
                  No payroll records found for {monthNames[selectedMonth - 1]}{" "}
                  {selectedYear}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Click "Run Monthly Payroll" to process payroll for this month
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Working Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Present Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Gross Pay
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Net Pay
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payrollRecords.map((record, index) => (
                    <tr
                      key={record.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <Avatar
                              employeeId={record.employee.id}
                              employeeName={`${record.employee.firstName} ${record.employee.lastName}`}
                              size="md"
                              showLink={true}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {record.employee.firstName}{" "}
                              {record.employee.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {record.employee.employeeId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.workingDays}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.presentDays}
                        {record.absentDays > 0 && (
                          <span className="text-red-600 text-xs block">
                            ({record.absentDays} absent)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(record.grossPay)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {formatCurrency(record.netPay)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            record.status
                          )}`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleGeneratePayslip(record.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Generate Payslip"
                          >
                            <DocumentTextIcon className="h-4 w-4" />
                          </button>
                          {record.payslipGenerated && record.payslipUrl && (
                            <button
                              onClick={() =>
                                window.open(record.payslipUrl, "_blank")
                              }
                              className="text-green-600 hover:text-green-900"
                              title="Download Payslip"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Payslip Preview Modal */}
        {showPayslipModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Payslip Preview
                </h3>
                <button
                  onClick={() => setShowPayslipModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto border rounded">
                <div dangerouslySetInnerHTML={{ __html: payslipHtml }} />
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => setShowPayslipModal(false)}
                  className="btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(payslipHtml);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                  className="btn-primary"
                >
                  Print Payslip
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
