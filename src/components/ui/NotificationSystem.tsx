"use client";

import { useEffect, useState } from "react";
import { BellIcon, XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  timestamp: Date;
  read: boolean;
}

export default function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Check for attendance reminders
    checkAttendanceReminders();
    
    // Set up periodic checks
    const interval = setInterval(checkAttendanceReminders, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const checkAttendanceReminders = async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Get office times
    const response = await fetch('/api/admin/office-times');
    const officeTimes = await response.json();
    
    const startHour = officeTimes?.startTime ? new Date(officeTimes.startTime).getHours() : 9;
    const endHour = officeTimes?.endTime ? new Date(officeTimes.endTime).getHours() : 18;

    // Morning check-in reminder (15 mins after office start)
    if (currentHour === startHour && currentMinute === 15) {
      addNotification({
        title: "Attendance Reminder",
        message: "Don't forget to clock in for today!",
        type: "warning"
      });
    }

    // End of day reminder (30 mins before office end)
    const endReminderHour = endHour;
    const endReminderMinute = 30; // 30 mins before
    if (currentHour === endReminderHour && currentMinute >= endReminderMinute) {
      addNotification({
        title: "Clock Out Reminder",
        message: "Remember to clock out before leaving!",
        type: "warning"
      });
    }

    // Absent marking (at office end time)
    if (currentHour === endHour && currentMinute === 0) {
      addNotification({
        title: "Attendance Status",
        message: "You've been marked absent for today",
        type: "warning"
      });
    }
  };

  const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep only 10 notifications
    toast(notification.message, {
      icon: notification.type === "warning" ? "⚠️" : notification.type === "error" ? "❌" : "ℹ️"
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning": return "⚠️";
      case "error": return "❌";
      case "success": return "✅";
      default: return "ℹ️";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "warning": return "border-l-yellow-500 bg-yellow-50";
      case "error": return "border-l-red-500 bg-red-50";
      case "success": return "border-l-green-500 bg-green-50";
      default: return "border-l-blue-500 bg-blue-50";
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <BellIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-l-4 ${getNotificationColor(notification.type)} ${
                    !notification.read ? "bg-opacity-100" : "bg-opacity-50"
                  } border-b border-gray-100 last:border-b-0`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <h4 className={`text-sm font-medium ${!notification.read ? "text-gray-900" : "text-gray-600"}`}>
                          {notification.title}
                        </h4>
                      </div>
                      <p className={`text-sm mt-1 ${!notification.read ? "text-gray-700" : "text-gray-500"}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-primary-600 hover:text-primary-800"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
