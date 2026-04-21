"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import AssetForm from "@/components/ui/AssetForm";
import AssetDetailsModal from "@/components/ui/AssetDetailsModal";
import Pagination from "@/components/ui/Pagination";
import { usePermissions } from "@/hooks/usePermission";
interface Asset {
  id: string;
  name: string;
  assetId: string;
  category: {
    id: string;
    name: string;
  };
  status: string;
  purchaseDate: string;
  purchaseCost: number;
  currentValue: number;
  location?: string;
  condition?: string;
  notes?: string;
  supplier?: string;
  warrantyExpiry?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
}

export default function AssetsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  const { permissions } = usePermissions(currentUser?.role || "");
  const router = useRouter();
  const [accessDenied, setAccessDenied] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalAssets, setTotalAssets] = useState(0);
  const hasPermission = (perm: string) => {
    if (currentUser?.role === "ADMINISTRATOR") return true;
    return permissions.includes(perm);
  };
  useEffect(() => {
    const checkUserRoleAndFetchData = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const { user } = await response.json();
          if (user) {
            setCurrentUser(user);
            setAccessDenied(false);
            fetchAssets();
          }
        } else {
          setAccessDenied(true);
          setLoading(false);
        }
      } catch (error) {
        setAccessDenied(true);
        setLoading(false);
      } finally {
        setAuthChecked(true);
      }
    };

    checkUserRoleAndFetchData();
  }, []);

  useEffect(() => {
    if (!accessDenied) {
      fetchAssets();
    }
  }, [currentPage, itemsPerPage, searchTerm]);

  const fetchAssets = async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());
      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await fetch(
        `/api/inventory/assets?${params.toString()}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
        setTotalAssets(data.pagination?.total || data.assets?.length || 0);
      } else {
        toast.error("Failed to fetch assets");
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
      toast.error("Failed to fetch assets");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    try {
      const response = await fetch(`/api/inventory/assets/${assetId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Asset deleted successfully");
        fetchAssets(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete asset");
      }
    } catch (error) {
      console.error("Failed to delete asset:", error);
      toast.error("Failed to delete asset");
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

  const filteredAssets = assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.category.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  if (!authChecked || loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Assets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage company assets and inventory
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <div className="relative rounded-md shadow-sm">
            <input
              type="text"
              className="input pl-10"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          {hasPermission("inventory.create") && (
            <button
              onClick={() => {
                setEditingAsset(null);
                setShowForm(true);
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Asset</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <svg
                  className="h-6 w-6 text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Assets
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {totalAssets}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <svg
                  className="h-6 w-6 text-green-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {
                        assets.filter((asset) => asset.status === "ACTIVE")
                          .length
                      }
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                <svg
                  className="h-6 w-6 text-yellow-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Maintenance
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {
                        assets.filter((asset) => asset.status === "MAINTENANCE")
                          .length
                      }
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gray-100 rounded-md p-3">
                <svg
                  className="h-6 w-6 text-gray-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Disposed
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {
                        assets.filter((asset) => asset.status === "DISPOSED")
                          .length
                      }
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Asset Inventory
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            List of all company assets
          </p>
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
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No assets found
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {asset.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {asset.assetId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {asset.category.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          asset.status,
                        )}`}
                      >
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {asset.assignedTo ? (
                        <>
                          <div>
                            {asset.assignedTo.firstName}{" "}
                            {asset.assignedTo.lastName}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {asset.assignedTo.employeeId}
                          </div>
                        </>
                      ) : (
                        "Unassigned"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(asset.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${asset.currentValue?.toFixed(2) || "0.00"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        {hasPermission("inventory.update") && (
                          <button
                            onClick={() => {
                              setEditingAsset(asset);
                              setShowForm(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        )}
                        {hasPermission("inventory.delete") && (
                          <button
                            onClick={() => handleDelete(asset.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {assets.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalAssets / itemsPerPage)}
          totalItems={totalAssets}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}

      {/* Asset Form Modal */}
      <AssetForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingAsset(null);
        }}
        asset={
          editingAsset
            ? {
                ...editingAsset,
                categoryId: editingAsset.category.id,
                purchasePrice: editingAsset.purchaseCost,
              }
            : null
        }
        onSuccess={() => {
          fetchAssets();
          setShowForm(false);
          setEditingAsset(null);
        }}
      />

      {/* Asset Details Modal */}
      <AssetDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        asset={selectedAsset}
      />
    </div>
  );
}
