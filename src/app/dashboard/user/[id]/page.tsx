"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarDaysIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  designation?:
    | {
        title: string;
      }
    | string;
  position?: string;
  joinDate: string;
  department?: {
    name: string;
  };
  manager?: {
    firstName: string;
    lastName: string;
  };
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  status?: string;
}

export default function UserProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchEmployeeProfile();
  }, [params.id]);

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setIsResetting(true);
      const response = await fetch(`/api/users/${params.id}/reset-password`, {
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

  const fetchEmployeeProfile = async () => {
    try {
      const response = await fetch(`/api/employees/${params.id}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployee(data.employee);
      } else {
        toast.error("Failed to fetch user profile");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error("Failed to fetch user profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="border-t border-gray-200">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
              >
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          User not found
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          The requested user profile could not be found.
        </p>
        <div className="mt-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">User Profile</h1>
        <button
          onClick={() => setShowResetModal(true)}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <KeyIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
          Reset Password
        </button>
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

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
              <UserIcon className="h-8 w-8 text-gray-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {employee.firstName} {employee.middleName} {employee.lastName}
              </h3>
              <p className="text-sm text-gray-500">
                {typeof employee.designation === "string"
                  ? employee.designation
                  : employee.designation?.title || "No designation"}
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Employee ID</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {employee.employeeId}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Email address
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex items-center">
                  <EnvelopeIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                  {employee.email}
                </div>
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex items-center">
                  <PhoneIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                  {employee.phone || "Not provided"}
                </div>
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Department</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex items-center">
                  <BuildingOfficeIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                  {employee.department?.name || "Not assigned"}
                </div>
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Join Date</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex items-center">
                  <CalendarDaysIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                  {employee.joinDate
                    ? new Date(employee.joinDate).toLocaleDateString()
                    : "Not provided"}
                </div>
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Manager</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {employee.manager
                  ? `${employee.manager.firstName} ${employee.manager.lastName}`
                  : "Not assigned"}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    employee.status === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : employee.status === "INACTIVE"
                      ? "bg-yellow-100 text-yellow-800"
                      : employee.status === "TERMINATED"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {employee.status || "Not specified"}
                </span>
              </dd>
            </div>
            {(employee.address ||
              employee.city ||
              employee.state ||
              employee.country ||
              employee.postalCode) && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="flex items-start">
                    <MapPinIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      {employee.address && <div>{employee.address}</div>}
                      <div>
                        {[
                          employee.city,
                          employee.state,
                          employee.country,
                          employee.postalCode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    </div>
                  </div>
                </dd>
              </div>
            )}
            {(employee.emergencyContactName ||
              employee.emergencyContactPhone ||
              employee.emergencyContactRelation) && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Emergency Contact
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div>
                    {employee.emergencyContactName && (
                      <div>Name: {employee.emergencyContactName}</div>
                    )}
                    {employee.emergencyContactPhone && (
                      <div>Phone: {employee.emergencyContactPhone}</div>
                    )}
                    {employee.emergencyContactRelation && (
                      <div>Relation: {employee.emergencyContactRelation}</div>
                    )}
                  </div>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
