"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SpeakerWaveIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { getCookie } from "@/lib/cookies";
import { usePermissions } from "@/hooks/usePermission";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  author?: {
    firstName: string;
    lastName: string;
    user?: {
      email: string;
    };
  };
}

interface AnnouncementForm {
  title: string;
  content: string;
  type: string;
  priority: string;
  expiresAt: string;
  isActive: boolean;
}

export default function AnnouncementsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  const { permissions } = usePermissions(currentUser?.role || "");
  const router = useRouter();
  const [accessDenied, setAccessDenied] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<AnnouncementForm>({
    title: "",
    content: "",
    type: "GENERAL",
    priority: "MEDIUM",
    expiresAt: "",
    isActive: true,
  });
  const hasPermission = (perm: string) => {
    if (currentUser?.role === "ADMINISTRATOR") return true;
    return permissions.includes(perm);
  };
  useEffect(() => {
    const checkUserRoleAndFetchData = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const { user } = await response.json();
          if (user) {
            setCurrentUser(user);
            setAccessDenied(false);
            fetchAnnouncements();
          } else {
            setAccessDenied(true);
            setLoading(false);
          }
        } else {
          setAccessDenied(true);
          setLoading(false);
        }
      } catch (error) {
        setAccessDenied(true);
        setLoading(false);
      } finally {
        setAuthChecked(true);
      }
    };

    checkUserRoleAndFetchData();
  }, []);

  useEffect(() => {
    if (!accessDenied) {
      fetchAnnouncements();
    }
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch("/api/announcements", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      } else {
        toast.error("Failed to fetch announcements");
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
      toast.error("Failed to fetch announcements");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingId
        ? `/api/announcements/${editingId}`
        : "/api/announcements";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          expiresAt: formData.expiresAt || null,
        }),
      });

      if (response.ok) {
        toast.success(
          editingId
            ? "Announcement updated successfully"
            : "Announcement created successfully",
        );
        setShowModal(false);
        resetForm();
        fetchAnnouncements();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to save announcement");
      }
    } catch (error) {
      console.error("Failed to save announcement:", error);
      toast.error("Failed to save announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      expiresAt: announcement.expiresAt
        ? new Date(announcement.expiresAt).toISOString().split("T")[0]
        : "",
      isActive: announcement.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Announcement deleted successfully");
        fetchAnnouncements();
      } else {
        toast.error("Failed to delete announcement");
      }
    } catch (error) {
      console.error("Failed to delete announcement:", error);
      toast.error("Failed to delete announcement");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: "",
      content: "",
      type: "GENERAL",
      priority: "MEDIUM",
      expiresAt: "",
      isActive: true,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-100 text-red-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800";
      case "LOW":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (isActive: boolean, expiresAt?: string) => {
    if (!isActive) return "bg-gray-100 text-gray-800";
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return "bg-red-100 text-red-800";
    }
    return "bg-green-100 text-green-800";
  };

  if (!authChecked || loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            Access Denied
          </h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Announcements Management Access Restricted
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  You do not have permission to access announcements management
                  features.
                </p>
                <p className="mt-1">
                  This section is restricted to Administrators and HR Managers
                  only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            📢 Announcements Management
          </h1>
          <p className="text-gray-600">
            Create and manage company-wide announcements
          </p>
        </div>
        {hasPermission("announcement.create") && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Announcement
          </button>
        )}
      </div>

      {/* Announcements List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            All Announcements
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {announcements.length > 0 ? (
            announcements.map((announcement) => (
              <div key={announcement.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">
                        {announcement.title}
                      </h4>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                          announcement.priority,
                        )}`}
                      >
                        {announcement.priority}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          announcement.isActive,
                          announcement.expiresAt,
                        )}`}
                      >
                        {!announcement.isActive
                          ? "Inactive"
                          : announcement.expiresAt &&
                              new Date(announcement.expiresAt) < new Date()
                            ? "Expired"
                            : "Active"}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {announcement.content}
                    </p>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>
                        Created by{" "}
                        {announcement.author
                          ? `${announcement.author.firstName} ${announcement.author.lastName}`
                          : "System"}
                      </span>
                      <span>
                        Created{" "}
                        {new Date(announcement.createdAt).toLocaleDateString()}
                      </span>
                      {announcement.expiresAt && (
                        <span>
                          Expires{" "}
                          {new Date(
                            announcement.expiresAt,
                          ).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {hasPermission("announcement.update") && (
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                    )}
                    {hasPermission("announcement.delete") && (
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <SpeakerWaveIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-500">No announcements yet</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="mt-4 btn-primary"
              >
                Create your first announcement
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Announcement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingId ? "Edit Announcement" : "Create New Announcement"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content <span className="required-asterisk">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  rows={4}
                  className="input w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className="input w-full"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expires On (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) =>
                      setFormData({ ...formData, expiresAt: e.target.value })
                    }
                    className="input w-full"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label
                  htmlFor="isActive"
                  className="ml-2 text-sm text-gray-700"
                >
                  Active (visible to all employees)
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting
                    ? "Saving..."
                    : editingId
                      ? "Update Announcement"
                      : "Create Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
