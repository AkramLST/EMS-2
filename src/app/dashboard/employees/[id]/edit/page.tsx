"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, KeyIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { getCookie } from "@/lib/cookies";
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
  employeeId?: string;
}

interface Designation {
  id: string;
  title: string;
}

export default function EditEmployeePage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    employeeId: "",
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
    resignationDate: "",
    lastWorkingDay: "",
    role: "EMPLOYEE",
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [selectedDesignation, setSelectedDesignation] =
    useState<Designation | null>(null);
  const [originalEmployeeData, setOriginalEmployeeData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [emailValidation, setEmailValidation] = useState({
    isChecking: false,
    isValid: true,
    message: "",
  });
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [employeeIdValidation, setEmployeeIdValidation] = useState({
    isChecking: false,
    isValid: true,
    message: "",
  });

  const availableRoles = [
    { id: "EMPLOYEE", name: "Employee" },
    { id: "DEPARTMENT_MANAGER", name: "Department Manager" },
    { id: "HR_MANAGER", name: "HR Manager" },
    { id: "PAYROLL_OFFICER", name: "Payroll Officer" },
    { id: "SYSTEM_AUDITOR", name: "System Auditor" },
    { id: "ADMINISTRATOR", name: "Administrator" },
  ];

  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const canEditEmployeeId = currentUserRole === "ADMINISTRATOR";

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const linkedUserId = originalEmployeeData?.userId;
    if (!linkedUserId) {
      toast.error("Unable to reset password: linked user account not found.");
      return;
    }

    try {
      setIsResetting(true);
      const response = await fetch(
        `/api/users/${linkedUserId}/reset-password`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ newPassword }),
        }
      );

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
    if (!employeeId) return;

    // First fetch current user to determine role
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const { user } = await response.json();
          setCurrentUserRole(user?.role ?? null);
        } else {
          setCurrentUserRole(null);
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error);
        setCurrentUserRole(null);
      }
    };

    fetchCurrentUser();
    fetchEmployeeData();
    fetchDepartments();
    fetchDesignations();
    fetchManagers();
  }, [employeeId]);

  const fetchEmployeeData = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const employee = data.employee;

        setOriginalEmployeeData(employee);

        // Set form data
        setFormData({
          firstName: employee.firstName || "",
          lastName: employee.lastName || "",
          middleName: employee.middleName || "",
          employeeId: employee.employeeId || "",
          email: employee.email || "",
          phone: employee.phone || "",
          alternatePhone: employee.alternatePhone || "",
          dateOfBirth: employee.dateOfBirth
            ? new Date(employee.dateOfBirth).toISOString().split("T")[0]
            : "",
          gender: employee.gender || "",
          maritalStatus: employee.maritalStatus || "",
          nationality: employee.nationality || "",
          address: employee.address || "",
          city: employee.city || "",
          state: employee.state || "",
          country: employee.country || "",
          postalCode: employee.postalCode || "",
          emergencyContactName: employee.emergencyContactName || "",
          emergencyContactPhone: employee.emergencyContactPhone || "",
          emergencyContactRelation: employee.emergencyContactRelation || "",
          designationId: employee.designation?.id || "",
          departmentId: employee.department?.id || "",
          managerId: employee.manager?.id || "",
          employmentType: employee.employmentType || "FULL_TIME",
          workLocation: employee.workLocation || "",
          joinDate: employee.joinDate
            ? new Date(employee.joinDate).toISOString().split("T")[0]
            : "",
          probationEndDate: employee.probationEndDate
            ? new Date(employee.probationEndDate).toISOString().split("T")[0]
            : "",
          status: employee.status || "ACTIVE",
          resignationDate: employee.resignationDate
            ? new Date(employee.resignationDate).toISOString().split("T")[0]
            : "",
          lastWorkingDay: employee.lastWorkingDay
            ? new Date(employee.lastWorkingDay).toISOString().split("T")[0]
            : "",
          role:
            employee.user?.role ||
            (Array.isArray(employee.user?.roles) &&
            employee.user.roles.length > 0
              ? employee.user.roles[0].role
              : "EMPLOYEE"),
        });

        // Set selected designation
        if (employee.designation) {
          setSelectedDesignation({
            id: employee.designation.id,
            title: employee.designation.title,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch employee data:", error);
      toast.error("Failed to load employee data");
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
      }
    } catch (error) {
      console.error("Failed to fetch designations:", error);
    }
  };

  const fetchManagers = async () => {
    try {
      // Fetch ALL employees to show in manager dropdown
      const response = await fetch("/api/employees", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Fetched managers/employees:", data.employees?.length || 0);
        setManagers(data.employees || []);
      } else {
        console.error("Failed to fetch managers:", response.status);
        // Fallback: try with role=manager parameter
        try {
          const fallbackResponse = await fetch("/api/employees?role=manager", {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            console.log(
              "Fallback fetch successful:",
              fallbackData.employees?.length || 0
            );
            setManagers(fallbackData.employees || []);
          }
        } catch (fallbackError) {
          console.error("Fallback fetch also failed:", fallbackError);
        }
      }
    } catch (error) {
      console.error("Failed to fetch managers:", error);
      // Try one more time with role=manager parameter
      try {
        const retryResponse = await fetch("/api/employees?role=manager", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          setManagers(retryData.employees || []);
        }
      } catch (retryError) {
        console.error("Retry also failed:", retryError);
      }
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    let isValid = true;

    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required";
      isValid = false;
    }

    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required";
      isValid = false;
    }

    if (!formData.employeeId.trim()) {
      errors.employeeId = "Employee ID is required";
      isValid = false;
    }

    // Email validation is now handled by real-time validation
    // But we still check if it's empty
    if (!formData.email.trim()) {
      errors.email = "Email is required";
      isValid = false;
    }

    if (!formData.designationId) {
      errors.designationId = "Designation is required";
      isValid = false;
    }

    if (!formData.departmentId) {
      errors.departmentId = "Department is required";
      isValid = false;
    }

    if (!formData.employmentType) {
      errors.employmentType = "Employment type is required";
      isValid = false;
    }

    if (!formData.joinDate) {
      errors.joinDate = "Join date is required";
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Prevent submission if email is invalid
    if (!emailValidation.isValid) {
      toast.error("Please fix the email validation error before submitting");
      return;
    }

    // Prevent submission if employee ID is invalid and has changed
    if (
      !employeeIdValidation.isValid &&
      originalEmployeeData &&
      formData.employeeId !== originalEmployeeData.employeeId
    ) {
      toast.error(
        employeeIdValidation.message ||
          "Please fix the Employee ID error before submitting"
      );
      return;
    }
    setSaving(true);

    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Employee updated successfully");
        // Always redirect to employees list after updating
        router.push("/dashboard/employees");
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to update employee");
      }
    } catch (error) {
      console.error("Failed to update employee:", error);
      toast.error("Failed to update employee");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Live validate employee ID when edited by admin
    if (name === "employeeId" && canEditEmployeeId) {
      validateEmployeeId(value);
    }

    // Clear error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: "" });
    }
  };

  const validateEmployeeId = async (newEmployeeId: string) => {
    const trimmed = newEmployeeId.trim();

    if (!trimmed) {
      setEmployeeIdValidation({
        isChecking: false,
        isValid: false,
        message: "Employee ID is required",
      });
      return;
    }

    // Validate format: EMP + exactly 4 digits
    const formatMatch = trimmed.match(/^EMP\d{4}$/);
    if (!formatMatch) {
      setEmployeeIdValidation({
        isChecking: false,
        isValid: false,
        message: "Employee ID must be in format EMP#### (exactly 4 digits)",
      });
      return;
    }

    setEmployeeIdValidation({
      isChecking: true,
      isValid: true,
      message: "",
    });

    try {
      const params = new URLSearchParams({
        employeeId: trimmed,
        currentId: employeeId,
      });

      const response = await fetch(`/api/employees/validate-id?${params}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        if (data.exists) {
          setEmployeeIdValidation({
            isChecking: false,
            isValid: false,
            message: "This Employee ID is already in use",
          });
        } else {
          setEmployeeIdValidation({
            isChecking: false,
            isValid: true,
            message: "Employee ID is available",
          });
        }
      } else {
        setEmployeeIdValidation({
          isChecking: false,
          isValid: false,
          message: data.message || "Failed to validate Employee ID",
        });
      }
    } catch (error) {
      console.error("Employee ID validation error:", error);
      setEmployeeIdValidation({
        isChecking: false,
        isValid: false,
        message: "Failed to validate Employee ID",
      });
    }
  };

  const handleDesignationChange = (designation: Designation) => {
    setSelectedDesignation(designation);
    setFormData((prev) => ({
      ...prev,
      designationId: designation.id,
    }));
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <Link
            href={`/dashboard/employees/${employeeId}`}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Edit Employee
            </h1>
            <p className="text-gray-600">Update employee information</p>
          </div>
          <button
            onClick={() => setShowResetModal(true)}
            className="ml-auto inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <KeyIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
            Reset Password
          </button>
        </div>
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
                className={`mt-1 input ${
                  fieldErrors.firstName
                    ? "border-red-500 focus:ring-red-500"
                    : ""
                }`}
                value={formData.firstName}
                onChange={handleChange}
              />
              {fieldErrors.firstName && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.firstName}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Last Name <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                className={`mt-1 input ${
                  fieldErrors.lastName
                    ? "border-red-500 focus:ring-red-500"
                    : ""
                }`}
                value={formData.lastName}
                onChange={handleChange}
              />
              {fieldErrors.lastName && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.lastName}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Middle Name
              </label>
              <input
                type="text"
                name="middleName"
                className="mt-1 input"
                value={formData.middleName || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Employee ID <span className="required-asterisk">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="employeeId"
                  className={`mt-1 input ${
                    canEditEmployeeId
                      ? employeeIdValidation.isValid
                        ? employeeIdValidation.message &&
                          !employeeIdValidation.isChecking
                          ? "border-green-500 focus:ring-green-500"
                          : ""
                        : "border-red-500 focus:ring-red-500"
                      : "bg-gray-100 text-gray-600 cursor-not-allowed"
                  }`}
                  value={formData.employeeId}
                  onChange={canEditEmployeeId ? handleChange : undefined}
                  readOnly={!canEditEmployeeId}
                />
                {employeeIdValidation.isChecking && canEditEmployeeId && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                  </div>
                )}
              </div>
              <p
                className={`mt-1 text-xs ${
                  employeeIdValidation.isValid && employeeIdValidation.message
                    ? "text-green-600"
                    : !employeeIdValidation.isValid &&
                      employeeIdValidation.message
                    ? "text-red-600"
                    : "text-gray-500"
                }`}
              >
                {employeeIdValidation.message
                  ? employeeIdValidation.message
                  : "Employee IDs are system generated. Only administrators can modify this value."}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email <span className="required-asterisk">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  className={`mt-1 input ${
                    emailValidation.isValid
                      ? emailValidation.message && !emailValidation.isChecking
                        ? "border-green-500 focus:ring-green-500"
                        : fieldErrors.email
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                      : "border-red-500 focus:ring-red-500"
                  }`}
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleChange}
                />
                {emailValidation.isChecking && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                  </div>
                )}
              </div>
              {(fieldErrors.email || emailValidation.message) && (
                <p
                  className={`mt-1 text-xs ${
                    emailValidation.isValid && !fieldErrors.email
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {fieldErrors.email || emailValidation.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                className="mt-1 input"
                value={formData.phone || ""}
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
                value={formData.dateOfBirth || ""}
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
                value={formData.gender || ""}
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
                value={formData.maritalStatus || ""}
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
                value={formData.nationality || ""}
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
                value={formData.address || ""}
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
                value={formData.city || ""}
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
                value={formData.state || ""}
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
                value={formData.country || ""}
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
                value={formData.postalCode || ""}
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
                value={formData.emergencyContactName || ""}
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
                value={formData.emergencyContactPhone || ""}
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
                value={formData.emergencyContactRelation || ""}
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
              {fieldErrors.designationId && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.designationId}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Department <span className="required-asterisk">*</span>
              </label>
              <select
                name="departmentId"
                className={`mt-1 input ${
                  fieldErrors.departmentId
                    ? "border-red-500 focus:ring-red-500"
                    : ""
                }`}
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
              {fieldErrors.departmentId && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.departmentId}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Manager
              </label>
              <select
                name="managerId"
                className="mt-1 input"
                value={formData.managerId || ""}
                onChange={handleChange}
              >
                <option value="">Select Manager</option>
                {managers
                  .filter((m) => m.id !== employeeId)
                  .map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.firstName} {manager.lastName}{" "}
                      {manager.employeeId ? `(${manager.employeeId})` : ""}
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
                className={`mt-1 input ${
                  fieldErrors.employmentType
                    ? "border-red-500 focus:ring-red-500"
                    : ""
                }`}
                value={formData.employmentType}
                onChange={handleChange}
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
              {fieldErrors.employmentType && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.employmentType}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Work Location
              </label>
              <input
                type="text"
                name="workLocation"
                className="mt-1 input"
                value={formData.workLocation || ""}
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
                className={`mt-1 input ${
                  fieldErrors.joinDate
                    ? "border-red-500 focus:ring-red-500"
                    : ""
                }`}
                value={formData.joinDate}
                onChange={handleChange}
              />
              {fieldErrors.joinDate && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.joinDate}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Probation End Date
              </label>
              <input
                type="date"
                name="probationEndDate"
                className="mt-1 input"
                value={formData.probationEndDate || ""}
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
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                name="role"
                className="mt-1 input"
                value={formData.role}
                onChange={handleChange}
              >
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Choose the system role assigned to this employee.
              </p>
            </div>
            {(formData.status === "INACTIVE" ||
              formData.status === "TERMINATED") && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Resignation Date
                  </label>
                  <input
                    type="date"
                    name="resignationDate"
                    className="mt-1 input"
                    value={formData.resignationDate || ""}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Working Day
                  </label>
                  <input
                    type="date"
                    name="lastWorkingDay"
                    className="mt-1 input"
                    value={formData.lastWorkingDay || ""}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3">
          <Link
            href={`/dashboard/employees/${employeeId}`}
            className="btn-outline"
          >
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
