"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  role: string;
  roles?: Array<{ role: string }>;
  employee?: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
}

export default function DebugAuthPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("Debug Auth - Fetching user data...");
        const response = await fetch('/api/auth/me', { credentials: 'include' });

        if (response.ok) {
          const { user } = await response.json();
          console.log("Debug Auth - User data received:", user);
          setUser(user);
        } else {
          console.log("Debug Auth - Failed to fetch user:", response.status, response.statusText);
          setError(`Failed to fetch user: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error("Debug Auth - Error:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">User Authentication Debug</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h2 className="text-red-800 font-medium">Error:</h2>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {user && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">User Information:</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">User ID:</h3>
              <p className="text-gray-700">{user.id}</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">Email:</h3>
              <p className="text-gray-700">{user.email}</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">Primary Role:</h3>
              <p className="text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">
                {user.role || 'No role set'}
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">Roles Array:</h3>
              {user.roles && user.roles.length > 0 ? (
                <div className="space-y-1">
                  {user.roles.map((roleObj, index) => (
                    <p key={index} className="text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">
                      {roleObj.role}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No roles array present</p>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-900">Employee Info:</h3>
              {user.employee ? (
                <div>
                  <p className="text-gray-700">{user.employee.firstName} {user.employee.lastName}</p>
                  <p className="text-gray-500 text-sm">Employee ID: {user.employee.employeeId}</p>
                </div>
              ) : (
                <p className="text-gray-500 italic">No employee data</p>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-900">Access Check:</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">ADMINISTRATOR:</span>
                  <span className={`px-2 py-1 text-xs rounded ${user.role === 'ADMINISTRATOR' || user.roles?.some(r => r.role === 'ADMINISTRATOR') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.role === 'ADMINISTRATOR' || user.roles?.some(r => r.role === 'ADMINISTRATOR') ? '✅ YES' : '❌ NO'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">SUPER_ADMIN:</span>
                  <span className={`px-2 py-1 text-xs rounded ${user.role === 'SUPER_ADMIN' || user.roles?.some(r => r.role === 'SUPER_ADMIN') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.role === 'SUPER_ADMIN' || user.roles?.some(r => r.role === 'SUPER_ADMIN') ? '✅ YES' : '❌ NO'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">HR_MANAGER:</span>
                  <span className={`px-2 py-1 text-xs rounded ${user.role === 'HR_MANAGER' || user.roles?.some(r => r.role === 'HR_MANAGER') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.role === 'HR_MANAGER' || user.roles?.some(r => r.role === 'HR_MANAGER') ? '✅ YES' : '❌ NO'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">HR_ADMIN:</span>
                  <span className={`px-2 py-1 text-xs rounded ${user.role === 'HR_ADMIN' || user.roles?.some(r => r.role === 'HR_ADMIN') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.role === 'HR_ADMIN' || user.roles?.some(r => r.role === 'HR_ADMIN') ? '✅ YES' : '❌ NO'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
