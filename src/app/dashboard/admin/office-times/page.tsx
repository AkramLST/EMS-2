"use client";

import { useEffect, useState } from "react";
import { getOfficeTimes } from "@/lib/officeTimes";
import OfficeTimeForm from "@/components/admin/OfficeTimeForm";

export default function OfficeTimeSettings() {
  const [officeTimes, setOfficeTimes] = useState({ startTime: '09:00', endTime: '17:00', graceTime: 60 });
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const refreshData = async () => {
    try {
      console.log('🔄 refreshData called');
      const response = await fetch('/api/admin/office-times', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Refreshed office times received:', data);
        setOfficeTimes({
          startTime: data.startTime,
          endTime: data.endTime,
          graceTime: data.graceTime || 60
        });
        
        console.log('✅ State updated with:', { startTime: data.startTime, endTime: data.endTime });
      } else {
        console.error('❌ Failed to fetch office times:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Failed to refresh office times:', error);
    }
  };

  useEffect(() => {
    const checkUserRoleAndFetchData = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (response.ok) {
          const { user } = await response.json();
          console.log("Office Times - User object:", user);
          console.log("Office Times - User role:", user?.role);
          console.log("Office Times - User roles array:", user?.roles);

          // Check if user has ADMINISTRATOR role
          const allowedRoles = ['ADMINISTRATOR', 'SUPER_ADMIN', 'HR_MANAGER', 'HR_ADMIN'];
          const userRole = user?.role;

          if (!userRole || !allowedRoles.includes(userRole)) {
            console.log("Office Times - Access denied. User role:", userRole, "Allowed roles:", allowedRoles);
            setAccessDenied(true);
            setAuthChecked(true);
            setLoading(false);
            return;
          }

          setAccessDenied(false);

          // Fetch office times
          try {
            console.log('🏢 Fetching initial office times...');
            const response = await fetch('/api/admin/office-times', {
              credentials: 'include'
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log('📋 Initial office times loaded:', data);
              setOfficeTimes({
                startTime: data.startTime,
                endTime: data.endTime,
                graceTime: data.graceTime || 60
              });
              
              console.log('✅ Initial state set to:', { startTime: data.startTime, endTime: data.endTime });
            } else {
              console.error('❌ Failed to fetch initial office times:', response.status, response.statusText);
            }
          } catch (error) {
            console.error('❌ Office Times - Failed to fetch office times:', error);
            // Don't deny access if fetching fails, just use defaults
          }
        } else {
          console.log("Office Times - Auth API failed:", response.status, response.statusText);
          setAccessDenied(true);
        }
      } catch (error) {
        console.error("Office Times - Auth API error:", error);
        setAccessDenied(true);
      } finally {
        setAuthChecked(true);
        setLoading(false);
      }
    };

    checkUserRoleAndFetchData();
  }, []);

  if (!authChecked || loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
        </div>
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
                Office Hours Settings Access Restricted
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  You do not have permission to access office hours settings.
                </p>
                <p className="mt-1">
                  Required roles: ADMINISTRATOR, SUPER_ADMIN, HR_MANAGER, or HR_ADMIN
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
      {/* Header - matches user management */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Office Hours Settings
          </h1>
          <p className="text-gray-600">
            Configure standard working hours for attendance tracking
          </p>
        </div>
      </div>

      {/* Form container - matches table styling */}
      <div className="bg-white shadow rounded-lg">
        <OfficeTimeForm
          initialStartTime={officeTimes.startTime}
          initialEndTime={officeTimes.endTime}
          initialGraceTime={officeTimes.graceTime}
          onSaveSuccess={refreshData}
        />
      </div>
    </div>
  );
}
