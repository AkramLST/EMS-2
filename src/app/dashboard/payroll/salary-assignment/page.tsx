"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  CalculatorIcon,
  UserIcon,
  BanknotesIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  designation: string;
  department: { name: string };
}

interface SalaryTemplate {
  id: string;
  name: string;
  description?: string;
  targetRole?: string;
}

interface SalaryStructure {
  id: string;
  employee: Employee;
  templateName?: string;
  templateId?: string | null;
  basicSalary?: number;
  allowances?: Record<string, number | string>;
  deductions?: Record<string, number | string>;
  grossSalary: number;
  netSalary: number;
  ctc: number;
  status: string;
  revisionNumber: number;
  revisionReason?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  variablePay?: number | null;
}

export default function EmployeeSalaryPage() {
  const allowedRoles = ["ADMINISTRATOR", "HR_MANAGER", "HR_ADMIN"];
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<SalaryTemplate[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [grossSalary, setGrossSalary] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [viewingSalary, setViewingSalary] = useState<SalaryStructure | null>(null);
  const [editingSalary, setEditingSalary] = useState<SalaryStructure | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<SalaryStructure | null>(null);
  const [allowances, setAllowances] = useState({
    houseRentUtilities: "",
    medicalAllowance: "",
    fuelAllowance: "",
  });
  const [deductions, setDeductions] = useState({
    incomeTax: "",
  });

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
        const role = data?.user?.role;

        if (!role || !allowedRoles.includes(role)) {
          toast.error("You do not have permission to view this page");
          router.push("/dashboard");
          return;
        }

        setAuthorized(true);
      } catch (error) {
        console.error("Access verification failed", error);
        router.push("/dashboard");
      } finally {
        setCheckingAccess(false);
      }
    };

    verifyAccess();
  }, [router]);

  useEffect(() => {
    if (!authorized) {
      return;
    }
    fetchData();
  }, [authorized]);

  const fetchData = async () => {
    try {
      const commonOptions: RequestInit = {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      };

      const [employeesRes, templatesRes, salariesRes] = await Promise.all([
        fetch("/api/employees?limit=1000", commonOptions),
        fetch("/api/payroll/templates", commonOptions),
        fetch("/api/payroll/employee-salary", commonOptions),
      ]);

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.employees || []);
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates || []);
      }
      if (salariesRes.ok) {
        const data = await salariesRes.json();
        setSalaryStructures(data.salaryStructures || []);
      }
    } catch (error) {
      console.error("Salary assignment data load failed", error);
      toast.error("Failed to load salary assignment data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSalary = async () => {
    if (!selectedEmployee || !grossSalary || !effectiveFrom) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const method = editingSalary ? "PUT" : "POST";
      const payload: Record<string, any> = {
        templateId: selectedTemplate || null,
        grossSalary: parseFloat(grossSalary),
        effectiveFrom,
        allowances: Object.fromEntries(
          Object.entries(allowances).filter(([, value]) => value !== "")
        ),
        deductions: Object.fromEntries(
          Object.entries(deductions).filter(([, value]) => value !== "")
        ),
      };

      if (editingSalary) {
        payload.id = editingSalary.id;
        payload.revisionReason =
          editingSalary.revisionReason || "Updated salary assignment";
        payload.status = editingSalary.status;
        if (editingSalary.variablePay !== undefined) {
          payload.variablePay = editingSalary.variablePay;
        }
      } else {
        payload.employeeId = selectedEmployee;
        payload.revisionReason = "Initial salary assignment";
      }

      const response = await fetch("/api/payroll/employee-salary", {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(
          editingSalary
            ? "Salary assignment updated successfully"
            : "Salary assigned successfully"
        );
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to assign salary");
      }
    } catch (error) {
      toast.error("Failed to assign salary");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployee("");
    setSelectedTemplate("");
    setGrossSalary("");
    setEffectiveFrom("");
    setEditingSalary(null);
    setAllowances({
      houseRentUtilities: "",
      medicalAllowance: "",
      fuelAllowance: "",
    });
    setDeductions({
      incomeTax: "",
    });
  };

  const handleView = (salary: SalaryStructure) => {
    setViewingSalary(salary);
  };

  const handleEdit = (salary: SalaryStructure) => {
    setEditingSalary(salary);
    setSelectedEmployee(salary.employee.id);
    setSelectedTemplate(salary.templateId ?? "");
    setGrossSalary(String(Number(salary.grossSalary)));
    setEffectiveFrom(
      salary.effectiveFrom
        ? new Date(salary.effectiveFrom).toISOString().split("T")[0]
        : ""
    );
    setAllowances({
      houseRentUtilities:
        salary.allowances?.houseRentUtilities?.toString() ||
        salary.allowances?.houseRent?.toString() ||
        "",
      medicalAllowance:
        salary.allowances?.medicalAllowance?.toString() ||
        salary.allowances?.medical?.toString() ||
        "",
      fuelAllowance:
        salary.allowances?.fuelAllowance?.toString() ||
        salary.allowances?.transport?.toString() ||
        "",
    });
    setDeductions({
      incomeTax:
        salary.deductions?.incomeTax?.toString() ||
        salary.deductions?.tax?.toString() ||
        "",
    });
    setShowModal(true);
  };

  const handleDelete = async (salary: SalaryStructure) => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/payroll/employee-salary?id=${salary.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        toast.success("Salary assignment deleted");
        fetchData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete salary assignment");
      }
    } catch (error) {
      toast.error("Failed to delete salary assignment");
    } finally {
      setSubmitting(false);
      setShowDeleteConfirm(null);
    }
  };

  if (checkingAccess || (!authorized && !loading)) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Employee Salary Assignment
          </h1>
          <p className="text-gray-600">
            Assign salary structures to employees using templates
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Assign Salary</span>
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <UserIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-2xl font-semibold">{employees.length}</p>
              <p className="text-gray-600">Total Employees</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <BanknotesIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-2xl font-semibold">
                {salaryStructures.filter((s) => s.status === "ACTIVE").length}
              </p>
              <p className="text-gray-600">Assigned Salaries</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <CalculatorIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-2xl font-semibold">{templates.length}</p>
              <p className="text-gray-600">Available Templates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Salary Structures Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">Current Salary Assignments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Template
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Gross Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Net Salary
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
              {salaryStructures.map((salary) => (
                <tr key={salary.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium">
                        {salary.employee.firstName} {salary.employee.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {salary.employee.employeeId}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {salary.templateName || "Custom"}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {formatCurrency(salary.grossSalary)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {formatCurrency(salary.netSalary)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        salary.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {salary.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3 text-sm">
                      <button
                        onClick={() => handleView(salary)}
                        className="text-indigo-500 hover:text-indigo-700"
                        title="View details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(salary)}
                        className="text-indigo-500 hover:text-indigo-700"
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(salary)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Salary Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium">
                {editingSalary ? "Edit Salary Assignment" : "Assign Salary Structure"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Employee *
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="input"
                  required
                  disabled={Boolean(editingSalary)}
                >
                  <option value="">Choose an employee...</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} (
                      {employee.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salary Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="input"
                >
                  <option value="">Custom salary (no template)</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gross Salary (Monthly) *
                </label>
                <input
                  type="number"
                  value={grossSalary}
                  onChange={(e) => setGrossSalary(e.target.value)}
                  className="input"
                  placeholder="100000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Effective From *
                </label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignSalary}
                  className="flex-1 btn-primary"
                  disabled={
                    submitting ||
                    !selectedEmployee ||
                    !grossSalary ||
                    !effectiveFrom
                  }
                >
                  {submitting
                    ? editingSalary
                      ? "Saving..."
                      : "Assigning..."
                    : editingSalary
                    ? "Save Changes"
                    : "Assign Salary"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Salary Modal */}
      {viewingSalary && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium">Salary Assignment Details</h3>
              <button onClick={() => setViewingSalary(null)}>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Employee</p>
                  <p className="text-sm font-medium">
                    {viewingSalary.employee.firstName} {viewingSalary.employee.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    ID: {viewingSalary.employee.employeeId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Template</p>
                  <p className="text-sm font-medium">
                    {viewingSalary.templateName || "Custom"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Gross Salary</p>
                  <p className="font-medium">{formatCurrency(viewingSalary.grossSalary)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Net Salary</p>
                  <p className="font-medium">{formatCurrency(viewingSalary.netSalary)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-medium">{viewingSalary.status}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Revision</p>
                <p className="text-sm">
                  Revision #{viewingSalary.revisionNumber} • Effective from {new Date(viewingSalary.effectiveFrom).toLocaleDateString()}
                </p>
                {viewingSalary.revisionReason && (
                  <p className="text-sm text-gray-500">
                    Reason: {viewingSalary.revisionReason}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Delete Salary Assignment
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to remove the salary assignment for {showDeleteConfirm.employee.firstName} {showDeleteConfirm.employee.lastName}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="btn-secondary"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={submitting}
              >
                {submitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
