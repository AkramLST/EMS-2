"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClockIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  UserIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  BellIcon,
  CakeIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { getCookie } from "@/lib/cookies";

interface EmployeeStats {
  attendanceThisMonth: number;
  leaveBalance: number;
  pendingLeaves: number;
  upcomingTraining: number;
  teamSize: number;
  departmentName: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  createdAt: string;
}

export default function EmployeeDashboard() {
  const [stats, setStats] = useState<EmployeeStats>({
    attendanceThisMonth: 0,
    leaveBalance: 0,
    pendingLeaves: 0,
    upcomingTraining: 0,
    teamSize: 0,
    departmentName: "",
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCurrentlyWorking, setIsCurrentlyWorking] = useState(false);
  const [clockedInTime, setClockedInTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    fetchEmployeeData();
    fetchAttendanceStatus();
  }, []);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchEmployeeData = async () => {
    try {
      const [statsRes, announcementsRes] = await Promise.all([
        fetch("/api/dashboard/employee-stats", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }),
        fetch("/api/announcements?active=true&limit=3", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (announcementsRes.ok) {
        const data = await announcementsRes.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error("Failed to fetch employee data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStatus = async () => {
    try {
      const response = await fetch("/api/attendance/status", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsCurrentlyWorking(data.isCurrentlyWorking || false);
        setClockedInTime(
          data.clockedInTime ? new Date(data.clockedInTime) : null
        );
      }
    } catch (error) {
      console.error("Failed to fetch attendance status:", error);
    }
  };

  const handleClockIn = async () => {
    setAttendanceLoading(true);
    try {
      const clockInDateTime = new Date();

      const response = await fetch("/api/attendance/clock-in", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clockIn: clockInDateTime.toISOString(),
        }),
      });

      if (response.ok) {
        setClockedInTime(clockInDateTime);
        setIsCurrentlyWorking(true);
        toast.success(
          `Clocked in successfully at ${clockInDateTime.toLocaleTimeString()}`
        );
        await fetchAttendanceStatus();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to clock in");
      }
    } catch (error) {
      console.error("Clock in failed:", error);
      toast.error("Failed to clock in");
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleClockOut = async () => {
    setAttendanceLoading(true);
    try {
      const clockOutDateTime = new Date();

      const response = await fetch("/api/attendance/clock-out", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clockOut: clockOutDateTime.toISOString(),
        }),
      });

      if (response.ok) {
        setClockedInTime(null);
        setIsCurrentlyWorking(false);
        toast.success(
          `Clocked out successfully at ${clockOutDateTime.toLocaleTimeString()}`
        );
        await fetchAttendanceStatus();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to clock out");
      }
    } catch (error) {
      console.error("Clock out failed:", error);
      toast.error("Failed to clock out");
    } finally {
      setAttendanceLoading(false);
    }
  };

  const getElapsedTime = () => {
    if (!clockedInTime) return "00:00:00";

    const now = currentTime;
    const diff = now.getTime() - clockedInTime.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            👋 Employee Dashboard
          </h1>
          <p className="text-gray-600">{stats.departmentName} Department</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/dashboard/leave"
            className="btn-primary flex items-center"
          >
            <CalendarDaysIcon className="h-5 w-5 mr-2" />
            Apply Leave
          </Link>
          <Link
            href="/dashboard/profile"
            className="btn-outline flex items-center"
          >
            <UserIcon className="h-5 w-5 mr-2" />
            My Profile
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <ClockIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Attendance This Month
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.attendanceThisMonth} days
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <CalendarDaysIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Leave Balance</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.leaveBalance} days
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <DocumentTextIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Pending Leaves
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.pendingLeaves}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <AcademicCapIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Upcoming Training
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.upcomingTraining}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          🕐 Quick Attendance
        </h3>

        {/* Clock In/Out Status */}
        <div className="mb-4">
          {isCurrentlyWorking && clockedInTime ? (
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-700 mb-2">
                You're clocked in since:
              </div>
              <div className="text-2xl font-bold text-green-800 font-mono mb-2">
                {formatTime(clockedInTime)}
              </div>
              <div className="text-lg font-semibold text-green-700 font-mono bg-white py-2 px-4 rounded border">
                {getElapsedTime()}
              </div>
              <div className="text-xs text-green-600 mt-1">
                Real-time Working Timer
              </div>
            </div>
          ) : (
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600 mb-2">
                Ready to start your day?
              </div>
              <div className="text-lg font-medium text-gray-800">
                Clock in to track your time
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isCurrentlyWorking ? (
            <button
              onClick={handleClockIn}
              disabled={attendanceLoading}
              className="w-full btn-primary flex items-center justify-center space-x-2"
            >
              <ClockIcon className="h-5 w-5" />
              <span>{attendanceLoading ? "Clocking In..." : "Clock In"}</span>
            </button>
          ) : (
            <button
              onClick={handleClockOut}
              disabled={attendanceLoading}
              className="w-full btn-secondary flex items-center justify-center space-x-2"
            >
              <ClockIcon className="h-5 w-5" />
              <span>{attendanceLoading ? "Clocking Out..." : "Clock Out"}</span>
            </button>
          )}

          <Link
            href="/dashboard/attendance"
            className="w-full btn-outline flex items-center justify-center space-x-2"
          >
            <ChartBarIcon className="h-5 w-5" />
            <span>View Full Attendance</span>
          </Link>
        </div>
      </div>

      {/* Announcements */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <BellIcon className="h-5 w-5 mr-2" />
          Company Announcements
        </h3>
        <div className="space-y-3">
          {announcements.length > 0 ? (
            announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="border-l-4 border-primary-500 pl-4 py-2"
              >
                <h4 className="text-sm font-medium text-gray-900">
                  {announcement.title}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {announcement.content}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(announcement.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <BellIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No announcements</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/dashboard/leave"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Leave Management
              </h3>
              <p className="text-sm text-gray-600">
                Apply for leave or check status
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/training"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <AcademicCapIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Training Programs
              </h3>
              <p className="text-sm text-gray-600">View available training</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/profile"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <UserIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">My Profile</h3>
              <p className="text-sm text-gray-600">
                Update personal information
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
