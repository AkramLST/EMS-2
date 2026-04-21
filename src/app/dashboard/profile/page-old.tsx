"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import PassportFormModal from "@/components/ui/PassportFormModal";
import PersonalTab from "@/components/profile/PersonalTab";
import {
  PencilIcon,
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
  DocumentTextIcon,
  CloudArrowUpIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  AcademicCapIcon,
  HeartIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

type Role =
  | "ADMINISTRATOR"
  | "HR_MANAGER"
  | "DEPARTMENT_MANAGER"
  | "EMPLOYEE"
  | "MANAGER"
  | string;

type PersonalFormState = {
  firstName: string;
  lastName: string;
  middleName: string;
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
};

const ADMIN_PERSONAL_EDIT_FIELDS: (keyof PersonalFormState)[] = [
  "firstName",
  "lastName",
  "middleName",
  "phone",
  "alternatePhone",
  "dateOfBirth",
  "gender",
  "maritalStatus",
  "nationality",
  "address",
  "city",
  "state",
  "country",
  "postalCode",
  "emergencyContactName",
  "emergencyContactPhone",
  "emergencyContactRelation",
];

const EMPLOYEE_PERSONAL_EDIT_FIELDS: (keyof PersonalFormState)[] = [
  "phone",
  "alternatePhone",
  "dateOfBirth",
  "gender",
  "maritalStatus",
  "nationality",
  "address",
  "city",
  "state",
  "country",
  "postalCode",
  "emergencyContactName",
  "emergencyContactPhone",
  "emergencyContactRelation",
];

const ADMIN_ROLES_FRONT = ["ADMINISTRATOR", "HR_MANAGER"] as const;

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
  // Additional fields from comprehensive API
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

const mapEmployeeToPersonalForm = (employee: Employee): PersonalFormState => ({
  firstName: employee.firstName ?? "",
  lastName: employee.lastName ?? "",
  middleName: employee.middleName ?? "",
  phone: employee.phone ?? "",
  alternatePhone: employee.alternatePhone ?? "",
  dateOfBirth: employee.dateOfBirth
    ? new Date(employee.dateOfBirth).toISOString().split("T")[0]
    : "",
  gender: employee.gender ?? "",
  maritalStatus: employee.maritalStatus ?? "",
  nationality: employee.nationality ?? "",
  address: employee.address ?? "",
  city: employee.city ?? "",
  state: employee.state ?? "",
  country: employee.country ?? "",
  postalCode: employee.postalCode ?? "",
  emergencyContactName: employee.emergencyContactName ?? "",
  emergencyContactPhone: employee.emergencyContactPhone ?? "",
  emergencyContactRelation: employee.emergencyContactRelation ?? "",
});

export default function ProfilePage() {
  const { user: currentUser } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  // Passports state
  const [passports, setPassports] = useState<any[]>([]);
  const [passportsLoading, setPassportsLoading] = useState(false);
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [editingPassport, setEditingPassport] = useState<any | null>(null);
  const [showPassportDeleteModal, setShowPassportDeleteModal] = useState(false);
  const [passportToDelete, setPassportToDelete] = useState<any>(null);
  const [deletePassportLoading, setDeletePassportLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [documentType, setDocumentType] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState<PersonalFormState>({
    firstName: "",
    lastName: "",
    middleName: "",
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
  });
  const [personalFormErrors, setPersonalFormErrors] = useState<
    Record<string, string>
  >({});
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState<any>({});
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get employee ID from URL parameters
  const employeeId = searchParams.get("id");
  const isOwnProfile = !employeeId; // If no ID in URL, it's the current user's profile

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

  useEffect(() => {
    fetchEmployeeProfile();
  }, []);

  useEffect(() => {
    if (activeTab === "documents") {
      fetchDocuments();
    }
  }, [activeTab]);

  // Load passports when Personal tab is active
  useEffect(() => {
    if (activeTab === "personal") {
      fetchPassports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, employeeId]);

  useEffect(() => {
    if (employee?.employeeId) {
      fetchEmployeeProfileImage();
    }
  }, [employee?.employeeId]);

  useEffect(() => {
    if (!employee) return;
    setPersonalForm(mapEmployeeToPersonalForm(employee));
  }, [employee]);

  const userRole: Role | null = currentUser?.role || null;
  const currentUserEmployeeId = currentUser?.employee?.id || null;

  const canEditPersonal = useMemo(() => {
    if (!employee || !userRole) return false;
    const isAdminOrHr = ["ADMINISTRATOR", "HR_MANAGER"].includes(userRole);
    const isSelf = currentUserEmployeeId === employee.id;
    if (isAdminOrHr) return true;
    if (isSelf) return true;
    return false;
  }, [employee, userRole, currentUserEmployeeId]);

  const editablePersonalFields = useMemo(() => {
    if (!employee || !userRole) {
      return [] as (keyof PersonalFormState)[];
    }
    const isAdminOrHr = (userRole === "ADMINISTRATOR" || userRole === "HR_MANAGER");
    const isSelf = currentUserEmployeeId === employee.id;
    if (isAdminOrHr) {
      return ADMIN_PERSONAL_EDIT_FIELDS;
    }
    if (isSelf) {
      return EMPLOYEE_PERSONAL_EDIT_FIELDS;
    }
    return [] as (keyof PersonalFormState)[];
  }, [employee, userRole, currentUserEmployeeId]);

  const canEditField = useCallback(
    (field: keyof PersonalFormState) => editablePersonalFields.includes(field),
    [editablePersonalFields]
  );

  const startFormFromEmployee = useCallback(() => {
    if (!employee) return mapEmployeeToPersonalForm({} as Employee);
    return mapEmployeeToPersonalForm(employee);
  }, [employee]);

  const handleStartEditPersonal = useCallback(() => {
    if (!canEditPersonal || !employee) return;
    setPersonalForm(mapEmployeeToPersonalForm(employee));
    setPersonalFormErrors({});
    setIsEditingPersonal(true);
  }, [canEditPersonal, employee]);

  const handleCancelPersonalEdit = useCallback(() => {
    if (!employee) return;
    setPersonalForm(mapEmployeeToPersonalForm(employee));
    setPersonalFormErrors({});
    setIsEditingPersonal(false);
  }, [employee]);

  const handlePersonalFieldChange = useCallback(
    (field: keyof PersonalFormState, value: string) => {
      setPersonalForm((prev) => ({
        ...prev,
        [field]: value,
      }));
      if (personalFormErrors[field]) {
        setPersonalFormErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [personalFormErrors]
  );

  const validatePersonalForm = useCallback(() => {
    const errors: Record<string, string> = {};
    const requiredFields: (keyof PersonalFormState)[] = [
      "firstName",
      "lastName",
      "phone",
    ];

    requiredFields.forEach((field) => {
      if (!personalForm[field]?.trim()) {
        errors[field] = "This field is required";
      }
    });

    const phoneRegExp = /^\+?[0-9\-\s()]{7,20}$/;

    if (personalForm.phone && !phoneRegExp.test(personalForm.phone)) {
      errors.phone = "Enter a valid phone number";
    }

    if (
      personalForm.alternatePhone &&
      !phoneRegExp.test(personalForm.alternatePhone)
    ) {
      errors.alternatePhone = "Enter a valid phone number";
    }

    if (
      personalForm.emergencyContactPhone &&
      !phoneRegExp.test(personalForm.emergencyContactPhone)
    ) {
      errors.emergencyContactPhone = "Enter a valid phone number";
    }

    if (personalForm.dateOfBirth) {
      const dob = new Date(personalForm.dateOfBirth);
      if (isNaN(dob.getTime())) {
        errors.dateOfBirth = "Invalid date";
      } else {
        const today = new Date();
        if (dob > today) {
          errors.dateOfBirth = "Date cannot be in the future";
        }
      }
    }

    setPersonalFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [personalForm]);

  const handleSavePersonal = useCallback(async () => {
    if (!employee) return;
    if (!validatePersonalForm()) {
      return;
    }

    try {
      setIsSavingPersonal(true);
      const currentSnapshot = mapEmployeeToPersonalForm(employee);
      const updates: Partial<PersonalFormState> = {};

      editablePersonalFields.forEach((field) => {
        if (personalForm[field] !== currentSnapshot[field]) {
          updates[field] = personalForm[field];
        }
      });

      if (Object.keys(updates).length === 0) {
        toast.success("No changes to update");
        setIsEditingPersonal(false);
        return;
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: employeeId ?? undefined,
          updates,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message = errorData?.message || "Failed to update profile";
        toast.error(message);
        return;
      }

      const data = await response.json();
      if (data?.profile) {
        setEmployee(data.profile);
        setPersonalForm(mapEmployeeToPersonalForm(data.profile));
        setIsEditingPersonal(false);
        toast.success("Profile updated successfully");
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSavingPersonal(false);
    }
  }, [
    editablePersonalFields,
    employee,
    employeeId,
    personalForm,
    validatePersonalForm,
  ]);

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
        )}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.imageUrl) {
          setProfileImage(data.imageUrl);
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

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("employeeId", employee.employeeId);

      const response = await fetch("/api/employees/profile-image", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfileImage(data.imageUrl);
        toast.success("Profile image updated successfully");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to upload image");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setDocumentsLoading(true);
      const response = await fetch("/api/documents", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        console.error("Failed to fetch documents:", response.status);
        setDocuments([]);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Fetch passports for Personal tab
  const fetchPassports = async () => {
    try {
      setPassportsLoading(true);
      const url = employeeId
        ? `/api/passports?employeeId=${encodeURIComponent(employeeId)}`
        : "/api/passports";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPassports(Array.isArray(data.passports) ? data.passports : []);
      } else {
        setPassports([]);
      }
    } catch (error) {
      console.error("Failed to fetch passports:", error);
      setPassports([]);
    } finally {
      setPassportsLoading(false);
    }
  };

  // Handle passport deletion - show confirmation modal
  const handleDeletePassport = (passport: any) => {
    console.log('Delete passport clicked:', passport);
    setPassportToDelete(passport);
    setShowPassportDeleteModal(true);
  };

  // Confirm passport deletion
  const confirmDeletePassport = async () => {
    if (!passportToDelete) return;

    try {
      setDeletePassportLoading(true);
      const response = await fetch(`/api/passports/${passportToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setPassports(passports.filter((p) => p.id !== passportToDelete.id));
        toast.success("Passport deleted successfully");
        setShowPassportDeleteModal(false);
        setPassportToDelete(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete passport");
      }
    } catch (error) {
      console.error("Delete passport error:", error);
      toast.error("Failed to delete passport");
    } finally {
      setDeletePassportLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // Show error in upload modal instead of toast
        setSelectedFile(file);
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
        setDocumentName(nameWithoutExtension);
        return;
      }

      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error(
          "Only PDF, DOC, DOCX, JPG, JPEG, and PNG files are allowed"
        );
        return;
      }

      setSelectedFile(file);
      // Auto-fill document name from filename
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      setDocumentName(nameWithoutExtension);
    }
  };

  const handleDocumentUpload = async () => {
    if (!selectedFile || !documentType || !documentName) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setUploadLoading(true);
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", documentType);
      formData.append("name", documentName);
      if (expiryDate) {
        formData.append("expiryDate", expiryDate);
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      const response = await fetch("/api/documents", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const data = await response.json();
        setDocuments([data.document, ...documents]);
        toast.success("Document uploaded successfully");

        // Small delay to show 100% progress
        setTimeout(() => {
          setShowUploadModal(false);
          resetUploadForm();
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to upload document");
        setIsUploading(false);
        setUploadProgress(0);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
      setIsUploading(false);
      setUploadProgress(0);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDocumentDelete = (document: any) => {
    setDocumentToDelete(document);
    setShowDeleteModal(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/documents/${documentToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setDocuments(documents.filter((doc) => doc.id !== documentToDelete.id));
        toast.success("Document deleted successfully");
        setShowDeleteModal(false);
        setDocumentToDelete(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete document");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDocumentDownload = async (document: any) => {
    try {
      toast.success("Downloading document...");
      const response = await fetch(`/api/documents/${document.id}`, {
        credentials: "include",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = url;
        a.download = document.name;
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
        toast.success("Document downloaded successfully");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to download document");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Network error. Please check your connection and try again.");
    }
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null);
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setDocumentType("");
    setDocumentName("");
    setExpiryDate("");
    setUploadProgress(0);
    setIsUploading(false);
  };

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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

  return (
    <div className="min-h-screen bg-gray-50">
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-b-3xl px-6 py-8 mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start space-x-6">
            {/* Profile Image */}
            <div className="flex-shrink-0 relative">
              <div className="w-20 h-20">
                <Avatar
                  employeeId={employee.id}
                  employeeName={`${employee.firstName} ${employee.lastName}`}
                  profileImage={profileImage}
                  size="xl"
                  showLink={!isOwnProfile}
                  className="ring-4 ring-white shadow-lg w-20 h-20"
                />
              </div>
              {isOwnProfile && (
                <div className="absolute -bottom-2 -right-2">
                  <div className="relative">
                    <input
                      type="file"
                      onChange={handleImageUpload}
                      accept="image/*"
                      disabled={uploadingImage}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      id="profile-image-upload"
                    />
                    <button
                      disabled={uploadingImage}
                      className={`bg-white border border-gray-200 rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 ${
                        uploadingImage
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-blue-400"
                      }`}
                      title="Change profile picture"
                    >
                      {uploadingImage ? (
                        <ArrowPathIcon className="h-4 w-4 text-gray-500 animate-spin" />
                      ) : (
                        <PhotoIcon className="h-4 w-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">
                {employee.firstName} {employee.middleName} {employee.lastName}
                {!isOwnProfile && (
                  <span className="ml-3 px-3 py-1 bg-blue-500 text-white text-sm rounded-full">
                    View Only
                  </span>
                )}
              </h1>
              <p className="text-blue-100 text-lg mb-6">
                {typeof employee.designation === "string"
                  ? employee.designation
                  : employee.designation.title}
              </p>

              {/* Tab Navigation */}
              <div className="flex space-x-1">
                {[
                  {
                    id: "personal",
                    label: "Personal",
                    active: activeTab === "personal",
                  },
                  {
                    id: "job",
                    label: "Job",
                    active: activeTab === "employment",
                  },
                  {
                    id: "timeoff",
                    label: "Time Off",
                    active: activeTab === "timeoff",
                  },
                  {
                    id: "emergency",
                    label: "Emergency",
                    active: activeTab === "contact",
                  },
                  {
                    id: "documents",
                    label: "Documents",
                    active: activeTab === "documents",
                  },
                  {
                    id: "training",
                    label: "Training",
                    active: activeTab === "training",
                  },
                  {
                    id: "benefits",
                    label: "Benefits",
                    active: activeTab === "benefits",
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() =>
                      setActiveTab(
                        tab.id === "job"
                          ? "employment"
                          : tab.id === "emergency"
                          ? "contact"
                          : tab.id === "timeoff"
                          ? "overview"
                          : tab.id
                      )
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      tab.active
                        ? "bg-white text-blue-600 shadow-md"
                        : "text-blue-100 hover:text-white hover:bg-blue-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6">
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
                <div className="flex items-center space-x-3">
                  <ClockIcon className="h-4 w-4 text-gray-400" />
                  <div className="text-sm text-gray-600">
                    {new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    local time
                  </div>
                </div>

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
            <div className="rounded-xl shadow-sm">
              {/* Tab Content Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <BriefcaseIcon className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {activeTab === "personal" && "Personal"}
                    {activeTab === "employment" && "Job"}
                    {activeTab === "contact" && "Emergency"}
                    {activeTab === "documents" && "Documents"}
                    {activeTab === "overview" && "Time Off"}
                    {activeTab === "training" && "Training"}
                    {activeTab === "benefits" && "Benefits"}
                  </h2>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Personal Tab */}
                {activeTab === "personal" && (
                  <PersonalTab 
                    employee={employee}
                    employeeId={employeeId}
                    formatDate={formatDate}
                  />
                )}

                {/* Job Tab */}
                {activeTab === "employment" && (

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Employee # */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Employee #
                          </label>
                          <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-300 font-medium">
                            {employee.employeeId}
                          </div>
                        </div>

                        {/* First Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={personalForm.firstName}
                            onChange={(e) =>
                              handlePersonalFieldChange(
                                "firstName",
                                e.target.value
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              isEditingPersonal && canEditField("firstName")
                                ? "border-gray-300 bg-white"
                                : "border-gray-200 bg-gray-100 cursor-not-allowed"
                            } ${
                              personalFormErrors.firstName
                                ? "border-red-300"
                                : ""
                            }`}
                            disabled={
                              !isEditingPersonal || !canEditField("firstName")
                            }
                          />
                          {personalFormErrors.firstName && (
                            <p className="mt-1 text-xs text-red-600">
                              {personalFormErrors.firstName}
                            </p>
                          )}
                        </div>

                        {/* Last Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={personalForm.lastName}
                            onChange={(e) =>
                              handlePersonalFieldChange(
                                "lastName",
                                e.target.value
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              isEditingPersonal && canEditField("lastName")
                                ? "border-gray-300 bg-white"
                                : "border-gray-200 bg-gray-100 cursor-not-allowed"
                            } ${
                              personalFormErrors.lastName
                                ? "border-red-300"
                                : ""
                            }`}
                            disabled={
                              !isEditingPersonal || !canEditField("lastName")
                            }
                          />
                          {personalFormErrors.lastName && (
                            <p className="mt-1 text-xs text-red-600">
                              {personalFormErrors.lastName}
                            </p>
                          )}
                        </div>

                        {/* Middle Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Middle Name
                          </label>
                          <input
                            type="text"
                            value={personalForm.middleName}
                            onChange={(e) =>
                              handlePersonalFieldChange(
                                "middleName",
                                e.target.value
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              isEditingPersonal && canEditField("middleName")
                                ? "border-gray-300 bg-white"
                                : "border-gray-200 bg-gray-100 cursor-not-allowed"
                            }`}
                            disabled={
                              !isEditingPersonal || !canEditField("middleName")
                            }
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={employee.email}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            readOnly
                          />
                        </div>

                        {/* Phone */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={personalForm.phone}
                            onChange={(e) =>
                              handlePersonalFieldChange("phone", e.target.value)
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              isEditingPersonal && canEditField("phone")
                                ? "border-gray-300 bg-white"
                                : "border-gray-200 bg-gray-100 cursor-not-allowed"
                            } ${
                              personalFormErrors.phone ? "border-red-300" : ""
                            }`}
                            disabled={
                              !isEditingPersonal || !canEditField("phone")
                            }
                          />
                          {personalFormErrors.phone && (
                            <p className="mt-1 text-xs text-red-600">
                              {personalFormErrors.phone}
                            </p>
                          )}
                        </div>

                        {/* Birth Date */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date of Birth{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type={
                              isEditingPersonal && canEditField("dateOfBirth")
                                ? "date"
                                : "text"
                            }
                            value={
                              isEditingPersonal && canEditField("dateOfBirth")
                                ? personalForm.dateOfBirth
                                : employee.dateOfBirth
                                ? formatDate(employee.dateOfBirth)
                                : "Not provided"
                            }
                            onChange={(e) =>
                              handlePersonalFieldChange(
                                "dateOfBirth",
                                e.target.value
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              isEditingPersonal && canEditField("dateOfBirth")
                                ? "border-gray-300 bg-white"
                                : "border-gray-200 bg-gray-100 cursor-not-allowed"
                            } ${
                              personalFormErrors.dateOfBirth
                                ? "border-red-300"
                                : ""
                            }`}
                            disabled={
                              !isEditingPersonal || !canEditField("dateOfBirth")
                            }
                          />
                          {personalFormErrors.dateOfBirth && (
                            <p className="mt-1 text-xs text-red-600">
                              {personalFormErrors.dateOfBirth}
                            </p>
                          )}
                        </div>

                        {/* Gender */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Gender
                          </label>
                          <select
                            value={personalForm.gender}
                            onChange={(e) =>
                              handlePersonalFieldChange(
                                "gender",
                                e.target.value
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              isEditingPersonal && canEditField("gender")
                                ? "border-gray-300 bg-white"
                                : "border-gray-200 bg-gray-100 cursor-not-allowed"
                            }`}
                            disabled={
                              !isEditingPersonal || !canEditField("gender")
                            }
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        {/* Marital Status */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Marital Status
                          </label>
                          <select
                            value={personalForm.maritalStatus}
                            onChange={(e) =>
                              handlePersonalFieldChange(
                                "maritalStatus",
                                e.target.value
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              isEditingPersonal && canEditField("maritalStatus")
                                ? "border-gray-300 bg-white"
                                : "border-gray-200 bg-gray-100 cursor-not-allowed"
                            }`}
                            disabled={
                              !isEditingPersonal ||
                              !canEditField("maritalStatus")
                            }
                          >
                            <option value="">Select Status</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                          </select>
                        </div>

                        {/* Nationality */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nationality
                          </label>
                          <input
                            type="text"
                            value={personalForm.nationality}
                            onChange={(e) =>
                              handlePersonalFieldChange(
                                "nationality",
                                e.target.value
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              isEditingPersonal && canEditField("nationality")
                                ? "border-gray-300 bg-white"
                                : "border-gray-200 bg-gray-100 cursor-not-allowed"
                            }`}
                            {...(!isEditingPersonal ||
                            !canEditField("nationality")
                              ? { placeholder: "Not provided" }
                              : {})}
                            disabled={
                              !isEditingPersonal || !canEditField("nationality")
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Passports Section */}
                    <div className="mt-8">
                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
                              <DocumentTextIcon className="h-3 w-3 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-blue-600">
                              Passports
                            </h3>
                          </div>
                          <button
                            onClick={() => {
                              setEditingPassport(null);
                              setShowPassportModal(true);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
                          >
                            <PlusIcon className="h-4 w-4" />
                            <span>Add Entry</span>
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Passport Number
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Issued Date
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Expiry Date
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Issuing Country
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {passportsLoading ? (
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="px-6 py-8 text-center text-sm text-gray-500"
                                  >
                                    Loading...
                                  </td>
                                </tr>
                              ) : passports.length > 0 ? (
                                passports.map((passport: any) => (
                                  <tr key={passport.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {passport.number}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {formatDate(passport.issuedDate)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {formatDate(passport.expiryDate)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {passport.issuingCountry}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('Edit button clicked for passport:', passport.id);
                                            setEditingPassport(passport);
                                            setShowPassportModal(true);
                                          }}
                                          className="text-blue-600 hover:text-blue-900 p-1 cursor-pointer"
                                          title="Edit passport"
                                          type="button"
                                        >
                                          <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('Delete button clicked for passport:', passport.id);
                                            handleDeletePassport(passport);
                                          }}
                                          className="text-red-600 hover:text-red-900 p-1 cursor-pointer"
                                          title="Delete passport"
                                          type="button"
                                        >
                                          <TrashIcon className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="px-6 py-8 text-center text-sm text-gray-500"
                                  >
                                    No passport entries have been added.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Address Section */}
                    <div className="mt-8">
                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
                            <MapPinIcon className="h-3 w-3 text-white" />
                          </div>
                          <h3 className="text-lg font-semibold text-blue-600">
                            Address
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Street 1
                            </label>
                            <input
                              type="text"
                              value={employee.address || "Not provided"}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Street 2
                            </label>
                            <input
                              type="text"
                              value="Not provided"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              City
                            </label>
                            <input
                              type="text"
                              value={employee.city || "Not provided"}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Province
                            </label>
                            <input
                              type="text"
                              value={employee.state || "Not provided"}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Postal Code
                            </label>
                            <input
                              type="text"
                              value={employee.postalCode || "Not provided"}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Country
                            </label>
                            <input
                              type="text"
                              value={employee.country || "Not provided"}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Section */}
                    <div className="mt-8">
                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
                            <PhoneIcon className="h-3 w-3 text-white" />
                          </div>
                          <h3 className="text-lg font-semibold text-blue-600">
                            Contact
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Work Phone
                            </label>
                            <input
                              type="text"
                              value={employee.phone || "Not provided"}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Mobile Phone
                            </label>
                            <input
                              type="text"
                              value={employee.alternatePhone || "Not provided"}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Home Phone
                            </label>
                            <input
                              type="text"
                              value="Not provided"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Extension
                            </label>
                            <input
                              type="text"
                              placeholder="Ext"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Work Email
                            </label>
                            <input
                              type="email"
                              value={employee.email}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Home Email
                            </label>
                            <input
                              type="email"
                              value="Not provided"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Social Links Section */}
                    <div className="mt-8">
                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
                            <GlobeAltIcon className="h-3 w-3 text-white" />
                          </div>
                          <h3 className="text-lg font-semibold text-blue-600">
                            Social Links
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              LinkedIn
                            </label>
                            <input
                              type="url"
                              value={
                                employee.socialLinks?.linkedin || "Not provided"
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Twitter Username
                            </label>
                            <input
                              type="text"
                              value={
                                employee.socialLinks?.twitter || "Not provided"
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Facebook
                            </label>
                            <input
                              type="url"
                              value={
                                employee.socialLinks?.facebook || "Not provided"
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Instagram
                            </label>
                            <input
                              type="url"
                              value={
                                employee.socialLinks?.instagram ||
                                "Not provided"
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Education Section */}
                    <div className="mt-8">
                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
                            <AcademicCapIcon className="h-3 w-3 text-white" />
                          </div>
                          <h3 className="text-lg font-semibold text-blue-600">
                            Education
                          </h3>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          {employee.education &&
                          employee.education.length > 0 ? (
                            employee.education.map((edu, index) => (
                              <div key={index} className="mb-4">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center space-x-2">
                                    <AcademicCapIcon className="h-5 w-5 text-gray-600" />
                                    <span className="font-medium text-gray-900">
                                      {edu.institution}
                                    </span>
                                  </div>
                                  <button className="p-1 text-gray-400 hover:text-red-600">
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Degree
                                    </label>
                                    <input
                                      type="text"
                                      value={edu.degree}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                      readOnly
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Major/Specialization
                                    </label>
                                    <input
                                      type="text"
                                      value={edu.major}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                      readOnly
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      GPA
                                    </label>
                                    <input
                                      type="text"
                                      value={edu.gpa || "Not provided"}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                      readOnly
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Start Date
                                    </label>
                                    <input
                                      type="text"
                                      value={formatDate(edu.startDate)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                      readOnly
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      End Date
                                    </label>
                                    <input
                                      type="text"
                                      value={formatDate(edu.endDate)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                      readOnly
                                    />
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <AcademicCapIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                              <p>No education records found</p>
                            </div>
                          )}
                        </div>

                        <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2">
                          <PlusIcon className="h-4 w-4" />
                          <span>Add Education</span>
                        </button>
                      </div>
                    </div>

                    {/* Passport Form Modal */}
                    <PassportFormModal
                      isOpen={showPassportModal}
                      initial={editingPassport}
                      onClose={() => {
                        setShowPassportModal(false);
                        setEditingPassport(null);
                      }}
                      employeeId={employeeId ?? undefined}
                      onSaved={() => {
                        fetchPassports(); // refresh after save/update
                      }}
                    />

                    {/* Passport Delete Confirmation Modal */}
                    {showPassportDeleteModal && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-md w-full">
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold text-gray-900">
                                Delete Passport
                              </h3>
                              <button
                                onClick={() => {
                                  setShowPassportDeleteModal(false);
                                  setPassportToDelete(null);
                                }}
                                disabled={deletePassportLoading}
                                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                              >
                                <svg
                                  className="h-6 w-6"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
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

                            <div className="flex items-center space-x-3 mb-6">
                              <div className="flex-shrink-0">
                                <svg
                                  className="h-12 w-12 text-red-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                  />
                                </svg>
                              </div>
                              <div>
                                <h4 className="text-lg font-medium text-gray-900 mb-1">
                                  Delete passport entry?
                                </h4>
                                <p className="text-sm text-gray-600">
                                  Are you sure you want to delete the passport "{passportToDelete?.number}"? This action cannot be undone.
                                </p>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-3">
                              <button
                                onClick={() => {
                                  setShowPassportDeleteModal(false);
                                  setPassportToDelete(null);
                                }}
                                disabled={deletePassportLoading}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={confirmDeletePassport}
                                disabled={deletePassportLoading}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                              >
                                {deletePassportLoading ? (
                                  <>
                                    <svg
                                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                    <span>Deleting...</span>
                                  </>
                                ) : (
                                  <>
                                    <TrashIcon className="h-4 w-4" />
                                    <span>Delete Passport</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Job Tab */}
                {activeTab === "employment" && (
                  <div className="space-y-6">
                    {/* Hire Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hire Date
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={formatDate(employee.joinDate)}
                          className="px-3 py-2 border border-gray-300 rounded-md bg-white"
                          readOnly
                        />
                        <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    {/* Direct Reports */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Direct Reports
                      </h4>
                      <p className="text-sm text-gray-500">No Direct Reports</p>
                    </div>

                    {/* Employment Status */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
                          <BriefcaseIcon className="h-3 w-3 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Employment Status
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Effective Date
                          </label>
                          <p className="text-sm text-gray-900">
                            {formatDate(employee.joinDate)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Employment Status
                          </label>
                          <p className="text-sm text-gray-900">
                            {employee.employmentType.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Job Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
                          <BriefcaseIcon className="h-3 w-3 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Job Information
                        </h3>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                                Effective Date
                              </th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                                Location
                              </th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                                Division
                              </th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                                Department
                              </th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                                Job Title
                              </th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                                Reports To
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="py-2 text-sm text-gray-900">
                                {formatDate(employee.joinDate)}
                              </td>
                              <td className="py-2 text-sm text-gray-900">
                                {employee.workLocation ||
                                  employee.city ||
                                  "Not specified"}
                              </td>
                              <td className="py-2 text-sm text-gray-900">
                                {employee.department.name}
                              </td>
                              <td className="py-2 text-sm text-gray-900">
                                {employee.department.name}
                              </td>
                              <td className="py-2 text-sm text-gray-900">
                                {typeof employee.designation === "string"
                                  ? employee.designation
                                  : employee.designation.title}
                              </td>
                              <td className="py-2 text-sm text-gray-900">
                                {employee.manager
                                  ? `${employee.manager.firstName} ${employee.manager.lastName}`
                                  : "Not assigned"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Time Off Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    {/* Leave Balances */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {employee.leaveBalanceSummary &&
                      Object.entries(employee.leaveBalanceSummary).length >
                        0 ? (
                        Object.entries(employee.leaveBalanceSummary).map(
                          ([leaveType, balance]: [string, any]) => (
                            <div
                              key={leaveType}
                              className="bg-blue-50 rounded-lg p-4 text-center"
                            >
                              <CalendarDaysIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                              <div className="text-2xl font-bold text-blue-600">
                                {balance.remaining} Days
                              </div>
                              <div className="text-sm text-gray-600">
                                {leaveType} Available
                              </div>
                              <div className="flex justify-center space-x-2 mt-2">
                                <button className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )
                        )
                      ) : (
                        <>
                          <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <CalendarDaysIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-blue-600">
                              0 Days
                            </div>
                            <div className="text-sm text-gray-600">
                              Casual Leave Available
                            </div>
                            <div className="flex justify-center space-x-2 mt-2">
                              <button className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="bg-green-50 rounded-lg p-4 text-center">
                            <CalendarDaysIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-green-600">
                              0 Days
                            </div>
                            <div className="text-sm text-gray-600">
                              Sick Leave Available
                            </div>
                            <div className="flex justify-center space-x-2 mt-2">
                              <button className="p-1 text-green-600 hover:bg-green-100 rounded">
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button className="p-1 text-green-600 hover:bg-green-100 rounded">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="bg-purple-50 rounded-lg p-4 text-center">
                            <CalendarDaysIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-purple-600">
                              0 Days
                            </div>
                            <div className="text-sm text-gray-600">
                              Annual Leave Available
                            </div>
                            <div className="flex justify-center space-x-2 mt-2">
                              <button className="p-1 text-purple-600 hover:bg-purple-100 rounded">
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button className="p-1 text-purple-600 hover:bg-purple-100 rounded">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Upcoming Time Off */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <ClockIcon className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-blue-600">
                          Upcoming Time Off
                        </h3>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">Nov 9</div>
                          <div className="text-sm text-gray-500">
                            Iqbal Day (Pakistan)
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* History */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <ClockIcon className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-blue-600">
                          History
                        </h3>
                      </div>

                      <div className="flex items-center space-x-4 mb-4">
                        <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                          <option>Casual Leave</option>
                          <option>Sick Leave</option>
                          <option>Annual Leave</option>
                        </select>
                        <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                          <option>All</option>
                          <option>Approved</option>
                          <option>Pending</option>
                        </select>
                        <select className="px-3 py-2 border border-gray-300 rounded-md text-sm ml-auto">
                          <option>Balance History</option>
                        </select>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                                Date
                              </th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                                Description
                              </th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                                Used Days (-)
                              </th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                                Earned Days (+)
                              </th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                                Balance
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="py-2 text-sm text-gray-900">
                                01/01/2025
                              </td>
                              <td className="py-2 text-sm text-gray-900">
                                Accrual for 01/01/2025 to 31/12/2025
                              </td>
                              <td className="py-2 text-sm text-gray-900">-</td>
                              <td className="py-2 text-sm text-gray-900">
                                12.00
                              </td>
                              <td className="py-2 text-sm text-gray-900">
                                12.00
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Emergency Contact Tab */}
                {activeTab === "contact" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          value={
                            employee.emergencyContactName || "Not provided"
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Relationship
                        </label>
                        <input
                          type="text"
                          value={
                            employee.emergencyContactRelation || "Not provided"
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <label className="text-sm text-gray-700">
                        Primary Contact
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Work Phone
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder="Phone number"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white"
                            readOnly
                          />
                          <input
                            type="text"
                            placeholder="Ext"
                            className="w-20 px-3 py-2 border border-gray-300 rounded-md bg-white"
                            readOnly
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Home Phone
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Mobile Phone
                        </label>
                        <input
                          type="text"
                          value={
                            employee.emergencyContactPhone || "Not provided"
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                          readOnly
                        />
                      </div>
                    </div>

                    {/* Address Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Address
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Street 1
                          </label>
                          <input
                            type="text"
                            value={employee.address || "Not provided"}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Street 2
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                            readOnly
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              City
                            </label>
                            <input
                              type="text"
                              value={employee.city || "Not provided"}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Province
                            </label>
                            <input
                              type="text"
                              value={employee.state || "Not provided"}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Postal Code
                            </label>
                            <input
                              type="text"
                              value={employee.postalCode || "Not provided"}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === "documents" && (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 bg-blue-600 rounded-sm"></div>
                        <h3 className="text-lg font-semibold text-blue-600">
                          Employee Uploads
                        </h3>
                        <span className="text-sm text-gray-500">
                          ({documents.length} documents)
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setShowUploadModal(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors shadow-sm"
                        >
                          <CloudArrowUpIcon className="h-4 w-4" />
                          <span>Upload Document</span>
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Documents Grid */}
                    {documentsLoading ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="bg-gray-200 rounded-lg h-24 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                          </div>
                        ))}
                      </div>
                    ) : filteredDocuments.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {filteredDocuments.map((document) => (
                          <div
                            key={document.id}
                            className="group cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
                            onClick={() => handleDocumentDownload(document)}
                          >
                            <div className="flex flex-col items-center text-center">
                              {/* File Icon */}
                              <div className="relative w-16 h-20 bg-blue-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-200 transition-colors">
                                <div className="text-2xl">
                                  {getDocumentIcon(
                                    document.filePath || document.name
                                  )}
                                </div>
                                <div className="absolute top-1 right-1 text-xs text-blue-600 font-medium">
                                  {document.filePath
                                    ?.split(".")
                                    .pop()
                                    ?.toUpperCase() || "FILE"}
                                </div>
                              </div>

                              {/* File Name */}
                              <h4 className="text-sm font-medium text-gray-900 truncate w-full mb-1">
                                {document.name}
                              </h4>

                              {/* File Date */}
                              <p className="text-xs text-gray-500">
                                {new Date(
                                  document.uploadedAt || document.createdAt
                                ).toLocaleDateString("en-US", {
                                  month: "2-digit",
                                  day: "2-digit",
                                  year: "numeric",
                                })}
                              </p>

                              {/* File Size */}
                              {document.fileSize && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatFileSize(document.fileSize)}
                                </p>
                              )}

                              {/* Hover Actions */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2 flex space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDocumentDownload(document);
                                  }}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                  title="Download"
                                >
                                  <ArrowDownTrayIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDocumentDelete(document);
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                                  title="Delete"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Empty State */
                      <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <DocumentTextIcon className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No documents uploaded yet
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                          Start building your document library by uploading your
                          first file. Supported formats include PDF, DOC, DOCX,
                          and images.
                        </p>
                        <button
                          onClick={() => setShowUploadModal(true)}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto transition-colors shadow-sm"
                        >
                          <CloudArrowUpIcon className="h-5 w-5" />
                          <span>Upload Your First Document</span>
                        </button>
                      </div>
                    )}

                    {/* Upload Modal */}
                    {showUploadModal && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold text-gray-900">
                                Upload Document
                              </h3>
                              <button
                                onClick={() => setShowUploadModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <svg
                                  className="h-6 w-6"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
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

                            <div className="space-y-4">
                              {/* Document Type */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Document Type{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={documentType}
                                  onChange={(e) =>
                                    setDocumentType(e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Select Type</option>
                                  <option value="passport">Passport</option>
                                  <option value="visa">Visa</option>
                                  <option value="license">
                                    Driver's License
                                  </option>
                                  <option value="certificate">
                                    Certificate
                                  </option>
                                  <option value="contract">Contract</option>
                                  <option value="resume">Resume</option>
                                  <option value="id_proof">ID Proof</option>
                                  <option value="address_proof">
                                    Address Proof
                                  </option>
                                  <option value="education_certificate">
                                    Education Certificate
                                  </option>
                                  <option value="experience_certificate">
                                    Experience Certificate
                                  </option>
                                  <option value="offer_letter">
                                    Offer Letter
                                  </option>
                                  <option value="other">Other</option>
                                </select>
                              </div>

                              {/* Document Name */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Document Name{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={documentName}
                                  onChange={(e) =>
                                    setDocumentName(e.target.value)
                                  }
                                  placeholder="Enter document name"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Expiry Date */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Expiry Date (Optional)
                                </label>
                                <input
                                  type="date"
                                  value={expiryDate}
                                  onChange={(e) =>
                                    setExpiryDate(e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* File Upload */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  File <span className="text-red-500">*</span>
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                                  <input
                                    type="file"
                                    onChange={handleFileSelect}
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    className="hidden"
                                    id="modal-document-upload"
                                  />
                                  <label
                                    htmlFor="modal-document-upload"
                                    className="cursor-pointer flex flex-col items-center space-y-2"
                                  >
                                    <CloudArrowUpIcon className="h-8 w-8 text-gray-400" />
                                    <span className="text-sm text-gray-600">
                                      Click to select or drag and drop
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      PDF, DOC, DOCX, JPG, JPEG, PNG (max 10MB)
                                    </span>
                                  </label>
                                </div>
                                {selectedFile && (
                                  <div
                                    className={`mt-2 p-2 rounded-md ${
                                      selectedFile.size > 10 * 1024 * 1024
                                        ? "bg-red-50 border border-red-200"
                                        : "bg-green-50 border border-green-200"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <span
                                          className={`text-sm ${
                                            selectedFile.size > 10 * 1024 * 1024
                                              ? "text-red-800"
                                              : "text-green-800"
                                          }`}
                                        >
                                          {selectedFile.name} (
                                          {formatFileSize(selectedFile.size)})
                                        </span>
                                      </div>
                                      <button
                                        onClick={handleRemoveSelectedFile}
                                        className="p-1 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100 transition-colors"
                                        title="Remove file"
                                      >
                                        <svg
                                          className="h-4 w-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                          />
                                        </svg>
                                      </button>
                                    </div>
                                    {selectedFile.size > 10 * 1024 * 1024 && (
                                      <div className="mt-2 flex items-start space-x-2">
                                        <svg
                                          className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                        <div className="text-sm text-red-700">
                                          <p className="font-medium">
                                            File size exceeds limit
                                          </p>
                                          <p>
                                            Please select a file smaller than
                                            10MB.
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Upload Progress */}
                              {isUploading && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">
                                      Uploading...
                                    </span>
                                    <span className="text-blue-600 font-medium">
                                      {Math.round(uploadProgress)}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                                      style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                  </div>
                                  {selectedFile && (
                                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                                      <div className="text-lg">
                                        {getDocumentIcon(selectedFile.name)}
                                      </div>
                                      <span>{selectedFile.name}</span>
                                      <span>
                                        ({formatFileSize(selectedFile.size)})
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex space-x-3 pt-4">
                                <button
                                  onClick={() => {
                                    setShowUploadModal(false);
                                    resetUploadForm();
                                  }}
                                  disabled={isUploading}
                                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleDocumentUpload}
                                  disabled={
                                    uploadLoading ||
                                    isUploading ||
                                    !selectedFile ||
                                    !documentType ||
                                    !documentName ||
                                    (selectedFile &&
                                      selectedFile.size > 10 * 1024 * 1024)
                                  }
                                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                                >
                                  {isUploading ? (
                                    <>
                                      <svg
                                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                      >
                                        <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                        ></circle>
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                      </svg>
                                      <span>Uploading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <CloudArrowUpIcon className="h-4 w-4" />
                                      <span>Upload Document</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {showDeleteModal && documentToDelete && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-md w-full">
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold text-gray-900">
                                Delete Document
                              </h3>
                              <button
                                onClick={() => {
                                  setShowDeleteModal(false);
                                  setDocumentToDelete(null);
                                }}
                                disabled={deleteLoading}
                                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                              >
                                <svg
                                  className="h-6 w-6"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
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

                            {/* Document Info */}
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <svg
                                    className="h-8 w-8 text-red-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                                    {documentToDelete.name}
                                  </h4>
                                  <p className="text-sm text-gray-600 mb-1">
                                    <span className="capitalize">
                                      {documentToDelete.type
                                        ?.replace("_", " ")
                                        .toLowerCase()}
                                    </span>{" "}
                                    -{" "}
                                    {new Date(
                                      documentToDelete.uploadedAt
                                    ).toLocaleDateString()}
                                  </p>
                                  <div className="text-xs text-gray-500 mb-2">
                                    <p>
                                      <span className="font-medium">
                                        Document Type:
                                      </span>{" "}
                                      {documentToDelete.type?.replace("_", " ")}
                                    </p>
                                    <p>
                                      <span className="font-medium">
                                        Document Name:
                                      </span>{" "}
                                      {documentToDelete.name}
                                    </p>
                                  </div>
                                  <p className="text-sm text-red-700 font-medium">
                                    This action cannot be undone.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <p className="text-gray-700 mb-6">
                              Are you sure you want to delete this document?
                              This will permanently remove all associated data.
                            </p>

                            {/* Action Buttons */}
                            <div className="flex space-x-3">
                              <button
                                onClick={() => {
                                  setShowDeleteModal(false);
                                  setDocumentToDelete(null);
                                }}
                                disabled={deleteLoading}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={confirmDeleteDocument}
                                disabled={deleteLoading}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                              >
                                {deleteLoading ? (
                                  <>
                                    <svg
                                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                    <span>Deleting...</span>
                                  </>
                                ) : (
                                  <>
                                    <TrashIcon className="h-4 w-4" />
                                    <span>Delete Document</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Training Tab */}
                {activeTab === "training" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AcademicCapIcon className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-blue-600">
                          Certifications
                        </h3>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2">
                        <PlusIcon className="h-4 w-4" />
                        <span>Add Entry</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                              Certification Title
                            </th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                              Completion Date
                            </th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                              Certification Number
                            </th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                              Expiration Date
                            </th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                              Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td
                              colSpan={5}
                              className="py-8 text-center text-gray-500"
                            >
                              No certification entries have been added.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Benefits Tab */}
                {activeTab === "benefits" && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Insurance Card Number
                      </label>
                      <input
                        type="text"
                        value="01-03814-00113"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                        readOnly
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <HeartIcon className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-blue-600">
                            Benefits Overview
                          </h3>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>Showing</span>
                          <select className="px-2 py-1 border border-gray-300 rounded text-sm">
                            <option>Enrolled</option>
                            <option>All</option>
                          </select>
                        </div>
                      </div>

                      <div className="text-center py-12">
                        <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No benefits to see here!
                        </h3>
                        <p className="text-gray-500">
                          There are no plans that match this selected filter.
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Dependent's Information
                        </h3>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2">
                          <PlusIcon className="h-4 w-4" />
                          <span>Add Entry</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                                Name
                              </th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                                Relationship
                              </th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                                Gender
                              </th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                                CNIC
                              </th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase py-2">
                                Birthdate
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td
                                colSpan={5}
                                className="py-8 text-center text-gray-500"
                              >
                                No dependent's information entries have been
                                added.
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
