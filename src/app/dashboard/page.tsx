"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  UserGroupIcon,
  ClockIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  BellIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  SparklesIcon,
  CakeIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
  type ChartData,
} from "chart.js";
import toast from "react-hot-toast";
import StatusIndicator from "@/components/ui/StatusIndicator";
import { useUserStatuses } from "@/hooks/useUserStatuses";
import Avatar from "@/components/ui/Avatar";
import { useUserSession } from "@/hooks/useUserSession";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
);

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  pendingLeaves: number;
  upcomingBirthdays: number;
  userRole?: string;
  isEmployee?: boolean;
}

interface AttendanceData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
  }[];
}

interface DepartmentData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
  }[];
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  color: string;
  performer?: {
    firstName: string;
    lastName: string;
  };
  targetEmployee?: {
    firstName: string;
    lastName: string;
  };
}

interface Birthday {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  position?: string;
  department?: {
    name: string;
  };
  profileImage?: string | null;
  daysUntil: number;
  turningAge: number;
  isToday: boolean;
  isTomorrow: boolean;
  isThisWeek: boolean;
}

interface Anniversary {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  joinDate: string;
  years: number;
  daysUntil: number;
  profileImage?: string | null;
}

interface CelebrationItem {
  id: string;
  employeeId: string;
  name: string;
  type: "birthday" | "anniversary";
  message: string;
  profileImage?: string | null;
  daysUntil: number;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
    department?: {
      name: string;
    };
  };
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  designation: string;
  email: string;
  phone?: string;
  joinDate: string;
  profileImage?: string | null;
  department?: {
    name: string;
  };
}

interface TeamData {
  teamMembers: TeamMember[];
  manager?: {
    firstName: string;
    lastName: string;
    designation: string;
    employeeId: string;
  };
  totalCount: number;
}

interface TeamAttendanceData {
  summary: {
    totalMembers: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
  };
  teamMembers: TeamMember[];
  attendance: TeamAttendanceRecord[];
}

interface TeamAttendanceRecord {
  dayOfWeek: number;
  date: string;
  status: string;
  clockIn: string | null;
  clockOut: string | null;
  employeeId: string;
}

const formatName = (firstName: string, lastName: string) => {
  const capitalize = (value: string) =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

  return `${capitalize(firstName)} ${capitalize(lastName)}`.trim();
};

const formatOrdinal = (value: number) => {
  const remainderTen = value % 10;
  const remainderHundred = value % 100;

  if (remainderTen === 1 && remainderHundred !== 11) return `${value}st`;
  if (remainderTen === 2 && remainderHundred !== 12) return `${value}nd`;
  if (remainderTen === 3 && remainderHundred !== 13) return `${value}rd`;
  return `${value}th`;
};

