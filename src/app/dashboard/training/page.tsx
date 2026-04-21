"use client";

import { useEffect, useState } from "react";
import {
  AcademicCapIcon,
  BookOpenIcon,
  TrophyIcon,
  PlusIcon,
  EyeIcon,
  PlayIcon,
  CheckCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Pagination from "@/components/ui/Pagination";
import { usePermissions } from "@/hooks/usePermission";
interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  duration: number;
  type: string;
  instructor: string;
  startDate: string;
  endDate: string;
  status: string;
  maxParticipants: number;
  enrollments: {
    id: string;
    status: string;
    employeeId: string;
  }[];
}

interface TrainingEnrollment {
  id: string;
  status: string;
  progress: number;
  enrolledAt: string;
  completedAt: string | null;
  program: {
    title: string;
    type: string;
    duration: number;
  };
}

interface CurrentUser {
  role: string;
  employee?: {
    id: string;
  } | null;
}

export default function TrainingPage() {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("programs");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedProgram, setSelectedProgram] =
    useState<TrainingProgram | null>(null);
  const [creating, setCreating] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalPrograms, setTotalPrograms] = useState(0);
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const { permissions } = usePermissions(currentUser?.role);
  const hasPermission = (perm: string) => {
    if (currentUser?.role === "ADMINISTRATOR") return true;
    return permissions.includes(perm);
  };
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: "",
    type: "TECHNICAL",
    instructor: "",
    startDate: "",
    endDate: "",
    maxParticipants: "",
    status: "SCHEDULED",
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user || null);
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    fetchTrainingData();
  }, [currentPage, itemsPerPage]);

  const fetchTrainingData = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const [programsResponse, enrollmentsResponse] = await Promise.all([
        fetch(
          `/api/training/programs?page=${currentPage}&limit=${itemsPerPage}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
        fetch(
          `/api/training/enrollments?page=${currentPage}&limit=${itemsPerPage}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      ]);

      if (programsResponse.ok) {
        const programsData = await programsResponse.json();
        const rawPrograms: TrainingProgram[] = programsData.programs || [];

        const filteredPrograms = currentUser?.employee?.id
          ? rawPrograms.filter(
              (program) =>
                !program.enrollments.some(
                  (enrollment) =>
                    enrollment.employeeId === currentUser.employee?.id,
                ),
            )
          : rawPrograms;

        setPrograms(filteredPrograms);
        setTotalPrograms(
          filteredPrograms.length ||
            programsData.pagination?.total ||
            rawPrograms.length,
        );
      }

      if (enrollmentsResponse.ok) {
        const enrollmentsData = await enrollmentsResponse.json();
        setEnrollments(enrollmentsData.enrollments || []);
        setTotalEnrollments(
          enrollmentsData.pagination?.total ||
            enrollmentsData.enrollments?.length ||
            0,
        );
      }
    } catch (error) {
      console.error("Failed to fetch training data:", error);
      toast.error("Failed to fetch training data");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleEnroll = async (program: TrainingProgram) => {
    if (!currentUser?.employee?.id) {
      toast.error("Employee profile required to enroll in training");
      return;
    }

    const isAlreadyEnrolled = program.enrollments.some(
      (enrollment) => enrollment.employeeId === currentUser.employee?.id,
    );

    if (isAlreadyEnrolled) {
      toast.success("You're already enrolled in this program");
      return;
    }

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/training/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ programId: program.id }),
      });

      if (response.ok) {
        toast.success("Enrolled successfully");
        fetchTrainingData();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to enroll");
      }
    } catch (error) {
      console.error("Enrollment failed:", error);
      toast.error("Failed to enroll");
    }
  };

  const handleDeleteProgram = async (
    programId: string,
    programTitle: string,
  ) => {
    if (currentUser?.role !== "ADMINISTRATOR") {
      toast.error("Only administrators can delete programs");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete "${programTitle}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch(`/api/training/programs/${programId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Training program deleted successfully");
        fetchTrainingData();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to delete program");
      }
    } catch (error) {
      console.error("Delete program failed:", error);
      toast.error("Failed to delete program");
    }
  };

  const handleViewProgram = (program: TrainingProgram) => {
    setSelectedProgram(program);
    setShowViewModal(true);
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/training/programs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Training program created successfully");
        setShowCreateModal(false);
        setFormData({
          title: "",
          description: "",
          duration: "",
          type: "TECHNICAL",
          instructor: "",
          startDate: "",
          endDate: "",
          maxParticipants: "",
          status: "SCHEDULED",
        });
        fetchTrainingData();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to create program");
      }
    } catch (error) {
      console.error("Create program failed:", error);
      toast.error("Failed to create program");
    } finally {
      setCreating(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "ENROLLED":
        return "bg-yellow-100 text-yellow-800";
      case "SCHEDULED":
        return "bg-purple-100 text-purple-800";
      case "ONGOING":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "TECHNICAL":
        return "bg-blue-100 text-blue-800";
      case "SOFT_SKILLS":
        return "bg-green-100 text-green-800";
      case "COMPLIANCE":
        return "bg-red-100 text-red-800";
      case "LEADERSHIP":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Training & Development
          </h1>
          <p className="text-gray-600">
            Track and manage organizational training programs.
          </p>
        </div>
        {hasPermission("training.create") && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Program
          </button>
        )}
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BookOpenIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Available Programs
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {programs.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AcademicCapIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    My Enrollments
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {enrollments.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrophyIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {enrollments.filter((e) => e.status === "COMPLETED").length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab("programs")}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === "programs"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Available Programs
            </button>
            <button
              onClick={() => setActiveTab("enrollments")}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === "enrollments"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              My Learning
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "programs" ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {programs.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">
                    No training programs available
                  </p>
                </div>
              ) : (
                <>
                  {programs.map((program) => (
                    <div
                      key={program.id}
                      className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-lg font-medium text-gray-900">
                              {program.title}
                            </h4>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                program.status,
                              )}`}
                            >
                              {program.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mb-3">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getTypeColor(
                                program.type,
                              )}`}
                            >
                              {program.type}
                            </span>
                            <span className="text-sm text-gray-500">
                              {program.duration} hours
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            {program.description}
                          </p>
                          <div className="text-sm text-gray-500 space-y-1">
                            <p>
                              <span className="font-medium">Instructor:</span>{" "}
                              {program.instructor}
                            </p>
                            <p>
                              <span className="font-medium">Duration:</span>{" "}
                              {new Date(program.startDate).toLocaleDateString()}{" "}
                              - {new Date(program.endDate).toLocaleDateString()}
                            </p>
                            <p>
                              <span className="font-medium">Enrolled:</span>{" "}
                              {program.enrollments.length}/
                              {program.maxParticipants}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleViewProgram(program)}
                            className="text-primary-600 hover:text-primary-900 p-1 rounded"
                            title="View Program"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          {hasPermission("training.delete") && (
                            <button
                              onClick={() =>
                                handleDeleteProgram(program.id, program.title)
                              }
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                              title="Delete Program"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                        {currentUser?.employee?.id &&
                        program.enrollments.some(
                          (enrollment) =>
                            enrollment.employeeId === currentUser.employee?.id,
                        ) ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Enrolled
                          </span>
                        ) : (
                          <button
                            onClick={() => handleEnroll(program)}
                            className="btn-primary text-sm"
                            disabled={
                              program.enrollments.length >=
                              program.maxParticipants
                            }
                          >
                            {program.enrollments.length >=
                            program.maxParticipants
                              ? "Full"
                              : "Enroll"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Pagination */}
                  {programs.length > 0 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(totalPrograms / itemsPerPage)}
                      totalItems={totalPrograms}
                      itemsPerPage={itemsPerPage}
                      onPageChange={handlePageChange}
                      onItemsPerPageChange={handleItemsPerPageChange}
                    />
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {enrollments.length === 0 ? (
                <div className="text-center py-12">
                  <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">No enrollments found</p>
                </div>
              ) : (
                <>
                  {enrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900">
                              {enrollment.program.title}
                            </h4>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                enrollment.status,
                              )}`}
                            >
                              {enrollment.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 mt-1">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getTypeColor(
                                enrollment.program.type,
                              )}`}
                            >
                              {enrollment.program.type}
                            </span>
                            <span className="text-sm text-gray-500">
                              {enrollment.program.duration} hours
                            </span>
                            <span className="text-sm text-gray-500">
                              Enrolled:{" "}
                              {new Date(
                                enrollment.enrolledAt,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center">
                              <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                                <div
                                  className="bg-primary-600 h-2 rounded-full"
                                  style={{ width: `${enrollment.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600">
                                {enrollment.progress}%
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {enrollment.status === "COMPLETED" ? (
                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                              ) : (
                                <button className="text-primary-600 hover:text-primary-900">
                                  <PlayIcon className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Pagination */}
                  {enrollments.length > 0 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(totalEnrollments / itemsPerPage)}
                      totalItems={totalEnrollments}
                      itemsPerPage={itemsPerPage}
                      onPageChange={handlePageChange}
                      onItemsPerPageChange={handleItemsPerPageChange}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Create Program Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Create Training Program
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Title <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="mt-1 input"
                    value={formData.title}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Description <span className="required-asterisk">*</span>
                  </label>
                  <textarea
                    name="description"
                    required
                    rows={3}
                    className="mt-1 input"
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Duration (hours){" "}
                    <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="number"
                    name="duration"
                    required
                    min="1"
                    className="mt-1 input"
                    value={formData.duration}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Type <span className="required-asterisk">*</span>
                  </label>
                  <select
                    name="type"
                    required
                    className="mt-1 input"
                    value={formData.type}
                    onChange={handleInputChange}
                  >
                    <option value="TECHNICAL">Technical</option>
                    <option value="SOFT_SKILLS">Soft Skills</option>
                    <option value="COMPLIANCE">Compliance</option>
                    <option value="LEADERSHIP">Leadership</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Instructor <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    name="instructor"
                    required
                    className="mt-1 input"
                    value={formData.instructor}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Max Participants{" "}
                    <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="number"
                    name="maxParticipants"
                    required
                    min="1"
                    className="mt-1 input"
                    value={formData.maxParticipants}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Date <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    className="mt-1 input"
                    value={formData.startDate}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Date <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    required
                    className="mt-1 input"
                    value={formData.endDate}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Status <span className="required-asterisk">*</span>
                  </label>
                  <select
                    name="status"
                    required
                    className="mt-1 input"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary"
                >
                  {creating ? "Creating..." : "Create Program"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Program Modal */}
      {showViewModal && selectedProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedProgram.title}
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Details</h3>
                <div className="mt-2 bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-gray-500">Type</p>
                      <p className="font-medium">{selectedProgram.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="font-medium">
                        {selectedProgram.duration} hours
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Instructor</p>
                      <p className="font-medium">
                        {selectedProgram.instructor}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          selectedProgram.status,
                        )}`}
                      >
                        {selectedProgram.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Start Date</p>
                      <p className="font-medium">
                        {new Date(
                          selectedProgram.startDate,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">End Date</p>
                      <p className="font-medium">
                        {new Date(selectedProgram.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Enrolled</p>
                      <p className="font-medium">
                        {selectedProgram.enrollments.length}/
                        {selectedProgram.maxParticipants}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Description
                </h3>
                <p className="mt-2 text-gray-600">
                  {selectedProgram.description}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
