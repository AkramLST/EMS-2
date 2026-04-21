"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export interface WorkExperienceInput {
  id?: string;
  title: string;
  companyName?: string | null;
  employmentType?: string | null;
  location?: string | null;
  startDate: string; // yyyy-mm-dd
  endDate?: string | null; // yyyy-mm-dd
  isCurrent?: boolean;
  changeReason?: string | null;
  description?: string | null;
}

interface WorkExperienceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (experience?: any) => void;
  initial?: WorkExperienceInput | null;
  employeeId?: string;
}

const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERN", label: "Intern" },
];

const defaultForm: WorkExperienceInput = {
  title: "",
  companyName: "",
  employmentType: "FULL_TIME",
  location: "",
  startDate: "",
  endDate: "",
  isCurrent: true,
  changeReason: "",
  description: "",
};

const toDateInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export default function WorkExperienceFormModal({
  isOpen,
  onClose,
  onSaved,
  initial,
  employeeId,
}: WorkExperienceFormModalProps) {
  const [form, setForm] = useState<WorkExperienceInput>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(initial?.id);

  useEffect(() => {
    if (!isOpen) return;

    if (initial) {
      setForm({
        id: initial.id,
        title: initial.title || "",
        companyName: initial.companyName ?? "",
        employmentType: initial.employmentType || "FULL_TIME",
        location: initial.location ?? "",
        startDate: toDateInput(initial.startDate) || "",
        endDate: initial.isCurrent ? "" : toDateInput(initial.endDate) || "",
        isCurrent: initial.isCurrent ?? !initial.endDate,
        changeReason: initial.changeReason ?? "",
        description: initial.description ?? "",
      });
    } else {
      setForm(defaultForm);
    }
    setErrors({});
  }, [initial, isOpen]);

  const modalTitle = useMemo(
    () => (isEditing ? "Edit Work Experience" : "Add Work Experience"),
    [isEditing]
  );

  if (!isOpen) return null;

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) {
      nextErrors.title = "Role / Title is required";
    }
    if (!form.startDate) {
      nextErrors.startDate = "Start date is required";
    }
    if (!form.isCurrent && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
        nextErrors.endDate = "End date cannot be before start date";
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
        companyName: form.companyName?.trim() || null,
        location: form.location?.trim() || null,
        employmentType: form.employmentType || null,
        startDate: form.startDate,
        endDate: form.isCurrent ? null : form.endDate || null,
        isCurrent: form.isCurrent,
        changeReason: form.changeReason?.trim() || null,
        description: form.description?.trim() || null,
      };

      if (employeeId) {
        payload.employeeId = employeeId;
      }

      let response: Response;

      if (form.id) {
        response = await fetch(`/api/work-experience/${form.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch("/api/work-experience", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save work experience");
      }

      const data = await response.json();
      onSaved(data.workExperience);
      toast.success(form.id ? "Work experience updated" : "Work experience added");
      onClose();
    } catch (error: any) {
      console.error("Save work experience error", error);
      const message = error?.message || "Failed to save work experience";
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
          <h3 className="text-lg font-semibold text-gray-900">{modalTitle}</h3>
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
                Role / Title<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className={`input w-full ${errors.title ? "border-red-300" : ""}`}
                placeholder="e.g. Senior Frontend Developer"
              />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Company</label>
              <input
                type="text"
                value={form.companyName ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, companyName: event.target.value }))
                }
                className="input w-full"
                placeholder="e.g. Acme Corp"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Employment Type</label>
              <select
                value={form.employmentType ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, employmentType: event.target.value || null }))
                }
                className="input w-full"
              >
                {EMPLOYMENT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                value={form.location ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                className="input w-full"
                placeholder="e.g. Islamabad"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Start Date<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                className={`input w-full ${errors.startDate ? "border-red-300" : ""}`}
              />
              {errors.startDate && <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={form.isCurrent ? "" : form.endDate ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, endDate: event.target.value, isCurrent: !event.target.value }))
                }
                className={`input w-full ${errors.endDate ? "border-red-300" : ""}`}
                disabled={form.isCurrent}
              />
              {errors.endDate && <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>}
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="work-current-role"
                  type="checkbox"
                  checked={form.isCurrent ?? false}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isCurrent: event.target.checked, endDate: event.target.checked ? "" : prev.endDate }))
                  }
                />
                <label htmlFor="work-current-role" className="text-sm text-gray-600">
                  I currently work in this role
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Highlights / Change Reason</label>
            <textarea
              rows={3}
              value={form.changeReason ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, changeReason: event.target.value }))
              }
              className="input w-full"
              placeholder="e.g. Promoted due to outstanding performance"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={4}
              value={form.description ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              className="input w-full"
              placeholder="Brief summary of responsibilities, achievements, or projects"
            />
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
