"use client";

import { useEffect, useState } from "react";
import {
  BuildingOfficeIcon,
  UsersIcon,
  UserIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowLeftIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getCookie } from "@/lib/cookies";

interface Department {
  id: string;
  name: string;
  code?: string;
  description: string;
  headId?: string;
  head?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  employees: {
    id: string;
    firstName: string;
    lastName: string;
    designation: string;
    employeeId: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface Employee {
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
  departmentId: string;
  user: {
    role: string;
  };
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [viewingDepartment, setViewingDepartment] = useState<Department | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    headId: "",
  });
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    code: "",
  });
  const [accessDenied, setAccessDenied] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const searchParams = useSearchParams();
  const selectedDeptId = searchParams?.get("id");

  useEffect(() => {
    const checkUserRoleAndFetchData = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const { user } = await response.json();
          if (user && (user.role === 'ADMINISTRATOR' || user.role === 'HR_MANAGER')) {
            setAccessDenied(false);
            fetchData();
          } else {
            setAccessDenied(true);
            setLoading(false); // Stop loading when access denied
          }
        } else {
          setAccessDenied(true);
          setLoading(false); // Stop loading when access denied
        }
      } catch (error) {
        setAccessDenied(true);
        setLoading(false); // ✅ Stop loading when access denied
      } finally {
        setAuthChecked(true);
      }
    };

    checkUserRoleAndFetchData();
  }, []);

  useEffect(() => {
    if (selectedDeptId && departments.length > 0) {
      const dept = departments.find((d) => d.id === selectedDeptId);
      if (dept) {
        handleViewDepartment(dept);
      }
    }
  }, [selectedDeptId, departments]);

  const fetchData = async () => {
    try {
      const [departmentsRes, employeesRes] = await Promise.all([
        fetch("/api/departments", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }),
        fetch("/api/employees", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (departmentsRes.ok) {
        const data = await departmentsRes.json();
        setDepartments(data.departments || []);
      }

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {
      name: "",
      code: "",
    };

    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = "Department name is required";
      isValid = false;
    }

    if (!formData.code.trim()) {
      errors.code = "Department code is required";
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleCreateDepartment = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const method = editingDepartment ? "PUT" : "POST";
      const url = editingDepartment
        ? `/api/departments/${editingDepartment.id}`
        : "/api/departments";

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingDepartment
            ? "Department updated successfully"
            : "Department created successfully"
        );
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to save department");
      }
    } catch (error) {
      console.error("Failed to save department:", error);
      toast.error("Failed to save department");
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) {
      return;
    }

    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Department deleted successfully");
        fetchData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete department");
      }
    } catch (error) {
      console.error("Failed to delete department:", error);
      toast.error("Failed to delete department");
    }
  };

  const handleViewDepartment = (department: Department) => {
    setViewingDepartment(department);
    setShowViewModal(true);
  };

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      code: (department as any).code || "",
      description: department.description || "",
      headId: (department as any).headId || "",
    });
    // Clear any previous errors when editing
    setFieldErrors({ name: "", code: "" });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingDepartment(null);
    setFormData({
      name: "",
      code: "",
      description: "",
      headId: "",
    });
    setFieldErrors({ name: "", code: "" });
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const getDepartmentStats = () => {
    const totalEmployees = departments.reduce(
      (sum, dept) => sum + dept.employees.length,
      0
    );
    const avgEmployeesPerDept =
      departments.length > 0
        ? Math.round(totalEmployees / departments.length)
        : 0;

    return {
      totalDepartments: departments.length,
      totalEmployees,
      avgEmployeesPerDept,
    };
  };

  const stats = getDepartmentStats();

  if (loading) {
    return (
      <div className="animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>

        {/* Departments Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Access Denied</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Department Management Access Restricted
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  You do not have permission to access department management features.
                </p>
                <p className="mt-1">
                  Please contact HR or an Administrator if you believe this is an error.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Link
            href="/dashboard/admin"
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              🏢 Department Management
            </h1>
            <p className="text-gray-600">
              Manage organizational structure and department assignments
            </p>
          </div>
        </div>
        <button onClick={openModal} className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Department
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Departments
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.totalDepartments}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <UsersIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Employees
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.totalEmployees}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <ChartBarIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Avg per Department
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.avgEmployeesPerDept}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((department) => (
          <div
            key={department.id}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    {department.name}
                  </h3>
                  {department.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {department.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <UsersIcon className="h-4 w-4 mr-2" />
                  <span>{department.employees.length} employees</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditDepartment(department)}
                    className="text-blue-600 hover:text-blue-900 p-1 rounded"
                    title="Edit Department"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleViewDepartment(department)}
                    className="text-green-600 hover:text-green-900 p-1 rounded"
                    title="View Details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDepartment(department.id)}
                    className="text-red-600 hover:text-red-900 p-1 rounded"
                    title="Delete Department"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <Link
                  href={`/dashboard/employees?department=${department.id}`}
                  className="text-xs text-primary-600 hover:text-primary-900 font-medium"
                >
                  View All →
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* Add Department Card */}
        <div
          onClick={openModal}
          className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
        >
          <div className="p-6 text-center">
            <PlusIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Add New Department
            </h3>
            <p className="text-sm text-gray-500">
              Create a new department to organize your workforce
            </p>
          </div>
        </div>
      </div>

      {departments.length === 0 && (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">No departments found</p>
          <button onClick={openModal} className="mt-4 btn-primary">
            Add First Department
          </button>
        </div>
      )}

      {/* Department Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  {editingDepartment ? "Edit Department" : "Add New Department"}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Name <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      // Clear error when user starts typing
                      if (fieldErrors.name) {
                        setFieldErrors({ ...fieldErrors, name: "" });
                      }
                    }}
                    className={`input w-full ${
                      fieldErrors.name
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                    placeholder="e.g., Engineering"
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-xs text-red-600">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Code <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => {
                      setFormData({ ...formData, code: e.target.value });
                      // Clear error when user starts typing
                      if (fieldErrors.code) {
                        setFieldErrors({ ...fieldErrors, code: "" });
                      }
                    }}
                    className={`input w-full ${
                      fieldErrors.code
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                    placeholder="e.g., ENG"
                  />
                  {fieldErrors.code && (
                    <p className="mt-1 text-xs text-red-600">
                      {fieldErrors.code}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="input w-full"
                  placeholder="Brief description of the department"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Head of Department
                </label>
                <select
                  value={formData.headId}
                  onChange={(e) =>
                    setFormData({ ...formData, headId: e.target.value })
                  }
                  className="input w-full"
                >
                  <option value="">Select HOD</option>
                  {employees
                    .filter(
                      (emp) =>
                        emp.user?.role !== "EMPLOYEE" ||
                        (typeof emp.designation === "string"
                          ? emp.designation.toLowerCase().includes("manager")
                          : emp.designation.title
                              .toLowerCase()
                              .includes("manager"))
                    )
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName} (
                        {employee.employeeId}) -{" "}
                        {typeof employee.designation === "string"
                          ? employee.designation
                          : employee.designation.title}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDepartment}
                  className="btn-primary"
                >
                  {editingDepartment
                    ? "Update Department"
                    : "Create Department"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Department Modal */}
      {showViewModal && viewingDepartment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {viewingDepartment.name} Department
              </h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewingDepartment(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Department Info */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    Department Details
                  </h4>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Code
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {viewingDepartment.code}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Description
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {viewingDepartment.description || "No description"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Department Head
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {viewingDepartment.head
                          ? `${viewingDepartment.head.firstName} ${viewingDepartment.head.lastName}`
                          : "Not assigned"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Total Employees
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {viewingDepartment.employees.length}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Created
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(
                          viewingDepartment.createdAt
                        ).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Employees List */}
              <div className="lg:col-span-2">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Department Employees
                </h4>
                {viewingDepartment.employees.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-500">No employees assigned</p>
                    <Link
                      href={`/dashboard/admin?assignDept=${viewingDepartment.id}`}
                      className="mt-4 btn-primary inline-flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Assign Employees
                    </Link>
                  </div>
                ) : (
                  <div className="bg-white border rounded-lg">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Employee
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Designation
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {viewingDepartment.employees.map((employee) => (
                            <tr key={employee.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {employee.firstName} {employee.lastName}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {employee.employeeId}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {typeof employee.designation === "string"
                                  ? employee.designation
                                  : (employee.designation as any)?.title || "N/A"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <Link
                                  href={`/dashboard/employees/${employee.id}`}
                                  className="text-primary-600 hover:text-primary-900"
                                >
                                  View Profile
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => handleEditDepartment(viewingDepartment)}
                className="btn-outline flex items-center"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit Department
              </button>
              <Link
                href={`/dashboard/employees?department=${viewingDepartment.id}`}
                className="btn-primary flex items-center"
              >
                <UsersIcon className="h-4 w-4 mr-2" />
                Manage Employees
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
