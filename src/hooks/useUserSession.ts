import { useState, useEffect, useCallback } from "react";
import { UserStatus } from "@/components/ui/StatusIndicator";
import { SESSION_THRESHOLDS } from "@/lib/session-status";

interface UserSession {
  id: string;
  status: UserStatus;
  lastActivity: string;
  deviceInfo?: any;
}

interface UserSessionData {
  status: UserStatus;
  sessions: UserSession[];
}

export function useUserSession() {
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<UserSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  // Generate unique session token
  const generateSessionToken = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Create new session
  const createSession = useCallback(async (deviceInfo?: any) => {
    // Don't create multiple sessions
    if (currentSession || isInitialized) {
      console.log("Session already exists or initialized, skipping creation");
      return currentSession;
    }

    try {
      setIsInitialized(true);
      const token = generateSessionToken();

      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          deviceInfo: deviceInfo || {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screenWidth: screen.width,
            screenHeight: screen.height,
          },
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentSession(data.session.token);
        await updateUserStatus();
        console.log("Session created successfully:", data.session.token);
        return data.session.token;
      } else if (response.status === 401) {
        // User is not authenticated, don't retry
        console.log("User not authenticated, skipping session creation");
        setIsInitialized(false);
        return null;
      }
    } catch (error) {
      console.error("Failed to create session:", error);
      setIsInitialized(false);
    }
    return null;
  }, [generateSessionToken, currentSession, isInitialized]);

  // Update session activity (with debouncing)
  const updateSession = useCallback(async (status: UserStatus = "ONLINE") => {
    if (!currentSession) return;

    // Debounce updates - don't update more than once per 30 seconds
    const now = Date.now();
    if (now - lastUpdateTime < SESSION_THRESHOLDS.heartbeatMs) {
      return;
    }

    try {
      setLastUpdateTime(now);
      await fetch("/api/sessions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          sessionToken: currentSession,
          status,
        }),
        keepalive: true,
      });

      await updateUserStatus();
    } catch (error) {
      console.error("Failed to update session:", error);
    }
  }, [currentSession, lastUpdateTime]);

  // End current session
  const endSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      await fetch(`/api/sessions?token=${currentSession}`, {
        method: "DELETE",
        credentials: "include",
      });

      setCurrentSession(null);
      setUserStatus(null);
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  }, [currentSession]);

  // Get user status
  const updateUserStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/sessions", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUserStatus(data);
      } else if (response.status === 401) {
        // User is not authenticated
        setUserStatus(null);
        setCurrentSession(null);
      }
    } catch (error) {
      console.error("Failed to fetch user status:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Activity tracking
  useEffect(() => {
    // Only set up activity tracking if user has a session
    if (!currentSession) return;

    let activityInterval: NodeJS.Timeout;
    let idleTimer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);

      // Update activity immediately
      updateSession("ONLINE");

      // Set idle detection after 5 minutes of inactivity
      idleTimer = setTimeout(() => {
        updateSession("AWAY");
      }, SESSION_THRESHOLDS.awayMs);
    };

    const handleActivity = () => {
      resetIdleTimer();
    };

    // Track user activity
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initial activity setup
    resetIdleTimer();

    // Update activity every 5 minutes (less frequent)
    activityInterval = setInterval(() => {
      updateSession("ONLINE");
    }, SESSION_THRESHOLDS.heartbeatMs);

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearInterval(activityInterval);
      clearTimeout(idleTimer);
    };
  }, [updateSession, currentSession]);

  // Update status on mount
  useEffect(() => {
    updateUserStatus();
  }, [updateUserStatus]);

  // Handle page visibility changes
  useEffect(() => {
    // Only handle visibility changes if user has a session
    if (!currentSession) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateSession("AWAY");
      } else {
        updateSession("ONLINE");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("pagehide", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("pagehide", handleVisibilityChange);
    };
  }, [updateSession, currentSession]);

  // Handle beforeunload
  useEffect(() => {
    const sendBeacon = (status: UserStatus) => {
      if (!currentSession) return;
      try {
        const payload = JSON.stringify({
          sessionToken: currentSession,
          status,
        });
        navigator.sendBeacon(
          "/api/sessions",
          new Blob([payload], { type: "application/json" })
        );
      } catch (err) {
        console.warn("Failed to send beacon, falling back to fetch", err);
        updateSession(status);
      }
    };

    const handleBeforeUnload = () => {
      sendBeacon("OFFLINE");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentSession, updateSession]);

  return {
    currentSession,
    userStatus,
    isLoading,
    createSession,
    updateSession,
    endSession,
    updateUserStatus,
  };
}
