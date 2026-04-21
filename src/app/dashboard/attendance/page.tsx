"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import {
  ClockIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  ChevronDownIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import LeaveRequestForm from "@/components/ui/LeaveRequestForm";
import TeamMembersList from "@/components/ui/TeamMembersList";
import Avatar from "@/components/ui/Avatar";
import { getCookie } from "@/lib/cookies";
import Pagination from "@/components/ui/Pagination";
import { useRouter } from "next/navigation";

const LOCATION_VISIBLE_ROLES = new Set([
  "ADMINISTRATOR",
  "HR_MANAGER",
  "DEPARTMENT_MANAGER",
]);

const formatDecimalHours = (value: number) => {
  if (Number.isNaN(value)) {
    return "N/A";
  }

  const totalMinutes = Math.round(value * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
};

interface AttendanceRecord {
  id: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | string | null;
  status: string;
  notes?: string | null;
  clockInLatitude?: number | null;
  clockInLongitude?: number | null;
  clockInLocation?: string | null;
  clockInLocationSource?: "GPS" | "IP" | "MANUAL" | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    profileImage?: string | null;
    designation?: {
      title: string;
    } | null;
  };
}

interface User {
  id: string;
  role: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department?: {
    name: string;
  };
}

export default function AttendancePage() {
  const router = useRouter();
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [attendanceHistory, setAttendanceHistory] = useState<
    AttendanceRecord[]
  >([]);
  const [user, setUser] = useState<User | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [clockInLoading, setClockInLoading] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [clockInTime, setClockInTime] = useState("");
  const [clockOutTime, setClockOutTime] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("current_month");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);

  // Attendance stats for employees
  const [attendanceStats, setAttendanceStats] = useState({
    todayStatus: "Absent",
    todayPercentage: 0,
    averageHours: "0h 0mins",
    averageCheckIn: "00:00 AM",
    onTimePercentage: 0,
    averageCheckOut: "00:00 PM",
    monthlyStats: {
      onTime: 0,
      workFromHome: 0,
      lateAttendance: 0,
      absent: 0,
      onLeave: 0,
      holiday: 0,
      autoCheckout: 0,
      totalDays: 0,
    },
  });

  // Pagination state for attendance history
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalAttendanceHistory, setTotalAttendanceHistory] = useState(0);

  const canViewLocation = user ? LOCATION_VISIBLE_ROLES.has(user.role) : false;

  // Timer functionality - simplified
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockedInTime, setClockedInTime] = useState<Date | null>(null);
  const [isCurrentlyWorking, setIsCurrentlyWorking] = useState(false);
  // Office timings state (fetched from database)
  const [officeTimings, setOfficeTimings] = useState<{
    startTime: string;
    endTime: string;
  }>({ startTime: "--:--", endTime: "--:--" });

  // Register Chart.js components
  ChartJS.register(ArcElement, Tooltip, Legend);

  useEffect(() => {
    fetchUserData();
    checkCurrentAttendanceStatus();
    fetchOfficeTimings();

    // Real-time clock timer
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFilterDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      fetchAttendanceRecords();
      fetchAttendanceHistory();

      // Fetch attendance stats for all users
      fetchAttendanceStats();

      if (user.role === "EMPLOYEE") {
        setSelectedEmployeeId("");
      }

      // For admin users, ensure they start with empty selectedEmployeeId to view their own attendance
      if (
        user.role === "ADMINISTRATOR" ||
        user.role === "HR_MANAGER" ||
        user.role === "DEPARTMENT_MANAGER" ||
        user.role === "MANAGER"
      ) {
        // Only set to empty if it's not already set by user selection
        if (!selectedEmployeeId) {
          setSelectedEmployeeId("");
        }
      }

      // Fetch employees list for admin users
      if (
        (user.role === "ADMINISTRATOR" ||
          user.role === "HR_MANAGER" ||
          user.role === "DEPARTMENT_MANAGER" ||
          user.role === "MANAGER") &&
        employees.length === 0
      ) {
        fetchEmployees();
      }
    }
  }, [
    selectedDate,
    user,
    filterPeriod,
    selectedEmployeeId,
    currentPage,
    itemsPerPage,
  ]);

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      console.log("Fetching attendance stats...");
      let url = `/api/attendance/stats?period=${filterPeriod}`;
      if (
        selectedEmployeeId &&
        user?.employee?.id !== selectedEmployeeId &&
        (user?.role === "ADMINISTRATOR" ||
          user?.role === "HR_MANAGER" ||
          user?.role === "DEPARTMENT_MANAGER")
      ) {
        url += `&employeeId=${selectedEmployeeId}`;
      }

      const response = await fetch(url, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Attendance stats response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Attendance stats data:", data);

        setAttendanceStats((prev) => ({
          ...prev,
          ...data,
          monthlyStats: {
            ...prev.monthlyStats,
            ...(data.monthlyStats || {}),
            onLeave:
              (data.monthlyStats && data.monthlyStats.onLeave != null
                ? data.monthlyStats.onLeave
                : prev.monthlyStats.onLeave) || 0,
            holiday:
              (data.monthlyStats && data.monthlyStats.holiday != null
                ? data.monthlyStats.holiday
                : prev.monthlyStats.holiday) || 0,
            autoCheckout:
              (data.monthlyStats && data.monthlyStats.autoCheckout != null
                ? data.monthlyStats.autoCheckout
                : prev.monthlyStats.autoCheckout) || 0,
          },
        }));
      } else {
        const errorData = await response.json();
        console.error("Attendance stats error:", errorData);
      }
    } catch (error) {
      console.error("Failed to fetch attendance stats:", error);
    }
  };

  // Fetch office timings from database
  const fetchOfficeTimings = async () => {
    try {
      console.log("Fetching office timings from API...");
      const response = await fetch("/api/office-times");
      console.log("Office timings API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Office timings data received:", data);
        setOfficeTimings({ startTime: data.startTime, endTime: data.endTime });
      } else {
        const errorData = await response.json();
        console.error("Office timings API error:", errorData);
        toast.error("Unable to load office hours");
      }
    } catch (error) {
      console.error("Failed to fetch office timings:", error);
      toast.error("Failed to fetch office hours");
    }
  };

  const fetchEmployees = async () => {
    try {
      // Department managers should load only their team members
      if (user?.role === "DEPARTMENT_MANAGER") {
        const res = await fetch("/api/employees/team", {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          const team = Array.isArray(data.teamMembers) ? data.teamMembers : [];
          // Build manager/self entry so DM appears in the list like Admin dropdowns
          const managerEntry = user?.employee?.id
            ? {
                id: user.employee.id,
                firstName: data.manager?.firstName || user.employee.firstName,
                lastName: data.manager?.lastName || user.employee.lastName,
                employeeId: data.manager?.employeeId || "",
                department: data.manager?.department || undefined,
              }
            : null;

          // Normalize to Employee[] minimal shape and prepend manager if available
          const mappedTeam: Employee[] = team.map((m: any) => ({
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
            employeeId: m.employeeId,
            department: m.department || undefined,
          }));

          // Ensure we don't duplicate manager if somehow present in team list
          const deduped = managerEntry
            ? [
                managerEntry,
                ...mappedTeam.filter((t) => t.id !== managerEntry.id),
              ]
            : mappedTeam;

          setEmployees(deduped);
        } else {
          // Fallback to empty list on permission errors
          setEmployees([]);
        }
        return;
      }

      // Admin/HR continue to load all employees
      const response = await fetch("/api/employees", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      const response = await fetch(`/api/attendance?date=${selectedDate}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceRecords(data.records);
      } else {
        toast.error("Failed to fetch attendance records");
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
      toast.error("Failed to fetch attendance records");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceHistory = async () => {
    setHistoryLoading(true);
    try {
      let url = `/api/attendance/history?period=${filterPeriod}&page=${currentPage}&limit=${itemsPerPage}`;
      if (
        selectedEmployeeId &&
        user?.employee?.id !== selectedEmployeeId && // Make sure it's not the current employee
        (user?.role === "ADMINISTRATOR" ||
          user?.role === "HR_MANAGER" ||
          user?.role === "DEPARTMENT_MANAGER")
      ) {
        url += `&employeeId=${selectedEmployeeId}`;
      }

      console.log("Fetching attendance history with URL:", url);
      console.log("User role:", user?.role);
      console.log("Selected employee ID:", selectedEmployeeId);
      console.log("Current user employee ID:", user?.employee?.id);

      const response = await fetch(url, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Attendance history response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Attendance history data:", data);
        setAttendanceHistory(data.records || []);
        setTotalAttendanceHistory(
          data.pagination?.total || data.records?.length || 0,
        );
      } else {
        const errorData = await response.json();
        console.error("Failed to fetch attendance history:", errorData);
        toast.error(errorData.message || "Failed to fetch attendance history");
      }
    } catch (error) {
      console.error("Failed to fetch attendance history:", error);
      toast.error("Failed to fetch attendance history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const checkCurrentAttendanceStatus = async () => {
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
          data.clockedInTime ? new Date(data.clockedInTime) : null,
        );
      }
    } catch (error) {
      console.error("Failed to check attendance status:", error);
    }
  };

  const handleClockIn = async () => {
    setClockInLoading(true);
    try {
      const clockInDateTime = new Date();
      let locationPayload: {
        latitude: number;
        longitude: number;
        accuracy?: number;
      } | null = null;
      let locationSource: "GPS" | "IP" = "GPS";

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
              });
            },
          );

          locationPayload = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
        } catch (geoError) {
          console.warn("Geolocation unavailable or denied", geoError);
          locationPayload = null;
          locationSource = "IP";
        }
      } else {
        console.warn("Browser does not support geolocation");
        locationSource = "IP";
      }

      const response = await fetch("/api/attendance/clock-in", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clockIn: clockInDateTime.toISOString(),
          location: locationPayload ? { ...locationPayload } : undefined,
          locationSource,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setClockInTime(data.clockInTime);
        toast.success("Clocked in successfully");
        fetchAttendanceRecords();
        // Refresh the attendance status
        checkCurrentAttendanceStatus();
        // Also refresh stats and history so UI updates immediately
        fetchAttendanceStats();
        fetchAttendanceHistory();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to clock in");
      }
    } catch (error) {
      console.error("Clock in error:", error);
      toast.error("Failed to clock in");
    } finally {
      setClockInLoading(false);
    }
  };

  const handleClockOut = async () => {
    setClockOutLoading(true);
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
        const data = await response.json();
        setClockOutTime(data.clockOutTime);
        toast.success("Clocked out successfully");
        fetchAttendanceRecords();
        // Refresh the attendance status
        checkCurrentAttendanceStatus();
        // Also refresh stats and history so UI updates immediately
        fetchAttendanceStats();
        fetchAttendanceHistory();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to clock out");
      }
    } catch (error) {
      console.error("Clock out error:", error);
      toast.error("Failed to clock out");
    } finally {
      setClockOutLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ON_TIME":
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case "PRESENT":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "ABSENT":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case "LATE":
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case "HOLIDAY":
        return <CalendarDaysIcon className="h-5 w-5 text-blue-500" />;
      case "PUBLIC_HOLIDAY":
        return <CalendarDaysIcon className="h-5 w-5 text-blue-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ON_TIME":
        return "bg-green-100 text-green-800";
      case "PRESENT":
        return "bg-green-100 text-green-800";
      case "ABSENT":
        return "bg-red-100 text-red-800";
      case "LATE":
        return "bg-yellow-100 text-yellow-800";
      case "HALF_DAY":
        return "bg-blue-100 text-blue-800";
      case "HOLIDAY":
        return "bg-blue-100 text-blue-800";
      case "PUBLIC_HOLIDAY":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PUBLIC_HOLIDAY":
        return "Public Holiday";
      case "HOLIDAY":
        return "Holiday";
      default:
        return status
          .replace(/_/g, " ")
          .toLowerCase()
          .replace(/(^|\s)\w/g, (c) => c.toUpperCase());
    }
  };

  const getFilterLabel = (period: string) => {
    switch (period) {
      case "today":
        return "Today";
      case "current_week":
        return "This Week";
      case "current_month":
        return "This Month";
      case "last_month":
        return "Last Month";
      case "yearly":
        return "This Year";
      default:
        return "Today";
    }
  };

  const getDateRangeText = () => {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    switch (filterPeriod) {
      case "today":
        return new Date().toLocaleDateString();
      case "current_week":
        return `${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;
      case "current_month":
        const currentMonth = new Date();
        return currentMonth.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      case "last_month":
        const lastMonthDate = new Date();
        lastMonthDate.setDate(1);
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        return lastMonthDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      case "yearly":
        return new Date().getFullYear().toString();
      default:
        return "";
    }
  };

  // Helper function to convert decimal hours to HH:MM:SS format
  const formatHoursToHHMMSS = (decimalHours: number) => {
    const hours = Math.floor(decimalHours);
    const minutes = Math.floor((decimalHours - hours) * 60);
    const seconds = Math.floor(((decimalHours - hours) * 60 - minutes) * 60);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Helper function to format time as HH:MM:SS
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Format "HH:MM" (24h) to "h:MMAM/PM"
  const formatTo12Hour = (time: string) => {
    if (!time || !time.includes(":")) return time;
    const [hStr, mStr] = time.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr.padStart(2, "0");
    const period = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${period}`;
  };

  // Helper function to get elapsed time from clock in as HH:MM:SS
  const getElapsedTime = () => {
    if (!clockedInTime) return "00:00:00";

    const now = currentTime;
    const diff = now.getTime() - clockedInTime.getTime();

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Only update minutes display when seconds reach 00
    const displayMinutes = now.getSeconds() === 0 ? minutes : minutes;

    return `${hours.toString().padStart(2, "0")}:${displayMinutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const renderLocationCell = (record: AttendanceRecord) => {
    if (!canViewLocation) {
      return null;
    }

    const lat =
      record.clockInLatitude == null ? null : Number(record.clockInLatitude);
    const lng =
      record.clockInLongitude == null ? null : Number(record.clockInLongitude);

    const hasCoordinates =
      lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);

    const googleMapsUrl = hasCoordinates
      ? `https://www.google.com/maps?q=${lat!.toFixed(6)},${lng!.toFixed(6)}`
      : null;

    return (
      <div className="space-y-1">
        {googleMapsUrl ? (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-primary-600 hover:text-primary-800 hover:underline"
          >
            View location
          </a>
        ) : (
          <span className="text-xs text-gray-500">Approximate location</span>
        )}
        {record.clockInLocation && (
          <p className="text-xs text-gray-500 break-words">
            {record.clockInLocation}
          </p>
        )}
        {record.clockInLocationSource && (
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">
            Source: {record.clockInLocationSource}
          </p>
        )}
      </div>
    );
  };

  // Helper function to get filtered records based on selected employee
  const getFilteredRecords = () => {
    if (
      selectedEmployeeId &&
      (user?.role === "ADMINISTRATOR" ||
        user?.role === "HR_MANAGER" ||
        user?.role === "DEPARTMENT_MANAGER")
    ) {
      return attendanceRecords.filter(
        (r) => r.employee.id === selectedEmployeeId,
      );
    }
    return attendanceRecords;
  };

  // Helper function to get today's attendance record display text
  const getTodayAttendanceDisplay = () => {
    const today = new Date().toISOString().split("T")[0];
    const todayDate = new Date(today);
    const filteredRecords = getFilteredRecords();

    // Debug: Log attendance records to see what's available (commented out to reduce console noise)
    // console.log("Debug - Today:", today);
    // console.log("Debug - Selected Employee ID:", selectedEmployeeId);
    // console.log(
    //   "Debug - Filtered Records:",
    //   filteredRecords.map((r) => ({
    //     id: r.id,
    //     date: r.date,
    //     clockIn: r.clockIn,
    //     clockOut: r.clockOut,
    //   }))
    // );

    // console.log("Debug - Is Currently Working:", isCurrentlyWorking);

    // If currently working and we're looking at current user, show elapsed time
    if (
      isCurrentlyWorking &&
      (!selectedEmployeeId ||
        selectedEmployeeId === "" ||
        selectedEmployeeId === user?.employee?.id)
    ) {
      return getElapsedTime();
    }

    // Find today's record by comparing dates properly
    const todayRecord = filteredRecords.find((r) => {
      if (!r.date) return false;
      const recordDate = new Date(r.date);
      return recordDate.toDateString() === todayDate.toDateString();
    });

    if (todayRecord) {
      // console.log("Debug - Found today record:", todayRecord);

      // If there's a completed record for today (has clockOut)
      if (todayRecord.clockOut) {
        if (todayRecord.totalHours) {
          const totalHours = Number(todayRecord.totalHours);
          return `${Math.floor(totalHours)}h ${Math.floor(
            (totalHours % 1) * 60,
          )}m`;
        } else {
          // Calculate hours from clock in/out times
          const clockIn = new Date(todayRecord.clockIn!);
          const clockOut = new Date(todayRecord.clockOut);
          const workedHours =
            (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
          return `${Math.floor(workedHours)}h ${Math.floor(
            (workedHours % 1) * 60,
          )}m`;
        }
      }
      // If there's an incomplete record for today (clocked in but not out)
      if (todayRecord.clockIn && !todayRecord.clockOut) {
        return "Incomplete workday";
      }
    }

    // Check if there's any completed work for today (even if clocked out)
    const anyTodayRecord = filteredRecords.find((r) => {
      if (!r.date) return false;
      const recordDate = new Date(r.date);
      return recordDate.toDateString() === todayDate.toDateString();
    });

    console.log("Debug - Any today record:", anyTodayRecord);

    if (anyTodayRecord) {
      // If there's any record for today that has both clockIn and clockOut (completed workday)
      if (anyTodayRecord.clockIn && anyTodayRecord.clockOut) {
        if (anyTodayRecord.totalHours) {
          const totalHours = Number(anyTodayRecord.totalHours);
          return `${Math.floor(totalHours)}h ${Math.floor(
            (totalHours % 1) * 60,
          )}m`;
        } else {
          // Calculate hours from clock in/out times
          const clockIn = new Date(anyTodayRecord.clockIn!);
          const clockOut = new Date(anyTodayRecord.clockOut);
          const workedHours =
            (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
          return `${Math.floor(workedHours)}h ${Math.floor(
            (workedHours % 1) * 60,
          )}m`;
        }
      }
      // If there's a record but no clockOut (incomplete), show incomplete
      if (anyTodayRecord.clockIn && !anyTodayRecord.clockOut) {
        return "Incomplete workday";
      }
    }

    return "Not clocked in";
  };

  const isPastOfficeEndTime = (() => {
    if (!officeTimings?.endTime || officeTimings.endTime === "--:--") {
      return false;
    }

    const [endHourStr, endMinuteStr] = officeTimings.endTime.split(":");
    const endHour = parseInt(endHourStr, 10);
    const endMinute = parseInt(endMinuteStr, 10);

    if (Number.isNaN(endHour) || Number.isNaN(endMinute)) {
      return false;
    }

    const officeEndToday = new Date(currentTime);
    officeEndToday.setHours(endHour, endMinute, 0, 0);

    return currentTime >= officeEndToday;
  })();

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          {user?.role === "EMPLOYEE"
            ? "My Attendance"
            : "Attendance Management"}
        </h1>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full sm:w-auto">
          <div
            className="relative inline-block text-left w-[180px]"
            ref={filterDropdownRef}
          >
            <button
              type="button"
              className="inline-flex justify-between items-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 whitespace-nowrap"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <span className="overflow-hidden text-ellipsis">
                {getFilterLabel(filterPeriod)}
              </span>
              <ChevronDownIcon className="ml-2 h-5 w-5 flex-shrink-0" />
            </button>

            {showFilterDropdown && (
              <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="py-1">
                  {[
                    "today",
                    "current_week",
                    "current_month",
                    "last_month",
                    "yearly",
                  ].map((period) => (
                    <button
                      key={period}
                      className={`block px-4 py-2 text-sm w-full text-left ${
                        filterPeriod === period
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-700"
                      }`}
                      onClick={() => {
                        setFilterPeriod(period);
                        setShowFilterDropdown(false);
                        if (period !== "custom") {
                          setSelectedDate(
                            new Date().toISOString().split("T")[0],
                          );
                        }
                      }}
                    >
                      {getFilterLabel(period)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {(user?.role === "ADMINISTRATOR" ||
            user?.role === "HR_MANAGER" ||
            user?.role === "DEPARTMENT_MANAGER") && (
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="input min-w-[200px] w-full sm:w-auto"
            >
              <option value="">All Employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} (
                  {employee.employeeId})
                </option>
              ))}
            </select>
          )}

          {(user?.role === "ADMINISTRATOR" ||
            user?.role === "HR_MANAGER" ||
            user?.role === "DEPARTMENT_MANAGER") && (
            <button
              className="btn btn-secondary whitespace-nowrap"
              onClick={async () => {
                try {
                  if (!selectedEmployeeId) {
                    toast.error("Please select an employee to export");
                    return;
                  }
                  const url = `/api/attendance/export?employeeId=${encodeURIComponent(
                    selectedEmployeeId,
                  )}&period=${encodeURIComponent(filterPeriod)}`;
                  const res = await fetch(url, { credentials: "include" });
                  if (!res.ok) {
                    const errText = await res.text();
                    toast.error(`Export failed: ${errText || res.status}`);
                    return;
                  }
                  const blob = await res.blob();
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  const emp = employees.find(
                    (e) => e.id === selectedEmployeeId,
                  );
                  const namePart = emp
                    ? `${emp.firstName}_${emp.lastName}_${emp.employeeId}`
                    : selectedEmployeeId;
                  const safeName = namePart.replace(/[^a-z0-9_\-]+/gi, "_");
                  link.download = `attendance_${safeName}_${filterPeriod}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                } catch (e) {
                  console.error("Export error", e);
                  toast.error("Failed to export attendance");
                }
              }}
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Cards (now all connected to the filters) */}
      {user && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Today Card */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedEmployeeId === "" &&
                (user?.role === "ADMINISTRATOR" ||
                  user?.role === "HR_MANAGER" ||
                  user?.role === "DEPARTMENT_MANAGER")
                  ? "All Employees"
                  : "Today"}
              </h3>
              {(() => {
                // When viewing all employees, show summary badge instead of personal status
                if (
                  selectedEmployeeId === "" &&
                  (user?.role === "ADMINISTRATOR" ||
                    user?.role === "HR_MANAGER" ||
                    user?.role === "DEPARTMENT_MANAGER")
                ) {
                  const totalEmployees = attendanceRecords.length;
                  const presentToday = attendanceRecords.filter(
                    (r) => r.status === "PRESENT" || r.status === "LATE",
                  ).length;
                  const absentToday = totalEmployees - presentToday;

                  return (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {presentToday}/{totalEmployees} Present
                    </span>
                  );
                }

                const today = new Date().toISOString().split("T")[0];
                const todayDate = new Date(today);
                const filteredRecords = getFilteredRecords();
                const todayRecord = filteredRecords.find((r) => {
                  if (!r.date) return false;
                  const recordDate = new Date(r.date);
                  return recordDate.toDateString() === todayDate.toDateString();
                });

                // Check if this was a late arrival based on clock-in time and grace period
                let isLateArrival = false;
                let isOnTime = false;
                if (todayRecord?.clockIn) {
                  const clockInTime = new Date(todayRecord.clockIn);
                  const clockInHour = clockInTime.getHours();
                  const clockInMinute = clockInTime.getMinutes();

                  // Office start time: 9:00 AM
                  const officeStartHour = 9;
                  const officeStartMinute = 0;

                  // Grace period: 60 minutes (should match your database setting)
                  const graceTimeMinutes = 60;

                  // Calculate total minutes from midnight for comparison
                  const clockInTotalMinutes = clockInHour * 60 + clockInMinute;
                  const officeStartTotalMinutes =
                    officeStartHour * 60 + officeStartMinute;
                  const lateThreshold =
                    officeStartTotalMinutes + graceTimeMinutes;

                  if (clockInTotalMinutes <= officeStartTotalMinutes) {
                    isOnTime = true;
                  } else if (clockInTotalMinutes <= lateThreshold) {
                    // Within grace period - should be marked as PRESENT, not LATE
                    isOnTime = false;
                    isLateArrival = false; // This is the key fix
                  } else {
                    isLateArrival = true;
                  }
                }

                let badgeClass = "";
                let badgeText = "";

                // Priority order: Late > On Time > Present > Working > Absent
                if (todayRecord?.status === "LATE" && isLateArrival) {
                  // Only show LATE if both database status is LATE AND clock-in was actually late (beyond grace period)
                  badgeClass = "bg-yellow-100 text-yellow-800";
                  badgeText = "LATE";
                } else if (
                  isOnTime ||
                  (todayRecord?.status === "PRESENT" && isOnTime)
                ) {
                  badgeClass = "bg-green-100 text-green-800";
                  badgeText = "ON TIME";
                } else if (
                  todayRecord?.status === "PRESENT" &&
                  !isLateArrival
                ) {
                  // If status is PRESENT and not actually late (within grace period), show PRESENT
                  badgeClass = "bg-green-100 text-green-800";
                  badgeText = "PRESENT";
                } else if (
                  isCurrentlyWorking &&
                  (!selectedEmployeeId ||
                    selectedEmployeeId === "" ||
                    selectedEmployeeId === user?.employee?.id)
                ) {
                  // Show current status for working users
                  if (isLateArrival) {
                    badgeClass = "bg-yellow-100 text-yellow-800";
                    badgeText = "LATE";
                  } else if (isOnTime) {
                    badgeClass = "bg-green-100 text-green-800";
                    badgeText = "ON TIME";
                  } else {
                    badgeClass = "bg-green-100 text-green-800";
                    badgeText = "PRESENT";
                  }
                } else if (todayRecord?.clockIn && !todayRecord?.clockOut) {
                  badgeClass = "bg-blue-100 text-blue-800";
                  badgeText = "WORKING";
                } else {
                  // Only show ABSENT after office end time; otherwise, show no badge
                  const officeEndHour = 18; // 6 PM
                  const nowHour = new Date().getHours();
                  if (nowHour >= officeEndHour) {
                    badgeClass = "bg-red-100 text-red-800";
                    badgeText = "ABSENT";
                  } else {
                    badgeClass = "";
                    badgeText = ""; // No badge before office end time if not marked
                  }
                }

                if (!badgeText) return null;
                return (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${badgeClass}`}
                  >
                    {badgeText}
                  </span>
                );
              })()}
            </div>

            <div className="flex items-start justify-between mb-6">
              {/* Left side - Text */}
              <div className="flex-1 pr-4">
                <div className="flex items-center mb-4 mt-4">
                  <span
                    className={`${
                      selectedEmployeeId === "" &&
                      (user?.role === "ADMINISTRATOR" ||
                        user?.role === "HR_MANAGER")
                        ? "text-base md:text-lg font-semibold text-gray-500"
                        : (() => {
                            const isOwn =
                              !selectedEmployeeId ||
                              selectedEmployeeId === "" ||
                              selectedEmployeeId === user?.employee?.id;
                            const size =
                              isCurrentlyWorking && isOwn
                                ? "text-5xl"
                                : "text-xl";
                            const color =
                              isCurrentlyWorking && isOwn
                                ? "text-green-600"
                                : (() => {
                                    const displayText =
                                      getTodayAttendanceDisplay();
                                    const hoursMatch =
                                      displayText.match(/(\d+)h/);
                                    if (
                                      hoursMatch &&
                                      parseInt(hoursMatch[1]) >= 8
                                    )
                                      return "text-green-600";
                                    if (displayText === "Incomplete workday")
                                      return "text-yellow-600";
                                    return "text-red-500";
                                  })();
                            return `${size} font-extrabold ${color}`;
                          })()
                    }`}
                  >
                    {selectedEmployeeId === "" &&
                    (user?.role === "ADMINISTRATOR" ||
                      user?.role === "HR_MANAGER" ||
                      user?.role === "DEPARTMENT_MANAGER")
                      ? // Show summary when viewing all employees
                        (() => {
                          const totalEmployees = attendanceRecords.length;
                          const presentToday = attendanceRecords.filter(
                            (r) =>
                              r.status === "PRESENT" || r.status === "LATE",
                          ).length;
                          const absentToday = totalEmployees - presentToday;
                          const lateToday = attendanceRecords.filter(
                            (r) => r.status === "LATE",
                          ).length;

                          return `${presentToday} Present, ${lateToday} Late, ${absentToday} Absent`;
                        })()
                      : isCurrentlyWorking &&
                          (!selectedEmployeeId ||
                            selectedEmployeeId === "" ||
                            selectedEmployeeId === user?.employee?.id)
                        ? getElapsedTime()
                        : getTodayAttendanceDisplay()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {selectedEmployeeId === "" &&
                  (user?.role === "ADMINISTRATOR" ||
                    user?.role === "HR_MANAGER") ? (
                    <span>Attendance summary for all employees</span>
                  ) : (
                    (() => {
                      const today = new Date().toISOString().split("T")[0];
                      const todayDate = new Date(today);
                      const filteredRecords = getFilteredRecords();
                      const todayRecord = filteredRecords.find((r) => {
                        if (!r.date) return false;
                        const recordDate = new Date(r.date);
                        return (
                          recordDate.toDateString() === todayDate.toDateString()
                        );
                      });

                      // Get selected employee name for display
                      const selectedEmployee = selectedEmployeeId
                        ? employees.find((emp) => emp.id === selectedEmployeeId)
                        : null;
                      const employeeName = selectedEmployee
                        ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                        : "You";

                      // Check if this was a late arrival or on-time for display text
                      let displayIsLateArrival = false;
                      let displayIsOnTime = false;
                      let displayIsWithinGracePeriod = false;

                      if (todayRecord?.clockIn) {
                        const clockInTime = new Date(todayRecord.clockIn);
                        const clockInHour = clockInTime.getHours();
                        const clockInMinute = clockInTime.getMinutes();

                        const officeStartHour = 9;
                        const officeStartMinute = 0;

                        // Grace period: 60 minutes (should match database setting)
                        const graceTimeMinutes = 60;

                        // Calculate total minutes from midnight for comparison
                        const clockInTotalMinutes =
                          clockInHour * 60 + clockInMinute;
                        const officeStartTotalMinutes =
                          officeStartHour * 60 + officeStartMinute;
                        const lateThreshold =
                          officeStartTotalMinutes + graceTimeMinutes;

                        if (clockInTotalMinutes <= officeStartTotalMinutes) {
                          displayIsOnTime = true;
                        } else if (clockInTotalMinutes <= lateThreshold) {
                          // Within grace period - should be treated as on time
                          displayIsWithinGracePeriod = true;
                        } else {
                          displayIsLateArrival = true;
                        }
                      }

                      if (
                        isCurrentlyWorking &&
                        (!selectedEmployeeId ||
                          selectedEmployeeId === "" ||
                          selectedEmployeeId === user?.employee?.id)
                      ) {
                        if (displayIsLateArrival) {
                          return "You are currently working (arrived late)!";
                        } else if (displayIsOnTime) {
                          return "You are currently working (on time)!";
                        } else if (displayIsWithinGracePeriod) {
                          return "You are currently working!";
                        } else {
                          return "You are currently working!";
                        }
                      } else if (
                        todayRecord?.status === "LATE" ||
                        displayIsLateArrival
                      ) {
                        return `${employeeName} arrived late today`;
                      } else if (
                        todayRecord?.status === "PRESENT" ||
                        displayIsOnTime ||
                        displayIsWithinGracePeriod
                      ) {
                        if (displayIsOnTime) {
                          return `${employeeName} arrived on time today`;
                        } else if (displayIsWithinGracePeriod) {
                          return `${employeeName} arrived within grace period today`;
                        } else {
                          return `${employeeName} ${
                            selectedEmployee ? "was" : "were"
                          } marked present today`;
                        }
                      } else if (
                        todayRecord?.clockIn &&
                        !todayRecord?.clockOut
                      ) {
                        return `${employeeName} ${
                          selectedEmployee ? "has" : "have"
                        } an incomplete workday`;
                      } else {
                        return selectedEmployee
                          ? `${employeeName} has not clocked in today`
                          : "You haven't clocked in today";
                      }
                    })()
                  )}
                </p>
              </div>

              {/* Right side - Dynamic Chart */}
              <div className="relative w-24 h-24 mt-6">
                {(() => {
                  const expectedHours = 8;
                  let workedHours = 0;

                  // Use filtered records based on selected employee
                  const targetRecords = getFilteredRecords();

                  if (
                    isCurrentlyWorking &&
                    clockedInTime &&
                    (!selectedEmployeeId ||
                      selectedEmployeeId === "" ||
                      selectedEmployeeId === user?.employee?.id)
                  ) {
                    workedHours =
                      (currentTime.getTime() -
                        new Date(clockedInTime).getTime()) /
                      (1000 * 60 * 60);
                  } else {
                    const record = targetRecords.find(
                      (r) => r.status === "PRESENT" || r.status === "LATE",
                    );
                    if (record) {
                      if (typeof record.totalHours === "number") {
                        workedHours = record.totalHours;
                      } else if (record.clockIn && record.clockOut) {
                        workedHours =
                          (new Date(record.clockOut).getTime() -
                            new Date(record.clockIn).getTime()) /
                          (1000 * 60 * 60);
                      } else if (typeof record.totalHours === "string") {
                        const parts = record.totalHours.toString().split(":");
                        workedHours =
                          parseFloat(parts[0]) +
                          (parts[1] ? parseFloat(parts[1]) / 60 : 0);
                      }
                    }
                  }

                  const percentage =
                    workedHours > 0
                      ? Math.min(
                          100,
                          Math.round((workedHours / expectedHours) * 100),
                        )
                      : 0;
                  const hours = Math.floor(workedHours);
                  const minutes = Math.floor((workedHours % 1) * 60);

                  const data = {
                    datasets: [
                      {
                        data: [percentage, Math.max(0, 100 - percentage)],
                        backgroundColor: [
                          percentage >= 100 ? "#10B981" : "#F59E0B",
                          "#F3F4F6",
                        ],
                        borderWidth: 0,
                      },
                    ],
                  };

                  return (
                    <>
                      <Doughnut
                        data={data}
                        options={{
                          cutout: "80%",
                          plugins: {
                            legend: { display: false },
                            tooltip: { enabled: false },
                          },
                          maintainAspectRatio: false,
                        }}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-base font-bold text-gray-900">
                          {percentage}%
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Button */}
            {(user?.role === "EMPLOYEE" ||
              user?.role === "ADMINISTRATOR" ||
              user?.role === "HR_MANAGER" ||
              user?.role === "DEPARTMENT_MANAGER" ||
              user?.role === "MANAGER") && (
              <div>
                {/* Admin/HR All Employees message removed per request */}

                {/* Show clock in/out buttons for current user when viewing own attendance */}
                {(!selectedEmployeeId ||
                  selectedEmployeeId === "" ||
                  selectedEmployeeId === user?.employee?.id) && (
                  <>
                    <button
                      onClick={() => {
                        if (isPastOfficeEndTime && !isCurrentlyWorking) {
                          toast.error(
                            "Office hours have ended. You cannot mark attendance now.",
                          );
                          return;
                        }

                        if (isCurrentlyWorking) {
                          handleClockOut();
                        } else if (
                          !attendanceRecords.some(
                            (r) =>
                              r.employee.id === user?.employee?.id &&
                              (r.status === "PRESENT" || r.status === "LATE"),
                          )
                        ) {
                          handleClockIn();
                        }
                      }}
                      disabled={
                        clockInLoading ||
                        clockOutLoading ||
                        (selectedEmployeeId === "" &&
                          (user?.role === "ADMINISTRATOR" ||
                            user?.role === "HR_MANAGER" ||
                            user?.role === "DEPARTMENT_MANAGER")) ||
                        (!isCurrentlyWorking && isPastOfficeEndTime) ||
                        attendanceRecords.some(
                          (r) =>
                            r.employee.id === user?.employee?.id && r.clockOut,
                        )
                      }
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                        clockInLoading || clockOutLoading
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : (selectedEmployeeId === "" &&
                                (user?.role === "ADMINISTRATOR" ||
                                  user?.role === "HR_MANAGER" ||
                                  user?.role === "DEPARTMENT_MANAGER")) ||
                              attendanceRecords.some(
                                (r) =>
                                  r.employee.id === user?.employee?.id &&
                                  r.clockOut,
                              )
                            ? "bg-gray-400 text-white cursor-not-allowed"
                            : !isCurrentlyWorking && isPastOfficeEndTime
                              ? "bg-gray-400 text-white cursor-not-allowed"
                              : isCurrentlyWorking
                                ? clockedInTime &&
                                  currentTime.getTime() -
                                    clockedInTime.getTime() >=
                                    8 * 60 * 60 * 1000
                                  ? "bg-green-600 hover:bg-green-700 text-white"
                                  : "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {clockInLoading || clockOutLoading ? (
                        <>
                          <svg
                            className="animate-spin h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <span>
                            {isCurrentlyWorking
                              ? "Clocking Out..."
                              : "Marking Attendance..."}
                          </span>
                        </>
                      ) : selectedEmployeeId === "" &&
                        (user?.role === "ADMINISTRATOR" ||
                          user?.role === "HR_MANAGER" ||
                          user?.role === "DEPARTMENT_MANAGER") ? (
                        "Select Employee to Mark Attendance"
                      ) : isCurrentlyWorking ? (
                        "Clock Out"
                      ) : isPastOfficeEndTime ? (
                        "Office Closed"
                      ) : attendanceRecords.some(
                          (r) =>
                            r.employee.id === user?.employee?.id &&
                            (r.status === "PRESENT" || r.status === "LATE"),
                        ) ? (
                        "Already Clocked In"
                      ) : (
                        "Mark Present"
                      )}
                    </button>
                    {/* Office Timings Display (from database) */}
                    <div className="mt-2 text-center">
                      {officeTimings && (
                        <p className="text-xs text-gray-500">
                          Office Hours:{" "}
                          {formatTo12Hour(officeTimings.startTime)} -{" "}
                          {formatTo12Hour(officeTimings.endTime)}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Show message when viewing a different employee's attendance */}
                {selectedEmployeeId &&
                  selectedEmployeeId !== "" &&
                  selectedEmployeeId !== user?.employee?.id && (
                    <div className="w-full py-3 text-center text-sm text-gray-500 bg-gray-50 rounded-lg">
                      Viewing{" "}
                      {
                        employees.find((emp) => emp.id === selectedEmployeeId)
                          ?.firstName
                      }
                      's attendance
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="space-y-4">
            {/* First Row - 2 Columns */}
            <div className="grid grid-cols-2 gap-4">
              {/* Average Hours */}
              <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                  <ClockIcon className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm text-gray-500 mb-1">Average hours</p>
                <p className="text-xl font-bold text-gray-900">
                  {attendanceStats.averageHours}
                </p>
              </div>

              {/* Average Check-in */}
              <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 mb-1">Average check-in</p>
                <p className="text-xl font-bold text-gray-900">
                  {attendanceStats.averageCheckIn}
                </p>
              </div>
            </div>

            {/* Second Row - 2 Columns */}
            <div className="grid grid-cols-2 gap-4">
              {/* On-time Arrival */}
              <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-500 mb-1">On-time arrival</p>
                <p className="text-xl font-bold text-green-600">
                  {attendanceStats.onTimePercentage}%
                </p>
              </div>

              {/* Average Check-out */}
              <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                  <svg
                    className="w-6 h-6 text-red-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 mb-1">Average check-out</p>
                <p className="text-xl font-bold text-gray-900">
                  {attendanceStats.averageCheckOut}
                </p>
              </div>
            </div>
          </div>

          {/* My Attendance Card */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                My Attendance
              </h3>
            </div>

            <div className="flex items-start justify-between mb-6">
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">
                    {attendanceStats.monthlyStats.onTime} on time
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">
                    {attendanceStats.monthlyStats.lateAttendance} late
                    attendance
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">
                    {attendanceStats.monthlyStats.absent} absent
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">
                    {attendanceStats.monthlyStats.onLeave || 0} on leave
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">
                    {attendanceStats.monthlyStats.holiday || 0} holiday
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-300 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">
                    {attendanceStats.monthlyStats.autoCheckout || 0} auto
                    checkout
                  </span>
                </div>
              </div>

              <div className="relative w-24 h-24 flex items-center justify-center">
                {(() => {
                  const totalWorkingDays =
                    attendanceStats.monthlyStats.totalDays || 1;
                  const onTimeDays = attendanceStats.monthlyStats.onTime;
                  const lateDays = attendanceStats.monthlyStats.lateAttendance;
                  const absentDays = attendanceStats.monthlyStats.absent;
                  const onLeaveDays = attendanceStats.monthlyStats.onLeave || 0;
                  const holidayDays = attendanceStats.monthlyStats.holiday || 0;
                  const autoCheckoutDays =
                    attendanceStats.monthlyStats.autoCheckout || 0;
                  const nonAttendedDays =
                    totalWorkingDays -
                    onTimeDays -
                    lateDays -
                    absentDays -
                    onLeaveDays -
                    holidayDays -
                    autoCheckoutDays;

                  const data = {
                    datasets: [
                      {
                        data: [
                          onTimeDays,
                          lateDays,
                          absentDays,
                          onLeaveDays,
                          holidayDays,
                          autoCheckoutDays,
                          Math.max(nonAttendedDays, 0),
                        ],
                        backgroundColor: [
                          "#10B981",
                          "#F59E0B",
                          "#EF4444",
                          "#6366F1",
                          "#3B82F6",
                          "#FACC15",
                          "#F3F4F6",
                        ], // Green for on-time, yellow for late, red for absent, indigo for leave, gray for remainder
                        borderWidth: 0,
                      },
                    ],
                  };
                  return (
                    <>
                      <Doughnut
                        data={data}
                        options={{
                          cutout: "80%",
                          plugins: {
                            legend: { display: false },
                            tooltip: { enabled: false },
                          },
                          maintainAspectRatio: false,
                        }}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-base font-bold text-gray-900">
                          {onTimeDays + lateDays}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          /{totalWorkingDays}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance History Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Attendance History
          </h3>
          <p className="mt-1 text-sm text-gray-500">{getDateRangeText()}</p>
        </div>
        {/* Attendance History Table */}
        <div className="overflow-x-auto">
          {historyLoading ? (
            <div className="px-6 py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">
                Loading attendance history...
              </p>
            </div>
          ) : !historyLoading && (attendanceHistory || []).length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-500">
                No attendance records found for{" "}
                {getFilterLabel(filterPeriod).toLowerCase()}
              </p>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {user?.role !== "EMPLOYEE" &&
                      user?.role !== "DEPARTMENT_MANAGER" &&
                      user?.role !== "MANAGER" && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                      )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clock In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clock Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Hours
                    </th>
                    {canViewLocation && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clock-in Location
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceHistory.map((record, index) => (
                    <tr
                      key={record.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      {user?.role !== "EMPLOYEE" &&
                        user?.role !== "DEPARTMENT_MANAGER" &&
                        user?.role !== "MANAGER" && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center">
                              <Link
                                href={`/dashboard/employees/${record.employee.id}`}
                                className="flex-shrink-0"
                              >
                                <Avatar
                                  employeeId={record.employee.id}
                                  employeeName={`${record.employee.firstName} ${record.employee.lastName}`}
                                  profileImage={record.employee.profileImage}
                                  size="md"
                                  showLink={false}
                                />
                              </Link>
                              <div className="ml-4">
                                <Link
                                  href={`/dashboard/employees/${record.employee.id}`}
                                  className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline cursor-pointer"
                                >
                                  {record.employee.firstName}{" "}
                                  {record.employee.lastName}
                                </Link>
                                <p className="text-xs text-gray-500">
                                  {record.employee.designation?.title ||
                                    "Designation N/A"}
                                </p>
                              </div>
                            </div>
                          </td>
                        )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.date
                          ? new Date(record.date).toLocaleDateString(
                              undefined,
                              {
                                weekday: "short",
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(record.status)}
                          <span
                            className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              record.status,
                            )}`}
                          >
                            {getStatusLabel(record.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.clockIn
                          ? new Date(record.clockIn).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.clockOut
                          ? new Date(record.clockOut).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          if (record.clockIn && !record.clockOut) {
                            return (
                              <span className="inline-flex min-w-[90px] justify-center rounded-full px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800">
                                In progress
                              </span>
                            );
                          }

                          const isAutoCheckout =
                            record.notes?.includes("[Auto Checkout]") ?? false;

                          const numericValue =
                            typeof record.totalHours === "number"
                              ? record.totalHours
                              : Number(record.totalHours);

                          const mainContent = (() => {
                            if (Number.isNaN(numericValue)) {
                              return (
                                <span className="inline-flex min-w-[64px] justify-center rounded-full px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600">
                                  {record.totalHours || "N/A"}
                                </span>
                              );
                            }

                            const badgeClass =
                              numericValue >= 8
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800";

                            return (
                              <span
                                className={`inline-flex min-w-[64px] justify-center rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}`}
                              >
                                {formatDecimalHours(numericValue)}
                              </span>
                            );
                          })();

                          return (
                            <div className="flex flex-wrap items-center gap-2">
                              {mainContent}
                              {isAutoCheckout && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-yellow-300 bg-yellow-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-yellow-700">
                                  <ExclamationTriangleIcon
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  Auto checkout
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      {canViewLocation && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {renderLocationCell(record)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination */}
              {attendanceHistory.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(totalAttendanceHistory / itemsPerPage)}
                  totalItems={totalAttendanceHistory}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Leave Request Form Modal */}
      {showLeaveForm && (
        <LeaveRequestForm
          isOpen={showLeaveForm}
          onClose={() => setShowLeaveForm(false)}
          onSuccess={() => {
            setShowLeaveForm(false);
            // Refresh leave requests if needed
          }}
        />
      )}
    </div>
  );
}
