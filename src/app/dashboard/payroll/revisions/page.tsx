"use client";

import { useEffect, useState } from "react";
import {
  PlusIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  UserIcon,
  EyeIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { getCookie } from "@/lib/cookies";
import Avatar from "@/components/ui/Avatar";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  designation: string;
  department: { name: string };
}

interface SalaryRevision {
  id: string;
  employee: Employee;
  previousBasicSalary: number;
  previousGrossSalary: number;
  previousNetSalary: number;
  previousCTC: number;
  newBasicSalary: number;
  newGrossSalary: number;
  newNetSalary: number;
  newCTC: number;
  revisionType: string;
  revisionReason: string;
  percentageIncrease?: number;
  amountIncrease?: number;
  effectiveFrom: string;
  approvedAt: string;
  createdAt: string;
}

export default function SalaryRevisionsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [revisions, setRevisions] = useState<SalaryRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRevision, setSelectedRevision] =
    useState<SalaryRevision | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [revisionType, setRevisionType] = useState("INCREMENT");
  const [revisionReason, setRevisionReason] = useState("");
  const [newBasicSalary, setNewBasicSalary] = useState("");
  const [newGrossSalary, setNewGrossSalary] = useState("");
  const [newNetSalary, setNewNetSalary] = useState("");
  const [newCTC, setNewCTC] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [employeesRes, revisionsRes] = await Promise.all([
        fetch("/api/employees", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }),
        fetch("/api/payroll/revisions", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.employees || []);
      }
      if (revisionsRes.ok) {
        const data = await revisionsRes.json();
        setRevisions(data.revisions || []);
      }
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRevision = async () => {
    if (
      !selectedEmployee ||
      !revisionReason ||
      !newBasicSalary ||
      !newGrossSalary ||
      !newNetSalary ||
      !newCTC ||
      !effectiveFrom
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/payroll/revisions", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          revisionType,
          revisionReason,
          newBasicSalary: parseFloat(newBasicSalary),
          newGrossSalary: parseFloat(newGrossSalary),
          newNetSalary: parseFloat(newNetSalary),
          newCTC: parseFloat(newCTC),
          effectiveFrom,
        }),
      });

      if (response.ok) {
        toast.success("Salary revision created successfully");
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to create revision");
      }
    } catch (error) {
      toast.error("Failed to create revision");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployee("");
    setRevisionType("INCREMENT");
    setRevisionReason("");
    setNewBasicSalary("");
    setNewGrossSalary("");
    setNewNetSalary("");
    setNewCTC("");
    setEffectiveFrom("");
  };

  const handleViewRevision = (revision: SalaryRevision) => {
    setSelectedRevision(revision);
    setShowViewModal(true);
  };

  const getRevisionTypeColor = (type: string) => {
    switch (type) {
      case "INCREMENT":
        return "bg-green-100 text-green-800";
      case "PROMOTION":
        return "bg-blue-100 text-blue-800";
      case "ADJUSTMENT":
        return "bg-yellow-100 text-yellow-800";
      case "CORRECTION":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const calculateIncreasePercentage = (
    oldAmount: number,
    newAmount: number
  ) => {
    if (oldAmount === 0) return 0;
    return ((newAmount - oldAmount) / oldAmount) * 100;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
    }).format(amount);
  };

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
                💰 Salary Revisions
              </h1>
              <p className="mt-2 text-gray-600">
                Manage salary revisions and track history
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Create Revision</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-semibold">{revisions.length}</p>
                <p className="text-gray-600">Total Revisions</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-semibold">
                  {
                    revisions.filter((r) => r.revisionType === "INCREMENT")
                      .length
                  }
                </p>
                <p className="text-gray-600">Increments</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <UserIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-2xl font-semibold">
                  {
                    revisions.filter((r) => r.revisionType === "PROMOTION")
                      .length
                  }
                </p>
                <p className="text-gray-600">Promotions</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <CheckIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-2xl font-semibold">
                  {
                    revisions.filter((r) => r.revisionType === "ADJUSTMENT")
                      .length
                  }
                </p>
                <p className="text-gray-600">Adjustments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Revisions Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium">Salary Revision History</h2>
          </div>
          <div className="overflow-x-auto">
            {revisions.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">No salary revisions found</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Previous Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      New Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Increase
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Effective From
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {revisions.map((revision, index) => (
                    <tr
                      key={revision.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <Avatar
                              employeeId={revision.employee.id}
                              employeeName={`${revision.employee.firstName} ${revision.employee.lastName}`}
                              size="md"
                              showLink={true}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {revision.employee.firstName}{" "}
                              {revision.employee.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {revision.employee.employeeId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRevisionTypeColor(
                            revision.revisionType
                          )}`}
                        >
                          {revision.revisionType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(Number(revision.previousGrossSalary))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(Number(revision.newGrossSalary))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="text-green-600 font-medium">
                          +
                          {calculateIncreasePercentage(
                            Number(revision.previousGrossSalary),
                            Number(revision.newGrossSalary)
                          ).toFixed(1)}
                          %
                        </div>
                        <div className="text-gray-500">
                          {formatCurrency(
                            Number(revision.newGrossSalary) -
                              Number(revision.previousGrossSalary)
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(revision.effectiveFrom).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewRevision(revision)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Create Revision Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Create Salary Revision
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Employee *
                    </label>
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="">Select Employee</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.firstName} {employee.lastName} (
                          {employee.employeeId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Revision Type *
                    </label>
                    <select
                      value={revisionType}
                      onChange={(e) => setRevisionType(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="INCREMENT">Increment</option>
                      <option value="PROMOTION">Promotion</option>
                      <option value="ADJUSTMENT">Adjustment</option>
                      <option value="CORRECTION">Correction</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Revision Reason *
                  </label>
                  <textarea
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Enter reason for salary revision"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      New Basic Salary *
                    </label>
                    <input
                      type="number"
                      value={newBasicSalary}
                      onChange={(e) => setNewBasicSalary(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      New Gross Salary *
                    </label>
                    <input
                      type="number"
                      value={newGrossSalary}
                      onChange={(e) => setNewGrossSalary(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      New Net Salary *
                    </label>
                    <input
                      type="number"
                      value={newNetSalary}
                      onChange={(e) => setNewNetSalary(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      New CTC *
                    </label>
                    <input
                      type="number"
                      value={newCTC}
                      onChange={(e) => setNewCTC(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Effective From *
                  </label>
                  <input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRevision}
                  disabled={submitting}
                  className="btn-primary disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Revision"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && selectedRevision && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Revision Details
                </h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Employee Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedRevision.employee.firstName}{" "}
                      {selectedRevision.employee.lastName}
                    </div>
                    <div>
                      <span className="font-medium">Employee ID:</span>{" "}
                      {selectedRevision.employee.employeeId}
                    </div>
                    <div>
                      <span className="font-medium">Designation:</span>{" "}
                      {selectedRevision.employee.designation}
                    </div>
                    <div>
                      <span className="font-medium">Department:</span>{" "}
                      {selectedRevision.employee.department.name}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Previous Salary
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Basic Salary:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            Number(selectedRevision.previousBasicSalary)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gross Salary:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            Number(selectedRevision.previousGrossSalary)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Net Salary:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            Number(selectedRevision.previousNetSalary)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">CTC:</span>
                        <span className="font-medium">
                          {formatCurrency(Number(selectedRevision.previousCTC))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">
                      New Salary
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Basic Salary:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            Number(selectedRevision.newBasicSalary)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gross Salary:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            Number(selectedRevision.newGrossSalary)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Net Salary:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            Number(selectedRevision.newNetSalary)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">CTC:</span>
                        <span className="font-medium">
                          {formatCurrency(Number(selectedRevision.newCTC))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Increase Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Percentage Increase:</span>{" "}
                      <span className="text-green-600 font-medium">
                        +
                        {calculateIncreasePercentage(
                          Number(selectedRevision.previousGrossSalary),
                          Number(selectedRevision.newGrossSalary)
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Amount Increase:</span>{" "}
                      <span className="text-green-600 font-medium">
                        {formatCurrency(
                          Number(selectedRevision.newGrossSalary) -
                            Number(selectedRevision.previousGrossSalary)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
