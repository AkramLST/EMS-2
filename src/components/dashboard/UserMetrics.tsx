"use client";

import { UserGroupIcon, CheckCircleIcon, XCircleIcon, UserPlusIcon } from '@heroicons/react/24/outline';

type UserMetricsProps = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsers: number;
  avgAccountAge: number;
  growthPercentage: number;
  usersByRole?: {
    role: string;
    count: number;
  }[];
  roleDistribution?: {
    administrators: number;
    hrManagers: number;
    departmentManagers: number;
    employees: number;
    payrollOfficers: number;
    systemAuditors: number;
  };
};

export default function UserMetrics({
  totalUsers,
  activeUsers,
  inactiveUsers,
  newUsers,
  avgAccountAge,
  growthPercentage,
  usersByRole = [],
  roleDistribution = {
    administrators: 0,
    hrManagers: 0,
    departmentManagers: 0,
    employees: 0,
    payrollOfficers: 0,
    systemAuditors: 0
  }
}: UserMetricsProps) {
  const getChangeIndicator = (value: number) => {
    if (value > 0) {
      return (
        <span className="inline-flex items-center text-green-600">
          <UserPlusIcon className="h-4 w-4 mr-1" />
          {value}%
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="inline-flex items-center text-red-600">
          <UserPlusIcon className="h-4 w-4 mr-1" />
          {Math.abs(value)}%
        </span>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* Total Users */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-blue-500 rounded-md p-3">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Users
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {totalUsers}
                  </div>
                  <div className="ml-2 text-sm text-gray-500">
                    {getChangeIndicator(growthPercentage)}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Active Users */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-green-500 rounded-md p-3">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Active Users
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {activeUsers}
                  </div>
                  <div className="ml-2 text-sm text-gray-500">
                    {Math.round((activeUsers / totalUsers) * 100)}%
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Inactive Users */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-yellow-500 rounded-md p-3">
                <XCircleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Inactive Users
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {inactiveUsers}
                  </div>
                  <div className="ml-2 text-sm text-gray-500">
                    {Math.round((inactiveUsers / totalUsers) * 100)}%
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* New Users */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-purple-500 rounded-md p-3">
                <UserPlusIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  New Users (30d)
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {newUsers}
                  </div>
                  <div className="ml-2 text-sm text-gray-500">
                    Avg: {avgAccountAge}d
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
