"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChartBarIcon,
  TrophyIcon,
  FlagIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Pagination from "@/components/ui/Pagination";
import Avatar from "@/components/ui/Avatar";
import { usePermissions } from "@/hooks/usePermission";

interface User {
  id: string;
  role: string;
  employee?: {
    id: string;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  email: string;
}

interface PerformanceReview {
  id: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  reviewPeriod: string;
  reviewType: string;
  overallRating: number;
  status: string;
  createdAt: string;
  achievements?: string;
  areasOfImprovement?: string;
  reviewerComments?: string;
}

interface GoalAssignment {
  id: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  } | null;
  assignedAt?: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  status: string;
  progress: number;
  assignments: GoalAssignment[];
}

interface GoalFormState {
  title: string;
  description: string;
  targetDate: string;
  employeeIds: string[];
}

const createEmptyGoalForm = (): GoalFormState => ({
  title: "",
  description: "",
  targetDate: "",
  employeeIds: [],
});

export default function PerformancePage() {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reviews");
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showNewReviewModal, setShowNewReviewModal] = useState(false);
  const [showViewReviewModal, setShowViewReviewModal] = useState(false);
  const [showEditReviewModal, setShowEditReviewModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [selectedReview, setSelectedReview] =
    useState<PerformanceReview | null>(null);
  const [creating, setCreating] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalReviews, setTotalReviews] = useState(0);
  const [totalGoals, setTotalGoals] = useState(0);

  // Goal form state
  const [goalForm, setGoalForm] = useState<GoalFormState>(
    createEmptyGoalForm(),
  );
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  // Review form state - Updated with new fields
  const [reviewForm, setReviewForm] = useState({
    id: "",
    employeeId: "",
    reviewPeriodStart: "",
    reviewPeriodEnd: "",
    reviewType: "QUARTERLY",
    overallRating: 1,
    status: "DRAFT",
    achievements: "",
    areasOfImprovement: "",
    reviewerComments: "",
  });
  const { permissions } = usePermissions(user?.role || "");
  const hasPermission = (perm: string) => {
    if (user?.role === "ADMINISTRATOR") return true;
    return permissions.includes(perm);
  };
  const selectedEmployees = useMemo(
    () =>
      goalForm.employeeIds
        .map((id) => employees.find((emp) => emp.id === id))
        .filter((emp): emp is Employee => Boolean(emp)),
    [goalForm.employeeIds, employees],
  );

  const toggleEmployeeSelection = (employeeId: string) => {
    setGoalForm((prev) => {
      const exists = prev.employeeIds.includes(employeeId);
      const employeeIds = exists
        ? prev.employeeIds.filter((id) => id !== employeeId)
        : [...prev.employeeIds, employeeId];
      return { ...prev, employeeIds };
    });
  };

  const removeSelectedEmployee = (employeeId: string) => {
    setGoalForm((prev) => ({
      ...prev,
      employeeIds: prev.employeeIds.filter((id) => id !== employeeId),
    }));
  };

  const closeAddGoalModal = () => {
    setShowAddGoalModal(false);
    setGoalForm(createEmptyGoalForm());
    setIsEmployeeDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isEmployeeDropdownOpen &&
        employeeDropdownRef.current &&
        !employeeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsEmployeeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEmployeeDropdownOpen]);

  useEffect(() => {
    console.log("=== DEBUG: useEffect called ===");
    console.log("currentPage:", currentPage);
    console.log("itemsPerPage:", itemsPerPage);

    fetchPerformanceData();
    fetchCurrentUser();
    fetchEmployees(); // Ensure employees are fetched on component mount
  }, [currentPage, itemsPerPage]);

  const fetchCurrentUser = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user || userData);
      } else {
        console.log("Failed to fetch user data");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      console.log(
        "Debug - fetching employees with token:",
        token ? "present" : "missing",
      );

      const response = await fetch("/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Debug - employees response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Debug - employees data:", data);
        console.log(
          "Debug - employees array length:",
          data.employees?.length || 0,
        );
        setEmployees(data.employees || []);
      } else {
        console.error(
          "Debug - failed to fetch employees:",
          response.status,
          response.statusText,
        );
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const canCreateReviews = () => {
    return (
      user?.role === "ADMINISTRATOR" ||
      user?.role === "HR_MANAGER" ||
      user?.role === "MANAGER" ||
      user?.role === "DEPARTMENT_MANAGER"
    );
  };

  const canEditReviews = () => {
    return (
      user?.role === "ADMINISTRATOR" ||
      user?.role === "HR_MANAGER" ||
      user?.role === "MANAGER"
    );
  };

  const canDeleteReviews = () => {
    return user?.role === "ADMINISTRATOR" || user?.role === "HR_MANAGER";
  };

  const handleViewReview = (review: PerformanceReview) => {
    setSelectedReview(review);
    setShowViewReviewModal(true);
  };

  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    console.log("=== DEBUG: handleUpdateReview START ===");
    console.log("Current reviewForm state:", reviewForm);
    console.log("Current selectedReview state:", selectedReview);

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      // Format the review period as a string combining start and end dates
      const reviewPeriod = `${reviewForm.reviewPeriodStart} to ${reviewForm.reviewPeriodEnd}`;

      // Use the IDs from reviewForm (set by handleEditReview)
      const employeeId = reviewForm.employeeId;
      const reviewId = reviewForm.id;

      console.log("=== DEBUG: VALIDATION CHECKS ===");
      console.log("reviewForm.employeeId:", reviewForm.employeeId);
      console.log("reviewForm.id:", reviewForm.id);
      console.log("selectedReview?.employee.id:", selectedReview?.employee.id);
      console.log("selectedReview?.id:", selectedReview?.id);

      console.log("=== DEBUG: FINAL VALUES ===");
      console.log("employeeId:", employeeId);
      console.log("reviewId:", reviewId);

      if (!employeeId || !reviewId) {
        console.error("=== DEBUG: VALIDATION FAILED ===");
        console.error("Missing employeeId:", !employeeId);
        console.error("Missing reviewId:", !reviewId);
        console.error("reviewForm:", reviewForm);
        console.error("selectedReview:", selectedReview);

        // Show more detailed error message
        if (!employeeId && !reviewId) {
          toast.error("Both Employee ID and Review ID are missing");
        } else if (!employeeId) {
          toast.error("Employee ID is missing");
        } else {
          toast.error("Review ID is missing");
        }

        setCreating(false);
        return;
      }

      console.log("=== DEBUG: BUILDING SUBMIT DATA ===");
      const submitData = {
        ...reviewForm,
        employeeId: employeeId,
        reviewPeriod,
        goals: [], // Add empty goals array for Prisma compatibility
      };

      // Remove the id from submitData as it shouldn't be in the request body
      if ("id" in submitData) {
        delete (submitData as any).id;
      }

      console.log("submitData (before API call):", submitData);
      console.log("API URL:", `/api/performance/reviews/${reviewId}`);

      const response = await fetch(`/api/performance/reviews/${reviewId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      console.log("API response status:", response.status);

      if (response.ok) {
        toast.success("Performance review updated successfully");
        setShowEditReviewModal(false);
        setReviewForm({
          id: "",
          employeeId: "",
          reviewPeriodStart: "",
          reviewPeriodEnd: "",
          reviewType: "QUARTERLY",
          overallRating: 1,
          status: "DRAFT",
          achievements: "",
          areasOfImprovement: "",
          reviewerComments: "",
        });
        fetchPerformanceData();
      } else {
        const data = await response.json();
        console.error("API Error Response:", data);
        toast.error(data.message || "Failed to update review");
      }
    } catch (error) {
      console.error("=== DEBUG: EXCEPTION CAUGHT ===");
      console.error("Update review error:", error);
      toast.error("Failed to update review - check console for details");
    } finally {
      setCreating(false);
      console.log("=== DEBUG: handleUpdateReview END ===");
    }
  };

  const handleDeleteReview = async () => {
    if (!selectedReview) return;

    setCreating(true);

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch(
        `/api/performance/reviews/${selectedReview.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        toast.success("Performance review deleted successfully");
        setShowDeleteConfirmModal(false);
        setSelectedReview(null);
        fetchPerformanceData();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to delete review");
      }
    } catch (error) {
      console.error("Delete review error:", error);
      toast.error("Failed to delete review");
    } finally {
      setCreating(false);
    }
  };

  const handleEditReview = (review: PerformanceReview) => {
    console.log("=== DEBUG: handleEditReview START ===");
    console.log("Input review object:", review);
    console.log("review.id:", review.id);
    console.log("review.employee:", review.employee);
    console.log("review.employee.id:", review.employee?.id);

    // Check if the review object has the required structure
    if (!review.id || !review.employee?.id) {
      console.error("ERROR: Invalid review object structure!");
      console.error("Missing review.id:", !review.id);
      console.error("Missing review.employee:", !review.employee);
      console.error("Missing review.employee.id:", !review.employee?.id);

      // Show detailed error about what's missing
      const missingFields = [];
      if (!review.id) missingFields.push("review.id");
      if (!review.employee) missingFields.push("review.employee");
      if (review.employee && !review.employee.id)
        missingFields.push("review.employee.id");

      console.error("Missing fields:", missingFields);
      console.error("Full review object:", JSON.stringify(review, null, 2));

      toast.error(
        `Invalid review data - cannot edit this review. Missing: ${missingFields.join(", ")}`,
      );
      return;
    }

    console.log("✅ Review object validation passed");

    // Extract employee ID (this code only runs if validation passes)
    const employeeId = review.employee.id;

    setSelectedReview(review);
    setReviewForm({
      id: review.id,
      employeeId: employeeId, // Use the found employee ID
      reviewPeriodStart: review.reviewPeriod.split(" to ")[0] || "",
      reviewPeriodEnd: review.reviewPeriod.split(" to ")[1] || "",
      reviewType: review.reviewType,
      overallRating: review.overallRating,
      status: review.status,
      achievements: review.achievements || "",
      areasOfImprovement: review.areasOfImprovement || "",
      reviewerComments: review.reviewerComments || "",
    });
    setShowEditReviewModal(true);

    console.log("=== DEBUG: handleEditReview END ===");
    console.log("Set selectedReview to:", review);
    console.log("Set reviewForm.id to:", review.id);
    console.log("Set reviewForm.employeeId to:", employeeId);
  };

  const fetchPerformanceData = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      console.log("=== DEBUG: fetchPerformanceData START ===");
      console.log("Token present:", !!token);

      const [reviewsResponse, goalsResponse] = await Promise.all([
        fetch(
          `/api/performance/reviews?page=${currentPage}&limit=${itemsPerPage}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
        fetch(
          `/api/performance/goals?page=${currentPage}&limit=${itemsPerPage}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      ]);

      console.log("Reviews response status:", reviewsResponse.status);
      console.log("Goals response status:", goalsResponse.status);

      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        console.log("=== DEBUG: Reviews API Response ===");
        console.log("reviewsData:", reviewsData);
        console.log("reviewsData.reviews:", reviewsData.reviews);
        console.log("First review structure:", reviewsData.reviews?.[0]);

        if (reviewsData.reviews?.[0]) {
          console.log("First review.id:", reviewsData.reviews[0].id);
          console.log(
            "First review.employee:",
            reviewsData.reviews[0].employee,
          );
          console.log(
            "First review.employee.id:",
            reviewsData.reviews[0].employee?.id,
          );
        }

        setReviews(reviewsData.reviews || []);
        setTotalReviews(
          reviewsData.pagination?.total || reviewsData.reviews?.length || 0,
        );
      } else {
        console.error("Failed to fetch reviews:", reviewsResponse.status);
        const errorData = await reviewsResponse.json();
        console.error("Reviews error data:", errorData);
      }

      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json();
        setGoals(goalsData.goals || []);
        setTotalGoals(
          goalsData.pagination?.total || goalsData.goals?.length || 0,
        );
      }
    } catch (error) {
      console.error("Failed to fetch performance data:", error);
      toast.error("Failed to fetch performance data");
    } finally {
      setLoading(false);
      console.log("=== DEBUG: fetchPerformanceData END ===");
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (goalForm.employeeIds.length === 0) {
        toast.error("Please select at least one employee for the goal");
        return;
      }

      const payload = {
        ...goalForm,
        progress: 0,
      };

      const response = await fetch("/api/performance/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Goal added successfully");
        setGoalForm(createEmptyGoalForm());
        setIsEmployeeDropdownOpen(false);
        setShowAddGoalModal(false);
        fetchPerformanceData();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to add goal");
      }
    } catch (error) {
      console.error("Add goal error:", error);
      toast.error("Failed to add goal");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      // Format the review period as a string combining start and end dates
      const reviewPeriod = `${reviewForm.reviewPeriodStart} to ${reviewForm.reviewPeriodEnd}`;

      // Ensure employeeId is present. If not selected in form (edit modal is read-only),
      // fallback to selectedReview's employee id
      const ensuredEmployeeId =
        reviewForm.employeeId || selectedReview?.employee.id || "";

      if (!ensuredEmployeeId) {
        toast.error("Employee is required");
        setCreating(false);
        return;
      }

      const submitData = {
        ...reviewForm,
        employeeId: ensuredEmployeeId,
        reviewPeriod,
        goals: [], // Add empty goals array for Prisma compatibility
      };

      const response = await fetch("/api/performance/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        toast.success("Performance review created successfully");
        setShowNewReviewModal(false);
        setReviewForm({
          id: "",
          employeeId: "",
          reviewPeriodStart: "",
          reviewPeriodEnd: "",
          reviewType: "QUARTERLY",
          overallRating: 1,
          status: "DRAFT",
          achievements: "",
          areasOfImprovement: "",
          reviewerComments: "",
        });
        fetchPerformanceData();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to create review");
      }
    } catch (error) {
      console.error("Create review error:", error);
      toast.error("Failed to create review");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveDraft = async () => {
    // Set status to DRAFT and save
    const currentStatus = reviewForm.status;
    setReviewForm((prev) => ({ ...prev, status: "DRAFT" }));

    // Create a form event to trigger the save
    const event = new Event("submit") as any;
    await handleCreateReview(event);

    // Restore original status if save failed
    if (reviewForm.status === "DRAFT") {
      setReviewForm((prev) => ({ ...prev, status: currentStatus }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "NOT_STARTED":
        return "bg-gray-100 text-gray-800";
      case "DRAFT":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-lg ${
          i < rating ? "text-yellow-400" : "text-gray-300"
        }`}
      >
        ★
      </span>
    ));
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

  // Debug: Log employees state
  console.log("Debug - employees state:", employees);
  console.log("Debug - employees length:", employees.length);

  // Debug: Log form state changes
  console.log("Debug - reviewForm state:", reviewForm);
  console.log("Debug - reviewForm.id:", reviewForm.id);
  console.log("Debug - reviewForm.employeeId:", reviewForm.employeeId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          Performance Management
        </h1>
        <div className="flex space-x-3">
          {canCreateReviews() && (
            <button
              onClick={() => setShowAddGoalModal(true)}
              className="btn-outline"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Goal
            </button>
          )}
          {hasPermission("review.create") && (
            <button
              onClick={() => setShowNewReviewModal(true)}
              className="btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Review
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Reviews
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {reviews.length}
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
                <FlagIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Goals
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {goals.filter((g) => g.status === "IN_PROGRESS").length}
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
                    Completed Goals
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {goals.filter((g) => g.status === "COMPLETED").length}
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
              onClick={() => setActiveTab("reviews")}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === "reviews"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Performance Reviews
            </button>
            <button
              onClick={() => setActiveTab("goals")}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === "goals"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Goals & OKRs
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "reviews" ? (
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">
                    No performance reviews found
                  </p>
                </div>
              ) : (
                <>
                  {reviews.map((review) => {
                    console.log("=== DEBUG: Rendering review ===");
                    console.log("Review object:", review);
                    console.log("Review.id:", review.id);
                    console.log("Review.employee:", review.employee);
                    console.log("Review.employee.id:", review.employee?.id);

                    return (
                      <div
                        key={review.id}
                        className="border rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <Avatar
                                employeeId={review.employee.id}
                                employeeName={`${review.employee.firstName} ${review.employee.lastName}`}
                                size="md"
                                showLink={true}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-gray-900">
                                  {review.employee.firstName}{" "}
                                  {review.employee.lastName}
                                </p>
                                <span
                                  className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                    review.status,
                                  )}`}
                                >
                                  {review.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500">
                                {review.reviewType} Review -{" "}
                                {review.reviewPeriod}
                              </p>
                              <div className="flex items-center mt-1">
                                {getRatingStars(review.overallRating)}
                                <span className="ml-2 text-sm text-gray-600">
                                  {review.overallRating}/5
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewReview(review)}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                          {hasPermission("review.update") && (
                              <button
                                onClick={() => {
                                  console.log(
                                    "=== DEBUG: Edit button clicked ===",
                                  );
                                  console.log(
                                    "Review being passed to handleEditReview:",
                                    review,
                                  );
                                  handleEditReview(review);
                                }}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                            )}
                          {hasPermission("review.delete") && (
                              <button
                                onClick={() => {
                                  console.log(
                                    "=== DEBUG: Delete button clicked ===",
                                  );
                                  console.log("Review being deleted:", review);
                                  setSelectedReview(review);
                                  setShowDeleteConfirmModal(true);
                                }}
                                className="text-red-600 hover:text-red-800"
                                title="Delete Review"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Pagination */}
                  {reviews.length > 0 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(totalReviews / itemsPerPage)}
                      totalItems={totalReviews}
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
              {goals.length === 0 ? (
                <div className="text-center py-12">
                  <FlagIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">No goals found</p>
                </div>
              ) : (
                <>
                  {goals.map((goal) => (
                    <div
                      key={goal.id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900">
                              {goal.title}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                  goal.status,
                                )}`}
                              >
                                {goal.status}
                              </span>
                              {canEditReviews() && (
                                <button className="text-gray-600 hover:text-gray-900">
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {goal.description}
                          </p>
                          <div className="mt-2 text-xs text-gray-500">
                            <span className="font-medium text-gray-700">
                              Assigned to:
                            </span>{" "}
                            {goal.assignments
                              .map((assignment) => assignment.employee)
                              .filter(
                                (
                                  employee,
                                ): employee is GoalAssignment["employee"] =>
                                  Boolean(employee),
                              )
                              .map((employee) =>
                                `${employee?.firstName ?? ""} ${employee?.lastName ?? ""}`.trim(),
                              )
                              .filter((name) => name.length > 0)
                              .join(", ") || "No assignments"}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-500">
                              Target:{" "}
                              {new Date(goal.targetDate).toLocaleDateString()}
                            </p>
                            <div className="flex items-center">
                              <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-primary-600 h-2 rounded-full"
                                  style={{ width: `${goal.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600">
                                {goal.progress}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Pagination */}
                  {goals.length > 0 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(totalGoals / itemsPerPage)}
                      totalItems={totalGoals}
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

      {/* Add Goal Modal */}
      {showAddGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Add New Goal
              </h2>
              <button
                onClick={closeAddGoalModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Title <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={goalForm.title}
                  onChange={(e) =>
                    setGoalForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter goal title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="required-asterisk">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  className="input"
                  value={goalForm.description}
                  onChange={(e) =>
                    setGoalForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe the goal"
                />
              </div>

              <div ref={employeeDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Employees <span className="required-asterisk">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsEmployeeDropdownOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <span>
                    {selectedEmployees.length > 0
                      ? `${selectedEmployees.length} employee${selectedEmployees.length > 1 ? "s" : ""} selected`
                      : "Select employees"}
                  </span>
                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                </button>
                {isEmployeeDropdownOpen && (
                  <div className="mt-2 max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                    {employees.length === 0 ? (
                      <p className="px-4 py-2 text-sm text-gray-500">
                        No employees available
                      </p>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {employees.map((employee) => {
                          const fullName = `${employee.firstName} ${employee.lastName}`;
                          const isSelected = goalForm.employeeIds.includes(
                            employee.id,
                          );
                          return (
                            <li
                              key={employee.id}
                              className="flex items-center px-4 py-2 hover:bg-gray-50"
                            >
                              <input
                                id={`goal-employee-${employee.id}`}
                                type="checkbox"
                                checked={isSelected}
                                onChange={() =>
                                  toggleEmployeeSelection(employee.id)
                                }
                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <label
                                htmlFor={`goal-employee-${employee.id}`}
                                className="ml-3 flex flex-1 flex-col text-sm"
                              >
                                <span className="font-medium text-gray-900">
                                  {fullName}
                                </span>
                                <span className="text-gray-500">
                                  {employee.employeeId}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
                {selectedEmployees.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedEmployees.map((employee) => (
                      <span
                        key={employee.id}
                        className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
                      >
                        {employee.firstName} {employee.lastName}
                        <button
                          type="button"
                          onClick={() => removeSelectedEmployee(employee.id)}
                          className="ml-1 text-primary-600 hover:text-primary-800"
                          aria-label={`Remove ${employee.firstName} ${employee.lastName}`}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {goalForm.employeeIds.length === 0 && (
                  <p className="mt-2 text-xs text-red-500">
                    Please select at least one employee.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Date <span className="required-asterisk">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="input"
                  value={goalForm.targetDate}
                  onChange={(e) =>
                    setGoalForm((prev) => ({
                      ...prev,
                      targetDate: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddGoalModal(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary"
                >
                  {creating ? "Adding..." : "Add Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Review Modal */}
      {showNewReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Create New Performance Review
              </h2>
              <button
                onClick={() => setShowNewReviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateReview} className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee <span className="required-asterisk">*</span>
                </label>
                <select
                  required
                  className="input"
                  value={reviewForm.employeeId}
                  onChange={(e) =>
                    setReviewForm((prev) => ({
                      ...prev,
                      employeeId: e.target.value,
                    }))
                  }
                >
                  <option value="">Select Employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} -{" "}
                      {employee.employeeId}
                    </option>
                  ))}
                </select>
                {/* Debug: Show employees count */}
                <p className="text-xs text-gray-500 mt-1">
                  Debug: {employees.length} employees loaded
                </p>
              </div>

              {/* Review Period - Date Range */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Period Start{" "}
                    <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={reviewForm.reviewPeriodStart}
                    onChange={(e) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        reviewPeriodStart: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Period End{" "}
                    <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={reviewForm.reviewPeriodEnd}
                    onChange={(e) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        reviewPeriodEnd: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Type <span className="required-asterisk">*</span>
                  </label>
                  <select
                    required
                    className="input"
                    value={reviewForm.reviewType}
                    onChange={(e) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        reviewType: e.target.value,
                      }))
                    }
                  >
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half-Yearly</option>
                    <option value="ANNUAL">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status <span className="required-asterisk">*</span>
                  </label>
                  <select
                    required
                    className="input"
                    value={reviewForm.status}
                    onChange={(e) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overall Rating <span className="required-asterisk">*</span>
                </label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    className="w-full"
                    value={reviewForm.overallRating}
                    onChange={(e) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        overallRating: parseFloat(e.target.value),
                      }))
                    }
                  />
                  <span className="ml-4 text-lg font-medium">
                    {reviewForm.overallRating}
                  </span>
                </div>
                <div className="flex justify-center mt-2">
                  {getRatingStars(reviewForm.overallRating)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key Achievements
                </label>
                <textarea
                  rows={3}
                  className="input"
                  value={reviewForm.achievements}
                  onChange={(e) =>
                    setReviewForm((prev) => ({
                      ...prev,
                      achievements: e.target.value,
                    }))
                  }
                  placeholder="Describe key achievements during this period"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Areas of Improvement
                </label>
                <textarea
                  rows={3}
                  className="input"
                  value={reviewForm.areasOfImprovement}
                  onChange={(e) =>
                    setReviewForm((prev) => ({
                      ...prev,
                      areasOfImprovement: e.target.value,
                    }))
                  }
                  placeholder="Identify areas for improvement"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reviewer Comments
                </label>
                <textarea
                  rows={3}
                  className="input"
                  value={reviewForm.reviewerComments}
                  onChange={(e) =>
                    setReviewForm((prev) => ({
                      ...prev,
                      reviewerComments: e.target.value,
                    }))
                  }
                  placeholder="Additional comments from the reviewer"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewReviewModal(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={creating}
                  className="btn-outline"
                >
                  {creating ? "Saving..." : "Save Draft"}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary"
                >
                  {creating ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showViewReviewModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Performance Review Details
              </h2>
              <button
                onClick={() => setShowViewReviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Employee Info */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Avatar
                  employeeId={selectedReview.employee.id}
                  employeeName={`${selectedReview.employee.firstName} ${selectedReview.employee.lastName}`}
                  size="lg"
                  showLink={true}
                />
                <div>
                  <h3 className="font-medium text-gray-900">
                    {selectedReview.employee.firstName}{" "}
                    {selectedReview.employee.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    ID: {selectedReview.employee.employeeId}
                  </p>
                </div>
                <span
                  className={`ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedReview.status)}`}
                >
                  {selectedReview.status}
                </span>
              </div>

              {/* Review Details */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Period
                  </label>
                  <p className="text-gray-900">{selectedReview.reviewPeriod}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Type
                  </label>
                  <p className="text-gray-900">{selectedReview.reviewType}</p>
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overall Rating
                </label>
                <div className="flex items-center">
                  {getRatingStars(selectedReview.overallRating)}
                  <span className="ml-2 text-lg font-medium">
                    {selectedReview.overallRating}/5
                  </span>
                </div>
              </div>

              {/* Key Achievements */}
              {selectedReview.achievements && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Key Achievements
                  </label>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {selectedReview.achievements}
                    </p>
                  </div>
                </div>
              )}

              {/* Areas of Improvement */}
              {selectedReview.areasOfImprovement && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Areas of Improvement
                  </label>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {selectedReview.areasOfImprovement}
                    </p>
                  </div>
                </div>
              )}

              {/* Reviewer Comments */}
              {selectedReview.reviewerComments && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reviewer Comments
                  </label>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {selectedReview.reviewerComments}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowViewReviewModal(false)}
                  className="btn-outline"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Review Modal */}
      {showEditReviewModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Performance Review
              </h2>
              <button
                onClick={() => {
                  console.log("Debug - Edit modal closing");
                  console.log("Current reviewForm before close:", reviewForm);
                  setShowEditReviewModal(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateReview} className="space-y-4">
              {/* Debug: Show form state when modal renders */}
              <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                Debug - Form ID: {reviewForm.id || "empty"} | Employee ID:{" "}
                {reviewForm.employeeId || "empty"}
              </div>

              {/* Employee Selection (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-gray-900">
                    {selectedReview.employee.firstName}{" "}
                    {selectedReview.employee.lastName} -{" "}
                    {selectedReview.employee.employeeId}
                  </p>
                </div>
              </div>

              {/* Review Period - Date Range */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Period Start{" "}
                    <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={reviewForm.reviewPeriodStart}
                    onChange={(e) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        reviewPeriodStart: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Period End{" "}
                    <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={reviewForm.reviewPeriodEnd}
                    onChange={(e) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        reviewPeriodEnd: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Type <span className="required-asterisk">*</span>
                  </label>
                  <select
                    required
                    className="input"
                    value={reviewForm.reviewType}
                    onChange={(e) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        reviewType: e.target.value,
                      }))
                    }
                  >
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half-Yearly</option>
                    <option value="ANNUAL">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status <span className="required-asterisk">*</span>
                  </label>
                  <select
                    required
                    className="input"
                    value={reviewForm.status}
                    onChange={(e) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overall Rating <span className="required-asterisk">*</span>
                </label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    className="w-full"
                    value={reviewForm.overallRating}
                    onChange={(e) =>
                      setReviewForm((prev) => ({
                        ...prev,
                        overallRating: parseFloat(e.target.value),
                      }))
                    }
                  />
                  <span className="ml-4 text-lg font-medium">
                    {reviewForm.overallRating}
                  </span>
                </div>
                <div className="flex justify-center mt-2">
                  {getRatingStars(reviewForm.overallRating)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key Achievements
                </label>
                <textarea
                  rows={3}
                  className="input"
                  value={reviewForm.achievements}
                  onChange={(e) =>
                    setReviewForm((prev) => ({
                      ...prev,
                      achievements: e.target.value,
                    }))
                  }
                  placeholder="Describe key achievements during this period"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Areas of Improvement
                </label>
                <textarea
                  rows={3}
                  className="input"
                  value={reviewForm.areasOfImprovement}
                  onChange={(e) =>
                    setReviewForm((prev) => ({
                      ...prev,
                      areasOfImprovement: e.target.value,
                    }))
                  }
                  placeholder="Identify areas for improvement"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reviewer Comments
                </label>
                <textarea
                  rows={3}
                  className="input"
                  value={reviewForm.reviewerComments}
                  onChange={(e) =>
                    setReviewForm((prev) => ({
                      ...prev,
                      reviewerComments: e.target.value,
                    }))
                  }
                  placeholder="Additional comments from the reviewer"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditReviewModal(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={creating}
                  className="btn-outline"
                >
                  {creating ? "Saving..." : "Save Draft"}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary"
                >
                  {creating ? "Updating..." : "Update Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Delete Performance Review
              </h2>
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-red-50 rounded-lg">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {selectedReview.employee.firstName}{" "}
                    {selectedReview.employee.lastName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedReview.reviewType} Review -{" "}
                    {selectedReview.reviewPeriod}
                  </p>
                  <p className="text-sm text-red-600 font-medium">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <p className="text-gray-600">
                Are you sure you want to delete this performance review? This
                will permanently remove all associated data.
              </p>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="btn-outline"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteReview}
                  disabled={creating}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md font-medium"
                >
                  {creating ? "Deleting..." : "Delete Review"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
