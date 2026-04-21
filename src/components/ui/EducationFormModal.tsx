"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export type EducationInput = {
  id?: string;
  institution: string;
  degree: string;
  major?: string | null;
  gpa?: string | null;
  startDate?: string | null; // yyyy-mm-dd
  endDate?: string | null; // yyyy-mm-dd
  description?: string | null;
};

interface EducationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (education?: any) => void;
  initial?: EducationInput | null;
  employeeId?: string;
}

const defaultForm: EducationInput = {
  institution: "",
  degree: "",
  major: "",
  gpa: "",
  startDate: "",
  endDate: "",
  description: "",
};

export default function EducationFormModal({
  isOpen,
  onClose,
  onSaved,
  initial,
  employeeId,
}: EducationFormModalProps) {
  const [form, setForm] = useState<EducationInput>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initial) {
        setForm({
          id: initial.id,
          institution: initial.institution || "",
          degree: initial.degree || "",
          major: initial.major ?? "",
          gpa: initial.gpa ?? "",
          startDate: initial.startDate ? initial.startDate.split("T")[0] : "",
          endDate: initial.endDate ? initial.endDate.split("T")[0] : "",
          description: initial.description ?? "",
        });
      } else {
        setForm(defaultForm);
      }
      setErrors({});
    }
  }, [initial, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.institution.trim()) {
      nextErrors.institution = "Institution is required";
    }
    if (!form.degree.trim()) {
      nextErrors.degree = "Degree is required";
    }
    if (form.startDate && form.endDate) {
      if (new Date(form.endDate) < new Date(form.startDate)) {
        nextErrors.endDate = "End date must be after start date";
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
        institution: form.institution.trim(),
        degree: form.degree.trim(),
        major: form.major?.trim() || null,
        gpa: form.gpa?.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        description: form.description?.trim() || null,
      };

      if (employeeId) {
        payload.employeeId = employeeId;
      }

      let response: Response;
      if (form.id) {
        response = await fetch(`/api/education/${form.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch("/api/education", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save education record");
      }

      const data = await response.json();
      toast.success(form.id ? "Education updated successfully" : "Education added successfully");
      onSaved(data.education);
      onClose();
    } catch (error: any) {
      console.error("Save education error:", error);
      toast.error(error.message || "Failed to save education record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {form.id ? "Edit Education" : "Add Education"}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Institution*</label>
            <input
              type="text"
              value={form.institution}
              onChange={(e) => setForm((prev) => ({ ...prev, institution: e.target.value }))}
              className={`input w-full ${errors.institution ? "border-red-300" : ""}`}
              placeholder="e.g. Stanford University"
            />
            {errors.institution && <p className="text-xs text-red-600 mt-1">{errors.institution}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Degree*</label>
              <input
                type="text"
                value={form.degree}
                onChange={(e) => setForm((prev) => ({ ...prev, degree: e.target.value }))}
                className={`input w-full ${errors.degree ? "border-red-300" : ""}`}
                placeholder="e.g. Bachelor of Science"
              />
              {errors.degree && <p className="text-xs text-red-600 mt-1">{errors.degree}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Major / Specialization</label>
              <input
                type="text"
                value={form.major ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, major: e.target.value }))}
                className="input w-full"
                placeholder="e.g. Computer Science"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GPA</label>
              <input
                type="text"
                value={form.gpa ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, gpa: e.target.value }))}
                className="input w-full"
                placeholder="e.g. 3.8/4.0"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.startDate ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  className={`input w-full ${errors.startDate ? "border-red-300" : ""}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={form.endDate ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  className={`input w-full ${errors.endDate ? "border-red-300" : ""}`}
                />
                {errors.endDate && <p className="text-xs text-red-600 mt-1">{errors.endDate}</p>}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="input w-full"
              placeholder="Relevant coursework, honors, activities, etc."
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : form.id ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
