"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, KeyIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import SimpleDropdown from "@/components/ui/SimpleDropdown";

interface User {
  id: string;
  email: string;
  role: string;
  roles: { role: string }[];
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    middleName: string;
    email: string;
    phone: string;
    alternatePhone: string;
    dateOfBirth: string;
    gender: string;
    maritalStatus: string;
    nationality: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation: string;
    designationId: string;
    departmentId: string;
    managerId: string;
    employmentType: string;
    workLocation: string;
    joinDate: string;
    probationEndDate: string;
    status: string;
  };
}

interface Department {
  id: string;
  name: string;
}

interface Designation {
  id: string;
  title: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

export default function EditUserPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    phone: "",
    alternatePhone: "",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    nationality: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    designationId: "",
    departmentId: "",
    managerId: "",
    employmentType: "FULL_TIME",
    workLocation: "",
    joinDate: "",
    probationEndDate: "",
    status: "ACTIVE",
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [selectedDesignation, setSelectedDesignation] =
    useState<Designation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["EMPLOYEE"]);
  const [user, setUser] = useState<User | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  // Available roles in the system
  const availableRoles = [
    { id: "ADMINISTRATOR", name: "Administrator" },
    { id: "HR_MANAGER", name: "HR Manager" },
    { id: "DEPARTMENT_MANAGER", name: "Department Manager" },
    { id: "EMPLOYEE", name: "Employee" },
    { id: "PAYROLL_OFFICER", name: "Payroll Officer" },
    { id: "SYSTEM_AUDITOR", name: "System Auditor" },
  ];

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setIsResetting(true);
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newPassword }),
      });

      if (response.ok) {
        toast.success("Password reset successfully");
        setShowResetModal(false);
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to reset password");
      }
    } catch (error) {
      console.error("Failed to reset password:", error);
      toast.error("Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    if (userId) {
      Promise.all([
        fetchUserData(),
        fetchDepartments(),
        fetchDesignations(),
        fetchManagers(),
      ]).finally(() => {
        setLoading(false);
      });
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.user;
        setUser(userData);

        // Set form data
        if (userData.employee) {
          setFormData({
            firstName: userData.employee.firstName || "",
            lastName: userData.employee.lastName || "",
            middleName: userData.employee.middleName || "",
            email: userData.employee.email || "",
            phone: userData.employee.phone || "",
            alternatePhone: userData.employee.alternatePhone || "",
            dateOfBirth: userData.employee.dateOfBirth
              ? new Date(userData.employee.dateOfBirth)
                  .toISOString()
                  .split("T")[0]
              : "",
            gender: userData.employee.gender || "",
            maritalStatus: userData.employee.maritalStatus || "",
            nationality: userData.employee.nationality || "",
            address: userData.employee.address || "",
            city: userData.employee.city || "",
            state: userData.employee.state || "",
            country: userData.employee.country || "",
            postalCode: userData.employee.postalCode || "",
            emergencyContactName: userData.employee.emergencyContactName || "",
            emergencyContactPhone:
              userData.employee.emergencyContactPhone || "",
            emergencyContactRelation:
              userData.employee.emergencyContactRelation || "",
            designationId: userData.employee.designationId || "",
            departmentId: userData.employee.departmentId || "",
            managerId: userData.employee.managerId || "",
            employmentType: userData.employee.employmentType || "FULL_TIME",
            workLocation: userData.employee.workLocation || "",
            joinDate: userData.employee.joinDate
              ? new Date(userData.employee.joinDate).toISOString().split("T")[0]
              : "",
            probationEndDate: userData.employee.probationEndDate
              ? new Date(userData.employee.probationEndDate)
                  .toISOString()
                  .split("T")[0]
              : "",
            status: userData.employee.status || "ACTIVE",
          });

          // Set selected designation
          if (userData.employee.designationId) {
            const designation = designations.find(
              (d) => d.id === userData.employee.designationId
            );
            if (designation) {
              setSelectedDesignation(designation);
            }
          }
        }

        // Set selected roles
        if (userData.roles && userData.roles.length > 0) {
          setSelectedRoles(userData.roles.map((r: { role: string }) => r.role));
        } else if (userData.role) {
          setSelectedRoles([userData.role]);
        }
      } else {
        toast.error("Failed to load user data");
        router.push("/dashboard/admin/users");
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      toast.error("Failed to load user data");
      router.push("/dashboard/admin/users");
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments);
      }
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  };

  const fetchDesignations = async (searchQuery: string = "") => {
    try {
      const params = new URLSearchParams();
      // Set limit to "all" to fetch all designations
      params.append("limit", "all");
      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await fetch(`/api/designations?${params.toString()}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDesignations(data.designations);

        // Update selected designation if we have user data
        if (user?.employee?.designationId) {
          const designation = data.designations.find(
            (d: Designation) => d.id === user.employee?.designationId
          );
          if (designation) {
            setSelectedDesignation(designation);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch designations:", error);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await fetch("/api/employees?role=manager", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setManagers(data.employees);
      }
    } catch (error) {
      console.error("Failed to fetch managers:", error);
    }
  };

  const handleRoleChange = (roleId: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles([...selectedRoles, roleId]);
    } else {
      setSelectedRoles(selectedRoles.filter((id) => id !== roleId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.firstName.trim()) {
      toast.error("First name is required");
      return;
    }

    if (!formData.lastName.trim()) {
      toast.error("Last name is required");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (!formData.designationId) {
      toast.error("Please select a designation");
      return;
    }

    if (!formData.employmentType) {
      toast.error("Please select an employment type");
      return;
    }

    setSaving(true);

    try {
      // Process form data to handle empty strings for date fields
      const processedFormData = { ...formData };

      // Handle relation fields specifically
      // For designationId, departmentId, managerId - keep empty strings as empty strings
      // Only set to null if explicitly needed
      const relationFields = ["designationId", "departmentId", "managerId"];

      // Remove empty strings for other optional fields
      const keys = Object.keys(processedFormData) as Array<
        keyof typeof processedFormData
      >;
      keys.forEach((key) => {
        // Skip relation fields as they are handled separately
        if (relationFields.includes(key)) {
          return;
        }

        if (processedFormData[key] === "") {
          processedFormData[key] = null as any;
        }
      });

      const response = await fetch("/api/users", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userId,
          email: formData.email,
          roles: selectedRoles,
          employeeData: processedFormData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "User updated successfully");
        router.push("/dashboard/admin/users");
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to update user");
      }
    } catch (error) {
      console.error("Failed to update user:", error);
      toast.error("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Link
            href="/dashboard/admin/users"
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Users
          </Link>
          <button
            onClick={() => setShowResetModal(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <KeyIcon className="h-4 w-4 mr-2" />
            Reset Password
          </button>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Edit User</h1>
        <p className="text-gray-600">Update user information</p>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                  <KeyIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Reset Password
                  </h3>
                  <div className="mt-2">
                    <div className="mt-4">
                      <label
                        htmlFor="newPassword"
                        className="block text-sm font-medium text-gray-700 text-left"
                      >
                        New Password
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="mt-4">
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-medium text-gray-700 text-left"
                      >
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                  onClick={handleResetPassword}
                  disabled={isResetting}
                >
                  {isResetting ? "Resetting..." : "Reset Password"}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  onClick={() => {
                    setShowResetModal(false);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Personal Information
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                First Name <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                required
                className="mt-1 input"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Last Name <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                required
                className="mt-1 input"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Middle Name
              </label>
              <input
                type="text"
                name="middleName"
                className="mt-1 input"
                value={formData.middleName}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email <span className="required-asterisk">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                className="mt-1 input"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone <span className="required-asterisk">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                className="mt-1 input"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date of Birth
              </label>
              <input
                type="date"
                name="dateOfBirth"
                className="mt-1 input"
                value={formData.dateOfBirth}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Gender
              </label>
              <select
                name="gender"
                className="mt-1 input"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Marital Status
              </label>
              <select
                name="maritalStatus"
                className="mt-1 input"
                value={formData.maritalStatus}
                onChange={handleChange}
              >
                <option value="">Select Status</option>
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="DIVORCED">Divorced</option>
                <option value="WIDOWED">Widowed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nationality
              </label>
              <input
                type="text"
                name="nationality"
                className="mt-1 input"
                value={formData.nationality}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Address Information
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                name="address"
                rows={3}
                className="mt-1 input"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                type="text"
                name="city"
                className="mt-1 input"
                value={formData.city}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                State
              </label>
              <input
                type="text"
                name="state"
                className="mt-1 input"
                value={formData.state}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Country
              </label>
              <input
                type="text"
                name="country"
                className="mt-1 input"
                value={formData.country}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Postal Code
              </label>
              <input
                type="text"
                name="postalCode"
                className="mt-1 input"
                value={formData.postalCode}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Emergency Contact
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contact Name
              </label>
              <input
                type="text"
                name="emergencyContactName"
                className="mt-1 input"
                value={formData.emergencyContactName}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contact Phone
              </label>
              <input
                type="tel"
                name="emergencyContactPhone"
                className="mt-1 input"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Relationship
              </label>
              <input
                type="text"
                name="emergencyContactRelation"
                className="mt-1 input"
                value={formData.emergencyContactRelation}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Employment Details
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Designation <span className="required-asterisk">*</span>
              </label>
              <SimpleDropdown
                options={designations}
                selected={selectedDesignation}
                onChange={(value: Designation | null) => {
                  setSelectedDesignation(value);
                  setFormData((prev) => ({
                    ...prev,
                    designationId: value?.id || "",
                  }));
                }}
                placeholder="Select or search designation..."
                onSearch={fetchDesignations}
                loadAllOnMount={true}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <select
                name="departmentId"
                className="mt-1 input"
                value={formData.departmentId}
                onChange={handleChange}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Manager
              </label>
              <select
                name="managerId"
                className="mt-1 input"
                value={formData.managerId}
                onChange={handleChange}
              >
                <option value="">Select Manager</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.firstName} {manager.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Employment Type <span className="required-asterisk">*</span>
              </label>
              <select
                name="employmentType"
                className="mt-1 input"
                value={formData.employmentType}
                onChange={handleChange}
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Work Location
              </label>
              <input
                type="text"
                name="workLocation"
                className="mt-1 input"
                value={formData.workLocation}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Join Date
              </label>
              <input
                type="date"
                name="joinDate"
                className="mt-1 input"
                value={formData.joinDate}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Probation End Date
              </label>
              <input
                type="date"
                name="probationEndDate"
                className="mt-1 input"
                value={formData.probationEndDate}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                name="status"
                className="mt-1 input"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Roles */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Roles <span className="required-asterisk">*</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {availableRoles.map((role) => (
              <div key={role.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={role.id}
                  checked={selectedRoles.includes(role.id)}
                  onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <label
                  htmlFor={role.id}
                  className="ml-2 block text-sm text-gray-900"
                >
                  {role.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-outline"
          >
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
