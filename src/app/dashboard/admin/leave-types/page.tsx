"use client";

import { useEffect, useState } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import Link from "next/link";
import Table from "@/components/ui/Table";

interface LeaveType {
  id: string;
  name: string;
  description: string;
  maxDaysPerYear: number;
  carryForward: boolean;
  encashable: boolean;
}

export default function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [accessDenied, setAccessDenied] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    maxDaysPerYear: "",
    carryForward: false,
    encashable: false,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeaveType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalLeaveTypes, setTotalLeaveTypes] = useState(0);

  // Define table columns with fixed widths
  const columns = [
    {
      header: "Name",
      accessor: "name",
      className: "w-2/5", // 40% width
    },
    {
      header: "Description",
      accessor: "description",
      className: "w-1/5", // 20% width
      render: (value: string) => value || "-",
    },
    {
      header: "Max Days/Year",
      accessor: "maxDaysPerYear",
      className: "w-1/5", // 20% width
    },
    {
      header: "Carry Forward",
      accessor: "carryForward",
      className: "w-1/12", // ~8% width
      render: (value: boolean) =>
        value ? (
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
        ) : (
          <XCircleIcon className="h-5 w-5 text-red-500" />
        ),
    },
    {
      header: "Encashable",
      accessor: "encashable",
      className: "w-1/12", // ~8% width
      render: (value: boolean) =>
        value ? (
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
        ) : (
          <XCircleIcon className="h-5 w-5 text-red-500" />
        ),
    },
  ];

  useEffect(() => {
    const checkUserRoleAndFetchData = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const { user } = await response.json();
          if (user && user.role === 'ADMINISTRATOR') {
            setAccessDenied(false);
            fetchLeaveTypes();
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
      fetchLeaveTypes();
    }
  }, [currentPage, itemsPerPage]);

  const fetchLeaveTypes = async () => {
    try {
      const response = await fetch(
        `/api/leave-types?page=${currentPage}&limit=${itemsPerPage}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLeaveTypes(data.leaveTypes || []);
        setTotalLeaveTypes(
          data.pagination?.total || data.leaveTypes?.length || 0
        );
      }
    } catch (error) {
      console.error("Failed to fetch leave types:", error);
      toast.error("Failed to load leave types");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeaveType = async () => {
    if (!formData.name) {
      toast.error("Please fill in the leave type name");
      return;
    }

    try {
      const method = editingLeaveType ? "PUT" : "POST";
      const url = editingLeaveType
        ? `/api/leave-types/${editingLeaveType.id}`
        : "/api/leave-types";

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          maxDaysPerYear: parseInt(formData.maxDaysPerYear),
        }),
      });

      if (response.ok) {
        toast.success(
          editingLeaveType
            ? "Leave type updated successfully"
            : "Leave type created successfully"
        );
        setShowModal(false);
        resetForm();
        fetchLeaveTypes();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to save leave type");
      }
    } catch (error) {
      console.error("Failed to save leave type:", error);
      toast.error("Failed to save leave type");
    }
  };

  const handleEditLeaveType = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType);
    setFormData({
      name: leaveType.name,
      description: leaveType.description || "",
      maxDaysPerYear: leaveType.maxDaysPerYear.toString(),
      carryForward: leaveType.carryForward,
      encashable: leaveType.encashable,
    });
    setShowModal(true);
  };

  const handleDeleteLeaveType = (leaveType: LeaveType) => {
    setDeleteTarget(leaveType);
    setShowDeleteModal(true);
  };

  const confirmDeleteLeaveType = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/leave-types/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Leave type deleted successfully");
        fetchLeaveTypes();
        setShowDeleteModal(false);
        setDeleteTarget(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete leave type");
      }
    } catch (error) {
      console.error("Failed to delete leave type:", error);
      toast.error("Failed to delete leave type");
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetForm = () => {
    setEditingLeaveType(null);
    setFormData({
      name: "",
      description: "",
      maxDaysPerYear: "",
      carryForward: false,
      encashable: false,
    });
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  if (!authChecked || loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>

        {/* Table Skeleton */}
        <div className="h-8 bg-gray-200 rounded w-full mb-4"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
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
                Leave Types Management Access Restricted
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  You do not have permission to access leave types management features.
                </p>
                <p className="mt-1">
                  This section is restricted to Administrators only.
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
          <h1 className="text-2xl font-bold text-gray-900">Leave Types</h1>
          <p className="text-gray-600">Manage leave types and policies</p>
        </div>
        <button onClick={openModal} className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Leave Type
        </button>
      </div>

      {/* Leave Types Table */}
      <Table
        columns={[
          ...columns,
          {
            header: "Actions",
            accessor: "actions",
            render: (_: any, row: LeaveType) => (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditLeaveType(row)}
                  className="text-primary-600 hover:text-primary-900"
                  title="Edit Leave Type"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteLeaveType(row)}
                  className="text-red-600 hover:text-red-900"
                  title="Delete Leave Type"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        data={leaveTypes}
        showPagination={true}
        currentPage={currentPage}
        totalPages={Math.ceil(totalLeaveTypes / itemsPerPage)}
        totalItems={totalLeaveTypes}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {/* Add/Edit Leave Type Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingLeaveType ? "Edit Leave Type" : "Add New Leave Type"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateLeaveType();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter leave type name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="input"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Days Per Year
                </label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={formData.maxDaysPerYear}
                  onChange={(e) =>
                    setFormData({ ...formData, maxDaysPerYear: e.target.value })
                  }
                  placeholder="Enter maximum days per year"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="carryForward"
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                    checked={formData.carryForward}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        carryForward: e.target.checked,
                      })
                    }
                  />
                  <label
                    htmlFor="carryForward"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Carry Forward
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="encashable"
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                    checked={formData.encashable}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        encashable: e.target.checked,
                      })
                    }
                  />
                  <label
                    htmlFor="encashable"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Encashable
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingLeaveType ? "Update Leave Type" : "Create Leave Type"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Delete Leave Type</h2>
              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to delete "{deleteTarget.name}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
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
                onClick={confirmDeleteLeaveType}
                className="btn-danger"
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
