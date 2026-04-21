"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BanknotesIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  UsersIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Pagination from "@/components/ui/Pagination";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";

interface PayrollRecord {
  id: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    email: string;
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
  month: string;
  year: number;
  workingDays: number;
  presentDays: number;
  overtime: number;
  bonuses: number;
  deductions: number;
  grossPay: number;
  netPay: number;
  status: string;
  processedAt: string;
}

interface SalaryStructure {
  id: string;
  name: string;
  basicSalary: number;
  allowances: any;
  deductions: any;
  grossSalary: number;
  netSalary: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

interface PayrollStats {
  totalEmployees: number;
  processedPayrolls: number;
  pendingPayrolls: number;
  totalPayrollAmount: number;
}

export default function PayrollPage() {
  const router = useRouter();
  const allowedRoles = [
    "ADMINISTRATOR",
    "HR_MANAGER",
    "HR_ADMIN",
    "PAYROLL_OFFICER",
    "DEPARTMENT_MANAGER",
  ];
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>(
    []
  );
  const [employees, setEmployees] = useState<
    {
      id: string;
      firstName: string;
      lastName: string;
      employeeId: string;
    }[]
  >([]);
  const [stats, setStats] = useState<PayrollStats>({
    totalEmployees: 0,
    processedPayrolls: 0,
    pendingPayrolls: 0,
    totalPayrollAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("records");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showBulkProcessDialog, setShowBulkProcessDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalPayrollRecords, setTotalPayrollRecords] = useState(0);

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewStructureModal, setShowViewStructureModal] = useState(false);
  const [showEditStructureModal, setShowEditStructureModal] = useState(false);
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState({
    open: false,
    type: "" as "record" | "structure" | "",
    targetId: "",
    targetName: "",
  });
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(
    null
  );
  const [selectedStructure, setSelectedStructure] =
    useState<SalaryStructure | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Payroll form
  const [payrollForm, setPayrollForm] = useState({
    employeeId: "",
    month: selectedMonth,
    year: selectedYear,
    workingDays: 22,
    presentDays: 22,
    overtime: 0,
    bonuses: 0,
    deductions: {
      incomeTax: "",
    },
  });

  // Salary structure form
  const [salaryForm, setSalaryForm] = useState({
    name: "",
    basicSalary: "",
    allowances: {
      houseRentUtilities: "",
      medicalAllowance: "",
      fuelAllowance: "",
    },
    deductions: {
      incomeTax: "",
    },
    effectiveFrom: "",
    effectiveTo: "",
  });

  // Check user role on component mount
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (!response.ok) {
          router.push("/login");
          return;
        }

        const data = await response.json();
        setUser(data.user);

        const role = data?.user?.role;
        if (!role || !allowedRoles.includes(role)) {
          router.push("/dashboard/employee/payroll");
          return;
        }

        setAuthorized(true);
      } catch (error) {
        console.error("Access verification failed", error);
        router.push("/dashboard/employee/payroll");
      } finally {
        setCheckingAccess(false);
      }
    };

    verifyAccess();
  }, [router]);

  // Redirect employees to their specific payroll page
  useEffect(() => {
    if (user && user.role === "EMPLOYEE") {
      router.push("/dashboard/employee/payroll");
    }
  }, [user, router]);

  useEffect(() => {
    if (!authorized) {
      return;
    }
    fetchPayrollData();
    fetchEmployees();
  }, [authorized, selectedMonth, selectedYear, currentPage, itemsPerPage]);

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
      toast.error("Failed to load employees");
    }
  };

  const employeeOptions = useMemo(
    () =>
      employees.map((emp) => ({
        value: emp.id,
        label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`.trim(),
      })),
    [employees]
  );

  const fetchPayrollData = async () => {
    try {
      const [recordsResponse, structuresResponse, statsResponse] =
        await Promise.all([
          fetch(
            `/api/payroll/records?month=${selectedMonth}&year=${selectedYear}&page=${currentPage}&limit=${itemsPerPage}`,
            {
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
            }
          ),
          fetch("/api/payroll/structures", {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }),
          fetch("/api/payroll/stats", {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }),
        ]);

      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        setPayrollRecords(recordsData.payrollRecords || []);
        setTotalPayrollRecords(
          recordsData.pagination?.total ||
            recordsData.payrollRecords?.length ||
            0
        );
      }

      if (structuresResponse.ok) {
        const structuresData = await structuresResponse.json();
        setSalaryStructures(structuresData.salaryStructures || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats((prev) => ({
          ...prev,
          ...(statsData?.stats ?? statsData ?? {}),
        }));
      }
    } catch (error) {
      console.error("Failed to fetch payroll data:", error);
      toast.error("Failed to fetch payroll data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch("/api/payroll/records", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payrollForm,
          deductions: Object.fromEntries(
            Object.entries(payrollForm.deductions).filter(
              ([, value]) => value !== ""
            )
          ),
        }),
      });

      if (response.ok) {
        toast.success("Payroll record created successfully");
        setShowCreateModal(false);
        resetPayrollForm();
        fetchPayrollData();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to create payroll record");
      }
    } catch (error) {
      console.error("Create payroll failed:", error);
      toast.error("Failed to create payroll record");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateSalaryStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Calculate gross and net salary
      const basicSalary = parseFloat(salaryForm.basicSalary);
      const allowancesTotal = Object.values(salaryForm.allowances).reduce(
        (sum, val) => sum + (parseFloat(val as string) || 0),
        0
      );
      const incomeTax = parseFloat(salaryForm.deductions.incomeTax || "0");

      const grossSalary = basicSalary + allowancesTotal;
      const netSalary = grossSalary - incomeTax;

      const payload = {
        ...salaryForm,
        basicSalary: basicSalary,
        grossSalary: grossSalary,
        netSalary: netSalary,
        effectiveTo: salaryForm.effectiveTo || null,
      };

      const response = await fetch("/api/payroll/structures", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Salary structure created successfully");
        setShowSalaryModal(false);
        resetSalaryForm();
        fetchPayrollData();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to create salary structure");
      }
    } catch (error) {
      console.error("Create salary structure failed:", error);
      toast.error("Failed to create salary structure");
    } finally {
      setCreating(false);
    }
  };

  const performBulkProcess = async () => {
    try {
      const response = await fetch("/api/payroll/bulk-process", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
        }),
      });

      if (response.ok) {
        toast.success("Bulk payroll processing initiated successfully");
        fetchPayrollData();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to process bulk payroll");
      }
    } catch (error) {
      console.error("Bulk process failed:", error);
      toast.error("Failed to process bulk payroll");
    } finally {
      setShowBulkProcessDialog(false);
    }
  };

  const resetPayrollForm = () => {
    setPayrollForm({
      employeeId: "",
      month: selectedMonth,
      year: selectedYear,
      workingDays: 22,
      presentDays: 22,
      overtime: 0,
      bonuses: 0,
      deductions: {
        incomeTax: "",
      },
    });
  };

  const renderSalaryStructureForm = (
    submitLabel: string,
    submitting: boolean,
    onCancel: () => void,
    onSubmit: (e: React.FormEvent) => void
  ) => (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Structure Name <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            value={salaryForm.name}
            onChange={(e) =>
              setSalaryForm({ ...salaryForm, name: e.target.value })
            }
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Basic Salary <span className="required-asterisk">*</span>
          </label>
          <input
            type="number"
            value={salaryForm.basicSalary}
            onChange={(e) =>
              setSalaryForm({
                ...salaryForm,
                basicSalary: e.target.value,
              })
            }
            className="input"
            required
          />
        </div>
      </div>

      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Allowances</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(salaryForm.allowances).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700">
                {key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
              </label>
              <input
                type="number"
                value={value as string | number}
                onChange={(e) =>
                  setSalaryForm({
                    ...salaryForm,
                    allowances: {
                      ...salaryForm.allowances,
                      [key]: e.target.value,
                    },
                  })
                }
                className="input"
                min="0"
                step="0.01"
              />
            </div>
          ))}
          {Object.entries(salaryForm.deductions).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700">
                {key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
              </label>
              <input
                type="number"
                value={value as string | number}
                onChange={(e) =>
                  setSalaryForm({
                    ...salaryForm,
                    deductions: {
                      ...salaryForm.deductions,
                      [key]: e.target.value,
                    },
                  })
                }
                className="input"
                min="0"
                step="0.01"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Effective From <span className="required-asterisk">*</span>
          </label>
          <input
            type="date"
            value={salaryForm.effectiveFrom}
            onChange={(e) =>
              setSalaryForm({
                ...salaryForm,
                effectiveFrom: e.target.value,
              })
            }
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Effective To
          </label>
          <input
            type="date"
            value={salaryForm.effectiveTo || ""}
            onChange={(e) =>
              setSalaryForm({
                ...salaryForm,
                effectiveTo: e.target.value,
              })
            }
            className="input"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? `${submitLabel}...` : submitLabel}
        </button>
      </div>
    </form>
  );

  const resetSalaryForm = () => {
    setSalaryForm({
      name: "",
      basicSalary: "",
      allowances: {
        houseRentUtilities: "",
        medicalAllowance: "",
        fuelAllowance: "",
      },
      deductions: {
        incomeTax: "",
      },
      effectiveFrom: "",
      effectiveTo: "",
    });
  };

  // Payroll Record Actions
  const handleViewRecord = async (recordId: string) => {
    try {
      const response = await fetch(`/api/payroll/records/${recordId}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedRecord(data.payrollRecord);
        setShowViewModal(true);
      } else {
        toast.error("Failed to fetch payroll record details");
      }
    } catch (error) {
      console.error("View record failed:", error);
      toast.error("Failed to fetch payroll record details");
    }
  };

  const handleEditRecord = async (recordId: string) => {
    try {
      const response = await fetch(`/api/payroll/records/${recordId}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const record = data.payrollRecord;
        const deductionTotal =
          typeof record.totalDeductions === "number"
            ? record.totalDeductions
            : Object.values(record.deductions || {}).reduce(
                (sum: number, value: any) =>
                  sum +
                  (typeof value === "number" ? value : parseFloat(value) || 0),
                0
              );

        setSelectedRecord(record);
        setPayrollForm({
          employeeId: record.employee.employeeId,
          month: record.month,
          year: record.year,
          workingDays: record.workingDays,
          presentDays: record.presentDays,
          overtime: record.overtimeHours ?? 0,
          bonuses: record.bonuses ?? 0,
          deductions: {
            incomeTax:
              (record.deductions?.incomeTax?.toString?.() as
                | string
                | undefined) ??
              (typeof record.deductions?.incomeTax === "number"
                ? record.deductions?.incomeTax.toString()
                : ""),
          },
        });
        setShowEditModal(true);
      } else {
        toast.error("Failed to fetch payroll record details");
      }
    } catch (error) {
      console.error("Edit record failed:", error);
      toast.error("Failed to fetch payroll record details");
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setUpdating(true);
    try {
      const response = await fetch(
        `/api/payroll/records/${selectedRecord.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payrollForm),
        }
      );

      if (response.ok) {
        toast.success("Payroll record updated successfully");
        setShowEditModal(false);
        setSelectedRecord(null);
        resetPayrollForm();
        fetchPayrollData();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to update payroll record");
      }
    } catch (error) {
      console.error("Update record failed:", error);
      toast.error("Failed to update payroll record");
    } finally {
      setUpdating(false);
    }
  };

  const performDeleteRecord = async (recordId: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/payroll/records/${recordId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Payroll record deleted successfully");
        fetchPayrollData();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to delete payroll record");
      }
    } catch (error) {
      console.error("Delete record failed:", error);
      toast.error("Failed to delete payroll record");
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteRecordDialog = (record: PayrollRecord) => {
    setConfirmDeleteDialog({
      open: true,
      type: "record",
      targetId: record.id,
      targetName:
        `${record.employee.firstName} ${record.employee.lastName}`.trim() ||
        record.employee.employeeId,
    });
  };

  // Salary Structure Actions
  const handleViewStructure = async (structureId: string) => {
    try {
      const response = await fetch(`/api/payroll/structures/${structureId}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedStructure(data.salaryStructure);
        setShowViewStructureModal(true);
      } else {
        toast.error("Failed to fetch salary structure details");
      }
    } catch (error) {
      console.error("View structure failed:", error);
      toast.error("Failed to fetch salary structure details");
    }
  };

  const handleEditStructure = async (structureId: string) => {
    try {
      const response = await fetch(`/api/payroll/structures/${structureId}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedStructure(data.salaryStructure);
        const allowances = {
          houseRentUtilities:
            data.salaryStructure.allowances?.houseRentUtilities?.toString() ||
            data.salaryStructure.allowances?.houseRent?.toString() ||
            "",
          medicalAllowance:
            data.salaryStructure.allowances?.medicalAllowance?.toString() ||
            data.salaryStructure.allowances?.medical?.toString() ||
            "",
          fuelAllowance:
            data.salaryStructure.allowances?.fuelAllowance?.toString() ||
            data.salaryStructure.allowances?.transport?.toString() ||
            "",
        };

        const deductions = {
          incomeTax:
            data.salaryStructure.deductions?.incomeTax?.toString() ||
            data.salaryStructure.deductions?.tax?.toString() ||
            "",
        };

        setSalaryForm({
          name: data.salaryStructure.name,
          basicSalary: data.salaryStructure.basicSalary.toString(),
          allowances,
          deductions,
          effectiveFrom: new Date(data.salaryStructure.effectiveFrom)
            .toISOString()
            .split("T")[0],
          effectiveTo: data.salaryStructure.effectiveTo
            ? new Date(data.salaryStructure.effectiveTo)
                .toISOString()
                .split("T")[0]
            : "",
        });
        setShowEditStructureModal(true);
      } else {
        toast.error("Failed to fetch salary structure details");
      }
    } catch (error) {
      console.error("Edit structure failed:", error);
      toast.error("Failed to fetch salary structure details");
    }
  };

  const handleUpdateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStructure) return;

    setUpdating(true);
    try {
      // Calculate gross and net salary
      const basicSalary = parseFloat(salaryForm.basicSalary);
      const allowancesTotal = Object.values(salaryForm.allowances).reduce(
        (sum, val) => sum + (parseFloat(val as string) || 0),
        0
      );
      const incomeTax = parseFloat(salaryForm.deductions.incomeTax || "0");

      const grossSalary = basicSalary + allowancesTotal;
      const netSalary = grossSalary - incomeTax;

      const payload = {
        ...salaryForm,
        basicSalary: basicSalary,
        grossSalary: grossSalary,
        netSalary: netSalary,
      };

      const response = await fetch(
        `/api/payroll/structures/${selectedStructure.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        toast.success("Salary structure updated successfully");
        setShowEditStructureModal(false);
        setSelectedStructure(null);
        resetSalaryForm();
        fetchPayrollData();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to update salary structure");
      }
    } catch (error) {
      console.error("Update structure failed:", error);
      toast.error("Failed to update salary structure");
    } finally {
      setUpdating(false);
    }
  };

  const performDeleteStructure = async (structureId: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/payroll/structures/${structureId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Salary structure deleted successfully");
        fetchPayrollData();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to delete salary structure");
      }
    } catch (error) {
      console.error("Delete structure failed:", error);
      toast.error("Failed to delete salary structure");
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteStructureDialog = (structure: SalaryStructure) => {
    setConfirmDeleteDialog({
      open: true,
      type: "structure",
      targetId: structure.id,
      targetName: structure.name,
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteDialog.targetId) return;
    const { type, targetId } = confirmDeleteDialog;
    closeConfirmDialog();
    if (type === "record") {
      await performDeleteRecord(targetId);
    } else if (type === "structure") {
      await performDeleteStructure(targetId);
    }
  };

  const closeConfirmDialog = () => {
    setConfirmDeleteDialog({
      open: false,
      type: "",
      targetId: "",
      targetName: "",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PROCESSED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  if (checkingAccess || (!authorized && !loading)) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
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
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          Payroll Management
        </h1>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="input py-2 text-sm border-gray-300 focus:border-primary-500 focus:ring-primary-500"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={i + 1}>
                    {new Date(0, i).toLocaleString("default", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="input py-2 text-sm border-gray-300 focus:border-primary-500 focus:ring-primary-500"
              >
                {[2023, 2024, 2025].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* Action Button - Only show for Admin and HR */}
          {(user?.role === "ADMINISTRATOR" || user?.role === "HR_MANAGER") && (
            <button
              onClick={() => setShowBulkProcessDialog(true)}
              className="btn-secondary whitespace-nowrap"
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Bulk Process
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Employees
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalEmployees}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Processed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.processedPayrolls}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarDaysIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.pendingPayrolls}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BanknotesIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Amount
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    PKR {Number(stats.totalPayrollAmount || 0).toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex flex-col sm:flex-row">
            <button
              onClick={() => setActiveTab("records")}
              className={`flex-1 py-3 px-4 text-center border-b-2 font-medium text-sm transition-colors ${
                activeTab === "records"
                  ? "border-primary-500 text-primary-600 bg-primary-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              Payroll Records
            </button>
            <button
              onClick={() => setActiveTab("structures")}
              className={`flex-1 py-3 px-4 text-center border-b-2 font-medium text-sm transition-colors ${
                activeTab === "structures"
                  ? "border-primary-500 text-primary-600 bg-primary-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              Salary Structures
            </button>
          </nav>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              {activeTab === "records"
                ? "Payroll Records"
                : "Salary Structures"}
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              {activeTab === "records" ? (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary whitespace-nowrap"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Payroll
                </button>
              ) : (
                <button
                  onClick={() => setShowSalaryModal(true)}
                  className="btn-primary whitespace-nowrap"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Structure
                </button>
              )}
            </div>
          </div>

          {activeTab === "records" ? (
            <div className="space-y-4">
              {payrollRecords.length === 0 ? (
                <div className="text-center py-12">
                  <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">
                    No payroll records found for{" "}
                    {new Date(0, selectedMonth - 1).toLocaleString("default", {
                      month: "long",
                    })}{" "}
                    {selectedYear}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Basic Salary
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Gross Pay
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
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {record.employee.firstName}{" "}
                                  {record.employee.lastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {record.employee.employeeId}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {record.employee.department.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              PKR{" "}
                              {Number(
                                record.salaryStructure?.basicSalary ?? 0
                              ).toLocaleString("en-PK", {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              PKR{" "}
                              {Number(record.grossPay).toLocaleString("en-PK", {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              PKR{" "}
                              {Number(record.netPay).toLocaleString("en-PK", {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                  record.status
                                )}`}
                              >
                                {record.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleViewRecord(record.id)}
                                  className="text-primary-600 hover:text-primary-900"
                                  title="View Details"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleEditRecord(record.id)}
                                  className="text-gray-600 hover:text-gray-900"
                                  title="Edit Record"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => openDeleteRecordDialog(record)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete Record"
                                  disabled={deleting}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
          ) : (
            <div className="space-y-4">
              {salaryStructures.length === 0 ? (
                <div className="text-center py-12">
                  <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">
                    No salary structures found
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {salaryStructures.map((structure) => (
                    <div
                      key={structure.id}
                      className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900 mb-2">
                            {structure.name}
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">
                                Basic Salary:
                              </span>
                              <span className="text-sm font-medium">
                                PKR {structure.basicSalary.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">
                                Gross Salary:
                              </span>
                              <span className="text-sm font-medium">
                                PKR {structure.grossSalary.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">
                                Net Salary:
                              </span>
                              <span className="text-sm font-medium text-green-600">
                                PKR {structure.netSalary.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">
                                Effective From:
                              </span>
                              <span className="text-sm">
                                {new Date(
                                  structure.effectiveFrom
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleViewStructure(structure.id)}
                            className="text-primary-600 hover:text-primary-900"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditStructure(structure.id)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Edit Structure"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteStructureDialog(structure)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Structure"
                            disabled={deleting}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* View Payroll Record Modal */}
      {showViewModal && selectedRecord && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Payroll Record Details
              </h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedRecord(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Employee
                  </label>
                  <p className="text-sm">
                    {selectedRecord.employee.firstName}{" "}
                    {selectedRecord.employee.lastName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Department
                  </label>
                  <p className="text-sm">
                    {selectedRecord.employee.department.name}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Basic Salary
                  </label>
                  <p className="text-sm">
                    PKR
                    {selectedRecord.salaryStructure?.basicSalary?.toLocaleString() ||
                      "0"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gross Pay
                  </label>
                  <p className="text-sm">
                    PKR {selectedRecord.grossPay.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Net Pay
                  </label>
                  <p className="text-sm font-medium text-green-600">
                    PKR {selectedRecord.netPay.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payroll Record Modal */}
      {showEditModal && selectedRecord && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Edit Payroll Record
            </h3>
            <form onSubmit={handleUpdateRecord} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Employee
                </label>
                <select
                  value={payrollForm.employeeId}
                  onChange={(e) =>
                    setPayrollForm({
                      ...payrollForm,
                      employeeId: e.target.value,
                    })
                  }
                  className="input"
                  disabled
                >
                  <option value="">Select employee...</option>
                  {employeeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Working Days <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="number"
                    value={payrollForm.workingDays}
                    onChange={(e) =>
                      setPayrollForm({
                        ...payrollForm,
                        workingDays: Number(e.target.value) || 0,
                      })
                    }
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Present Days <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="number"
                    value={payrollForm.presentDays}
                    onChange={(e) =>
                      setPayrollForm({
                        ...payrollForm,
                        presentDays: Number(e.target.value) || 0,
                      })
                    }
                    className="input"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Overtime Hours
                  </label>
                  <input
                    type="number"
                    value={payrollForm.overtime}
                    onChange={(e) =>
                      setPayrollForm({
                        ...payrollForm,
                        overtime: Number(e.target.value) || 0,
                      })
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Bonuses
                  </label>
                  <input
                    type="number"
                    value={payrollForm.bonuses}
                    onChange={(e) =>
                      setPayrollForm({
                        ...payrollForm,
                        bonuses: Number(e.target.value) || 0,
                      })
                    }
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Deductions
                </label>
                <input
                  type="number"
                  value={payrollForm.deductions.incomeTax || ""}
                  onChange={(e) =>
                    setPayrollForm({
                      ...payrollForm,
                      deductions: {
                        ...payrollForm.deductions,
                        incomeTax: e.target.value,
                      },
                    })
                  }
                  className="input"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRecord(null);
                    resetPayrollForm();
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="btn-primary"
                >
                  {updating ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Salary Structure Modal */}
      {showViewStructureModal && selectedStructure && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Salary Structure Details
              </h3>
              <button
                onClick={() => {
                  setShowViewStructureModal(false);
                  setSelectedStructure(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Structure Name
                </label>
                <p className="text-lg font-medium">{selectedStructure.name}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Basic Salary
                  </label>
                  <p className="text-sm">
                    PKR {selectedStructure.basicSalary.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gross Salary
                  </label>
                  <p className="text-sm">
                    PKR {selectedStructure.grossSalary.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Net Salary
                  </label>
                  <p className="text-sm font-medium text-green-600">
                    PKR {selectedStructure.netSalary.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Salary Structure Modal */}
      {showEditStructureModal && selectedStructure && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Edit Salary Structure
            </h3>
            {renderSalaryStructureForm(
              "Update Structure",
              updating,
              () => {
                setShowEditStructureModal(false);
                setSelectedStructure(null);
                resetSalaryForm();
              },
              handleUpdateStructure
            )}
          </div>
        </div>
      )}

      {/* Create Salary Structure Modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Create Salary Structure
            </h3>
            {renderSalaryStructureForm(
              "Create Structure",
              creating,
              () => {
                setShowSalaryModal(false);
                resetSalaryForm();
              },
              handleCreateSalaryStructure
            )}
          </div>
        </div>
      )}

      {/* Bulk Process Confirmation */}
      {showBulkProcessDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto max-w-lg w-full px-6 py-6 bg-white rounded-xl shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-primary-500 font-semibold">
                  Payroll Automation
                </p>
                <h3 className="text-xl font-semibold text-gray-900 mt-1">
                  Process Payroll for All Employees
                </h3>
              </div>
              <button
                onClick={() => setShowBulkProcessDialog(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-gray-600">
              <p>
                This action will calculate payroll for every employee using
                their current salary structures and attendance data for{" "}
                <strong>
                  {new Date(0, selectedMonth - 1).toLocaleString("default", {
                    month: "long",
                  })}
                </strong>{" "}
                {selectedYear}.
              </p>
              <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-primary-700 mb-2">
                  What happens next?
                </h4>
                <ul className="text-sm space-y-1 text-primary-700">
                  <li>
                    • Payroll records will be generated for all active
                    employees.
                  </li>
                  <li>
                    • Existing pending records for this month will be updated.
                  </li>
                  <li>
                    • You can review results in the payroll records tab after
                    processing.
                  </li>
                </ul>
              </div>
              <p className="text-sm text-gray-500">
                This process may take a few minutes depending on the number of
                employees. You can continue using the system while payroll is
                being processed.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                onClick={() => setShowBulkProcessDialog(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={performBulkProcess} className="btn-primary">
                Start Processing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Payroll Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Create Payroll Record
            </h3>
            <form onSubmit={handleCreatePayroll} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Employee <span className="required-asterisk">*</span>
                </label>
                <select
                  value={payrollForm.employeeId}
                  onChange={(e) =>
                    setPayrollForm({
                      ...payrollForm,
                      employeeId: e.target.value,
                    })
                  }
                  className="input"
                  required
                >
                  <option value="">Select employee...</option>
                  {employeeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Working Days <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="number"
                    value={payrollForm.workingDays}
                    onChange={(e) =>
                      setPayrollForm({
                        ...payrollForm,
                        workingDays: parseInt(e.target.value),
                      })
                    }
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Present Days <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="number"
                    value={payrollForm.presentDays}
                    onChange={(e) =>
                      setPayrollForm({
                        ...payrollForm,
                        presentDays: Number(e.target.value) || 0,
                      })
                    }
                    className="input"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Overtime Hours
                  </label>
                  <input
                    type="number"
                    value={payrollForm.overtime}
                    onChange={(e) =>
                      setPayrollForm({
                        ...payrollForm,
                        overtime: Number(e.target.value) || 0,
                      })
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Bonuses
                  </label>
                  <input
                    type="number"
                    value={payrollForm.bonuses}
                    onChange={(e) =>
                      setPayrollForm({
                        ...payrollForm,
                        bonuses: Number(e.target.value) || 0,
                      })
                    }
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Deductions
                </label>
                <input
                  type="number"
                  value={payrollForm.deductions.incomeTax || ""}
                  onChange={(e) =>
                    setPayrollForm({
                      ...payrollForm,
                      deductions: {
                        ...payrollForm.deductions,
                        incomeTax: e.target.value,
                      },
                    })
                  }
                  className="input"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetPayrollForm();
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={confirmDeleteDialog.open}
        onClose={closeConfirmDialog}
        onConfirm={handleConfirmDelete}
        title={
          confirmDeleteDialog.type === "record"
            ? "Delete Payroll Record"
            : confirmDeleteDialog.type === "structure"
            ? "Delete Salary Structure"
            : "Confirm"
        }
        message={
          confirmDeleteDialog.type === "record"
            ? `Are you sure you want to delete payroll record for ${
                confirmDeleteDialog.targetName || "this employee"
              }? This action cannot be undone.`
            : confirmDeleteDialog.type === "structure"
            ? `Are you sure you want to delete the salary structure "${
                confirmDeleteDialog.targetName || "this structure"
              }"? This action cannot be undone.`
            : ""
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
