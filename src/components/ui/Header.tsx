"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bars3Icon, BellIcon } from "@heroicons/react/24/outline";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import DarkModeToggle from "./DarkModeToggle";
import GlobalSearch from "./GlobalSearch";
import NotificationDropdown from "./NotificationDropdown";
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { clearAuthTokenCookie } from "@/lib/cookies";
import { useUserSession } from "@/hooks/useUserSession";
import StatusIndicator, { UserStatus } from "./StatusIndicator";
import Avatar from "./Avatar";

interface HeaderProps {
  title: string;
  user: any;
}

export default function Header({ title, user }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Use the existing user session management hook
  const { userStatus } = useUserSession();

  // Fetch profile image when user changes
  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!user?.employee?.employeeId) {
        console.log('[Header] No employeeId found in user:', user);
        return;
      }
      
      console.log('[Header] Fetching image for employeeId:', user.employee.employeeId);
      
      try {
        const response = await fetch(`/api/employees/profile-image?employeeId=${encodeURIComponent(user.employee.employeeId)}`, {
          credentials: 'include',
          headers: {
            "Content-Type": "application/json",
          },
        });

        console.log('[Header] Response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('[Header] Response data:', data);
          if (data.imageUrl) {
            setProfileImage(data.imageUrl);
          }
        }
      } catch (error) {
        console.error('Failed to fetch profile image:', error);
      }
    };

    fetchProfileImage();
  }, [user?.employee?.employeeId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // Call the logout API endpoint
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Redirect to login page using Next.js router for better SPA experience
        router.push("/login");
      } else {
        // Fallback to clearing cookie directly and redirecting
        clearAuthTokenCookie();
        router.push("/login");
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback to clearing cookie directly and redirecting
      clearAuthTokenCookie();
      router.push("/login");
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Global Search */}
            <GlobalSearch />

            {/* Dark Mode Toggle */}
            <DarkModeToggle />

            {/* Notifications */}
            <NotificationDropdown />

            {/* User info with dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="relative">
                  <Avatar
                    employeeId={user?.employee?.id || user?.id || "current-user"}
                    employeeName={`${user?.employee?.firstName || ""} ${user?.employee?.lastName || ""}`}
                    profileImage={profileImage}
                    size="sm"
                    showLink={false}
                  />
                  {/* Status indicator positioned inside the circle */}
                  <div className="absolute bottom-0.5 right-0.5">
                    <StatusIndicator
                      status={userStatus?.status || "OFFLINE"}
                      size="sm"
                    />
                  </div>
                </div>
                <ChevronDownIcon
                  className={`h-4 w-4 text-gray-500 transition-transform ${
                    showDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.employee?.firstName?.charAt(0).toUpperCase() +
                        user?.employee?.firstName?.slice(1) || ""}{" "}
                      {user?.employee?.lastName?.charAt(0).toUpperCase() +
                        user?.employee?.lastName?.slice(1) || ""}
                    </p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      {typeof user?.employee?.designation === "string"
                        ? user.employee.designation
                        : user?.employee?.designation?.title ||
                          user?.role?.replace("_", " ")}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      router.push("/dashboard/profile");
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <UserIcon className="h-4 w-4 mr-3" />
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      handleLogout();
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-red-600"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
