"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  UserIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  MapPinIcon,
  InformationCircleIcon,
  BriefcaseIcon,
  HomeIcon,
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
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  designation:
    | {
        id: string;
        title: string;
      }
    | string; // Support both object and string for backward compatibility
  departmentId: string;
  department: {
    name: string;
  };
  managerId?: string;
  manager?: {
    firstName: string;
    lastName: string;
  };
  employmentType: string;
  workLocation?: string;
  joinDate: string;
  probationEndDate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function EmployeeDetailPage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  useEffect(() => {
    if (employeeId) {
      fetchEmployee();
    }
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployee(data.employee);
      } else {
        toast.error("Failed to fetch employee details");
        router.push("/dashboard/employees");
      }
    } catch (error) {
      console.error("Failed to fetch employee:", error);
      toast.error("Failed to fetch employee details");
      router.push("/dashboard/employees");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Employee deleted successfully");
        router.push("/dashboard/employees");
      } else {
        toast.error("Failed to delete employee");
      }
    } catch (error) {
      console.error("Failed to delete employee:", error);
      toast.error("Failed to delete employee");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "INACTIVE":
        return "bg-yellow-100 text-yellow-800";
      case "TERMINATED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-gray-500">Employee not found</p>
        <Link href="/dashboard/employees" className="btn-primary mt-4">
          Back to Employees
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/dashboard/employees"
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {employee.firstName} {employee.lastName}
              </h1>
              <p className="text-gray-600">
                {typeof employee.designation === "string"
                  ? employee.designation
                  : employee.designation.title}{" "}
                • {employee.department.name}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/dashboard/employees/${employee.id}/edit`}
              className="btn btn-outline flex items-center"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </Link>
            <button
              onClick={handleDeleteEmployee}
              className="btn btn-danger flex items-center"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Employee Status */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-16 w-16">
              <div className="h-16 w-16 rounded-full bg-primary-500 flex items-center justify-center">
                <span className="text-xl font-medium text-white">
                  {employee.firstName[0]}
                  {employee.lastName[0]}
                </span>
              </div>
            </div>
            <div className="ml-6">
              <h3 className="text-lg font-medium text-gray-900">
                {employee.firstName} {employee.middleName} {employee.lastName}
              </h3>
              <p className="text-gray-600">
                Employee ID: {employee.employeeId}
              </p>
              <div className="flex items-center mt-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    employee.status
                  )}`}
                >
                  {employee.status}
                </span>
                <span className="ml-3 text-sm text-gray-500">
                  Joined: {formatDate(employee.joinDate)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "overview"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <InformationCircleIcon className="h-5 w-5 inline-block mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("personal")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "personal"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <UserIcon className="h-5 w-5 inline-block mr-2" />
            Personal Info
          </button>
          <button
            onClick={() => setActiveTab("employment")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "employment"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <BriefcaseIcon className="h-5 w-5 inline-block mr-2" />
            Employment
          </button>
          <button
            onClick={() => setActiveTab("contact")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "contact"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <HomeIcon className="h-5 w-5 inline-block mr-2" />
            Contact & Emergency
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg p-6">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Personal Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <label className="detail-label">Email</label>
                    <p className="detail-value">{employee.email}</p>
                  </div>
                </div>
                {employee.phone && (
                  <div className="flex items-center">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <label className="detail-label">Phone</label>
                      <p className="detail-value">{employee.phone}</p>
                    </div>
                  </div>
                )}
                {employee.dateOfBirth && (
                  <div className="flex items-center">
                    <CalendarDaysIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <label className="detail-label">Date of Birth</label>
                      <p className="detail-value">
                        {formatDate(employee.dateOfBirth)}
                      </p>
                    </div>
                  </div>
                )}
                {employee.gender && (
                  <div>
                    <label className="detail-label">Gender</label>
                    <p className="detail-value">{employee.gender}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Employment Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <label className="detail-label">Department</label>
                    <p className="detail-value">{employee.department.name}</p>
                  </div>
                </div>
                <div>
                  <label className="detail-label">Designation</label>
                  <p className="detail-value">
                    {typeof employee.designation === "string"
                      ? employee.designation
                      : employee.designation.title}
                  </p>
                </div>
                <div>
                  <label className="detail-label">Employment Type</label>
                  <p className="detail-value">
                    {employee.employmentType.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <label className="detail-label">Join Date</label>
                  <p className="detail-value">
                    {formatDate(employee.joinDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Personal Information Tab */}
        {activeTab === "personal" && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="detail-label">First Name</label>
                  <p className="detail-value">{employee.firstName}</p>
                </div>
                {employee.middleName && (
                  <div>
                    <label className="detail-label">Middle Name</label>
                    <p className="detail-value">{employee.middleName}</p>
                  </div>
                )}
                <div>
                  <label className="detail-label">Last Name</label>
                  <p className="detail-value">{employee.lastName}</p>
                </div>
                <div>
                  <label className="detail-label">Email</label>
                  <p className="detail-value">{employee.email}</p>
                </div>
                {employee.phone && (
                  <div>
                    <label className="detail-label">Phone</label>
                    <p className="detail-value">{employee.phone}</p>
                  </div>
                )}
                {employee.alternatePhone && (
                  <div>
                    <label className="detail-label">Alternate Phone</label>
                    <p className="detail-value">{employee.alternatePhone}</p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {employee.dateOfBirth && (
                  <div>
                    <label className="detail-label">Date of Birth</label>
                    <p className="detail-value">
                      {formatDate(employee.dateOfBirth)}
                    </p>
                  </div>
                )}
                {employee.gender && (
                  <div>
                    <label className="detail-label">Gender</label>
                    <p className="detail-value">{employee.gender}</p>
                  </div>
                )}
                {employee.maritalStatus && (
                  <div>
                    <label className="detail-label">Marital Status</label>
                    <p className="detail-value">{employee.maritalStatus}</p>
                  </div>
                )}
                {employee.nationality && (
                  <div>
                    <label className="detail-label">Nationality</label>
                    <p className="detail-value">{employee.nationality}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Employment Tab */}
        {activeTab === "employment" && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Employment Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <label className="detail-label">Department</label>
                    <p className="detail-value">{employee.department.name}</p>
                  </div>
                </div>
                <div>
                  <label className="detail-label">Designation</label>
                  <p className="detail-value">
                    {typeof employee.designation === "string"
                      ? employee.designation
                      : employee.designation.title}
                  </p>
                </div>
                <div>
                  <label className="detail-label">Employment Type</label>
                  <p className="detail-value">
                    {employee.employmentType.replace("_", " ")}
                  </p>
                </div>
                {employee.manager && (
                  <div>
                    <label className="detail-label">Manager</label>
                    <p className="detail-value">
                      {employee.manager.firstName} {employee.manager.lastName}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {employee.workLocation && (
                  <div>
                    <label className="detail-label">Work Location</label>
                    <p className="detail-value">{employee.workLocation}</p>
                  </div>
                )}
                <div>
                  <label className="detail-label">Join Date</label>
                  <p className="detail-value">
                    {formatDate(employee.joinDate)}
                  </p>
                </div>
                {employee.probationEndDate && (
                  <div>
                    <label className="detail-label">Probation End Date</label>
                    <p className="detail-value">
                      {formatDate(employee.probationEndDate)}
                    </p>
                  </div>
                )}
                <div>
                  <label className="detail-label">Status</label>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      employee.status
                    )}`}
                  >
                    {employee.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact & Emergency Tab */}
        {activeTab === "contact" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Address Information
                </h3>
                {(employee.address ||
                  employee.city ||
                  employee.state ||
                  employee.country) && (
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <label className="detail-label">Address</label>
                        <div className="detail-value">
                          {employee.address && <p>{employee.address}</p>}
                          <p>
                            {[
                              employee.city,
                              employee.state,
                              employee.postalCode,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                          {employee.country && <p>{employee.country}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Emergency Contact
                </h3>
                {(employee.emergencyContactName ||
                  employee.emergencyContactPhone) && (
                  <div className="space-y-4">
                    {employee.emergencyContactName && (
                      <div>
                        <label className="detail-label">Contact Name</label>
                        <p className="detail-value">
                          {employee.emergencyContactName}
                        </p>
                      </div>
                    )}
                    {employee.emergencyContactPhone && (
                      <div>
                        <label className="detail-label">Contact Phone</label>
                        <p className="detail-value">
                          {employee.emergencyContactPhone}
                        </p>
                      </div>
                    )}
                    {employee.emergencyContactRelation && (
                      <div>
                        <label className="detail-label">Relationship</label>
                        <p className="detail-value">
                          {employee.emergencyContactRelation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
