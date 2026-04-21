"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  BellAlertIcon,
  EnvelopeOpenIcon,
  InboxIcon,
  TrashIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon as EnvelopeOpenSolidIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [accessDenied, setAccessDenied] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [readToggleLoadingId, setReadToggleLoadingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUserRoleAndFetchData = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const { user } = await response.json();
          if (user && user.role === 'ADMINISTRATOR') {
            setAccessDenied(false);
            fetchNotifications();
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

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationReadState = async (
    notificationId: string,
    nextState: boolean
  ) => {
    setReadToggleLoadingId(notificationId);
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead: nextState }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, isRead: nextState } : notif
          )
        );
      }
    } catch (error) {
      console.error("Failed to update notification state:", error);
      toast.error("Failed to update notification");
    } finally {
      setReadToggleLoadingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkAllLoading(true);
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
        toast.success("All notifications marked as read");
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      toast.error("Failed to mark all notifications as read");
    } finally {
      setMarkAllLoading(false);
    }
  };

  const openDeleteModal = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowDeleteModal(true);
  };

  const confirmDeleteNotification = async () => {
    if (!selectedNotification) {
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/notifications/${selectedNotification.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.filter((notif) => notif.id !== selectedNotification.id)
        );
        toast.success("Notification deleted");
        setShowDeleteModal(false);
        setSelectedNotification(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete notification");
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("Failed to delete notification");
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmBulkDelete = async () => {
    setBulkDeleteLoading(true);
    try {
      const response = await fetch("/api/notifications/delete-read", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((notif) => !notif.isRead));
        toast.success("Read notifications deleted");
        setShowBulkDeleteModal(false);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete read notifications");
      }
    } catch (error) {
      console.error("Failed to delete read notifications:", error);
      toast.error("Failed to delete read notifications");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Function to get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "LEAVE_REQUEST":
        return "📋";
      case "LEAVE_APPROVED":
        return "✅";
      case "LEAVE_REJECTED":
        return "❌";
      default:
        return "🔔";
    }
  };

  const formatTypeLabel = (type: string) =>
    type
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const getTypeBadgeClasses = (type: string) => {
    if (type === "LEAVE_REQUEST") {
      return "bg-blue-100 text-blue-700";
    }
    if (type === "LEAVE_APPROVED") {
      return "bg-emerald-100 text-emerald-700";
    }
    if (type === "LEAVE_REJECTED") {
      return "bg-rose-100 text-rose-700";
    }
    return "bg-slate-100 text-slate-600";
  };

  const unreadCount = useMemo(
    () => notifications.filter((notif) => !notif.isRead).length,
    [notifications]
  );
  const readCount = notifications.length - unreadCount;
  const lastReceived = notifications.length > 0 ? new Date(notifications[0].createdAt) : null;
  const lastReceivedLabel = lastReceived ? lastReceived.toLocaleString() : null;

  const summaryItems = useMemo(
    () => [
      {
        title: "Unread notifications",
        value: unreadCount,
        subtitle: unreadCount === 0 ? "You're all caught up" : "Requires your attention",
        icon: BellAlertIcon,
        iconClasses: "bg-amber-100 text-amber-600",
      },
      {
        title: "Read notifications",
        value: readCount,
        subtitle: readCount === 0 ? "Nothing archived yet" : "Archived for reference",
        icon: EnvelopeOpenIcon,
        iconClasses: "bg-emerald-100 text-emerald-600",
      },
      {
        title: "Total notifications",
        value: notifications.length,
        subtitle: lastReceivedLabel ? `Latest: ${lastReceivedLabel}` : "No notifications yet",
        icon: InboxIcon,
        iconClasses: "bg-blue-100 text-blue-600",
      },
    ],
    [lastReceivedLabel, notifications.length, readCount, unreadCount]
  );

  const allRead = unreadCount === 0;
  const hasRead = readCount > 0;

  if (!authChecked || loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="bg-gray-200 h-96 rounded"></div>
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
                Notifications Access Restricted
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  You do not have permission to access notifications.
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">Stay on top of your latest updates and actions.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="btn-secondary text-sm"
            disabled={allRead || markAllLoading}
          >
            {markAllLoading ? "Marking..." : "Mark All Read"}
          </button>
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="btn-danger text-sm"
            disabled={!hasRead}
          >
            Delete Read
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {summaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {item.title}
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">
                    {item.value}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{item.subtitle}</p>
                </div>
                <span className={`flex h-12 w-12 items-center justify-center rounded-full ${item.iconClasses}`}>
                  <Icon className="h-6 w-6" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No notifications
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have any notifications yet.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                onClick={() => {
                  const isLeaveNotification =
                    notification.type === "LEAVE_REQUEST" ||
                    notification.type === "LEAVE_APPROVED" ||
                    notification.type === "LEAVE_REJECTED";

                  if (!notification.isRead && readToggleLoadingId !== notification.id) {
                    updateNotificationReadState(notification.id, true);
                  }

                  if (isLeaveNotification) {
                    router.push("/dashboard/leave");
                  }
                }}
                className={`group rounded-2xl border ${
                  notification.isRead
                    ? "border-gray-100 bg-white"
                    : "border-blue-100 bg-blue-50/60"
                } shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer`}
              >
                <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-1 gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4
                          className={`text-base font-semibold ${
                            notification.isRead ? "text-gray-800" : "text-gray-900"
                          }`}
                        >
                          {notification.title}
                        </h4>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${getTypeBadgeClasses(
                            notification.type
                          )}`}
                        >
                          {formatTypeLabel(notification.type)}
                        </span>
                        {!notification.isRead && (
                          <span className="flex items-center gap-1 rounded-full bg-blue-600/10 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed text-gray-600">
                        {notification.message}
                      </p>
                      <p className="text-xs font-medium text-gray-400">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        updateNotificationReadState(
                          notification.id,
                          !notification.isRead
                        );
                      }}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                        notification.isRead
                          ? "border-blue-100 bg-blue-50 text-blue-600 hover:border-blue-200 hover:bg-blue-100"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
                      }`}
                      disabled={readToggleLoadingId === notification.id}
                      title={
                        readToggleLoadingId === notification.id
                          ? "Updating"
                          : notification.isRead
                          ? "Mark as unread"
                          : "Mark as read"
                      }
                    >
                      {readToggleLoadingId === notification.id ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></span>
                      ) : notification.isRead ? (
                        <EnvelopeIcon className="h-4 w-4" />
                      ) : (
                        <EnvelopeOpenSolidIcon className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        openDeleteModal(notification);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600 transition hover:border-red-200 hover:bg-red-100"
                      title="Delete notification"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showDeleteModal && selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Delete notification</h2>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete "{selectedNotification.title}"? This action cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!deleteLoading) {
                    setShowDeleteModal(false);
                    setSelectedNotification(null);
                  }
                }}
                className="btn-outline"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteNotification}
                className="btn-danger"
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Delete read notifications</h2>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete all read notifications? This action cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!bulkDeleteLoading) {
                    setShowBulkDeleteModal(false);
                  }
                }}
                className="btn-outline"
                disabled={bulkDeleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBulkDelete}
                className="btn-danger"
                disabled={bulkDeleteLoading}
              >
                {bulkDeleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
