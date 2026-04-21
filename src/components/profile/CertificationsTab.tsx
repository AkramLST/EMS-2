"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AcademicCapIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

import CertificationFormModal, {
  CertificationInput,
  CertificationStatus,
} from "./CertificationFormModal";

interface CertificationsTabProps {
  employee: any;
}

interface CertificationRecord {
  id: string;
  employeeId?: string;
  title: string;
  issuedBy?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  status: CertificationStatus;
  verificationUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const STATUS_LABELS: Record<CertificationStatus, string> = {
  IN_PROGRESS: "In Progress",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

const STATUS_STYLES: Record<CertificationStatus, string> = {
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  ACTIVE: "bg-green-50 text-green-700",
  EXPIRED: "bg-gray-100 text-gray-600",
  REVOKED: "bg-red-50 text-red-700",
};

const sortCertifications = (items: CertificationRecord[]) =>
  [...items].sort((a, b) => {
    const getTime = (value?: string | null) =>
      value ? new Date(value).getTime() : 0;
    const aTime = getTime(a.issueDate) || getTime(a.createdAt) || 0;
    const bTime = getTime(b.issueDate) || getTime(b.createdAt) || 0;
    return bTime - aTime;
  });

export default function CertificationsTab({
  employee,
}: CertificationsTabProps) {
  const employeeId = employee?.id ?? employee?.employeeId ?? null;

  const [certifications, setCertifications] = useState<CertificationRecord[]>(
    () =>
      Array.isArray(employee?.certifications)
        ? employee.certifications.map((cert: any) => ({
            ...cert,
            status: (cert.status ?? "IN_PROGRESS") as CertificationStatus,
          }))
        : []
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState<CertificationInput | null>(
    null
  );
  const [certificationToDelete, setCertificationToDelete] =
    useState<CertificationRecord | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (Array.isArray(employee?.certifications)) {
      setCertifications(
        sortCertifications(
          employee.certifications.map((cert: any) => ({
            ...cert,
            status: (cert.status ?? "IN_PROGRESS") as CertificationStatus,
          }))
        )
      );
    }
  }, [employee?.certifications]);

  const formatDate = (value?: string | Date | null) => {
    if (!value) return "—";
    const asDate = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(asDate.getTime())) return "—";
    return asDate.toLocaleDateString();
  };

  const handleAddEntry = () => {
    setModalInitial(null);
    setIsModalOpen(true);
  };

  const handleEdit = (cert: CertificationRecord) => {
    setModalInitial({
      id: cert.id,
      title: cert.title ?? "",
      issuedBy: cert.issuedBy ?? "",
      issueDate: cert.issueDate ?? null,
      expiryDate: cert.expiryDate ?? null,
      status: cert.status ?? "IN_PROGRESS",
      verificationUrl: cert.verificationUrl ?? "",
    });
    setIsModalOpen(true);
  };

  const handleCertificationSaved = (saved?: CertificationRecord) => {
    if (!saved) return;
    setCertifications((prev) => {
      const sanitized: CertificationRecord = {
        ...saved,
        status: (saved.status ?? "IN_PROGRESS") as CertificationStatus,
      };
      const existingIndex = prev.findIndex((item) => item.id === sanitized.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = sanitized;
        return sortCertifications(next);
      }
      return sortCertifications([sanitized, ...prev]);
    });
  };

  const handleDelete = (cert: CertificationRecord) => {
    setCertificationToDelete(cert);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!certificationToDelete) return;

    try {
      setDeleteLoading(true);
      const response = await fetch(
        `/api/certifications/${certificationToDelete.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete certification");
      }

      setCertifications((prev) =>
        prev.filter((item) => item.id !== certificationToDelete.id)
      );
      toast.success("Certification deleted");
      setShowDeleteModal(false);
      setCertificationToDelete(null);
    } catch (error: any) {
      console.error("Delete certification error", error);
      toast.error(error?.message || "Failed to delete certification");
    } finally {
      setDeleteLoading(false);
    }
  };

  const statusSummary = useMemo(() => STATUS_LABELS, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AcademicCapIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-600">
              Certifications
            </h3>
          </div>
          <button
            onClick={handleAddEntry}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
            type="button"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Entry</span>
          </button>
        </div>

        <div className="overflow-x-auto mt-6">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 tracking-wide">
                <th className="py-2 text-left">Certification Title</th>
                <th className="py-2 text-left">Issued By</th>
                <th className="py-2 text-left">Issue Date</th>
                <th className="py-2 text-left">Expiry Date</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-left">Verification Link</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {certifications.length > 0 ? (
                certifications.map((cert) => {
                  const status = (cert.status ??
                    "IN_PROGRESS") as CertificationStatus;
                  return (
                    <tr
                      key={cert.id}
                      className="border-b border-gray-200 last:border-0 text-sm text-gray-700"
                    >
                      <td className="py-3 align-top">
                        <div className="font-medium text-gray-900">
                          {cert.title}
                        </div>
                      </td>
                      <td className="py-3 align-top">
                        {cert.issuedBy ? cert.issuedBy : "—"}
                      </td>
                      <td className="py-3 align-top">
                        {formatDate(cert.issueDate)}
                      </td>
                      <td className="py-3 align-top">
                        {formatDate(cert.expiryDate)}
                      </td>
                      <td className="py-3 align-top">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            STATUS_STYLES[status] || STATUS_STYLES.IN_PROGRESS
                          }`}
                        >
                          {statusSummary[status] || status}
                        </span>
                      </td>
                      <td className="py-3 align-top">
                        {cert.verificationUrl ? (
                          <a
                            href={cert.verificationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            View Link
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Not provided
                          </span>
                        )}
                      </td>
                      <td className="py-3 align-top text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleEdit(cert)}
                            className="text-blue-600 hover:text-blue-900 p-1 cursor-pointer"
                            type="button"
                            title="Edit certification"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cert)}
                            className="text-red-600 hover:text-red-900 p-1 cursor-pointer"
                            type="button"
                            title="Delete certification"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No certification entries have been added.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CertificationFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleCertificationSaved}
        initial={modalInitial}
        employeeId={employeeId ?? undefined}
      />

      {showDeleteModal && certificationToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Certification
                </h3>
                <button
                  onClick={() => {
                    if (deleteLoading) return;
                    setShowDeleteModal(false);
                    setCertificationToDelete(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  disabled={deleteLoading}
                  type="button"
                >
                  ✕
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
                    Delete certification entry?
                  </h4>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to delete "
                    {certificationToDelete.title}"? This action cannot be
                    undone.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setCertificationToDelete(null);
                  }}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  type="button"
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
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        ></path>
                      </svg>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete</span>
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
