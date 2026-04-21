"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  PhoneIcon,
  GlobeAltIcon,
  AcademicCapIcon,
  IdentificationIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import PassportFormModal from "@/components/ui/PassportFormModal";
import EducationFormModal from "@/components/ui/EducationFormModal";
import WorkExperienceFormModal from "@/components/ui/WorkExperienceFormModal";
import toast from "react-hot-toast";

const PERSONAL_FORM_FIELDS = [
  "employeeId",
  "firstName",
  "lastName",
  "fatherName",
  "cnic",
  "bloodGroup",
  "dateOfBirth",
  "gender",
  "maritalStatus",
  "nationality",
  "address",
  "city",
  "state",
  "country",
  "postalCode",
  "phone",
  "alternatePhone",
  "linkedin",
  "twitter",
  "facebook",
  "instagram",
] as const;

type PersonalFormState = Record<(typeof PERSONAL_FORM_FIELDS)[number], string>;

const formsAreEqual = (a: PersonalFormState, b: PersonalFormState) =>
  PERSONAL_FORM_FIELDS.every((field) => a[field] === b[field]);

const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

const formatDateSafe = (
  formatter: (value: string) => string,
  value?: string | Date | null
) => {
  if (!value) return null;
  const asString = value instanceof Date ? value.toISOString() : value;
  try {
    return formatter(asString);
  } catch (error) {
    console.error("Failed to format date", error);
    return null;
  }
};

const getExperienceDateRange = (
  formatter: (value: string) => string,
  start?: string | Date | null,
  end?: string | Date | null
) => {
  const startLabel =
    formatDateSafe(formatter, start) ?? "Start date not available";
  const endLabel = formatDateSafe(formatter, end) ?? "Present";
  return `${startLabel} — ${endLabel}`;
};

const getExperienceDuration = (
  start?: string | Date | null,
  end?: string | Date | null
) => {
  if (!start) return null;
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  let totalMonths =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());

  const dayDifference = endDate.getDate() - startDate.getDate();
  if (dayDifference < 0) {
    totalMonths -= 1;
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} yr${years > 1 ? "s" : ""}`);
  }
  if (months > 0) {
    parts.push(`${months} mo${months > 1 ? "s" : ""}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "Less than 1 mo";
};

const toTitleCase = (value: string) =>
  value
    .split(" ")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const getComparableExperienceTime = (record: any) => {
  const primary = record?.endDate ?? record?.startDate ?? record?.createdAt;
  return primary ? new Date(primary).getTime() : 0;
};

const sortExperiencesByTimeline = (records: any[]) =>
  [...records].sort((a, b) => {
    const aCurrent = !a?.endDate;
    const bCurrent = !b?.endDate;

    if (aCurrent !== bCurrent) {
      return aCurrent ? -1 : 1;
    }

    return getComparableExperienceTime(b) - getComparableExperienceTime(a);
  });

const MARITAL_STATUS_LABELS: Record<string, string> = {
  SINGLE: toTitleCase("single"),
  MARRIED: toTitleCase("married"),
  DIVORCED: toTitleCase("divorced"),
  WIDOWED: "Widowed",
};

const BLOOD_GROUP_LABELS: Record<string, string> = {
  "A+": "A+",
  "A-": "A-",
  "B+": "B+",
  "B-": "B-",
  "AB+": "AB+",
  "AB-": "AB-",
  "O+": "O+",
  "O-": "O-",
};

