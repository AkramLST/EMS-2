"use client";

import { useState, useEffect } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

interface NotificationCounterProps {
  title?: string;
  className?: string;
}

export default function NotificationCounter({
  title = "Notifications",
  className = ""
}: NotificationCounterProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "LEAVE_REQUEST":
        return "📋";
      case "LEAVE_APPROVED":
        return "✅";
      case "LEAVE_REJECTED":
        return "❌";
      case "ATTENDANCE_REMINDER":
        return "⏰";
      case "SYSTEM":
        return "🔔";
      default:
        return "📬";
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/notifications", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const unread = data.notifications?.filter((n: any) => !n.isRead).length || 0;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Failed to fetch notification count:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white overflow-hidden shadow rounded-lg ${className}`}>
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/dashboard/notifications"
      className={`bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer ${className}`}
    >
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <BellIcon className="h-8 w-8 text-blue-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">
                {unreadCount === 0
                  ? "No new notifications"
                  : `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <div className="text-gray-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
