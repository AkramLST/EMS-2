"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CubeIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  QrCodeIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface AssetDetails {
  id: string;
  assetCode: string;
  name: string;
  description?: string;
  category: { id: string; name: string };
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  status: string;
  condition: string;
  location?: string;
  depreciationRate?: number;
  residualValue?: number;
  usefulLife?: number;
  assignments: Array<{
    id: string;
    employee?: {
      firstName: string;
      lastName: string;
      employeeId: string;
      department?: { name: string };
    };
    assignedDate: string;
    returnDate?: string;
    status: string;
  }>;
  maintenanceRecords: Array<{
    id: string;
    type: string;
    scheduledDate: string;
    completedDate?: string;
    status: string;
    serviceProvider?: string;
    cost?: number;
    description: string;
  }>;
}

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;

  const [asset, setAsset] = useState<AssetDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    type: "PREVENTIVE",
    scheduledDate: "",
    description: "",
    serviceProvider: "",
    technician: "",
    estimatedCost: "",
  });

  useEffect(() => {
    if (assetId) {
      fetchAssetDetails();
    }
  }, [assetId]);

  const fetchAssetDetails = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch(`/api/inventory/assets/${assetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAsset(data.asset);
      } else {
        toast.error("Failed to fetch asset details");
        router.push("/dashboard/inventory");
      }
    } catch (error) {
      console.error("Failed to fetch asset details:", error);
      toast.error("Failed to fetch asset details");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-green-100 text-green-800";
      case "ASSIGNED":
        return "bg-blue-100 text-blue-800";
      case "IN_MAINTENANCE":
        return "bg-yellow-100 text-yellow-800";
      case "OUT_OF_ORDER":
        return "bg-orange-100 text-orange-800";
      case "RETIRED":
        return "bg-gray-100 text-gray-800";
      case "DISPOSED":
        return "bg-red-100 text-red-800";
      case "LOST":
        return "bg-red-200 text-red-900";
      case "STOLEN":
        return "bg-red-300 text-red-900";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleScheduleMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduling(true);

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
          ...maintenanceForm,
          cost: maintenanceForm.estimatedCost
            ? parseFloat(maintenanceForm.estimatedCost)
            : null,
        }),
      });

      if (response.ok) {
        toast.success("Maintenance scheduled successfully");
        setShowMaintenanceModal(false);
        setMaintenanceForm({
          type: "PREVENTIVE",
          scheduledDate: "",
          description: "",
          serviceProvider: "",
          technician: "",
          estimatedCost: "",
        });
        fetchAssetDetails(); // Refresh data
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to schedule maintenance");
      }
    } catch (error) {
      console.error("Failed to schedule maintenance:", error);
      toast.error("Failed to schedule maintenance");
    } finally {
      setScheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-12">
        <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Asset not found
        </h3>
        <div className="mt-6">
          <Link href="/dashboard/inventory" className="btn-primary">
            Back to Inventory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <Link
          href="/dashboard/inventory"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Inventory
        </Link>
        <div className="flex space-x-3">
          <Link
            href={`/dashboard/inventory/assets/${assetId}/edit`}
            className="btn-secondary"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Asset
          </Link>
          <button className="btn-secondary">
            <QrCodeIcon className="h-4 w-4 mr-2" />
            Generate QR Code
          </button>
        </div>
      </div>

      {/* Asset Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <CubeIcon className="h-12 w-12 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
              <p className="text-lg text-gray-600">Code: {asset.assetCode}</p>
              <p className="text-sm text-gray-500">{asset.category.name}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                asset.status
              )}`}
            >
              {asset.status.replace("_", " ")}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                asset.condition
              )}`}
            >
              {asset.condition.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="bg-gray-50 overflow-hidden rounded-lg p-4">
            <div className="flex items-center">
              <CalendarDaysIcon className="h-6 w-6 text-gray-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  Purchase Date
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {asset.purchaseDate
                    ? new Date(asset.purchaseDate).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 overflow-hidden rounded-lg p-4">
            <div className="flex items-center">
              <ChartBarIcon className="h-6 w-6 text-green-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  Purchase Value
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {asset.purchasePrice
                    ? `PKR ${asset.purchasePrice.toLocaleString()}`
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 overflow-hidden rounded-lg p-4">
            <div className="flex items-center">
              <UserIcon className="h-6 w-6 text-blue-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Assignments</p>
                <p className="text-lg font-semibold text-gray-900">
                  {asset.assignments.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 overflow-hidden rounded-lg p-4">
            <div className="flex items-center">
              <WrenchScrewdriverIcon className="h-6 w-6 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Maintenance</p>
                <p className="text-lg font-semibold text-gray-900">
                  {asset.maintenanceRecords.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: "details", name: "Asset Details", icon: DocumentTextIcon },
              { id: "assignments", name: "Assignments", icon: UserIcon },
              {
                id: "maintenance",
                name: "Maintenance",
                icon: WrenchScrewdriverIcon,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Asset Details Tab */}
          {activeTab === "details" && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Basic Information
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Asset Code
                    </dt>
                    <dd className="text-sm text-gray-900">{asset.assetCode}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="text-sm text-gray-900">{asset.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Category
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {asset.category.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Description
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {asset.description || "N/A"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Serial Number
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {asset.serialNumber || "N/A"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Location
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {asset.location || "N/A"}
                    </dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Financial Information
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Purchase Price
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {asset.purchasePrice
                        ? `PKR ${asset.purchasePrice.toLocaleString()}`
                        : "N/A"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Purchase Date
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {asset.purchaseDate
                        ? new Date(asset.purchaseDate).toLocaleDateString()
                        : "N/A"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* Assignments Tab */}
          {activeTab === "assignments" && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                Assignment History
              </h3>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Assigned Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Return Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {asset.assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {assignment.employee
                            ? `${assignment.employee.firstName} ${assignment.employee.lastName}`
                            : "Unassigned"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(
                            assignment.assignedDate
                          ).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {assignment.returnDate
                            ? new Date(
                                assignment.returnDate
                              ).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              assignment.status
                            )}`}
                          >
                            {assignment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === "maintenance" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Maintenance History
                </h3>
                <button
                  onClick={() => setShowMaintenanceModal(true)}
                  className="btn-primary"
                >
                  <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
                  Schedule Maintenance
                </button>
              </div>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Scheduled Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {asset.maintenanceRecords.map((maintenance) => (
                      <tr key={maintenance.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {maintenance.type.replace("_", " ")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(
                            maintenance.scheduledDate
                          ).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              maintenance.status
                            )}`}
                          >
                            {maintenance.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {maintenance.cost
                            ? `PKR ${maintenance.cost.toLocaleString()}`
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Maintenance Scheduling Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Schedule Maintenance
              </h3>
              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleMaintenance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maintenance Type
                </label>
                <select
                  value={maintenanceForm.type}
                  onChange={(e) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      type: e.target.value,
                    })
                  }
                  className="input w-full"
                  required
                >
                  <option value="PREVENTIVE">Preventive</option>
                  <option value="CORRECTIVE">Corrective</option>
                  <option value="EMERGENCY">Emergency</option>
                  <option value="WARRANTY">Warranty</option>
                  <option value="UPGRADE">Upgrade</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  value={maintenanceForm.scheduledDate}
                  onChange={(e) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      scheduledDate: e.target.value,
                    })
                  }
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={maintenanceForm.description}
                  onChange={(e) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="input w-full"
                  placeholder="Describe the maintenance work to be performed..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Provider
                </label>
                <input
                  type="text"
                  value={maintenanceForm.serviceProvider}
                  onChange={(e) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      serviceProvider: e.target.value,
                    })
                  }
                  className="input w-full"
                  placeholder="Internal or external service provider"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Technician
                </label>
                <input
                  type="text"
                  value={maintenanceForm.technician}
                  onChange={(e) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      technician: e.target.value,
                    })
                  }
                  className="input w-full"
                  placeholder="Assigned technician name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Cost
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={maintenanceForm.estimatedCost}
                  onChange={(e) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      estimatedCost: e.target.value,
                    })
                  }
                  className="input w-full"
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMaintenanceModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduling}
                  className="btn-primary"
                >
                  {scheduling ? "Scheduling..." : "Schedule Maintenance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
