"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export type CertificationStatus =
  | "IN_PROGRESS"
  | "ACTIVE"
  | "EXPIRED"
  | "REVOKED";

export interface CertificationInput {
  id?: string;
  title: string;
  issuedBy?: string | null;
  issueDate?: string | null; // yyyy-mm-dd
  expiryDate?: string | null; // yyyy-mm-dd
  status: CertificationStatus;
  verificationUrl?: string | null;
}

interface CertificationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (certification?: any) => void;
  initial?: CertificationInput | null;
  employeeId?: string;
}

const STATUS_OPTIONS: { value: CertificationStatus; label: string }[] = [
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRED", label: "Expired" },
  { value: "REVOKED", label: "Revoked" },
];

const defaultForm: CertificationInput = {
  title: "",
  issuedBy: "",
  issueDate: "",
  expiryDate: "",
  status: "IN_PROGRESS",
  verificationUrl: "",
};

const toDateInput = (value?: string | Date | null) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export default function CertificationFormModal({
  isOpen,
  onClose,
  onSaved,
  initial,
  employeeId,
}: CertificationFormModalProps) {
  const [form, setForm] = useState<CertificationInput>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(initial?.id);

  useEffect(() => {
    if (!isOpen) return;

    if (initial) {
      setForm({
        id: initial.id,
        title: initial.title ?? "",
        issuedBy: initial.issuedBy ?? "",
        issueDate: toDateInput(initial.issueDate),
        expiryDate: toDateInput(initial.expiryDate),
        status: initial.status ?? "IN_PROGRESS",
        verificationUrl: initial.verificationUrl ?? "",
      });
    } else {
      setForm(defaultForm);
    }
    setErrors({});
  }, [initial, isOpen]);

  const modalTitle = useMemo(
    () => (isEditing ? "Edit Certification" : "Add Certification"),
    [isEditing]
  );

  if (!isOpen) {
    return null;
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) {
      nextErrors.title = "Certification title is required";
    }
    if (form.issueDate && form.expiryDate) {
      const issue = new Date(form.issueDate);
      const expiry = new Date(form.expiryDate);
      if (
        !Number.isNaN(issue.getTime()) &&
        !Number.isNaN(expiry.getTime()) &&
        expiry < issue
      ) {
        nextErrors.expiryDate = "Expiry date cannot be before issue date";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      const payload: Record<string, any> = {
        title: form.title.trim(),
        issuedBy: form.issuedBy?.trim() || null,
        issueDate: form.issueDate || null,
        expiryDate: form.expiryDate || null,
        status: form.status,
        verificationUrl: form.verificationUrl?.trim() || null,
      };

      if (employeeId) {
        payload.employeeId = employeeId;
      }

      let response: Response;

      if (form.id) {
        response = await fetch(`/api/certifications/${form.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch("/api/certifications", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save certification");
      }

      const data = await response.json();
      onSaved(data.certification);
      toast.success(form.id ? "Certification updated" : "Certification added");
      onClose();
    } catch (error: any) {
      console.error("Save certification error", error);
      const message = error?.message || "Failed to save certification";
      toast.error(message);
      setErrors((prev) => ({ ...prev, general: message }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg(font-semibold text-gray-900)">{modalTitle}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 transition hover:text-gray-800"
            disabled={saving}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-6 py-5 space-y-5">
          {errors.general && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Certification Title<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                className={`input w-full ${errors.title ? "border-red-300" : ""}`}
                placeholder="e.g. AWS Solutions Architect Associate"
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-600">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Issued By
              </label>
              <input
                type="text"
                value={form.issuedBy ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, issuedBy: event.target.value }))
                }
                className="input w-full"
                placeholder="e.g. Amazon Web Services"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as CertificationStatus,
                  }))
                }
                className="input w-full"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Issue Date
              </label>
              <input
                type="date"
                value={form.issueDate ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, issueDate: event.target.value }))
                }
                className="input w-full"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Expiry Date
              </label>
              <input
                type="date"
                value={form.expiryDate ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, expiryDate: event.target.value }))
                }
                className={`input w-full ${errors.expiryDate ? "border-red-300" : ""}`}
              />
              {errors.expiryDate && (
                <p className="mt-1 text-xs text-red-600">{errors.expiryDate}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Verification Link
              </label>
              <input
                type="url"
                value={form.verificationUrl ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    verificationUrl: event.target.value,
                  }))
                }
                className="input w-full"
                placeholder="https://"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={saving}
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`btn btn-primary ${saving ? "opacity-50" : ""}`}
            type="button"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
