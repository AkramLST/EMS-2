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

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
  isOptional: boolean;
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [accessDenied, setAccessDenied] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    type: "NATIONAL",
    isOptional: false,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalHolidays, setTotalHolidays] = useState(0);

  // Define table columns with fixed widths
  const columns = [
    {
      header: "Name",
      accessor: "name",
      className: "w-2/5", // 40% width
    },
    {
      header: "Date",
      accessor: "date",
      className: "w-1/5", // 20% width
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      header: "Type",
      accessor: "type",
      className: "w-1/5", // 20% width
      render: (value: string) => (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          {value}
        </span>
      ),
    },
    {
      header: "Optional",
      accessor: "isOptional",
      className: "w-1/5", // 20% width
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
            fetchHolidays();
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
      fetchHolidays();
    }
  }, [currentPage, itemsPerPage]);

  const fetchHolidays = async () => {
    try {
      const response = await fetch(
        `/api/holidays?page=${currentPage}&limit=${itemsPerPage}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setHolidays(data.holidays || []);
        setTotalHolidays(data.pagination?.total || data.holidays?.length || 0);
      }
    } catch (error) {
      console.error("Failed to fetch holidays:", error);
      toast.error("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHoliday = async () => {
    if (!formData.name || !formData.date) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const method = editingHoliday ? "PUT" : "POST";
      const url = editingHoliday
        ? `/api/holidays/${editingHoliday.id}`
        : "/api/holidays";

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingHoliday
            ? "Holiday updated successfully"
            : "Holiday created successfully"
        );
        setShowModal(false);
        resetForm();
        fetchHolidays();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to save holiday");
      }
    } catch (error) {
      console.error("Failed to save holiday:", error);
      toast.error("Failed to save holiday");
    }
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      name: holiday.name,
      date: holiday.date.split("T")[0], // Format date for input
      type: holiday.type,
      isOptional: holiday.isOptional,
    });
    setShowModal(true);
  };

  const handleDeleteHoliday = (holiday: Holiday) => {
    setDeleteTarget(holiday);
    setShowDeleteModal(true);
  };

  const confirmDeleteHoliday = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/holidays/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Holiday deleted successfully");
        fetchHolidays();
        setShowDeleteModal(false);
        setDeleteTarget(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete holiday");
      }
    } catch (error) {
      console.error("Failed to delete holiday:", error);
      toast.error("Failed to delete holiday");
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetForm = () => {
    setEditingHoliday(null);
    setFormData({
      name: "",
      date: "",
      type: "NATIONAL",
      isOptional: false,
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
                Holiday Management Access Restricted
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  You do not have permission to access holiday management features.
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
          <h1 className="text-2xl font-bold text-gray-900">Holidays</h1>
          <p className="text-gray-600">
            Manage company holidays and observances
          </p>
        </div>
        <button onClick={openModal} className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Holiday
        </button>
      </div>

      {/* Holidays Table */}
      <Table
        columns={[
          ...columns,
          {
            header: "Actions",
            accessor: "actions",
            className: "w-1/12", // ~8% width
            render: (_: any, row: Holiday) => (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditHoliday(row)}
                  className="text-primary-600 hover:text-primary-900"
                  title="Edit Holiday"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteHoliday(row)}
                  className="text-red-600 hover:text-red-900"
                  title="Delete Holiday"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        data={holidays}
        showPagination={true}
        currentPage={currentPage}
        totalPages={Math.ceil(totalHolidays / itemsPerPage)}
        totalItems={totalHolidays}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {/* Add/Edit Holiday Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingHoliday ? "Edit Holiday" : "Add New Holiday"}
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
                handleCreateHoliday();
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
                  placeholder="Enter holiday name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="required-asterisk">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="input"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  className="input"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                >
                  <option value="NATIONAL">National</option>
                  <option value="REGIONAL">Regional</option>
                  <option value="COMPANY">Company</option>
                  <option value="RELIGIOUS">Religious</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isOptional"
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                  checked={formData.isOptional}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isOptional: e.target.checked,
                    })
                  }
                />
                <label
                  htmlFor="isOptional"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Optional Holiday
                </label>
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
                  {editingHoliday ? "Update Holiday" : "Create Holiday"}
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
              <h2 className="text-xl font-semibold text-gray-900">Delete Holiday</h2>
              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to delete "{deleteTarget.name}" scheduled on {new Date(deleteTarget.date).toLocaleDateString()}?
                This action cannot be undone.
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
                onClick={confirmDeleteHoliday}
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
