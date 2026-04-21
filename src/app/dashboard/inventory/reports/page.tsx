"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DocumentTextIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  CubeIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

export default function InventoryReportsPage() {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  const generateReport = async (reportType: string) => {
    setLoading(true);
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const params = new URLSearchParams({
        type: reportType,
        ...(dateRange.startDate && { startDate: dateRange.startDate }),
        ...(dateRange.endDate && { endDate: dateRange.endDate }),
      });

      const response = await fetch(`/api/inventory/reports?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();

        // Create a downloadable JSON file
        const blob = new Blob([JSON.stringify(data.report, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportType}-report-${
          new Date().toISOString().split("T")[0]
        }.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(`${reportType} report generated successfully`);
      } else {
        toast.error("Failed to generate report");
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const reportTypes = [
    {
      id: "asset_allocation",
      name: "Asset Allocation Report",
      description:
        "Current asset assignments and allocations by department and employee",
      icon: UserIcon,
      color: "bg-blue-50 border-blue-200 text-blue-700",
      iconColor: "text-blue-600",
    },
    {
      id: "asset_lifecycle",
      name: "Asset Lifecycle Report",
      description:
        "Comprehensive asset lifecycle including assignments, returns, maintenance, and disposals",
      icon: CubeIcon,
      color: "bg-green-50 border-green-200 text-green-700",
      iconColor: "text-green-600",
    },
    {
      id: "inventory_stock",
      name: "Inventory Stock Report",
      description:
        "Current stock levels, low stock alerts, and stock movements",
      icon: ChartBarIcon,
      color: "bg-purple-50 border-purple-200 text-purple-700",
      iconColor: "text-purple-600",
    },
    {
      id: "maintenance_summary",
      name: "Maintenance Summary Report",
      description:
        "Maintenance activities, costs, and upcoming scheduled maintenance",
      icon: WrenchScrewdriverIcon,
      color: "bg-yellow-50 border-yellow-200 text-yellow-700",
      iconColor: "text-yellow-600",
    },
    {
      id: "lost_damaged",
      name: "Lost & Damaged Assets Report",
      description: "Assets that are lost, damaged, or require attention",
      icon: ExclamationTriangleIcon,
      color: "bg-red-50 border-red-200 text-red-700",
      iconColor: "text-red-600",
    },
    {
      id: "depreciation",
      name: "Asset Depreciation Report",
      description: "Asset depreciation calculations and current values",
      icon: ChartBarIcon,
      color: "bg-gray-50 border-gray-200 text-gray-700",
      iconColor: "text-gray-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            📊 Inventory Reports
          </h1>
          <p className="text-gray-600">
            Generate comprehensive reports and analytics for inventory
            management
          </p>
        </div>
        <Link href="/dashboard/inventory" className="btn-secondary">
          Back to Inventory
        </Link>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Report Filters
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date (Optional)
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="input"
            />
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Leave dates empty to generate reports for all time periods
        </p>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <div
            key={report.id}
            className={`border rounded-lg p-6 ${report.color}`}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className={`flex-shrink-0 ${report.iconColor}`}>
                <report.icon className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-medium">{report.name}</h3>
              </div>
            </div>

            <p className="text-sm mb-6">{report.description}</p>

            <button
              onClick={() => generateReport(report.id)}
              disabled={loading}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>
        ))}
      </div>

      {/* Report Usage Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <DocumentTextIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              Report Usage Guidelines
            </h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                <strong>Asset Allocation Report:</strong> Use to track which
                employees have which assets assigned and identify unassigned
                assets.
              </p>
              <p>
                <strong>Asset Lifecycle Report:</strong> Comprehensive view of
                asset movement throughout their lifecycle including maintenance
                and disposal.
              </p>
              <p>
                <strong>Inventory Stock Report:</strong> Monitor stock levels
                and identify items that need reordering.
              </p>
              <p>
                <strong>Maintenance Summary:</strong> Track maintenance costs
                and schedule upcoming maintenance activities.
              </p>
              <p>
                <strong>Lost & Damaged Report:</strong> Identify assets that
                require attention or replacement.
              </p>
              <p>
                <strong>Depreciation Report:</strong> Calculate current asset
                values for financial reporting and insurance purposes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Quick Statistics
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">📊</div>
            <div className="text-sm text-gray-500">Reports Available</div>
            <div className="text-lg font-semibold text-gray-900">
              {reportTypes.length}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">📈</div>
            <div className="text-sm text-gray-500">Data Points</div>
            <div className="text-lg font-semibold text-gray-900">15+</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">🔄</div>
            <div className="text-sm text-gray-500">Real-time Data</div>
            <div className="text-lg font-semibold text-gray-900">Live</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">📋</div>
            <div className="text-sm text-gray-500">Export Format</div>
            <div className="text-lg font-semibold text-gray-900">JSON</div>
          </div>
        </div>
      </div>
    </div>
  );
}
