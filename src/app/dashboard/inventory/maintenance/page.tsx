"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  WrenchScrewdriverIcon,
  PlusIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface MaintenanceRecord {
  id: string;
  asset: {
    id: string;
    assetCode: string;
    name: string;
    category: { name: string };
  };
  type: string;
  scheduledDate: string;
  completedDate?: string;
  status: string;
  serviceProvider?: string;
  technician?: string;
  cost?: number;
  description: string;
  workPerformed?: string;
  partsReplaced?: string;
  nextMaintenanceDate?: string;
}

export default function MaintenancePage() {
  const [maintenanceRecords, setMaintenanceRecords] = useState<
    MaintenanceRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchMaintenanceRecords();
  }, []);

  const fetchMaintenanceRecords = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/inventory/maintenance", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMaintenanceRecords(data.maintenanceRecords || []);
      }
    } catch (error) {
      console.error("Failed to fetch maintenance records:", error);
      toast.error("Failed to fetch maintenance records");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return <CalendarDaysIcon className="h-4 w-4" />;
      case "in_progress":
        return <ClockIcon className="h-4 w-4" />;
      case "completed":
        return <CheckCircleIcon className="h-4 w-4" />;
      case "overdue":
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <CalendarDaysIcon className="h-4 w-4" />;
    }
  };

  const filteredRecords = maintenanceRecords.filter((record) => {
    if (filterStatus === "all") return true;
    return record.status.toLowerCase() === filterStatus;
  });

  const upcomingMaintenance = maintenanceRecords.filter((record) => {
    const scheduledDate = new Date(record.scheduledDate);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return (
      record.status === "SCHEDULED" &&
      scheduledDate >= today &&
      scheduledDate <= nextWeek
    );
  });

  const overdueMaintenance = maintenanceRecords.filter((record) => {
    const scheduledDate = new Date(record.scheduledDate);
    const today = new Date();
    return record.status === "SCHEDULED" && scheduledDate < today;
  });

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            🔧 Maintenance Management
          </h1>
          <p className="text-gray-600">
            Schedule and track asset maintenance activities
          </p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Schedule Maintenance
        </button>
      </div>

      {/* Alert Cards */}
      {(upcomingMaintenance.length > 0 || overdueMaintenance.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {upcomingMaintenance.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <CalendarDaysIcon className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Upcoming Maintenance
                  </p>
                  <p className="text-sm text-blue-700">
                    {upcomingMaintenance.length} maintenance activities
                    scheduled for next 7 days
                  </p>
                </div>
              </div>
            </div>
          )}

          {overdueMaintenance.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Overdue Maintenance
                  </p>
                  <p className="text-sm text-red-700">
                    {overdueMaintenance.length} maintenance activities are
                    overdue
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Scheduled
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {
                      maintenanceRecords.filter((r) => r.status === "SCHEDULED")
                        .length
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    In Progress
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {
                      maintenanceRecords.filter(
                        (r) => r.status === "IN_PROGRESS"
                      ).length
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {
                      maintenanceRecords.filter((r) => r.status === "COMPLETED")
                        .length
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Overdue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {overdueMaintenance.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">
            Filter by Status:
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input max-w-xs"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Maintenance Records Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Maintenance Records
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheduled Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {record.asset.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {record.asset.assetCode} • {record.asset.category.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.type.replace("_", " ")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(record.scheduledDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        record.status
                      )}`}
                    >
                      {getStatusIcon(record.status)}
                      <span className="ml-1">
                        {record.status.replace("_", " ")}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.serviceProvider || "Internal"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.cost
                      ? `PKR ${record.cost.toLocaleString()}`
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        View
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRecords.length === 0 && (
            <div className="text-center py-12">
              <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-500">No maintenance records found</p>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Maintenance Modal */}
      {showScheduleModal && (
        <ScheduleMaintenanceModal
          onClose={() => setShowScheduleModal(false)}
          onMaintenanceScheduled={fetchMaintenanceRecords}
        />
      )}
    </div>
  );
}

// Schedule Maintenance Modal Component
function ScheduleMaintenanceModal({
  onClose,
  onMaintenanceScheduled,
}: {
  onClose: () => void;
  onMaintenanceScheduled: () => void;
}) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [assetId, setAssetId] = useState("");
  const [type, setType] = useState("PREVENTIVE");
  const [scheduledDate, setScheduledDate] = useState("");
  const [serviceProvider, setServiceProvider] = useState("");
  const [technician, setTechnician] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/inventory/assets", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
      toast.error("Failed to fetch assets");
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assetId || !scheduledDate || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/inventory/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assetId,
          type,
          scheduledDate,
          serviceProvider: serviceProvider || undefined,
          technician: technician || undefined,
          estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
          description,
        }),
      });

      if (response.ok) {
        toast.success("Maintenance scheduled successfully");
        onMaintenanceScheduled();
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to schedule maintenance");
      }
    } catch (error) {
      console.error("Failed to schedule maintenance:", error);
      toast.error("Failed to schedule maintenance");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Schedule Maintenance
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Asset <span className="required-asterisk">*</span>
              </label>
              {loadingAssets ? (
                <div className="mt-1 h-10 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <select
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">Select an asset</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.assetCode})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Maintenance Type <span className="required-asterisk">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="PREVENTIVE">Preventive</option>
                <option value="CORRECTIVE">Corrective</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="WARRANTY">Warranty</option>
                <option value="UPGRADE">Upgrade</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Scheduled Date <span className="required-asterisk">*</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Estimated Cost
              </label>
              <input
                type="number"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Service Provider
              </label>
              <input
                type="text"
                value={serviceProvider}
                onChange={(e) => setServiceProvider(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Service provider name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Technician
              </label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Technician name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description <span className="required-asterisk">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Describe the maintenance work to be performed"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Scheduling..." : "Schedule Maintenance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