export default function DashboardPage() {
  // Helper function to determine display status with grace time consideration
  const getDisplayStatus = (attendance: any) => {
    if (!attendance?.clockIn || !attendance?.status) {
      return {
        text: attendance?.status || "Absent",
        className: "bg-red-100 text-red-800",
      };
    }

    const clockInTime = new Date(attendance.clockIn);
    const clockInHour = clockInTime.getHours();
    const clockInMinute = clockInTime.getMinutes();

    // Office start time: 9:00 AM
    const officeStartHour = 9;
    const officeStartMinute = 0;

    // Grace period: 60 minutes (should match database setting)
    const graceTimeMinutes = 60;

    // Calculate total minutes from midnight for comparison
    const clockInTotalMinutes = clockInHour * 60 + clockInMinute;
    const officeStartTotalMinutes = officeStartHour * 60 + officeStartMinute;
    const lateThreshold = officeStartTotalMinutes + graceTimeMinutes;

    // If within grace period, show PRESENT regardless of stored status
    if (clockInTotalMinutes <= lateThreshold) {
      return { text: "Present", className: "bg-green-100 text-green-800" };
    }

    // Use stored status for late arrivals
    switch (attendance.status) {
      case "PRESENT":
      case "ON_TIME":
        return { text: "Present", className: "bg-green-100 text-green-800" };
      case "LATE":
        return { text: "Late", className: "bg-yellow-100 text-yellow-800" };
      default:
        return {
          text: attendance.status || "Absent",
          className: "bg-red-100 text-red-800",
        };
    }
  };
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
    upcomingBirthdays: 0,
  });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [secondaryLoaded, setSecondaryLoaded] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(
    null,
  );
  const [departmentData, setDepartmentData] = useState<DepartmentData | null>(
    null,
  );
  const [activities, setActivities] = useState<Activity[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [departmentAnnouncements, setDepartmentAnnouncements] = useState<
    Announcement[]
  >([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamManager, setTeamManager] = useState<TeamData["manager"] | null>(
    null,
  );
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [teamAttendance, setTeamAttendance] = useState<TeamAttendanceData>({
    summary: {
      totalMembers: 0,
      presentToday: 0,
      absentToday: 0,
      lateToday: 0,
    },
    teamMembers: [],
    attendance: [],
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null);
  const [isCurrentlyWorking, setIsCurrentlyWorking] = useState(false);
  const [clockedInTime, setClockedInTime] = useState<Date | null>(null);

  const router = useRouter();
  const isDev = process.env.NODE_ENV !== "production";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchDashboardData();
      fetchAttendanceStatus();
    }
  }, [mounted]);

  // Real-time clock for attendance timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchTeamAttendance = async () => {
    try {
      const response = await fetch("/api/attendance/team", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeamAttendance(data);
      }
    } catch (error) {
      console.error("Failed to fetch team attendance:", error);
    }
  };

  const fetchDepartmentAnnouncements = async () => {
    try {
      // Fetch all active announcements (no department filtering since departmentId was removed)
      const response = await fetch("/api/announcements?active=true", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDepartmentAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error("Failed to fetch department announcements:", error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard stats using credentials to include HttpOnly cookie
      const response = await fetch("/api/dashboard/stats", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error("Failed to fetch dashboard stats:", response.status);
      }
      if (!secondaryLoaded) {
        Promise.all([
          fetchDepartmentChart(),
          fetchRecentActivities(),
          fetchUpcomingBirthdays(),
          fetchAnniversaries(),
          fetchAnnouncements(),
          fetchTeamMembers(),
          fetchTeamAttendance(),
          fetchDepartmentAnnouncements(),
        ])
          .catch((error) => {
            if (isDev) {
              console.error("Failed to load secondary dashboard data:", error);
            }
          })
          .finally(() => {
            setSecondaryLoaded(true);
          });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentChart = async () => {
    try {
      const response = await fetch("/api/dashboard/charts/departments", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDepartmentData({
          labels: data.departments?.map((d: any) => d.name) || [
            "Engineering",
            "HR",
            "Sales",
            "Marketing",
          ],
          datasets: [
            {
              label: "Employees",
              data: data.departments?.map((d: any) => d.count) || [
                45, 12, 28, 15,
              ],
              backgroundColor: [
                "#3B82F6",
                "#10B981",
                "#F59E0B",
                "#EF4444",
                "#8B5CF6",
              ],
            },
          ],
        });
      }
    } catch (error) {
      console.error("Failed to fetch department chart:", error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const response = await fetch("/api/activities?limit=5", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const formatActivityTitle = (activity: Activity) => {
          if (activity.type === "employee_added") {
            return `New employee ${activity.targetEmployee?.firstName} ${activity.targetEmployee?.lastName} added by ${activity.performer?.firstName} ${activity.performer?.lastName}`;
          }
          if (activity.type === "leave_action") {
            // For leave actions, show the performer (admin/manager) and target employee
            const action = activity.title.toLowerCase().includes("approved")
              ? "approved"
              : "rejected";
            return `Leave request ${action} by ${activity.performer?.firstName} ${activity.performer?.lastName} for ${activity.targetEmployee?.firstName} ${activity.targetEmployee?.lastName}`;
          }
          if (activity.type === "attendance") {
            // For attendance, just show the employee name since they performed the action themselves
            return `${activity.performer?.firstName} ${activity.performer?.lastName} marked attendance`;
          }
          return activity.performer
            ? `${activity.title} by ${activity.performer.firstName} ${activity.performer.lastName}`
            : activity.title;
        };
        setActivities(
          data.activities.map((activity: Activity) => ({
            ...activity,
            title: formatActivityTitle(activity),
          })) || [],
        );
      } else {
        console.error(
          "Failed to fetch activities:",
          response.status,
          response.statusText,
        );
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    }
  };

  const fetchUpcomingBirthdays = async () => {
    try {
      const response = await fetch("/api/birthdays?days=30", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBirthdays(data.birthdays || []);
      }
    } catch (error) {
      console.error("Failed to fetch birthdays:", error);
    }
  };

  const fetchAnniversaries = async () => {
    try {
      const response = await fetch("/api/anniversaries?days=30", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (isDev) {
          console.log(
            "Anniversaries fetched:",
            data.anniversaries?.length || 0,
          );
        }
        setAnniversaries(data.anniversaries || []);
      }
    } catch (error) {
      console.error("Failed to fetch anniversaries:", error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch("/api/announcements?active=true", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch("/api/employees/team", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.teamMembers || []);
        setTeamManager(data.manager || null);
      }
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    }
  };

  const celebrations = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const birthdayItems: CelebrationItem[] = birthdays.map((birthday) => {
      const celebrationDate = new Date(today);
      celebrationDate.setDate(today.getDate() + birthday.daysUntil);

      const dateLabel = celebrationDate.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
      });

      return {
        id: birthday.id,
        employeeId: birthday.employeeId,
        name: formatName(birthday.firstName, birthday.lastName),
        type: "birthday",
        message: `${dateLabel} - Happy Birthday!`,
        profileImage: birthday.profileImage,
        daysUntil: birthday.daysUntil,
      } satisfies CelebrationItem;
    });

    const anniversaryItems: CelebrationItem[] = anniversaries.map(
      (anniversary) => {
        const celebrationDate = new Date(today);
        celebrationDate.setDate(today.getDate() + anniversary.daysUntil);

        const dateLabel = celebrationDate.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
        });

        return {
          id: anniversary.id,
          employeeId: anniversary.employeeId,
          name: formatName(anniversary.firstName, anniversary.lastName),
          type: "anniversary",
          message: `${dateLabel} - ${formatOrdinal(anniversary.years)} Anniversary`,
          profileImage: anniversary.profileImage,
          daysUntil: anniversary.daysUntil,
        } satisfies CelebrationItem;
      },
    );

    return [...birthdayItems, ...anniversaryItems].sort(
      (a, b) => a.daysUntil - b.daysUntil,
    );
  }, [birthdays, anniversaries]);

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
        setAttendanceStatus(data);
        setIsCurrentlyWorking(data.isCurrentlyWorking || false);
        setClockedInTime(
          data.clockedInTime ? new Date(data.clockedInTime) : null,
        );
      }
    } catch (error) {
      console.error("Failed to fetch attendance status:", error);
    }
  };

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const response = await fetch("/api/dashboard/charts/attendance", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.labels && data.datasets) {
            setAttendanceData(data);
          } else {
            console.error("Invalid attendance data format:", data);
          }
        } else {
          console.error("Failed to fetch attendance data:", response.status);
        }
      } catch (error) {
        console.error("Error fetching attendance data:", error);
      }
    };

    if (stats.userRole === "ADMINISTRATOR" || stats.userRole === "HR_MANAGER") {
      fetchAttendanceData();
    }
  }, [stats.userRole]);

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
          `Clocked in successfully at ${clockInDateTime.toLocaleTimeString()}`,
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
          `Clocked out successfully at ${clockOutDateTime.toLocaleTimeString()}`,
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

  // Helper function to format elapsed time from clock in
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

  // Helper function to format time as HH:MM:SS
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActivityIcon = (iconType: string) => {
    switch (iconType) {
      case "clock":
        return <ClockIcon className="h-4 w-4" />;
      case "user":
        return <UserGroupIcon className="h-4 w-4" />;
      case "calendar":
        return <CalendarDaysIcon className="h-4 w-4" />;
      case "cube":
        return <ChartBarIcon className="h-4 w-4" />;
      default:
        return <ExclamationTriangleIcon className="h-4 w-4" />;
    }
  };

  const getActivityColor = (color: string) => {
    switch (color) {
      case "green":
        return "bg-green-100";
      case "blue":
        return "bg-blue-100";
      case "yellow":
        return "bg-yellow-100";
      case "red":
        return "bg-red-100";
      case "purple":
        return "bg-purple-100";
      default:
        return "bg-gray-100";
    }
  };

  const formatActivityItem = (activity: Activity) => {
    const timestamp = new Date(activity.timestamp).toLocaleString();

    const renderNameLink = (name: string, id?: string) => {
      if (!id) return <span>{name}</span>;
      return (
        <Link
          href={`/dashboard/employees/${id}`}
          className="text-indigo-600 hover:underline"
        >
          {name}
        </Link>
      );
    };

    const formatTitle = () => {
      if (
        activity.type === "employee_added" &&
        activity.targetEmployee &&
        activity.performer
      ) {
        return (
          <>
            New employee{" "}
            {renderNameLink(
              `${activity.targetEmployee.firstName} ${activity.targetEmployee.lastName}`,
              activity.id.replace("employee_", ""),
            )}{" "}
            added by{" "}
            {renderNameLink(
              `${activity.performer.firstName} ${activity.performer.lastName}`,
              activity.id.replace("employee_", ""),
            )}
          </>
        );
      }
      if (activity.type === "leave_action") {
        // For leave actions, show the performer (admin/manager) and target employee
        const action = activity.title.toLowerCase().includes("approved")
          ? "approved"
          : "rejected";
        return `Leave request ${action} by ${activity.performer?.firstName} ${activity.performer?.lastName} for ${activity.targetEmployee?.firstName} ${activity.targetEmployee?.lastName}`;
      }
      if (activity.type === "attendance") {
        // For attendance, just show the employee name since they performed the action themselves
        return `${activity.performer?.firstName} ${activity.performer?.lastName} marked attendance`;
      }
      return activity.title;
    };

    return (
      <div
        key={activity.id}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
      >
        <div className="flex-shrink-0">
          <div
            className={`h-8 w-8 rounded-full ${getActivityColor(
              activity.color,
            )} flex items-center justify-center`}
          >
            <div className={`text-${activity.color}-600`}>
              {getActivityIcon(activity.icon)}
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {formatTitle()}
          </p>
          <p className="text-xs text-gray-500">{timestamp}</p>
        </div>
      </div>
    );
  };

  // Create role-based stat cards
  const createStatCards = () => {
    const baseCards = [];

    // Show different cards based on role
    if (!stats.isEmployee) {
      // HR/Admin cards - show all data
      if (stats.userRole === "DEPARTMENT_MANAGER") {
        // Department Manager cards - show team data
        baseCards.push({
          name: "Team Members",
          value: stats.totalEmployees,
          icon: UserGroupIcon,
          color: "bg-blue-500",
          change: "",
          changeType: "neutral" as const,
        });

        baseCards.push({
          name: "Team Present Today",
          value: stats.presentToday,
          icon: ClockIcon,
          color: "bg-green-500",
          change: "",
          changeType: "neutral" as const,
        });
      } else {
        // Admin/HR cards - show all organization data
        baseCards.push({
          name: "Total Employees",
          value: stats.totalEmployees,
          icon: UserGroupIcon,
          color: "bg-blue-500",
          change: "",
          changeType: "neutral" as const,
        });

        baseCards.push({
          name: "Present Today",
          value: stats.presentToday,
          icon: ClockIcon,
          color: "bg-green-500",
          change: "",
          changeType: "neutral" as const,
        });
      }
    }

    // Show pending leaves only for managers with appropriate permissions
    if (
      stats.userRole === "DEPARTMENT_MANAGER" ||
      stats.userRole === "HR_MANAGER" ||
      stats.userRole === "ADMINISTRATOR"
    ) {
      baseCards.push({
        name: "Pending Leaves",
        value: stats.pendingLeaves,
        icon: CalendarDaysIcon,
        color: "bg-yellow-500",
        change: "",
        changeType: "neutral" as const,
      });
    }

    return baseCards;
  };

  const statCards = createStatCards();

  // Online/Offline Status Management
  const {
    userStatuses,
    stats: statusStats,
    isLoading: statusLoading,
  } = useUserStatuses();
  const { createSession, updateSession } = useUserSession();

  // Initialize user session on mount (only for authenticated users)
  useEffect(() => {
    // Only create session if user is authenticated and we have stats
    if (stats && stats.userRole && !loading) {
      let sessionInitialized = false;

      const initSession = async () => {
        if (sessionInitialized) return;
        sessionInitialized = true;

        try {
          const sessionToken = await createSession();
          if (sessionToken && isDev) {
            console.log("Session initialized successfully");
          }
        } catch (error) {
          console.error("Failed to initialize session:", error);
          sessionInitialized = false;
        }
      };

      initSession();
    }
  }, [stats?.userRole, loading]); // Only run when we have user role info and not loading

  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  const handleAnnouncementClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowAnnouncementModal(true);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white overflow-hidden shadow rounded-lg h-32"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      {/* Welcome Section */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left Side - Welcome Text */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {stats.isEmployee
                ? "Welcome to Your Employee Dashboard"
                : stats.userRole === "DEPARTMENT_MANAGER"
                  ? "Welcome to Your Team Dashboard"
                  : "Welcome to Employee Management System"}
            </h2>
            <p className="text-gray-600">
              {stats.isEmployee
                ? "Here's your personal overview and team updates."
                : stats.userRole === "DEPARTMENT_MANAGER"
                  ? "Here's what's happening with your team today."
                  : "Here's what's happening in your organization today."}
            </p>
          </div>

          {/* Right Side - Attendance (Only Employee) */}
          {stats.isEmployee && (
            <div className="flex flex-col items-end gap-2 min-w-[220px]">
              {/* Live Timer */}
              {isCurrentlyWorking && (
                <span className="text-lg font-semibold text-green-600">
                  {getElapsedTime()}
                </span>
              )}

              {/* Clock In / Out Button */}
              <button
                onClick={() => {
                  if (isCurrentlyWorking) {
                    handleClockOut();
                  } else {
                    handleClockIn();
                  }
                }}
                disabled={attendanceLoading}
                className={`px-4 py-2 rounded-lg text-white font-medium transition flex items-center justify-center gap-2 ${
                  attendanceLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : isCurrentlyWorking
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {attendanceLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      ></path>
                    </svg>
                    <span>
                      {isCurrentlyWorking
                        ? "Clocking Out..."
                        : "Clocking In..."}
                    </span>
                  </>
                ) : isCurrentlyWorking ? (
                  "Clock Out"
                ) : (
                  "Clock In"
                )}
              </button>

              {/* Status Text */}
              {attendanceStatus && (
                <span className="text-xs text-gray-500">
                  Status: {attendanceStatus.status || "Not Marked"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${stat.color} rounded-md p-3`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            {/* Make team-related cards clickable */}
            {(stat.name === "Team Members" ||
              stat.name === "Team Present Today" ||
              stat.name === "Department Colleagues") && (
              <div className="bg-gray-50 px-5 py-3">
                <Link
                  href="/dashboard/team"
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  View all team members →
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Secondary Panel: Show News & Announcements to all roles */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            📢 News & Announcements
          </h3>
          <div className="space-y-2 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {announcements.length > 0 ? (
              announcements.map((announcement) => {
                const timeAgo = new Date(
                  announcement.createdAt,
                ).toLocaleString();
                return (
                  <div
                    key={announcement.id}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                    onClick={() => handleAnnouncementClick(announcement)}
                  >
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <BellIcon className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {announcement.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {timeAgo}
                      </p>
                      <p className="text-xs text-gray-600 truncate mt-1">
                        {announcement.content}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          announcement.priority === "HIGH"
                            ? "bg-red-100 text-red-700"
                            : announcement.priority === "MEDIUM"
                              ? "bg-yellow-100 text-yellow-700"
                              : announcement.priority === "LOW"
                                ? "bg-blue-100 text-blue-700"
                                : announcement.priority === "CRITICAL"
                                  ? "bg-red-200 text-red-900 font-semibold"
                                  : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {announcement.priority}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No announcements</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activities - Admin Only */}
        {stats.userRole === "ADMINISTRATOR" && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Activities
              </h3>
              <div className="space-y-2">
                {activities.length > 0 ? (
                  activities.map(formatActivityItem)
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">
                      No recent activities
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* News & Announcements and Upcoming Birthdays - Side by Side */}
        {/* Only show this section for HR/Admin roles, managers will see it in their dedicated section below */}

        <>
          {/* News & Announcements - Same UI as Recent Activities */}
          {/* <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                📢 News & Announcements
              </h3>
              <div className="space-y-3">
                {announcements.length > 0 ? (
                  announcements.map((announcement) => {
                    const timeAgo = new Date(
                      announcement.createdAt
                    ).toLocaleString();

                    return (
                      <div
                        key={announcement.id}
                        className="flex items-center space-x-3"
                      >
                        <div className="flex-shrink-0">
                          <div
                            className={`h-8 w-8 rounded-full ${
                              announcement.priority === "HIGH"
                                ? "bg-red-100"
                                : announcement.priority === "MEDIUM"
                                ? "bg-yellow-100"
                                : "bg-blue-100"
                            } flex items-center justify-center`}
                          >
                            <div
                              className={`${
                                announcement.priority === "HIGH"
                                  ? "text-red-600"
                                  : announcement.priority === "MEDIUM"
                                  ? "text-yellow-600"
                                  : "text-blue-600"
                              }`}
                            >
                              <ExclamationTriangleIcon className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {announcement.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {announcement.content}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {timeAgo}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No announcements</p>
                  </div>
                )}
              </div>
            </div>
          </div> */}

          {/* Announcement Detail Modal */}
          {showAnnouncementModal && selectedAnnouncement && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div
                  className="fixed inset-0 transition-opacity"
                  aria-hidden="true"
                  onClick={() => setShowAnnouncementModal(false)}
                >
                  <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                {/* Modal content */}
                <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                  <div className="absolute top-0 right-0 pt-4 pr-4">
                    <button
                      type="button"
                      className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={() => setShowAnnouncementModal(false)}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                  <div>
                    <div className="mt-3 text-left sm:mt-0">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {selectedAnnouncement.title}
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 mb-2">
                          Posted by: {selectedAnnouncement.author.firstName}{" "}
                          {selectedAnnouncement.author.lastName}
                          {selectedAnnouncement.author.department && (
                            <span className="text-gray-400">
                              {" "}
                              ({selectedAnnouncement.author.department.name})
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                          {new Date(
                            selectedAnnouncement.createdAt,
                          ).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                          {selectedAnnouncement.content}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6">
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                      onClick={() => setShowAnnouncementModal(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Online Users Section - HR/Admin/Department Managers Only */}
          {(stats.userRole === "ADMINISTRATOR" ||
            stats.userRole === "HR_MANAGER" ||
            stats.userRole === "DEPARTMENT_MANAGER") && (
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {stats.userRole === "DEPARTMENT_MANAGER"
                    ? `👥 Team Members Online (${statusStats.online})`
                    : `👥 Online Users (${statusStats.online})`}
                </h3>
                {!statusLoading ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {userStatuses.length > 0 ? (
                      userStatuses
                        .filter((user) => user.status === "ONLINE")
                        .map((user) => (
                          <div
                            key={user.userId}
                            className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex-shrink-0">
                              <Avatar
                                employeeId={user.userId}
                                employeeName={`${user.firstName} ${user.lastName}`}
                                profileImage={user.profileImage}
                                size="md"
                                showLink={true}
                                className="ring-1 ring-gray-100"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {user.department} • {user.designation}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              <StatusIndicator
                                status={user.status}
                                size="sm"
                                showLabel
                              />
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">
                          {userStatuses.length === 0 && statusStats.total === 0
                            ? "No users online"
                            : "Loading users..."}
                        </p>
                        {statusStats.total > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            Total users: {statusStats.total} (Online:{" "}
                            {statusStats.online}, Offline: {statusStats.offline}
                            )
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upcoming Birthdays Section - All Roles */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center space-x-2">
                  <SparklesIcon className="h-5 w-5 text-indigo-500" />
                  <span>🎉 Celebrations</span>
                </h3>
              </div>
              {celebrations.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {celebrations.map((celebration) => (
                    <div
                      key={`${celebration.type}-${celebration.id}`}
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex-shrink-0">
                        <Avatar
                          employeeId={celebration.employeeId}
                          employeeName={celebration.name}
                          profileImage={celebration.profileImage}
                          size="md"
                          showLink={false}
                          className="ring-1 ring-gray-100"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {celebration.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {celebration.message}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-gray-400">
                        {celebration.type === "birthday" ? (
                          <CakeIcon className="h-5 w-5" />
                        ) : (
                          <CalendarDaysIcon className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    No upcoming celebrations
                  </p>
                </div>
              )}
            </div>
          </div>
        </>

        {/* Charts Section */}
        {stats.userRole === "ADMINISTRATOR" ||
        stats.userRole === "HR_MANAGER" ? (
          /* HR/Admin Charts */
          <>
            {(stats.userRole === "ADMINISTRATOR" ||
              stats.userRole === "HR_MANAGER") &&
              attendanceData && (
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      📊 Daily Attendance Overview
                    </h3>
                    <div className="h-64">
                      <Line
                        data={attendanceData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) =>
                                  `${context.dataset.label}: ${context.formattedValue}%`,
                              },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 100,
                              ticks: {
                                stepSize: 20,
                                callback: (value) => `${value}%`,
                                count: 6,
                              },
                            },
                            x: {
                              ticks: {
                                autoSkip: false,
                                maxRotation: 45,
                                minRotation: 45,
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Department Distribution
                </h3>
                <div className="h-64">
                  {departmentData ? (
                    <Doughnut
                      data={departmentData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "right" as const,
                          },
                          title: {
                            display: true,
                            text: "Employee Count by Department",
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center bg-gray-50 rounded-lg h-full">
                      <p className="text-gray-500">
                        Loading department chart...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : !stats.isEmployee ? (
          /* Manager Dashboard - Using 2-column grid structure throughout */
          <>
            {/* First Row: News & Announcements and Upcoming Birthdays */}

            {/* News & Announcements */}
            {/* <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  📢 News & Announcements
                </h3>
                <div className="space-y-3">
                  {announcements.length > 0 ? (
                    announcements.map((announcement) => {
                      const timeAgo = new Date(
                        announcement.createdAt
                      ).toLocaleString();

                      return (
                        <div
                          key={announcement.id}
                          className="flex items-center space-x-3"
                        >
                          <div className="flex-shrink-0">
                            <div
                              className={`h-8 w-8 rounded-full ${
                                announcement.priority === "HIGH"
                                  ? "bg-red-100"
                                  : announcement.priority === "MEDIUM"
                                  ? "bg-yellow-100"
                                  : "bg-blue-100"
                              } flex items-center justify-center`}
                            >
                              <div
                                className={`${
                                  announcement.priority === "HIGH"
                                    ? "text-red-600"
                                    : announcement.priority === "MEDIUM"
                                    ? "text-yellow-600"
                                    : "text-blue-600"
                                }`}
                              >
                                <ExclamationTriangleIcon className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {announcement.title}
                            </p>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {announcement.content}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {timeAgo}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No announcements</p>
                    </div>
                  )}
                </div>
              </div>
            </div> */}

            {/* Second Row: Team Attendance and Performance Metrics */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  🕐 Team Attendance This Week
                </h3>
                <div className="h-64">
                  <div className="space-y-4">
                    {/* Current Week Attendance Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {teamAttendance.summary?.totalMembers || 0}
                        </div>
                        <div className="text-sm text-green-700">
                          Team Members
                        </div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {teamAttendance.summary?.presentToday || 0}
                        </div>
                        <div className="text-sm text-blue-700">
                          Present Today
                        </div>
                      </div>
                    </div>

                    {/* This Week's Daily Status */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        This Week's Status
                      </h4>
                      <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {[
                          { day: "Monday", index: 0 },
                          { day: "Tuesday", index: 1 },
                          { day: "Wednesday", index: 2 },
                          { day: "Thursday", index: 3 },
                          { day: "Friday", index: 4 },
                          { day: "Saturday", index: 5 },
                          { day: "Sunday", index: 6 },
                        ].map((item) => {
                          // Find attendance for this day of the current week
                          const attendance = teamAttendance.attendance?.find(
                            (a) => a.dayOfWeek === item.index + 1,
                          );

                          return (
                            <div
                              key={item.day}
                              className="flex items-center justify-between py-2 border-b border-gray-100"
                            >
                              <span className="text-sm text-gray-600">
                                {item.day}
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {attendance?.status || "No Data"}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {attendance?.clockIn
                                    ? `${new Date(
                                        attendance.clockIn,
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })} - ${
                                        attendance.clockOut
                                          ? new Date(
                                              attendance.clockOut,
                                            ).toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })
                                          : "Ongoing"
                                      }`
                                    : "-"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  📊 Team Performance Metrics
                </h3>
                <div className="h-64">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          85%
                        </div>
                        <div className="text-sm text-blue-700">
                          Avg. Performance
                        </div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          92%
                        </div>
                        <div className="text-sm text-green-700">
                          Task Completion
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        Top Performers
                      </h4>
                      <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {[
                          { name: "John Smith", score: 98 },
                          { name: "Sarah Johnson", score: 95 },
                          { name: "Michael Brown", score: 92 },
                          { name: "Emily Davis", score: 90 },
                          { name: "Robert Wilson", score: 88 },
                        ].map((performer, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between py-2 border-b border-gray-100"
                          >
                            <div className="flex items-center space-x-3">
                              <Avatar
                                employeeId={`performer-${index}`}
                                employeeName={performer.name}
                                size="sm"
                                showLink={false}
                                className="ring-1 ring-gray-100"
                              />
                              <span className="text-sm text-gray-900">
                                {performer.name}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {performer.score}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Employee Dashboard - Personal + Team Information */
          <div className="grid grid-cols-1 gap-6 lg:col-span-2">
            {/* Team Attendance Card */}
            {teamAttendance.teamMembers.length > 0 && (
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    👥 Team Attendance Today
                  </h3>
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {teamAttendance.summary.totalMembers}
                        </div>
                        <div className="text-sm text-blue-700">
                          Team Members
                        </div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {teamAttendance.summary.presentToday}
                        </div>
                        <div className="text-sm text-green-700">Present</div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {teamAttendance.summary.absentToday +
                            teamAttendance.summary.lateToday}
                        </div>
                        <div className="text-sm text-red-700">Not Present</div>
                      </div>
                    </div>

                    {/* Team Members List */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        Today's Status
                      </h4>
                      <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {teamAttendance.teamMembers.map((member) => {
                          const attendance = teamAttendance.attendance.find(
                            (a) => a.employeeId === member.id,
                          );

                          return (
                            <div
                              key={member.id}
                              className="flex items-center justify-between py-2 border-b border-gray-100"
                            >
                              <div className="flex items-center space-x-3">
                                <Avatar
                                  employeeId={member.id}
                                  employeeName={`${member.firstName} ${member.lastName}`}
                                  size="sm"
                                  showLink={true}
                                  className="ring-1 ring-gray-100"
                                />
                                <div>
                                  <span className="text-sm text-gray-900">
                                    {member.firstName} {member.lastName}
                                  </span>
                                  <span className="text-xs text-gray-500 block">
                                    {member.department?.name || "No Department"}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    getDisplayStatus(attendance).className
                                  }`}
                                >
                                  {getDisplayStatus(attendance).text}
                                </span>
                                {attendance?.clockIn && (
                                  <span className="text-xs text-gray-500 block">
                                    {new Date(
                                      attendance.clockIn,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
