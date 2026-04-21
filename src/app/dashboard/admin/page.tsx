"use client";

import { useState, useEffect } from "react";
import {
  BuildingOfficeIcon,
  UsersIcon,
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowRightIcon,
  UserIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  FlagIcon,
  TableCellsIcon,
  DocumentTextIcon,
  UserPlusIcon,
  BellIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Link from "next/link";
import { getCookie } from "@/lib/cookies";

interface Department {
  id: string;
  name: string;
  description: string;
  employees: {
    id: string;
    firstName: string;
    lastName: string;
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
}

export default function AdminDashboard() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [stats, setStats] = useState({
    totalDepartments: 0,
    totalEmployees: 0,
    totalUsers: 0,
    presentToday: 0,
  });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);
  const [unassignedEmployees, setUnassignedEmployees] = useState<Employee[]>(
    []
  );
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [departmentsRes, employeesRes, usersRes, dashboardStatsRes] =
        await Promise.all([
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
          fetch("/api/users", {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }),
          fetch("/api/dashboard/stats", {
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

      // Calculate stats
      const departmentsData = await departmentsRes.json();
      const employeesData = await employeesRes.json();
      const usersData = usersRes.ok ? await usersRes.json() : { users: [] };

      // Get dashboard stats
      let presentToday = 0;
      if (dashboardStatsRes.ok) {
        const statsData = await dashboardStatsRes.json();
        presentToday = statsData.presentToday || 0;
      }

      setStats({
        totalDepartments: departmentsData.departments?.length || 0,
        totalEmployees: employeesData.employees?.length || 0,
        totalUsers: usersData.users?.length || 0,
        presentToday: presentToday,
      });
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async () => {
    if (!formData.name) {
      toast.error("Please fill in the department name");
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

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || "",
    });
    setShowModal(true);
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

  const resetForm = () => {
    setEditingDepartment(null);
    setFormData({
      name: "",
      description: "",
    });
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openAssignModal = async (department: Department) => {
    setSelectedDepartment(department);
    setSelectedEmployees([]);

    // Fetch unassigned employees
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/employees?unassigned=true", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUnassignedEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Failed to fetch unassigned employees:", error);
      toast.error("Failed to load unassigned employees");
    }

    setShowAssignModal(true);
  };

  const handleAssignEmployees = async () => {
    if (!selectedDepartment || selectedEmployees.length === 0) {
      toast.error("Please select employees to assign");
      return;
    }

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const updatePromises = selectedEmployees.map((employeeId) =>
        fetch(`/api/employees/${employeeId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ departmentId: selectedDepartment.id }),
        })
      );

      await Promise.all(updatePromises);
      toast.success(
        `${selectedEmployees.length} employees assigned successfully`
      );
      setShowAssignModal(false);
      fetchData();
    } catch (error) {
      console.error("Failed to assign employees:", error);
      toast.error("Failed to assign employees");
    }
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === unassignedEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(unassignedEmployees.map(emp => emp.id));
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleAssignEmployeesSubmit = () => {
    handleAssignEmployees();
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
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
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">
            Manage system configuration and user accounts
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Departments</p>
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
              <p className="text-sm font-medium text-gray-600">Employees</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.totalEmployees}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <UserGroupIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.totalUsers}
              </p>
            </div>
          </div>
        </div>

        {/* Add Present Today card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Present Today</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.presentToday}
              </p>
            </div>
          </div>
        </div>

        {/* Remove the old Active Users card since we're replacing it with Present Today */}
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/admin/users"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserGroupIcon className="h-6 w-6 text-primary-600 mr-3" />
            <span className="text-gray-900">Manage Users</span>
          </Link>

          <Link
            href="/dashboard/admin/departments"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BuildingOfficeIcon className="h-6 w-6 text-primary-600 mr-3" />
            <span className="text-gray-900">Departments</span>
          </Link>

          <Link
            href="/dashboard/admin/holidays"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <CalendarDaysIcon className="h-6 w-6 text-primary-600 mr-3" />
            <span className="text-gray-900">Holidays</span>
          </Link>

          <Link
            href="/dashboard/admin/leave-types"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FlagIcon className="h-6 w-6 text-primary-600 mr-3" />
            <span className="text-gray-900">Leave Types</span>
          </Link>

          {/* Add Notifications link */}
          <Link
            href="/dashboard/notifications"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BellIcon className="h-6 w-6 text-primary-600 mr-3" />
            <span className="text-gray-900">Notifications</span>
          </Link>
        </div>
      </div>

      {/* UI Components Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          UI Components
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/admin/table-demo"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <TableCellsIcon className="h-6 w-6 text-primary-600 mr-3" />
            <span className="text-gray-900">Table Demo</span>
          </Link>

          <Link
            href="/dashboard/admin/table-docs"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <DocumentTextIcon className="h-6 w-6 text-primary-600 mr-3" />
            <span className="text-gray-900">Table Docs</span>
          </Link>
        </div>
      </div>

      {/* Departments Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Departments
            </h3>
            <button
              onClick={openModal}
              className="btn-primary flex items-center text-sm"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Department
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {departments.slice(0, 5).map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {dept.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {dept.description || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dept.employees.length}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditDepartment(dept)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Edit Department"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDepartment(dept.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Department"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openAssignModal(dept)}
                        className="text-green-600 hover:text-green-900"
                        title="Assign Employees"
                      >
                        <UserPlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No departments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {departments.length > 5 && (
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <Link
              href="/dashboard/admin/departments"
              className="text-primary-600 hover:text-primary-900 text-sm font-medium"
            >
              View all departments →
            </Link>
          </div>
        )}
      </div>

      {/* Add/Edit Department Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingDepartment ? "Edit Department" : "Add New Department"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateDepartment();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter department name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="input"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter department description"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingDepartment ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Employees Modal */}
      {showAssignModal && selectedDepartment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Assign Employees to {selectedDepartment.name}
              </h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="selectAll"
                  checked={
                    selectedEmployees.length === unassignedEmployees.length &&
                    unassignedEmployees.length > 0
                  }
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <label
                  htmlFor="selectAll"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Select All
                </label>
              </div>
              <div className="border rounded-lg max-h-96 overflow-y-auto">
                {unassignedEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center p-3 border-b border-gray-200 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      id={`employee-${employee.id}`}
                      checked={selectedEmployees.includes(employee.id)}
                      onChange={() => handleEmployeeSelect(employee.id)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`employee-${employee.id}`}
                      className="ml-2 block text-sm text-gray-900"
                    >
                      {employee.firstName} {employee.lastName} (
                      {employee.employeeId})
                    </label>
                  </div>
                ))}
                {unassignedEmployees.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    No unassigned employees found
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignEmployeesSubmit}
                disabled={selectedEmployees.length === 0}
                className="btn-primary"
              >
                Assign Selected ({selectedEmployees.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
