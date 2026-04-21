"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";

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
  assignedTo?: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function AssetDetailsModal({
  isOpen,
  onClose,
  asset,
}: {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
}) {
  if (!isOpen || !asset) return null;

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
        return "bg-blue-100 text-blue-800";
      case "GOOD":
        return "bg-green-100 text-green-800";
      case "FAIR":
        return "bg-yellow-100 text-yellow-800";
      case "POOR":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
          &#8203;
        </span>
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={onClose}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Asset Details
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Asset Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="text-sm font-medium text-gray-900">
                        {asset.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Asset ID</p>
                      <p className="text-sm font-medium text-gray-900">
                        {asset.assetId}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Category</p>
                      <p className="text-sm font-medium text-gray-900">
                        {asset.category.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          asset.status
                        )}`}
                      >
                        {asset.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Condition</p>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConditionColor(
                          asset.condition || "UNKNOWN"
                        )}`}
                      >
                        {asset.condition || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Financial Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Purchase Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(asset.purchaseDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Purchase Cost</p>
                      <p className="text-sm font-medium text-gray-900">
                        ${asset.purchaseCost?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Current Value</p>
                      <p className="text-sm font-medium text-gray-900">
                        ${asset.currentValue?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Supplier</p>
                      <p className="text-sm font-medium text-gray-900">
                        {asset.supplier || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Warranty Expiry</p>
                      <p className="text-sm font-medium text-gray-900">
                        {asset.warrantyExpiry
                          ? new Date(asset.warrantyExpiry).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Location & Assignment
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="text-sm font-medium text-gray-900">
                        {asset.location || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Assigned To</p>
                      <p className="text-sm font-medium text-gray-900">
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
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Additional Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Notes</p>
                      <p className="text-sm font-medium text-gray-900">
                        {asset.notes || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Created</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(asset.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Updated</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(asset.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
