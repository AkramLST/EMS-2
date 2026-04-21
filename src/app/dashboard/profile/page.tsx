"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import PersonalTab from "@/components/profile/PersonalTab";
import JobTab from "@/components/profile/JobTab";
import EmergencyTab from "@/components/profile/EmergencyTab";
import DocumentsTab from "@/components/profile/DocumentsTab";
import CertificationsTab from "@/components/profile/CertificationsTab";
import SecurityTab from "@/components/profile/SecurityTab";
import Avatar from "@/components/ui/Avatar";
import EmployeeSummaryModal from "@/components/profile/EmployeeSummaryModal";
import ProfileImageEditor, {
  compressImageFile,
} from "@/components/profile/ProfileImageEditor";
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  MapPinIcon,
  BriefcaseIcon,
  ArrowPathIcon,
  PhotoIcon,
  ClockIcon,
  IdentificationIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
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
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  emergencyContactEmail?: string;
  emergencyContactAddressLine1?: string;
  emergencyContactAddressLine2?: string;
  emergencyContactCity?: string;
  emergencyContactState?: string;
  emergencyContactPostalCode?: string;
  designation:
    | {
        id: string;
        title: string;
      }
    | string;
  department: {
    name: string;
  };
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
  leaveBalanceSummary?: Record<string, any>;
  attendanceStats?: any;
  recentActivities?: any[];
  fullName?: string;
  age?: number;
  tenure?: number;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  education?: Array<{
    institution: string;
    degree: string;
    major: string;
    gpa?: string;
    startDate: string;
    endDate: string;
  }>;
  passports?: Array<{
    number: string;
    issuedDate: string;
    expiryDate: string;
    issuingCountry: string;
  }>;
  documents?: Array<any>;
  leaveBalances?: Array<any>;
  leaveApplications?: Array<any>;
  attendanceRecords?: Array<any>;
  performanceReviews?: Array<any>;
  trainingEnrollments?: Array<any>;
  assetAssignments?: Array<any>;
}

