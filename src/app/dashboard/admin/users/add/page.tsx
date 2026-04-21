"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import SearchableDropdown from "@/components/ui/SearchableDropdown";
import SimpleDropdown from "@/components/ui/SimpleDropdown";

interface Department {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

interface Designation {
  id: string;
  title: string;
}

export default function AddUserPage() {
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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [emailValidation, setEmailValidation] = useState({
    isChecking: false,
    isValid: true,
    message: "",
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["EMPLOYEE"]);
  const router = useRouter();

  // Available roles in the system
  const availableRoles = [
    { id: "ADMINISTRATOR", name: "Administrator" },
    { id: "HR_MANAGER", name: "HR Manager" },
    { id: "DEPARTMENT_MANAGER", name: "Department Manager" },
    { id: "EMPLOYEE", name: "Employee" },
    { id: "PAYROLL_OFFICER", name: "Payroll Officer" },
    { id: "SYSTEM_AUDITOR", name: "System Auditor" },
  ];

  // Check user authentication and authorization
  useEffect(() => {
    const checkUserRoleAndAccess = async () => {
      try {
        const response = await fetch('/api/auth/me', { 
          credentials: 'include',
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (response.ok) {
          const { user } = await response.json();
          if (user && (user.role === 'ADMINISTRATOR' || user.role === 'HR_MANAGER')) {
            setAccessDenied(false);
            setUser(user);
          } else {
            setAccessDenied(true);
          }
        } else {
          setAccessDenied(true);
        }
      } catch (error) {
        console.error("Failed to check user access:", error);
        setAccessDenied(true);
      } finally {
        setAuthChecked(true);
        setLoading(false);
      }
    };

    checkUserRoleAndAccess();
  }, []);

  useEffect(() => {
    if (!accessDenied && user) {
      fetchDepartments();
      fetchDesignations();
      fetchManagers();
    }
  }, [accessDenied, user]);

  // Show loading state while checking authentication
  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-2 text-gray-600">Checking permissions...</span>
      </div>
    );
  }

  // Show access denied page
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
                User Management Access Restricted
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  You do not have permission to access user management features.
                </p>
                <p className="mt-1">
                  This section is restricted to Administrators and HR Managers only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  const validateEmail = async (email: string) => {
    // Check email format first with improved regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setEmailValidation({
        isChecking: false,
        isValid: false,
        message: "Please enter a valid email address",
      });
      return;
    }

    setEmailValidation({
      isChecking: true,
      isValid: true,
      message: "Checking...",
    });

    try {
      const response = await fetch("/api/employees/validate-email", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const data = await response.json();
        setEmailValidation({
          isChecking: false,
          isValid: !data.exists,
          message: data.message,
        });
      }
    } catch (error) {
      console.error("Email validation failed:", error);
      setEmailValidation({ isChecking: false, isValid: true, message: "" });
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData((prev) => ({ ...prev, email }));

    // Reset validation when user starts typing
    if (emailValidation.message) {
      setEmailValidation({
        isChecking: false,
        isValid: true,
        message: "",
      });
    }
  };

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const email = e.target.value;
    // Only validate if there's an email entered
    if (email && email.length > 0) {
      validateEmail(email);
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

    if (!formData.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    if (!formData.dateOfBirth) {
      toast.error("Date of birth is required");
      return;
    }

    // Validate date of birth (should not be a future date)
    const today = new Date();
    const birthDate = new Date(formData.dateOfBirth);
    if (birthDate > today) {
      toast.error("Date of birth cannot be in the future");
      return;
    }

    if (!formData.joinDate) {
      toast.error("Join date is required");
      return;
    }

    // Validate join date (should not be a future date)
    const joinDate = new Date(formData.joinDate);
    if (joinDate > today) {
      toast.error("Join date cannot be in the future");
      return;
    }

    if (!formData.departmentId) {
      toast.error("Please select a department");
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

    if (selectedRoles.length === 0) {
      toast.error("Please select at least one role");
      return;
    }

    // Prevent submission if email is invalid
    if (!emailValidation.isValid) {
      toast.error("Please fix the email validation error before submitting");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          // Don't send password - let the backend use the default
          roles: selectedRoles,
          employeeData: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            middleName: formData.middleName || null,
            email: formData.email,
            phone: formData.phone || null,
            alternatePhone: formData.alternatePhone || null,
            dateOfBirth: formData.dateOfBirth
              ? new Date(formData.dateOfBirth)
              : null,
            gender: formData.gender || null,
            maritalStatus: formData.maritalStatus || null,
            nationality: formData.nationality || null,
            address: formData.address || null,
            city: formData.city || null,
            state: formData.state || null,
            country: formData.country || null,
            postalCode: formData.postalCode || null,
            emergencyContactName: formData.emergencyContactName || null,
            emergencyContactPhone: formData.emergencyContactPhone || null,
            emergencyContactRelation: formData.emergencyContactRelation || null,
            designationId: formData.designationId,
            departmentId: formData.departmentId,
            managerId: formData.managerId || null,
            employmentType: formData.employmentType,
            workLocation: formData.workLocation || null,
            joinDate: new Date(formData.joinDate),
            probationEndDate: formData.probationEndDate
              ? new Date(formData.probationEndDate)
              : null,
            status: formData.status || "ACTIVE",
          },
        }),
      });

      if (response.ok) {
        toast.success(
          "User created successfully. Default password is 'employee123'."
        );
        router.push("/dashboard/admin/users");
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to create user");
      }
    } catch (error) {
      console.error("Failed to create user:", error);
      toast.error("Failed to create user");
    } finally {
      setLoading(false);
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

  const handleRoleChange = (roleId: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles([...selectedRoles, roleId]);
    } else {
      setSelectedRoles(selectedRoles.filter((id) => id !== roleId));
    }
  };

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
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Add New User</h1>
        <p className="text-gray-600">
          Fill in the user information below. Default password will be
          "employee123".
        </p>
      </div>

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
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  required
                  className={`mt-1 input ${
                    emailValidation.isValid
                      ? emailValidation.message && !emailValidation.isChecking
                        ? "border-green-500 focus:ring-green-500"
                        : ""
                      : "border-red-500 focus:ring-red-500"
                  }`}
                  value={formData.email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                />
                {emailValidation.isChecking && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                  </div>
                )}
              </div>
              {emailValidation.message && (
                <p
                  className={`mt-1 text-xs ${
                    emailValidation.isValid ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {emailValidation.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone <span className="required-asterisk">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                required
                className="mt-1 input"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date of Birth <span className="required-asterisk">*</span>
              </label>
              <input
                type="date"
                name="dateOfBirth"
                required
                max={new Date().toISOString().split("T")[0]} // Prevent future dates
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
                onChange={(value) => {
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
                Department <span className="required-asterisk">*</span>
              </label>
              <select
                name="departmentId"
                required
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
                Join Date <span className="required-asterisk">*</span>
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
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Creating..." : "Create User"}
          </button>
        </div>
      </form>
    </div>
  );
}
