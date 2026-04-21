"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

export type PassportInput = {
  id?: string;
  number: string;
  issuedDate: string; // yyyy-mm-dd
  expiryDate: string; // yyyy-mm-dd
  issuingCountry: string;
};

interface PassportFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (passport: any) => void;
  initial?: PassportInput | null;
  employeeId?: string; // when admin/hr editing someone else
}

const countries = [
  "Pakistan",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Saudi Arabia",

  "Other",
];

export default function PassportFormModal({
  isOpen,
  onClose,
  onSaved,
  initial,
  employeeId,
}: PassportFormModalProps) {
  const [form, setForm] = useState<PassportInput>({
    number: "",
    issuedDate: "",
    expiryDate: "",
    issuingCountry: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        id: initial.id,
        number: initial.number || "",
        issuedDate: (initial.issuedDate || "").split("T")[0] || "",
        expiryDate: (initial.expiryDate || "").split("T")[0] || "",
        issuingCountry: initial.issuingCountry || "",
      });
    } else {
      setForm({
        number: "",
        issuedDate: "",
        expiryDate: "",
        issuingCountry: "",
      });
      setErrors({});
    }
  }, [initial, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.number.trim()) e.number = "Required";
    if (!form.issuedDate) e.issuedDate = "Required";
    if (!form.expiryDate) e.expiryDate = "Required";
    if (!form.issuingCountry) e.issuingCountry = "Required";

    // basic date check
    if (
      form.issuedDate &&
      form.expiryDate &&
      new Date(form.expiryDate) < new Date(form.issuedDate)
    ) {
      e.expiryDate = "Expiry must be after issued date";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const payload: any = {
        number: form.number.trim(),
        issuedDate: form.issuedDate,
        expiryDate: form.expiryDate,
        issuingCountry: form.issuingCountry,
      };
      if (employeeId) payload.employeeId = employeeId;

      let res: Response;
      if (form.id) {
        res = await fetch(`/api/passports/${form.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/passports", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to save passport");
      }

      const data = await res.json();
      toast.success(
        form.id
          ? "Passport updated successfully"
          : "Passport added successfully"
      );
      onSaved(data.passport);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save passport");
      setErrors({ general: err.message || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {form.id ? "Edit Passport" : "Add Passports Item"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-auto">
          {errors.general && (
            <div className="text-sm text-red-600">{errors.general}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passport Number*
            </label>
            <input
              type="text"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
              className={`input w-full ${
                errors.number ? "border-red-300" : ""
              }`}
              placeholder="e.g. AF1234567"
            />
            {errors.number && (
              <p className="text-xs text-red-600 mt-1">{errors.number}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issued Date*
              </label>
              <input
                type="date"
                value={form.issuedDate}
                onChange={(e) =>
                  setForm({ ...form, issuedDate: e.target.value })
                }
                className={`input w-full ${
                  errors.issuedDate ? "border-red-300" : ""
                }`}
              />
              {errors.issuedDate && (
                <p className="text-xs text-red-600 mt-1">{errors.issuedDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date*
              </label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) =>
                  setForm({ ...form, expiryDate: e.target.value })
                }
                className={`input w-full ${
                  errors.expiryDate ? "border-red-300" : ""
                }`}
              />
              {errors.expiryDate && (
                <p className="text-xs text-red-600 mt-1">{errors.expiryDate}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issuing Country*
            </label>
            <select
              value={form.issuingCountry}
              onChange={(e) =>
                setForm({ ...form, issuingCountry: e.target.value })
              }
              className={`input w-full ${
                errors.issuingCountry ? "border-red-300" : ""
              }`}
            >
              <option value="">--Select--</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.issuingCountry && (
              <p className="text-xs text-red-600 mt-1">
                {errors.issuingCountry}
              </p>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`btn btn-primary ${saving ? "opacity-50" : ""}`}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
