// hooks/usePermissions.ts
"use client";

import { useEffect, useState } from "react";

interface UsePermissionsReturn {
  permissions: string[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePermissions(role?: string): UsePermissionsReturn {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = async () => {
    if (!role) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/permission-nme?role=${role}`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch permissions");
      }

      const data = await res.json();

      setPermissions(data.permissions || []);
    } catch (err: any) {
      console.error("Permission fetch error:", err);
      setError(err.message || "Something went wrong");

      // ✅ Optional fallback (important for resilience)
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [role]);

  return {
    permissions,
    loading,
    error,
    refetch: fetchPermissions,
  };
}
