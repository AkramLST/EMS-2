"use client";

import { UserGroupIcon, ClockIcon, ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

type EmployeeMetricsProps = {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  newHires: number;
  avgTenure: number;
  openPositions: number;
  genderDiversity: {
    male: number;
    female: number;
    other: number;
  };
  growthPercentage: number;
};

export default function EmployeeMetrics({
  totalEmployees,
  activeEmployees,
  inactiveEmployees,
  newHires,
  avgTenure,
  openPositions,
  genderDiversity,
  growthPercentage,
}: EmployeeMetricsProps) {
  const getChangeIndicator = (value: number) => {
    if (value > 0) {
      return (
        <span className="inline-flex items-center text-green-600">
          <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
          {value}%
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="inline-flex items-center text-red-600">
          <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
          {Math.abs(value)}%
        </span>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* Total Employees */}
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
                  Total Employees
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {totalEmployees}
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

      {/* Active Employees */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-green-500 rounded-md p-3">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Active Employees
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {activeEmployees}
                  </div>
                  <div className="ml-2 text-sm text-gray-500">
                    {Math.round((activeEmployees / totalEmployees) * 100)}%
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Inactive Employees */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-yellow-500 rounded-md p-3">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Inactive Employees
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {inactiveEmployees}
                  </div>
                  <div className="ml-2 text-sm text-gray-500">
                    {Math.round((inactiveEmployees / totalEmployees) * 100)}%
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* New Hires */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-purple-500 rounded-md p-3">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  New Hires (30d)
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {newHires}
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
