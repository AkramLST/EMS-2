"use client";

import { useEffect, useState } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Table from "@/components/ui/Table";

interface Designation {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function DesignationsPage() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [accessDenied, setAccessDenied] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDesignation, setEditingDesignation] =
    useState<Designation | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalDesignations, setTotalDesignations] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Designation | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const columns = [
    {
      header: "Title",
      accessor: "title",
      className: "w-1/3",
    },
    {
      header: "Description",
      accessor: "description",
      className: "w-1/2",
      render: (value: string | null) => value || "-",
    },
    {
      header: "Actions",
      accessor: "actions",
      className: "w-1/6",
      render: (_: any, row: Designation) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEditDesignation(row)}
            className="text-primary-600 hover:text-primary-900"
            title="Edit Designation"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteDesignation(row)}
            className="text-red-600 hover:text-red-900"
            title="Delete Designation"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  useEffect(() => {
    const checkUserRoleAndFetchData = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        if (response.ok) {
          const { user } = await response.json();
          if (user && (user.role === "ADMINISTRATOR" || user.role === "HR_MANAGER")) {
            setAccessDenied(false);
            fetchDesignations();
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
      fetchDesignations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, searchTerm]);

  const fetchDesignations = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());
      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await fetch(`/api/designations?${params.toString()}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const total = data.pagination?.totalItems ?? data.designations?.length ?? 0;
        const totalPages = total > 0 ? Math.ceil(total / itemsPerPage) : 1;

        if (total > 0 && currentPage > totalPages) {
          setCurrentPage(totalPages);
          return;
        }

        if (total === 0 && currentPage !== 1) {
          setCurrentPage(1);
          return;
        }

        setDesignations(data.designations || []);
        setTotalDesignations(total);
      }
    } catch (error) {
      console.error("Failed to fetch designations:", error);
      toast.error("Failed to load designations");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDesignation = async () => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      const method = editingDesignation ? "PUT" : "POST";
      const url = editingDesignation
        ? `/api/designations/${editingDesignation.id}`
        : "/api/designations";

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
        }),
      });

      if (response.ok) {
        toast.success(
          editingDesignation
            ? "Designation updated successfully"
            : "Designation created successfully"
        );
        setShowModal(false);
        resetForm();
        fetchDesignations();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to save designation");
      }
    } catch (error) {
      console.error("Failed to save designation:", error);
      toast.error("Failed to save designation");
    }
  };

  const handleEditDesignation = (designation: Designation) => {
    setEditingDesignation(designation);
    setFormData({
      title: designation.title,
      description: designation.description || "",
    });
    setShowModal(true);
  };

  const handleDeleteDesignation = (designation: Designation) => {
    setDeleteTarget(designation);
    setShowDeleteModal(true);
  };

  const confirmDeleteDesignation = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/designations/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Designation deleted successfully");
        setShowDeleteModal(false);
        setDeleteTarget(null);
        fetchDesignations();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete designation");
      }
    } catch (error) {
      console.error("Failed to delete designation:", error);
      toast.error("Failed to delete designation");
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetForm = () => {
    setEditingDesignation(null);
    setFormData({ title: "", description: "" });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  if (!authChecked || loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

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
                Designations Management Access Restricted
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>You do not have permission to access designations management.</p>
                <p className="mt-1">This section is restricted to Administrators and HR Managers.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Designations</h1>
          <p className="text-gray-600">
            Manage job designations across the organization.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary flex items-center"
        >
          <PlusIcon className="mr-2 h-5 w-5" />
          Add Designation
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search designations..."
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={designations}
        showPagination={true}
        currentPage={currentPage}
        totalPages={Math.ceil(totalDesignations / itemsPerPage)}
        totalItems={totalDesignations}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingDesignation ? "Edit Designation" : "Add Designation"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full bg-gray-100 p-1 text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateDesignation();
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter designation title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="input"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the responsibilities or scope"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingDesignation ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900">Delete designation</h2>
              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to delete "{deleteTarget.title}"? This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!deleteLoading) {
                      setShowDeleteModal(false);
                      setDeleteTarget(null);
                    }
                  }}
                  className="btn-outline"
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteDesignation}
                  className="btn-danger"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
