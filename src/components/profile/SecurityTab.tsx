"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export default function SecurityTab() {
  const [formState, setFormState] = useState<PasswordFormState>({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof PasswordFormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const resetForm = () => {
    setFormState({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.currentPassword || !formState.newPassword) {
      toast.error("All fields are required");
      return;
    }

    if (formState.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    if (formState.newPassword === formState.currentPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    if (formState.newPassword !== formState.confirmNewPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: formState.currentPassword,
          newPassword: formState.newPassword,
          confirmNewPassword: formState.confirmNewPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to update password");
        return;
      }

      toast.success("Password updated successfully");
      resetForm();
    } catch (error) {
      console.error("Failed to update password:", error);
      toast.error("An unexpected error occurred while updating password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-900">Security</h3>
        <p className="text-sm text-gray-500">
          Update your account password to keep your profile secure.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Current Password <span className="required-asterisk">*</span>
          </label>
          <input
            type="password"
            className="mt-1 input"
            value={formState.currentPassword}
            onChange={handleChange("currentPassword")}
            placeholder="Enter your current password"
            required
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New Password <span className="required-asterisk">*</span>
            </label>
            <input
              type="password"
              className="mt-1 input"
              minLength={6}
              value={formState.newPassword}
              onChange={handleChange("newPassword")}
              placeholder="Enter a new password"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm New Password <span className="required-asterisk">*</span>
            </label>
            <input
              type="password"
              className="mt-1 input"
              value={formState.confirmNewPassword}
              onChange={handleChange("confirmNewPassword")}
              placeholder="Re-enter the new password"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="btn-outline"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`btn-primary ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