const toDateInputValue = (value?: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

const getGenderLabel = (value?: string | null) =>
  value ? GENDER_LABELS[value] ?? value : "Not provided";

const getMaritalStatusLabel = (value?: string | null) =>
  value ? MARITAL_STATUS_LABELS[value] ?? value : "Not provided";

const getBloodGroupLabel = (value?: string | null) =>
  value ? BLOOD_GROUP_LABELS[value] ?? value : "Not provided";

const getInputBaseClasses = (editable: boolean) =>
  `block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
    editable
      ? "border-gray-300 text-gray-900 bg-white"
      : "border-gray-200 text-gray-700 bg-gray-100 cursor-not-allowed"
  }`;

const normalizeFieldValue = (field: string, value: string): string => {
  if (!value) return "";
  if (field === "gender" || field === "maritalStatus") {
    return value.toUpperCase();
  }
  if (field === "bloodGroup") {
    return value.toUpperCase();
  }
  return value;
};

interface PersonalTabProps {
  employee: any;
  employeeId?: string;
  formatDate: (dateString: string) => string;
  canEdit?: boolean;
  currentUserEmployeeId?: string;
  currentUserRole?: string;
}

export default function PersonalTab({
  employee,
  employeeId,
  formatDate,
  canEdit,
  currentUserEmployeeId,
  currentUserRole,
}: PersonalTabProps) {
  const [passports, setPassports] = useState<any[]>([]);
  const [passportsLoading, setPassportsLoading] = useState(false);
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [editingPassport, setEditingPassport] = useState<any | null>(null);
  const [showPassportDeleteModal, setShowPassportDeleteModal] = useState(false);
  const [passportToDelete, setPassportToDelete] = useState<any>(null);
  const [deletePassportLoading, setDeletePassportLoading] = useState(false);
  const [personalForm, setPersonalForm] = useState<PersonalFormState>(
    () =>
      Object.fromEntries(
        PERSONAL_FORM_FIELDS.map((field) => [field, ""])
      ) as PersonalFormState
  );
  const [originalPersonal, setOriginalPersonal] =
    useState<PersonalFormState>(personalForm);
  const [isDirty, setIsDirty] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [educations, setEducations] = useState<any[]>([]);
  const [educationsLoading, setEducationsLoading] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [editingEducation, setEditingEducation] = useState<any | null>(null);
  const [showEducationDeleteModal, setShowEducationDeleteModal] =
    useState(false);
  const [educationToDelete, setEducationToDelete] = useState<any>(null);
  const [deleteEducationLoading, setDeleteEducationLoading] = useState(false);
  const [experiences, setExperiences] = useState<any[]>(() =>
    Array.isArray(employee?.workExperiences)
      ? sortExperiencesByTimeline(employee.workExperiences)
      : []
  );
  const [experiencesLoading, setExperiencesLoading] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [editingExperience, setEditingExperience] = useState<any | null>(null);
  const [showExperienceDeleteModal, setShowExperienceDeleteModal] =
    useState(false);
  const [experienceToDelete, setExperienceToDelete] = useState<any | null>(
    null
  );
  const [deleteExperienceLoading, setDeleteExperienceLoading] = useState(false);
  const [employeeIdValidation, setEmployeeIdValidation] = useState({
    isChecking: false,
    isValid: true,
    message: "",
  });
  const [employeeIdNumber, setEmployeeIdNumber] = useState(() => {
    // Initialize with extracted number from employee ID
    if (!employee?.employeeId) return "";
    // Try to match EMP format first
    const empMatch = employee.employeeId.match(/^EMP(\d{4})$/);
    if (empMatch) return empMatch[1];
    // For legacy IDs, try to extract last 4 digits if available
    const digits = employee.employeeId.replace(/\D/g, "");
    if (digits.length >= 4) return digits.slice(-4);
    // If no 4 digits found, return empty to let admin set new ID
    return "";
  });

  // Check if user can edit personal info
  const canEditPersonal = Boolean(
    canEdit || (!employeeId && currentUserEmployeeId === employee?.id)
  );

  // Check if user can edit employee ID (administrators only)
  const canEditEmployeeId = Boolean(currentUserRole === "ADMINISTRATOR");

  // Extract number from employee ID (e.g., "EMP0001" -> "0001" or legacy "ADMIN-1234567890" -> "7890")
  const extractEmployeeIdNumber = useCallback((fullId: string) => {
    if (!fullId) return "";
    // Try to match EMP format first
    const empMatch = fullId.match(/^EMP(\d{4})$/);
    if (empMatch) return empMatch[1];
    // For legacy IDs, try to extract last 4 digits if available
    const digits = fullId.replace(/\D/g, "");
    if (digits.length >= 4) return digits.slice(-4);
    // If no 4 digits found, return empty
    return "";
  }, []);

  // Format employee ID with EMP prefix
  const formatEmployeeId = useCallback((number: string) => {
    if (!number) return "";
    // Pad with zeros to ensure 4 digits
    const paddedNumber = number.padStart(4, "0");
    return `EMP${paddedNumber}`;
  }, []);

  // Handle personal form changes
  const fetchEducations = async () => {
    try {
      setEducationsLoading(true);
      const url = employeeId
        ? `/api/education?employeeId=${encodeURIComponent(employeeId)}`
        : "/api/education";
      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load education records");
      }

      const data = await response.json();
      setEducations(data.educations || []);
    } catch (error) {
      console.error("Fetch education error:", error);
      setEducations([]);
      toast.error("Failed to load education records");
    } finally {
      setEducationsLoading(false);
    }
  };

  const fetchExperiences = async () => {
    try {
      setExperiencesLoading(true);
      const url = employeeId
        ? `/api/work-experience?employeeId=${encodeURIComponent(employeeId)}`
        : "/api/work-experience";
      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        throw new Error("Failed to load work experience records");
      }

      const data = await response.json();
      setExperiences(
        Array.isArray(data.workExperiences)
          ? sortExperiencesByTimeline(data.workExperiences)
          : []
      );
    } catch (error) {
      console.error("Fetch work experience error:", error);
      setExperiences([]);
      toast.error("Failed to load work experience records");
    } finally {
      setExperiencesLoading(false);
    }
  };

  const handleExperienceSaved = (experience?: any) => {
    if (!experience) {
      fetchExperiences();
      return;
    }

    setExperiences((prev) =>
      sortExperiencesByTimeline([
        ...prev.filter((item: any) => item.id !== experience.id),
        experience,
      ])
    );
  };

  const handleDeleteExperience = (experience: any) => {
    setExperienceToDelete(experience);
    setShowExperienceDeleteModal(true);
  };

  const confirmDeleteExperience = async () => {
    if (!experienceToDelete) return;

    try {
      setDeleteExperienceLoading(true);
      const response = await fetch(
        `/api/work-experience/${experienceToDelete.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Failed to delete work experience"
        );
      }

      toast.success("Work experience deleted successfully");
      setShowExperienceDeleteModal(false);
      setExperienceToDelete(null);
      fetchExperiences();
    } catch (error: any) {
      console.error("Delete work experience error:", error);
      toast.error(error.message || "Failed to delete work experience");
    } finally {
      setDeleteExperienceLoading(false);
    }
  };

  // Sync form data whenever employee changes
  useEffect(() => {
    if (!employee) return;

    const initial: PersonalFormState = {
      employeeId: employee.employeeId || "",
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      fatherName: employee.fatherName || "",
      cnic: employee.cnic || "",
      bloodGroup: employee.bloodGroup ? employee.bloodGroup.toUpperCase() : "",
      dateOfBirth: toDateInputValue(employee.dateOfBirth),
      gender: employee.gender ? String(employee.gender).toUpperCase() : "",
      maritalStatus: employee.maritalStatus
        ? String(employee.maritalStatus).toUpperCase()
        : "",
      nationality: employee.nationality || "",
      address: employee.address || "",
      city: employee.city || "",
      state: employee.state || "",
      country: employee.country || "",
      postalCode: employee.postalCode || "",
      phone: employee.phone || "",
      alternatePhone: employee.alternatePhone || "",
      linkedin: employee.socialLinks?.linkedin || "",
      twitter: employee.socialLinks?.twitter || "",
      facebook: employee.socialLinks?.facebook || "",
      instagram: employee.socialLinks?.instagram || "",
    };

    setPersonalForm(initial);
    setOriginalPersonal(initial);
    setIsDirty(false);
    // Extract and set the employee ID number for editing
    setEmployeeIdNumber(extractEmployeeIdNumber(employee.employeeId || ""));
    setExperiences(
      Array.isArray(employee?.workExperiences)
        ? sortExperiencesByTimeline(employee.workExperiences)
        : []
    );
  }, [employee, extractEmployeeIdNumber]);

  const handlePersonalFieldChange = (field: string, value: string) => {
    if (!canEditPersonal) return;

    // Special handling for employeeId field
    if (field === "employeeId") {
      if (!canEditEmployeeId) return;
      // Validate employeeId if changed
      if (value !== employee.employeeId) {
        validateEmployeeId(value);
      } else {
        setEmployeeIdValidation({
          isChecking: false,
          isValid: true,
          message: "",
        });
      }
    }

    setPersonalForm((prev) => {
      const normalizedValue = normalizeFieldValue(field, value);
      const updated = {
        ...prev,
        [field]: normalizedValue,
      } as PersonalFormState;
      setIsDirty(!formsAreEqual(updated, originalPersonal));
      return updated;
    });
  };

  // Handle employee ID number change (4-digit input only)
  const handleEmployeeIdNumberChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, "");

    // Limit to 4 digits
    const limitedDigits = digitsOnly.slice(0, 4);

    setEmployeeIdNumber(limitedDigits);

    // Validate if exactly 4 digits
    if (limitedDigits.length === 0) {
      setEmployeeIdValidation({
        isChecking: false,
        isValid: false,
        message: "Employee ID number is required",
      });
      return;
    }

    if (limitedDigits.length < 4) {
      setEmployeeIdValidation({
        isChecking: false,
        isValid: false,
        message: `Please enter exactly 4 digits (${limitedDigits.length}/4)`,
      });
      return;
    }

    // Format and validate full employee ID
    const fullEmployeeId = formatEmployeeId(limitedDigits);
    handlePersonalFieldChange("employeeId", fullEmployeeId);
  };

  // Validate employee ID for duplicates
  const validateEmployeeId = async (newEmployeeId: string) => {
    if (!newEmployeeId.trim()) {
      setEmployeeIdValidation({
        isChecking: false,
        isValid: false,
        message: "Employee ID is required",
      });
      return;
    }

    // Validate format: EMP + exactly 4 digits
    const formatMatch = newEmployeeId.match(/^EMP\d{4}$/);
    if (!formatMatch) {
      setEmployeeIdValidation({
        isChecking: false,
        isValid: false,
        message: "Employee ID must be in format EMP#### (exactly 4 digits)",
      });
      return;
    }

    setEmployeeIdValidation({ isChecking: true, isValid: true, message: "" });

    try {
      const response = await fetch(
        `/api/employees/validate-id?employeeId=${encodeURIComponent(
          newEmployeeId
        )}&currentId=${encodeURIComponent(employee.id)}`,
        {
          credentials: "include",
        }
      );

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
  // Cancel editing personal info
  const handleCancelPersonalEdit = () => {
    setPersonalForm(originalPersonal);
    setIsDirty(false);
  };

  // Save personal info
  const handleSavePersonal = async () => {
    // Prevent saving if employee ID is invalid
    if (
      !employeeIdValidation.isValid &&
      personalForm.employeeId !== employee.employeeId
    ) {
      toast.error("Please fix the Employee ID error before saving");
      return;
    }

    try {
      setIsSavingPersonal(true);
      const payload: Record<string, any> = {
        updates: personalForm,
      };

      if (employeeId) {
        payload.employeeId = employeeId;
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Personal information updated successfully");
        setOriginalPersonal(personalForm);
        setIsDirty(false);
        // Reset validation state after successful save
        setEmployeeIdValidation({
          isChecking: false,
          isValid: true,
          message: "",
        });
      } else {
        const errorData = await response.json();
        toast.error(
          errorData.message || "Failed to update personal information"
        );
      }
    } catch (error) {
      console.error("Save personal info error:", error);
      toast.error("Failed to update personal information");
    } finally {
      setIsSavingPersonal(false);
    }
  };

  // Fetch passports
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

  const getEducationDateRange = (
    start?: string | null,
    end?: string | null
  ) => {
    if (!start && !end) return "Dates not available";

    const getYear = (value?: string | null) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return date.getFullYear().toString();
    };

    const startYear = getYear(start) || "Start not set";
    const endYear = getYear(end) || "Present";

    return `${startYear} — ${endYear}`;
  };

  useEffect(() => {
    fetchPassports();
    fetchEducations();
    fetchExperiences();
  }, [employeeId]);

  // Handle passport deletion
  const handleDeletePassport = (passport: any) => {
    console.log("Delete passport clicked:", passport);
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

  const handleDeleteEducation = async () => {
    if (!educationToDelete) return;

    try {
      setDeleteEducationLoading(true);
      const response = await fetch(`/api/education/${educationToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Failed to delete education record"
        );
      }

      toast.success("Education record deleted successfully");
      setShowEducationDeleteModal(false);
      setEducationToDelete(null);
      fetchEducations();
    } catch (error: any) {
      console.error("Delete education error:", error);
      toast.error(error.message || "Failed to delete education record");
    } finally {
      setDeleteEducationLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
            <IdentificationIcon className="h-3 w-3 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-blue-600">
            Basic Information
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Employee # */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee #
              {canEditEmployeeId && <span className="text-red-500">*</span>}
            </label>
            {canEditEmployeeId ? (
              <div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none">
                    EMP
                  </span>
                  <input
                    type="text"
                    value={employeeIdNumber}
                    onChange={(e) =>
                      handleEmployeeIdNumberChange(e.target.value)
                    }
                    className={`${getInputBaseClasses(true)} pl-14 ${
                      !employeeIdValidation.isValid
                        ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                        : employeeIdValidation.message &&
                          employeeIdValidation.isValid
                        ? "border-green-500 focus:ring-green-500 focus:border-green-500"
                        : ""
                    }`}
                    placeholder="0000"
                    maxLength={4}
                  />
                </div>
                {employeeIdValidation.isChecking && (
                  <p className="mt-1 text-xs text-gray-500">
                    Checking availability...
                  </p>
                )}
                {!employeeIdValidation.isChecking &&
                  employeeIdValidation.message && (
                    <p
                      className={`mt-1 text-xs ${
                        employeeIdValidation.isValid
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {employeeIdValidation.message}
                    </p>
                  )}
              </div>
            ) : (
              <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-300 font-medium">
                {employee.employeeId}
              </div>
            )}
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name{" "}
              {canEditPersonal && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={personalForm.firstName}
              onChange={(e) =>
                handlePersonalFieldChange("firstName", e.target.value)
              }
              className={getInputBaseClasses(canEditPersonal)}
              disabled={!canEditPersonal}
              placeholder={!personalForm.firstName ? "Not provided" : undefined}
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name{" "}
              {canEditPersonal && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={personalForm.lastName}
              onChange={(e) =>
                handlePersonalFieldChange("lastName", e.target.value)
              }
              className={getInputBaseClasses(canEditPersonal)}
              disabled={!canEditPersonal}
              placeholder={!personalForm.lastName ? "Not provided" : undefined}
            />
          </div>

          {/* Father Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Father Name
            </label>
            <input
              type="text"
              value={personalForm.fatherName}
              onChange={(e) =>
                handlePersonalFieldChange("fatherName", e.target.value)
              }
              placeholder={
                !personalForm.fatherName ? "Not provided" : undefined
              }
              className={getInputBaseClasses(canEditPersonal)}
              disabled={!canEditPersonal}
            />
          </div>

          {/* CNIC */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CNIC
            </label>
            <input
              type="text"
              value={personalForm.cnic}
              onChange={(e) =>
                handlePersonalFieldChange("cnic", e.target.value)
              }
              placeholder={!personalForm.cnic ? "Not provided" : undefined}
              className={getInputBaseClasses(canEditPersonal)}
              disabled={!canEditPersonal}
            />
          </div>

          {/* Blood Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Blood Group
            </label>
            {canEditPersonal ? (
              <select
                value={personalForm.bloodGroup}
                onChange={(e) =>
                  handlePersonalFieldChange("bloodGroup", e.target.value)
                }
                className={getInputBaseClasses(true)}
              >
                <option value="">Select Blood Group</option>
                {Object.keys(BLOOD_GROUP_LABELS).map((group) => (
                  <option key={group} value={group}>
                    {BLOOD_GROUP_LABELS[group]}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={getBloodGroupLabel(personalForm.bloodGroup)}
                className={getInputBaseClasses(false)}
                disabled
              />
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            {canEditPersonal ? (
              <input
                type="date"
                value={personalForm.dateOfBirth}
                onChange={(e) =>
                  handlePersonalFieldChange("dateOfBirth", e.target.value)
                }
                className={getInputBaseClasses(true)}
              />
            ) : (
              <input
                type="text"
                value={
                  employee.dateOfBirth
                    ? formatDate(employee.dateOfBirth)
                    : "Not provided"
                }
                className={getInputBaseClasses(false)}
                disabled
              />
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            {canEditPersonal ? (
              <select
                value={personalForm.gender}
                onChange={(e) =>
                  handlePersonalFieldChange("gender", e.target.value)
                }
                className={getInputBaseClasses(true)}
              >
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            ) : (
              <input
                type="text"
                value={getGenderLabel(personalForm.gender)}
                className={getInputBaseClasses(false)}
                disabled
              />
            )}
          </div>

          {/* Marital Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marital Status
            </label>
            {canEditPersonal ? (
              <select
                value={personalForm.maritalStatus}
                onChange={(e) =>
                  handlePersonalFieldChange("maritalStatus", e.target.value)
                }
                className={getInputBaseClasses(true)}
              >
                <option value="">Select Marital Status</option>
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="DIVORCED">Divorced</option>
                <option value="WIDOWED">Widowed</option>
              </select>
            ) : (
              <input
                type="text"
                value={getMaritalStatusLabel(personalForm.maritalStatus)}
                className={getInputBaseClasses(false)}
                disabled
              />
            )}
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
                handlePersonalFieldChange("nationality", e.target.value)
              }
              placeholder={
                !personalForm.nationality ? "Not provided" : undefined
              }
              className={getInputBaseClasses(canEditPersonal)}
              disabled={!canEditPersonal}
            />
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
            <h3 className="text-lg font-semibold text-blue-600">Address</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street 1
              </label>
              <input
                type="text"
                value={personalForm.address}
                onChange={(e) =>
                  handlePersonalFieldChange("address", e.target.value)
                }
                placeholder={!personalForm.address ? "Not provided" : undefined}
                className={getInputBaseClasses(canEditPersonal)}
                disabled={!canEditPersonal}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={personalForm.city}
                onChange={(e) =>
                  handlePersonalFieldChange("city", e.target.value)
                }
                placeholder={!personalForm.city ? "Not provided" : undefined}
                className={getInputBaseClasses(canEditPersonal)}
                disabled={!canEditPersonal}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Province/State
              </label>
              <input
                type="text"
                value={personalForm.state}
                onChange={(e) =>
                  handlePersonalFieldChange("state", e.target.value)
                }
                placeholder={!personalForm.state ? "Not provided" : undefined}
                className={getInputBaseClasses(canEditPersonal)}
                disabled={!canEditPersonal}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                value={personalForm.postalCode}
                onChange={(e) =>
                  handlePersonalFieldChange("postalCode", e.target.value)
                }
                placeholder={
                  !personalForm.postalCode ? "Not provided" : undefined
                }
                className={getInputBaseClasses(canEditPersonal)}
                disabled={!canEditPersonal}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                value={personalForm.country}
                onChange={(e) =>
                  handlePersonalFieldChange("country", e.target.value)
                }
                placeholder={!personalForm.country ? "Not provided" : undefined}
                className={getInputBaseClasses(canEditPersonal)}
                disabled={!canEditPersonal}
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
            <h3 className="text-lg font-semibold text-blue-600">Contact</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Phone
              </label>
              <input
                type="text"
                value={personalForm.phone}
                onChange={(e) =>
                  handlePersonalFieldChange("phone", e.target.value)
                }
                placeholder={!personalForm.phone ? "Not provided" : undefined}
                className={getInputBaseClasses(canEditPersonal)}
                disabled={!canEditPersonal}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Phone
              </label>
              <input
                type="text"
                value={personalForm.alternatePhone}
                onChange={(e) =>
                  handlePersonalFieldChange("alternatePhone", e.target.value)
                }
                placeholder={
                  !personalForm.alternatePhone ? "Not provided" : undefined
                }
                className={getInputBaseClasses(canEditPersonal)}
                disabled={!canEditPersonal}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Email
              </label>
              <input
                type="email"
                value={employee.email}
                className={getInputBaseClasses(false)}
                disabled
                title="Email cannot be changed from profile"
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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn
              </label>
              <input
                type="url"
                value={personalForm.linkedin}
                onChange={(e) =>
                  handlePersonalFieldChange("linkedin", e.target.value)
                }
                placeholder={
                  !personalForm.linkedin
                    ? "https://www.linkedin.com/in/username"
                    : undefined
                }
                className={getInputBaseClasses(canEditPersonal)}
                disabled={!canEditPersonal}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Twitter Username
              </label>
              <input
                type="text"
                value={personalForm.twitter}
                onChange={(e) =>
                  handlePersonalFieldChange("twitter", e.target.value)
                }
                placeholder={!personalForm.twitter ? "@username" : undefined}
                className={getInputBaseClasses(canEditPersonal)}
                disabled={!canEditPersonal}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facebook
              </label>
              <input
                type="url"
                value={personalForm.facebook}
                onChange={(e) =>
                  handlePersonalFieldChange("facebook", e.target.value)
                }
                placeholder={
                  !personalForm.facebook
                    ? "https://www.facebook.com/username"
                    : undefined
                }
                className={getInputBaseClasses(canEditPersonal)}
                disabled={!canEditPersonal}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instagram
              </label>
              <input
                type="url"
                value={personalForm.instagram}
                onChange={(e) =>
                  handlePersonalFieldChange("instagram", e.target.value)
                }
                placeholder={
                  !personalForm.instagram
                    ? "https://www.instagram.com/username"
                    : undefined
                }
                className={getInputBaseClasses(canEditPersonal)}
                disabled={!canEditPersonal}
              />
            </div>
          </div>
        </div>
      </div>

      {canEditPersonal && isDirty && (
        <div className="sticky bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-end space-x-3">
            <button
              onClick={handleCancelPersonalEdit}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isSavingPersonal}
            >
              Cancel
            </button>
            <button
              onClick={handleSavePersonal}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                isSavingPersonal
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              disabled={isSavingPersonal}
            >
              {isSavingPersonal ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Passports Section */}
      <div className="mt-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
                <DocumentTextIcon className="h-3 w-3 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-blue-600">Passports</h3>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Passport Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issued Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issuing Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                              console.log(
                                "Edit button clicked for passport:",
                                passport.id
                              );
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
                              console.log(
                                "Delete button clicked for passport:",
                                passport.id
                              );
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

      {/* Education Section */}
      <div className="mt-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
                <AcademicCapIcon className="h-3 w-3 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-blue-600">Education</h3>
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={() => {
                if (!canEditPersonal) return;
                setEditingEducation(null);
                setShowEducationModal(true);
              }}
              disabled={!canEditPersonal}
            >
              <PlusIcon className="h-4 w-4" />
              <span>Add Education</span>
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            {educationsLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading education records...
              </div>
            ) : educations.length > 0 ? (
              educations.map((edu: any) => (
                <div
                  key={edu.id}
                  className="flex flex-col gap-3 border-b border-slate-200/70 pb-6 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500 ring-1 ring-blue-100">
                      <AcademicCapIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          {edu.degree && (
                            <h4 className="text-base font-semibold text-slate-900">
                              {edu.degree}
                            </h4>
                          )}
                          <p className="text-sm text-slate-600">
                            {edu.institution || "Institution"}
                          </p>
                          {edu.major && (
                            <p className="text-sm text-slate-500">
                              Subject:{" "}
                              <span className="font-medium text-slate-700">
                                {edu.major}
                              </span>
                            </p>
                          )}
                        </div>

                        {canEditPersonal && (
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => {
                                setEditingEducation(edu);
                                setShowEducationModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 p-1 cursor-pointer"
                              title="Edit education"
                              type="button"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEducationToDelete(edu);
                                setShowEducationDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-900 p-1 cursor-pointer"
                              title="Delete education"
                              type="button"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <p className="text-sm font-medium text-blue-600">
                        {getEducationDateRange(edu.startDate, edu.endDate)}
                      </p>

                      {edu.description && (
                        <p className="text-sm leading-relaxed text-slate-600">
                          {edu.description}
                        </p>
                      )}
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
        </div>
      </div>

      {/* Work Experience Section */}
      <div className="mt-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
                <BriefcaseIcon className="h-3 w-3 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-blue-600">
                Work Experience
              </h3>
            </div>
            {canEditPersonal && (
              <button
                onClick={() => {
                  setEditingExperience(null);
                  setShowExperienceModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!canEditPersonal}
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add Experience</span>
              </button>
            )}
          </div>

          {experiencesLoading ? (
            <div className="text-center py-8 text-gray-500">
              Loading work experience...
            </div>
          ) : experiences.length > 0 ? (
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1.5 top-0 bottom-0 w-0.5 bg-slate-200"
              ></span>

              {sortExperiencesByTimeline(experiences).map(
                (experience: any, index: number) => {
                  const roleTitle =
                    experience.title ||
                    experience.designationTitle ||
                    "Role not specified";
                  const departmentName =
                    experience.departmentName ||
                    experience.department?.name ||
                    null;
                  const organizationLabel =
                    experience.companyName ||
                    experience.company ||
                    experience.organization ||
                    departmentName ||
                    (typeof employee?.designation === "object"
                      ? employee?.department?.name ?? null
                      : null);
                  const locationLabel =
                    experience.location ||
                    experience.workLocation ||
                    experience.city ||
                    employee?.workLocation ||
                    employee?.city ||
                    null;
                  const managerName =
                    experience.managerName ||
                    (experience.manager
                      ? [
                          experience.manager.firstName,
                          experience.manager.lastName,
                        ]
                          .filter(Boolean)
                          .join(" ")
                      : null);
                  const experienceRange = getExperienceDateRange(
                    formatDate,
                    experience.startDate,
                    experience.endDate
                  );
                  const durationLabel = getExperienceDuration(
                    experience.startDate,
                    experience.endDate
                  );
                  const isCurrent = !experience.endDate;
                  const reasonItems = (experience.changeReason || "")
                    .split("|")
                    .map((item: string) => item.trim())
                    .filter((item: string) => item.length > 0);

                  return (
                    <div
                      key={experience.id ?? index}
                      className="relative pl-8 mb-6 last:mb-0"
                    >
                      <span
                        className={`absolute left-0 top-6 h-3 w-3 rounded-full border-2 ${
                          isCurrent
                            ? "border-blue-500 bg-blue-500/20"
                            : "border-slate-300 bg-slate-100"
                        }`}
                      ></span>
                      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex-1 min-w-[200px]">
                            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <CalendarDaysIcon className="h-4 w-4" />
                              {experienceRange}
                            </p>
                            <h4 className="mt-2 text-lg font-semibold text-slate-900 capitalize">
                              {roleTitle}
                            </h4>
                            {organizationLabel && (
                              <div className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-slate-600">
                                <BuildingOffice2Icon className="h-4 w-4" />
                                <span>{organizationLabel}</span>
                              </div>
                            )}
                            <div className="mt-1 text-sm text-slate-500">
                              <span>
                                {experience.employmentType
                                  ? toTitleCase(
                                      experience.employmentType
                                        .toLowerCase()
                                        .replace(/_/g, " ")
                                    )
                                  : "Employment type not specified"}
                              </span>
                              {durationLabel && <span className="mx-2">·</span>}
                              {durationLabel && <span>{durationLabel}</span>}
                            </div>
                            {locationLabel && (
                              <div className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500">
                                <MapPinIcon className="h-4 w-4" />
                                <span className="capitalize">
                                  {locationLabel}
                                </span>
                              </div>
                            )}
                          </div>
                          {canEditPersonal && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingExperience(experience);
                                  setShowExperienceModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-900 p-1"
                                title="Edit experience"
                                type="button"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteExperience(experience)
                                }
                                className="text-red-600 hover:text-red-900 p-1"
                                title="Delete experience"
                                type="button"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                          {departmentName && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 capitalize">
                              <BriefcaseIcon className="h-3 w-3" />
                              {departmentName}
                            </span>
                          )}
                          {managerName && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                              <IdentificationIcon className="h-3 w-3" />
                              {managerName}
                            </span>
                          )}
                        </div>

                        {reasonItems.length > 0 && (
                          <div className="mt-4 space-y-1 text-sm text-slate-700">
                            {reasonItems.map(
                              (item: string, reasonIndex: number) => (
                                <p
                                  key={reasonIndex}
                                  className="flex items-start gap-2"
                                >
                                  <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400"></span>
                                  <span>{item}</span>
                                </p>
                              )
                            )}
                          </div>
                        )}

                        {!reasonItems.length && experience.description && (
                          <p className="mt-4 text-sm leading-relaxed text-slate-600">
                            {experience.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BriefcaseIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No work experience records found</p>
              <p className="text-sm">
                Add entries from the Job tab or HR module to see them here.
              </p>
            </div>
          )}
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
        employeeId={employeeId}
        onSaved={() => {
          fetchPassports();
        }}
      />

      <EducationFormModal
        isOpen={showEducationModal}
        onClose={() => {
          setShowEducationModal(false);
          setEditingEducation(null);
        }}
        onSaved={() => {
          fetchEducations();
        }}
        initial={editingEducation}
        employeeId={employeeId}
      />

      <WorkExperienceFormModal
        isOpen={showExperienceModal}
        onClose={() => {
          setShowExperienceModal(false);
          setEditingExperience(null);
        }}
        onSaved={handleExperienceSaved}
        initial={editingExperience}
        employeeId={employeeId}
      />

      {showExperienceDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Work Experience
                </h3>
                <button
                  onClick={() => {
                    setShowExperienceDeleteModal(false);
                    setExperienceToDelete(null);
                  }}
                  disabled={deleteExperienceLoading}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete this work experience entry? This
                action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowExperienceDeleteModal(false);
                  setExperienceToDelete(null);
                }}
                disabled={deleteExperienceLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExperience}
                disabled={deleteExperienceLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                  deleteExperienceLoading
                    ? "bg-red-300"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {deleteExperienceLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEducationDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Education
                </h3>
                <button
                  onClick={() => {
                    setShowEducationDeleteModal(false);
                    setEducationToDelete(null);
                  }}
                  disabled={deleteEducationLoading}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete this education record? This
                action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3 px-6 pb-6">
              <button
                onClick={() => {
                  setShowEducationDeleteModal(false);
                  setEducationToDelete(null);
                }}
                disabled={deleteEducationLoading}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEducation}
                disabled={deleteEducationLoading}
                className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-60"
              >
                {deleteEducationLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                    Are you sure you want to delete the passport "
                    {passportToDelete?.number}"? This action cannot be undone.
                  </p>
                </div>
              </div>

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
  );
}
