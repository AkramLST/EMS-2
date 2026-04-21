"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CubeIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  UsersIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  QrCodeIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface Asset {
  id: string;
  assetCode: string;
  name: string;
  description?: string;
  category: {
    id: string;
    name: string;
  };
  status: string;
  condition: string;
  serialNumber?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  warrantyEndDate?: string;
  assignments: Array<{
    id: string;
    employee: {
      firstName: string;
      lastName: string;
      employeeId: string;
    };
    status: string;
    assignedDate: string;
  }>;
}

interface InventoryStats {
  assets: {
    total: number;
    available: number;
    assigned: number;
    byStatus: Record<string, number>;
    totalValue: number;
    needingAttention: number;
  };
  assignments: {
    active: number;
    overdue: number;
    employeesWithAssets: number;
    totalAssignments: number;
  };
  maintenance: {
    upcoming: number;
  };
  alerts: {
    warrantyExpiring: number;
    lowStock: number;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department: { name: string };
}

export default function InventoryPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    // Fetch user role from auth API
    const fetchUserRole = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUserRole(userData.user.role);

          // Redirect if user is an employee
          if (userData.user.role === "EMPLOYEE") {
            router.push("/dashboard");
          }
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };

    fetchUserRole();
  }, [router]);

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const [statsResponse, assetsResponse, employeesResponse] =
        await Promise.all([
          fetch("/api/inventory/dashboard", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/inventory/assets", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/employees", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      if (assetsResponse.ok) {
        const assetsData = await assetsResponse.json();
        setAssets(assetsData.assets || []);
      }

      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        setEmployees(employeesData.employees || []);
      }
    } catch (error) {
      console.error("Failed to fetch inventory data:", error);
      toast.error("Failed to fetch inventory data");
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

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "NEW":
      case "EXCELLENT":
        return "bg-green-100 text-green-800";
      case "GOOD":
        return "bg-blue-100 text-blue-800";
      case "FAIR":
        return "bg-yellow-100 text-yellow-800";
      case "POOR":
      case "DAMAGED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assetCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || asset.status === filterStatus;
    const matchesCategory =
      filterCategory === "all" || asset.category.id === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleAssignAsset = async (assetId: string, employeeId: string) => {
    setAssigning(true);
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/inventory/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assetId,
          employeeId,
          purpose: "General Assignment",
        }),
      });

      if (response.ok) {
        toast.success("Asset assigned successfully");
        setShowAssignModal(false);
        setSelectedAsset(null);
        fetchInventoryData(); // Refresh data
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to assign asset");
      }
    } catch (error) {
      console.error("Failed to assign asset:", error);
      toast.error("Failed to assign asset");
    } finally {
      setAssigning(false);
    }
  };

  const openAssignModal = (asset: Asset) => {
    if (asset.status !== "AVAILABLE") {
      toast.error("Asset must be available to assign");
      return;
    }
    setSelectedAsset(asset);
    setShowAssignModal(true);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
          {[...Array(4)].map((_, i) => (
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
            📦 Inventory & Asset Management
          </h1>
          <p className="text-gray-600">
            Manage company assets, track assignments, and monitor inventory
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/dashboard/inventory/maintenance"
            className="btn-secondary"
          >
            <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
            Maintenance
          </Link>
          <Link href="/dashboard/inventory/reports" className="btn-secondary">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Reports
          </Link>
          <Link href="/dashboard/inventory/assets/new" className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Asset
          </Link>
        </div>
      </div>

      {/* Alert Cards */}
      {stats &&
        (stats.alerts.warrantyExpiring > 0 ||
          stats.alerts.lowStock > 0 ||
          stats.assignments.overdue > 0) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.alerts.warrantyExpiring > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Warranty Expiring Soon
                    </p>
                    <p className="text-sm text-yellow-700">
                      {stats.alerts.warrantyExpiring} assets warranty expiring
                      in 30 days
                    </p>
                  </div>
                </div>
              </div>
            )}

            {stats.assignments.overdue > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-red-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Overdue Returns
                    </p>
                    <p className="text-sm text-red-700">
                      {stats.assignments.overdue} assets are overdue for return
                    </p>
                  </div>
                </div>
              </div>
            )}

            {stats.alerts.lowStock > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CubeIcon className="h-5 w-5 text-orange-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">
                      Low Stock Items
                    </p>
                    <p className="text-sm text-orange-700">
                      {stats.alerts.lowStock} items below reorder level
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CubeIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Assets
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.assets.total}
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
                  <CubeIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Available
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.assets.available}
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
                  <UserIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Assigned Assets
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.assets.assigned}
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
                  <UsersIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Employees w/ Assets
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.assignments.employeesWithAssets}
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
                  <WrenchScrewdriverIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Maintenance Due
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.maintenance.upcoming}
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
                  <ChartBarIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Value
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      PKR {stats.assets.totalValue?.toLocaleString() || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_MAINTENANCE">In Maintenance</option>
              <option value="OUT_OF_ORDER">Out of Order</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Assets Catalog</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Condition
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {asset.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {asset.assetCode}
                      </div>
                      {asset.serialNumber && (
                        <div className="text-xs text-gray-400">
                          S/N: {asset.serialNumber}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {asset.category.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        asset.status
                      )}`}
                    >
                      {asset.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConditionColor(
                        asset.condition
                      )}`}
                    >
                      {asset.condition}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {asset.assignments?.find((a) => a.status === "ASSIGNED") ? (
                      <div>
                        <div className="font-medium">
                          {
                            asset.assignments.find(
                              (a) => a.status === "ASSIGNED"
                            )?.employee.firstName
                          }{" "}
                          {
                            asset.assignments.find(
                              (a) => a.status === "ASSIGNED"
                            )?.employee.lastName
                          }
                        </div>
                        <div className="text-xs text-gray-400">
                          {
                            asset.assignments.find(
                              (a) => a.status === "ASSIGNED"
                            )?.employee.employeeId
                          }
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {asset.purchasePrice
                      ? `PKR ${asset.purchasePrice.toLocaleString()}`
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link
                        href={`/dashboard/inventory/assets/${asset.id}`}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <button
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit Asset"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {asset.status === "AVAILABLE" && (
                        <button
                          onClick={() => openAssignModal(asset)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Assign to Employee"
                        >
                          <UserIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        className="text-green-600 hover:text-green-900"
                        title="Generate QR Code"
                      >
                        <QrCodeIcon className="h-4 w-4" />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900"
                        title="Delete Asset"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAssets.length === 0 && (
            <div className="text-center py-12">
              <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-500">No assets found</p>
            </div>
          )}
        </div>
      </div>

      {/* Asset Assignment Modal */}
      {showAssignModal && selectedAsset && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Assign Asset: {selectedAsset.name}
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedAsset(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Asset Code: {selectedAsset.assetCode}
              </p>
              <p className="text-sm text-gray-600">
                Category: {selectedAsset.category.name}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const employeeId = formData.get("employeeId") as string;
                if (employeeId) {
                  handleAssignAsset(selectedAsset.id, employeeId);
                }
              }}
            >
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employee
                </label>
                <select name="employeeId" className="input w-full" required>
                  <option value="">Choose an employee...</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} (
                      {employee.employeeId}) - {employee.department.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedAsset(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="btn-primary"
                >
                  {assigning ? "Assigning..." : "Assign Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
