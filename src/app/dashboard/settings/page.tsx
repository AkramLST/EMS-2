"use client";

import { useEffect, useState } from "react";
import {
  CogIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface Department {
  id: string;
  name: string;
  description: string;
  employeeCount: number;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [userProfile, setUserProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bio: "",
  });

  // Security form states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeTab === "profile") {
      fetchUserProfile();
    }
  }, [activeTab]);

  const fetchUserProfile = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const employee = data.user.employee;
        setUserProfile({
          firstName: employee?.firstName || "",
          lastName: employee?.lastName || "",
          email: data.user.email || "",
          phone: employee?.phone || "",
          bio: employee?.bio || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    // Check if new password is same as current password
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    setPasswordUpdating(true);

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Password updated successfully");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        });
      } else {
        toast.error(data.message || "Failed to update password");
      }
    } catch (error) {
      console.error("Password update error:", error);
      toast.error("An error occurred while updating password");
    } finally {
      setPasswordUpdating(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userProfile),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Profile updated successfully");
      } else {
        toast.error(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("An error occurred while updating profile");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "notifications", name: "Notifications", icon: BellIcon },
    { id: "security", name: "Security", icon: ShieldCheckIcon },
    { id: "profile", name: "Profile", icon: UserIcon },
  ];

  // Remove the loading state that was causing the page to show nothing
  // The loading state was preventing the page from rendering properly

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      </div>

      {/* Settings Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-6 border-b-2 font-medium text-sm whitespace-nowrap flex items-center ${
                  activeTab === tab.id
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Notification Settings
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Email Notifications
                    </h4>
                    <p className="text-sm text-gray-500">
                      Receive email notifications for important updates
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 rounded"
                    defaultChecked
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Leave Approvals
                    </h4>
                    <p className="text-sm text-gray-500">
                      Get notified when leave requests need approval
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 rounded"
                    defaultChecked
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Birthday Reminders
                    </h4>
                    <p className="text-sm text-gray-500">
                      Receive reminders for employee birthdays
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Security Settings
              </h3>

              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">
                    Change Password
                  </h4>
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Current Password{" "}
                        <span className="required-asterisk">*</span>
                      </label>
                      <input
                        type="password"
                        className="mt-1 input"
                        required
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({
                            ...prev,
                            currentPassword: e.target.value,
                          }))
                        }
                        placeholder="Enter your current password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        New Password{" "}
                        <span className="required-asterisk">*</span>
                      </label>
                      <input
                        type="password"
                        className="mt-1 input"
                        required
                        minLength={6}
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                        }
                        placeholder="Enter new password (min 6 characters)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Confirm New Password{" "}
                        <span className="required-asterisk">*</span>
                      </label>
                      <input
                        type="password"
                        className="mt-1 input"
                        required
                        value={passwordForm.confirmNewPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({
                            ...prev,
                            confirmNewPassword: e.target.value,
                          }))
                        }
                        placeholder="Confirm your new password"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={passwordUpdating}
                      className={`btn-primary ${
                        passwordUpdating ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {passwordUpdating ? "Updating..." : "Update Password"}
                    </button>
                  </form>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">
                    Two-Factor Authentication
                  </h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Add an extra layer of security to your account
                  </p>
                  <button className="btn-outline">Enable 2FA</button>
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Profile Settings
              </h3>

              <form
                onSubmit={handleProfileUpdate}
                className="grid grid-cols-1 gap-6 sm:grid-cols-2"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    className="mt-1 input"
                    value={userProfile.firstName}
                    onChange={(e) =>
                      setUserProfile((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="mt-1 input"
                    value={userProfile.lastName}
                    onChange={(e) =>
                      setUserProfile((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    className="mt-1 input"
                    value={userProfile.email}
                    onChange={(e) =>
                      setUserProfile((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="john.doe@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    className="mt-1 input"
                    value={userProfile.phone}
                    onChange={(e) =>
                      setUserProfile((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Bio
                  </label>
                  <textarea
                    rows={3}
                    className="mt-1 input"
                    value={userProfile.bio}
                    onChange={(e) =>
                      setUserProfile((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                    placeholder="Tell us about yourself..."
                  ></textarea>
                </div>
              </form>

              <div className="flex justify-end">
                <button
                  onClick={handleProfileUpdate}
                  disabled={saving}
                  className={`btn-primary ${
                    saving ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
