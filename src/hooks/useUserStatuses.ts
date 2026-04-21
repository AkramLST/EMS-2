import { useState, useEffect, useCallback } from "react";
import { UserStatus } from "@/components/ui/StatusIndicator";

interface UserStatusInfo {
  userId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
  profileImage?: string | null;
  status: UserStatus;
  lastActivity: string | null;
  sessions: any[];
}

interface UserStatusesResponse {
  users: UserStatusInfo[];
  total: number;
  online: number;
  away: number;
  busy: number;
  offline: number;
}

export function useUserStatuses() {
  const [userStatuses, setUserStatuses] = useState<UserStatusInfo[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    away: 0,
    busy: 0,
    offline: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserStatuses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("🔄 Fetching user statuses...");
      const response = await fetch("/api/sessions/status", {
        credentials: "include",
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log("📦 Response data:", data);

        // Handle the response format
        if (data.users !== undefined) {
          setUserStatuses(data.users);
          setStats({
            total: data.total,
            online: data.online,
            away: data.away,
            busy: data.busy,
            offline: data.offline,
          });
          console.log("✅ Successfully loaded user statuses:", {
            total: data.total,
            online: data.online,
            usersCount: data.users.length,
            userStatuses: data.users.map((u: any) => `${u.firstName} ${u.lastName}: ${u.status}`)
          });

          // Show debug info if available
          if (data.debug) {
            console.log("🔍 Debug information:", data.debug);
          }
        } else {
          console.error("❌ Unexpected response format:", data);
          setError("Invalid response format: " + JSON.stringify(data));
        }
      } else if (response.status === 401) {
        console.log("🚫 Unauthorized - user not authenticated");
        setUserStatuses([]);
        setStats({ total: 0, online: 0, away: 0, busy: 0, offline: 0 });
        setError(null);
      } else if (response.status === 403) {
        console.log("🚫 Forbidden - insufficient permissions");
        setError("Insufficient permissions to view user statuses");
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ API error:", response.status, errorData);

        // Show debug information if available
        if (errorData.debug) {
          console.log("🔍 Debug information:", errorData.debug);
          setError(`${errorData.message} [${errorData.debug.error || 'UNKNOWN'}] - Department: ${errorData.debug.departmentId || 'N/A'}`);
        } else {
          setError(errorData.message || "Failed to fetch user statuses");
        }
      }
    } catch (error) {
      console.error("💥 Error fetching user statuses:", error);
      setError("Failed to fetch user statuses");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserStatuses();
  }, [fetchUserStatuses]);

  // Auto-refresh every 2 minutes (less frequent)
  useEffect(() => {
    const interval = setInterval(fetchUserStatuses, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchUserStatuses]);

  const getUserStatus = useCallback(
    (userId: string) => {
      return userStatuses.find((user) => user.userId === userId);
    },
    [userStatuses]
  );

  const getUsersByStatus = useCallback(
    (status: UserStatus) => {
      return userStatuses.filter((user) => user.status === status);
    },
    [userStatuses]
  );

  const getStatusColor = useCallback((status: UserStatus) => {
    switch (status) {
      case "ONLINE":
        return "text-green-600";
      case "AWAY":
        return "text-yellow-600";
      case "BUSY":
        return "text-red-600";
      case "OFFLINE":
        return "text-gray-500";
      default:
        return "text-gray-500";
    }
  }, []);

  return {
    userStatuses,
    stats,
    isLoading,
    error,
    fetchUserStatuses,
    getUserStatus,
    getUsersByStatus,
    getStatusColor,
  };
}