export default function ProfilePage() {
  const { user: currentUser } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageBase, setProfileImageBase] = useState<string | null>(null);
  const [profileImageOriginalFile, setProfileImageOriginalFile] =
    useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isHeaderCondensed, setIsHeaderCondensed] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get employee ID from URL parameters
  const employeeId = searchParams.get("id");
  const isOwnProfile = !employeeId; // If no ID in URL, it's the current user's profile

  const canManageProfiles =
    currentUser?.role === "ADMINISTRATOR" || currentUser?.role === "HR_MANAGER";

  const canEditProfile = isOwnProfile || canManageProfiles;

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  // Calculate tenure
  const calculateTenure = (joinDate: string) => {
    const today = new Date();
    const start = new Date(joinDate);
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;

    return `${years}yr • ${months}m • ${days}d`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get document icon
  const getDocumentIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return "📄";
      case "doc":
      case "docx":
        return "📝";
      case "jpg":
      case "jpeg":
      case "png":
        return "🖼️";
      default:
        return "📋";
    }
  };

  useEffect(() => {
    fetchEmployeeProfile();
  }, []);

  useEffect(() => {
    if (employee?.employeeId) {
      fetchEmployeeProfileImage();
    }
  }, [employee?.employeeId]);

  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderCondensed(window.scrollY > 120);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchEmployeeProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build API URL with employee ID if provided
      const apiUrl = employeeId
        ? `/api/profile?id=${encodeURIComponent(employeeId)}`
        : "/api/profile";

      const response = await fetch(apiUrl, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const employeeData = data.profile;

        if (!employeeData) {
          throw new Error("Employee data not found");
        }

        setEmployee(employeeData);
      } else {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch profile`);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch profile"
      );
      toast.error("Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeProfileImage = async () => {
    if (!employee?.employeeId) return;

    try {
      const response = await fetch(
        `/api/employees/profile-image?employeeId=${encodeURIComponent(
          employee.employeeId
        )}&t=${Date.now()}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.originalUrl) {
          setProfileImageBase(data.originalUrl);
          setProfileImageOriginalFile(null);
        }
        if (data.imageUrl) {
          // Add timestamp to image URL for cache busting
          setProfileImage(`${data.imageUrl}?t=${Date.now()}`);
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile image:", error);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    if (!employee?.employeeId) {
      return;
    }

    const compressedFile = await compressImageFile(file, {
      maxWidth: 1600,
      maxHeight: 1600,
      quality: 0.9,
    });
    const objectUrl = URL.createObjectURL(compressedFile);
    setProfileImageBase(objectUrl);
    setProfileImageOriginalFile(compressedFile);
    setShowImageEditor(true);
    // Reset input value so the same file can be selected again if needed
    event.target.value = "";
  };

  const handleSaveCroppedImage = async (
    croppedImage: Blob,
    originalFile: File
  ) => {
    if (!employee?.employeeId) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("image", croppedImage, "profile.jpg");
      formData.append("original", originalFile);
      formData.append("employeeId", employee.employeeId);

      const response = await fetch("/api/employees/profile-image", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // Add cache-busting timestamp to force image refresh
        if (data.originalUrl) {
          setProfileImageBase(data.originalUrl);
          setProfileImageOriginalFile(null);
        }
        if (data.imageUrl) {
          const imageUrlWithTimestamp = `${data.imageUrl}?t=${Date.now()}`;
          setProfileImage(imageUrlWithTimestamp);
        }
        toast.success("Profile image updated successfully");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to upload image");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload image");
    }
  };

  const handleDeleteImage = async () => {
    if (!employee?.employeeId) {
      return;
    }

    try {
      const response = await fetch(
        `/api/employees/profile-image?employeeId=${encodeURIComponent(
          employee.employeeId
        )}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        setProfileImage(null);
        setProfileImageBase(null);
        setProfileImageOriginalFile(null);
        toast.success("Profile image deleted successfully");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete image");
      }
    } catch (error) {
      console.error("Image delete error:", error);
      toast.error("Failed to delete image");
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

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-red-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Error loading profile
        </h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
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

  if (!employee) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <ExclamationTriangleIcon className="h-12 w-12" />
        </div>
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

  const headerPaddingClass = isHeaderCondensed ? "py-4" : "py-6 md:py-8";
  const headerSpacingClass = isHeaderCondensed ? "space-x-4" : "space-x-6";
  const imageWrapperClass = isHeaderCondensed
    ? "w-16 h-16 lg:w-20 lg:h-20 rounded-xl"
    : "w-32 h-32 lg:w-36 lg:h-36 rounded-2xl";
  const imageRingClass = isHeaderCondensed ? "ring-2" : "ring-4";
  const uploadOffsetClass = isHeaderCondensed
    ? "-bottom-2 -right-2"
    : "-bottom-3 -right-3";
  const uploadPaddingClass = isHeaderCondensed ? "p-2" : "p-3";
  const uploadIconClass = isHeaderCondensed ? "h-4 w-4" : "h-5 w-5";
  const tabsPaddingClass = isHeaderCondensed ? "pb-1" : "pb-2";
  const tabButtonPadding = isHeaderCondensed ? "px-3 py-1.5" : "px-4 py-2";

  const profileTabs = [
    { id: "personal", label: "Personal", value: "personal" },
    { id: "job", label: "Job", value: "employment" },
    { id: "emergency", label: "Emergency", value: "contact" },
    { id: "documents", label: "Documents", value: "documents" },
    { id: "certifications", label: "Certifications", value: "certifications" },
  ];

  if (isOwnProfile) {
    profileTabs.push({ id: "security", label: "Security", value: "security" });
  }

  return (
    <div className="min-h-screen bg-gray-50 rounded-t-3xl">
      {/* Back Button for Other Profiles */}
      {!isOwnProfile && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span>Back to Previous Page</span>
            </button>
          </div>
        </div>
      )}

      {/* Blue Header Section */}
      <div className="shadow-lg rounded-3xl">
        <div
          className={`bg-gradient-to-r from-blue-600 to-blue-800 px-6 ${headerPaddingClass} rounded-3xl transition-all duration-300`}
        >
          <div className="max-w-7xl mx-auto">
            <div
              className={`flex items-start ${headerSpacingClass} transition-all duration-300`}
            >
              {/* Profile Image */}
              <div className="flex-shrink-0 relative transition-all duration-300">
                <button
                  onClick={() => canEditProfile && setShowImageEditor(true)}
                  className={`${imageWrapperClass} overflow-hidden shadow-2xl ${imageRingClass} ring-white transition-all duration-300 ${
                    canEditProfile ? "cursor-pointer hover:opacity-90" : ""
                  } relative`}
                  disabled={!canEditProfile}
                >
                  {profileImage ? (
                    <Image
                      src={profileImage}
                      alt={`${employee.firstName} ${employee.lastName}`}
                      width={288}
                      height={288}
                      className="h-full w-full object-cover object-center transition-all duration-300"
                      style={{ objectFit: "cover", objectPosition: "center" }}
                      priority
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-blue-500/20 text-blue-100">
                      <UserIcon
                        className={
                          isHeaderCondensed ? "h-12 w-12" : "h-16 w-16"
                        }
                      />
                    </div>
                  )}
                </button>
                {canEditProfile && (
                  <div
                    className={`absolute ${uploadOffsetClass} transition-all duration-300`}
                  >
                    <button
                      onClick={() => setShowImageEditor(true)}
                      disabled={uploadingImage}
                      className={`bg-white border border-gray-200 rounded-full ${uploadPaddingClass} shadow-lg hover:shadow-xl transition-all duration-200 ${
                        uploadingImage
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-blue-400"
                      }`}
                      title="Edit profile picture"
                    >
                      {uploadingImage ? (
                        <ArrowPathIcon
                          className={`${uploadIconClass} text-gray-500 animate-spin`}
                        />
                      ) : (
                        <PhotoIcon
                          className={`${uploadIconClass} text-gray-600`}
                        />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-bold text-white">
                        {employee.firstName} {employee.middleName}{" "}
                        {employee.lastName}
                      </h1>
                      {!canEditProfile && (
                        <span className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full">
                          View Only
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-blue-100 text-lg">
                      {typeof employee.designation === "string"
                        ? employee.designation
                        : employee.designation.title}
                    </p>
                  </div>
                  {canManageProfiles && (
                    <button
                      onClick={() => setShowSummaryModal(true)}
                      className="inline-flex items-center rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-blue-700 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      View Printable Profile
                    </button>
                  )}
                </div>
                {/* Tab Navigation */}
                <div
                  className={`mt-6 flex space-x-1 ${tabsPaddingClass} transition-all duration-300`}
                >
                  {profileTabs.map((tab) => {
                    const isActive = activeTab === tab.value;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.value)}
                        className={`${tabButtonPadding} rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-white text-blue-600 shadow-md"
                            : "text-blue-100 hover:text-white hover:bg-blue-700"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Vitals Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Vitals
              </h3>

              <div className="space-y-4">
                {/* Phone Numbers */}
                <div className="flex items-center space-x-3">
                  <PhoneIcon className="h-4 w-4 text-gray-400" />
                  <div className="text-sm">
                    <div className="text-gray-600">
                      {employee.phone || "Not provided"}
                    </div>
                    {employee.alternatePhone && (
                      <div className="text-gray-400">
                        {employee.alternatePhone}
                      </div>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center space-x-3">
                  <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                  <div className="text-sm text-gray-600">{employee.email}</div>
                </div>

                {/* Location */}

                {/* Location Details */}
                <div className="flex items-center space-x-3">
                  <MapPinIcon className="h-4 w-4 text-gray-400" />
                  <div className="text-sm text-gray-600">
                    {employee.workLocation || employee.city || "Not specified"}
                  </div>
                </div>

                {/* Job Title */}
                <div className="flex items-center space-x-3">
                  <BriefcaseIcon className="h-4 w-4 text-gray-400" />
                  <div className="text-sm">
                    <div className="text-gray-900 font-medium">
                      {typeof employee.designation === "string"
                        ? employee.designation
                        : employee.designation.title}
                    </div>
                    <div className="text-gray-500">
                      {employee.employmentType.replace("_", " ")}
                    </div>
                  </div>
                </div>

                {/* Department */}
                <div className="flex items-center space-x-3">
                  <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
                  <div className="text-sm text-gray-600">
                    {employee.department.name}
                  </div>
                </div>

                {/* Employee ID */}
                <div className="flex items-center space-x-3">
                  <IdentificationIcon className="h-4 w-4 text-gray-400" />
                  <div className="text-sm text-gray-600">
                    {employee.employeeId}
                  </div>
                </div>
              </div>

              {/* Hire Date Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Hire Date
                </h4>
                <div className="flex items-center space-x-3">
                  <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                  <div className="text-sm">
                    <div className="text-gray-900">
                      {formatDate(employee.joinDate)}
                    </div>
                    <div className="text-gray-500">
                      {calculateTenure(employee.joinDate)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Manager Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Manager
                </h4>
                <div className="flex items-center space-x-3">
                  {employee.manager ? (
                    <Avatar
                      employeeId="manager"
                      employeeName={`${employee.manager.firstName} ${employee.manager.lastName}`}
                      size="sm"
                      showLink={false}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 font-medium text-sm">
                        ?
                      </span>
                    </div>
                  )}
                  <div className="text-sm">
                    <div className="text-gray-900 font-medium">
                      {employee.manager
                        ? `${employee.manager.firstName} ${employee.manager.lastName}`
                        : "Not assigned"}
                    </div>
                    <div className="text-gray-500">
                      {employee.manager ? "Manager" : "No manager assigned"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="rounded-xl">
              {/* Tab Content Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  {activeTab === "security" ? (
                    <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
                  ) : (
                    <BriefcaseIcon className="h-5 w-5 text-blue-600" />
                  )}
                  <h2 className="text-lg font-semibold text-gray-900">
                    {activeTab === "personal" && "Personal"}
                    {activeTab === "employment" && "Job"}
                    {activeTab === "contact" && "Emergency"}
                    {activeTab === "documents" && "Documents"}
                    {activeTab === "certifications" && "Certifications"}
                    {activeTab === "security" && "Security"}
                  </h2>
                </div>
              </div>

              {/* Tab Content */}
              <div className="my-6">
                {/* Personal Tab */}
                {activeTab === "personal" && (
                  <PersonalTab
                    employee={employee}
                    employeeId={employeeId || undefined}
                    formatDate={formatDate}
                    canEdit={true}
                    currentUserEmployeeId={currentUser?.employee?.id}
                    currentUserRole={currentUser?.role}
                  />
                )}

                {/* Job Tab */}
                {activeTab === "employment" && (
                  <JobTab
                    employee={employee}
                    formatDate={formatDate}
                    calculateTenure={calculateTenure}
                  />
                )}

                {/* Emergency Contact Tab */}
                {activeTab === "contact" && (
                  <EmergencyTab
                    employee={{
                      ...employee,
                      emergencyContactEmail:
                        employee.emergencyContactEmail ?? null,
                      emergencyContactAddressLine1:
                        employee.emergencyContactAddressLine1 ?? null,
                      emergencyContactAddressLine2:
                        employee.emergencyContactAddressLine2 ?? null,
                      emergencyContactCity:
                        employee.emergencyContactCity ?? null,
                      emergencyContactState:
                        employee.emergencyContactState ?? null,
                      emergencyContactPostalCode:
                        employee.emergencyContactPostalCode ?? null,
                    }}
                  />
                )}

                {/* Documents Tab */}
                {activeTab === "documents" && (
                  <DocumentsTab
                    employee={employee}
                    formatDate={formatDate}
                    formatFileSize={formatFileSize}
                    getDocumentIcon={getDocumentIcon}
                  />
                )}

                {/* Certifications Tab */}
                {activeTab === "certifications" && (
                  <CertificationsTab employee={employee} />
                )}

                {activeTab === "security" && isOwnProfile && <SecurityTab />}
              </div>
            </div>
          </div>
        </div>
      </div>
      <EmployeeSummaryModal
        open={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        employee={employee}
        profileImage={profileImage}
      />
      {employee && (
        <ProfileImageEditor
          open={showImageEditor}
          onClose={() => setShowImageEditor(false)}
          imageUrl={profileImage}
          originalImageUrl={profileImageBase ?? profileImage}
          originalImageFile={profileImageOriginalFile}
          onSave={handleSaveCroppedImage}
          onDelete={profileImage ? handleDeleteImage : undefined}
          employeeName={`${employee.firstName} ${employee.lastName}`}
        />
      )}
    </div>
  );
}
