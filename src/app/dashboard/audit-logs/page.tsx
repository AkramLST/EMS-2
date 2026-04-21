"use client";

import { useEffect, useState } from "react";
import AuditLogger from "@/components/ui/AuditLogger";

export default function AuditLogsPage() {
  const [accessDenied, setAccessDenied] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkUserRoleAndFetchData = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const { user } = await response.json();
          if (user && user.role === 'ADMINISTRATOR') {
            setAccessDenied(false);
          } else {
            setAccessDenied(true);
          }
        } else {
          setAccessDenied(true);
        }
      } catch (error) {
        setAccessDenied(true);
      } finally {
        setAuthChecked(true);
      }
    };

    checkUserRoleAndFetchData();
  }, []);

  if (!authChecked) {
    return (
      <div className="space-y-6">
        <div className="h-96 bg-gray-200 rounded-lg"></div>
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
                Audit Logs Access Restricted
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  You do not have permission to access audit logs.
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
      <AuditLogger />
    </div>
  );
}
