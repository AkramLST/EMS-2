"use client";

import { useEffect, useState } from "react";
import {
  BanknotesIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Pagination from "@/components/ui/Pagination";

interface PayrollRecord {
  id: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    designation: string;
    department: {
      name: string;
    };
  };
  salaryStructure: {
    id: string;
    name: string;
    basicSalary: number;
    grossSalary: number;
    netSalary: number;
    allowances: any;
    deductions: any;
  };
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  overtimeHours: number;
  basicPay: number;
  allowances: any;
  grossPay: number;
  deductions: any;
  overtimePay: number;
  bonuses: number;
  penalties: number;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  processedAt: string;
  payslipGenerated: boolean;
  payslipUrl: string | null;
}

export default function EmployeePayrollPage() {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number | "">("");
  const [selectedYear, setSelectedYear] = useState<number | "">("");

  // Payslip modal state
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [payslipHtml, setPayslipHtml] = useState("");
  const [payslipLoading, setPayslipLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalPayrollRecords, setTotalPayrollRecords] = useState(0);

  useEffect(() => {
    fetchPayrollData();
  }, [selectedMonth, selectedYear, currentPage, itemsPerPage]);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());

      if (selectedMonth !== "") {
        params.append("month", selectedMonth.toString());
      }

      if (selectedYear !== "") {
        params.append("year", selectedYear.toString());
      }

      const response = await fetch(
        `/api/payroll/payslip?${params.toString()}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPayrollRecords(data.payrollRecords || []);
        setTotalPayrollRecords(
          data.pagination?.total || data.payrollRecords?.length || 0
        );
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to fetch payroll data");
      }
    } catch (error) {
      console.error("Failed to fetch payroll data:", error);
      toast.error("Failed to fetch payroll data");
    } finally {
      setLoading(false);
    }
  };

  const handleViewPayslip = async (
    payslipUrl: string | null,
    payrollRecordId: string
  ) => {
    setPayslipLoading(true);
    setShowPayslipModal(true);

    try {
      if (payslipUrl) {
        // Fetch the payslip HTML content
        const response = await fetch(payslipUrl, {
          credentials: "include",
        });

        if (response.ok) {
          const htmlContent = await response.text();
          setPayslipHtml(htmlContent);
        } else {
          // If we can't fetch the URL, try to generate the payslip
          await generatePayslip(payrollRecordId);
        }
      } else {
        // Generate and view payslip
        await generatePayslip(payrollRecordId);
      }
    } catch (error) {
      console.error("Failed to load payslip:", error);
      toast.error("Failed to load payslip");
      setShowPayslipModal(false);
    } finally {
      setPayslipLoading(false);
    }
  };

  const generatePayslip = async (payrollRecordId: string) => {
    try {
      const response = await fetch("/api/payroll/payslip", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payrollRecordId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.payslipHtml) {
          setPayslipHtml(data.payslipHtml);
        } else if (data.payslipUrl) {
          // Fetch the generated payslip
          const payslipResponse = await fetch(data.payslipUrl, {
            credentials: "include",
          });
          if (payslipResponse.ok) {
            const htmlContent = await payslipResponse.text();
            setPayslipHtml(htmlContent);
          }
        }
        // Refresh the data to update the payslip status
        fetchPayrollData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to generate payslip");
        setShowPayslipModal(false);
      }
    } catch (error) {
      console.error("Failed to generate payslip:", error);
      toast.error("Failed to generate payslip");
      setShowPayslipModal(false);
    }
  };

  const getMonthName = (monthNumber: number) => {
    const months = [
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
    return months[monthNumber - 1] || "";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
    }).format(amount);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
          {[...Array(3)].map((_, i) => (
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
        <h1 className="text-2xl font-semibold text-gray-900">My Payroll</h1>
        <div className="flex items-center space-x-4">
          <select
            value={selectedMonth}
            onChange={(e) =>
              setSelectedMonth(e.target.value ? parseInt(e.target.value) : "")
            }
            className="input"
          >
            <option value="">All Months</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
              <option key={month} value={month}>
                {getMonthName(month)}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) =>
              setSelectedYear(e.target.value ? parseInt(e.target.value) : "")
            }
            className="input"
          >
            <option value="">All Years</option>
            {[2023, 2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Payroll Records Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            📊 Payroll History
          </h3>
        </div>

        <div className="overflow-x-auto">
          {payrollRecords.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-500">No payroll records found</p>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gross Pay
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deductions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Pay
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payrollRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getMonthName(record.month)} {record.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(record.grossPay)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(record.totalDeductions)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {formatCurrency(record.netPay)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            record.status === "PROCESSED"
                              ? "bg-green-100 text-green-800"
                              : record.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() =>
                            handleViewPayslip(record.payslipUrl, record.id)
                          }
                          className="btn-secondary flex items-center space-x-1"
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                          <span>View Payslip</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {payrollRecords.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(totalPayrollRecords / itemsPerPage)}
                  totalItems={totalPayrollRecords}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Payslip Modal */}
      {showPayslipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-lg font-semibold text-gray-900">Payslip</h3>
              <button
                onClick={() => setShowPayslipModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {payslipLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: payslipHtml }} />
              )}
            </div>

            <div className="border-t p-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowPayslipModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Print functionality
                  const printWindow = window.open("", "_blank");
                  if (printWindow) {
                    printWindow.document.write(payslipHtml);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
                className="btn-primary"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
