"use client";

import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface Asset {
  id?: string;
  name: string;
  assetId?: string;
  categoryId: string;
  status: string;
  purchaseDate: string;
  purchasePrice?: number;
  location?: string;
  condition?: string;
  notes?: string;
  supplier?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}

export default function AssetForm({
  isOpen,
  onClose,
  asset,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  asset?: Asset | null;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<Asset>({
    name: "",
    categoryId: "",
    status: "AVAILABLE",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchasePrice: 0,
    location: "",
    condition: "GOOD",
    notes: "",
    supplier: "",
    warrantyStartDate: "",
    warrantyEndDate: "",
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    categoryId: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchEmployees();
      if (asset) {
        setFormData({
          name: asset.name || "",
          categoryId: asset.categoryId || "",
          status: asset.status || "AVAILABLE",
          purchaseDate:
            asset.purchaseDate || new Date().toISOString().split("T")[0],
          purchasePrice: asset.purchasePrice || 0,
          location: asset.location || "",
          condition: asset.condition || "GOOD",
          notes: asset.notes || "",
          supplier: asset.supplier || "",
          warrantyStartDate: asset.warrantyStartDate || "",
          warrantyEndDate: asset.warrantyEndDate || "",
        });
        // Check if asset is assigned to someone
        if (asset.id) {
          fetchAssetAssignment(asset.id);
        }
      } else {
        // Reset form for new asset
        setFormData({
          name: "",
          categoryId: "",
          status: "AVAILABLE",
          purchaseDate: new Date().toISOString().split("T")[0],
          purchasePrice: 0,
          location: "",
          condition: "GOOD",
          notes: "",
          supplier: "",
          warrantyStartDate: "",
          warrantyEndDate: "",
        });
        setAssignedTo("");
        // Clear errors for new asset
        setFieldErrors({ name: "", categoryId: "" });
      }
    }
  }, [isOpen, asset]);

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const response = await fetch("/api/inventory/categories", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const response = await fetch("/api/employees", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setEmployeesLoading(false);
    }
  };

  const fetchAssetAssignment = async (assetId: string) => {
    try {
      const response = await fetch(
        `/api/inventory/assignments?assetId=${assetId}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.assignments && data.assignments.length > 0) {
          const activeAssignment = data.assignments.find(
            (assignment: any) => !assignment.returnedAt,
          );
          if (activeAssignment) {
            setAssignedTo(activeAssignment.employeeId);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch asset assignment:", error);
    }
  };

  const validateForm = () => {
    const errors = {
      name: "",
      categoryId: "",
    };

    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = "Asset name is required";
      isValid = false;
    }

    if (!formData.categoryId) {
      errors.categoryId = "Category is required";
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "purchasePrice" ? parseFloat(value) || 0 : value,
    }));

    // Clear error when user starts typing
    if ((fieldErrors as any)[name]) {
      setFieldErrors({ ...fieldErrors, [name]: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const url = asset?.id
        ? `/api/inventory/assets/${asset.id}`
        : "/api/inventory/assets";
      const method = asset?.id ? "PUT" : "POST";

      // Prepare the data
      const requestData = {
        ...formData,
        purchaseCost: parseFloat(formData.purchasePrice as any),
        warrantyExpiry: formData.warrantyEndDate, // Map warrantyEndDate to warrantyExpiry for API
      };

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(
          asset?.id
            ? "Asset updated successfully"
            : "Asset created successfully",
        );

        // If assignedTo is set, create assignment
        if (assignedTo && result.asset?.id) {
          await createAssignment(result.asset.id, assignedTo);
        } else if (!assignedTo && asset?.id) {
          // If unassigned, check if there was a previous assignment to return
          await returnAssignment(asset.id);
        }

        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to save asset");
      }
    } catch (error) {
      console.error("Failed to save asset:", error);
      toast.error("Failed to save asset");
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (assetId: string, employeeId: string) => {
    try {
      const response = await fetch("/api/inventory/assignments", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assetId,
          employeeId,
          assignedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || "Failed to assign asset");
      }
    } catch (error) {
      console.error("Failed to assign asset:", error);
      toast.error("Failed to assign asset");
    }
  };

  const returnAssignment = async (assetId: string) => {
    try {
      // First get the current assignment
      const response = await fetch(
        `/api/inventory/assignments?assetId=${assetId}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.assignments && data.assignments.length > 0) {
          const activeAssignment = data.assignments.find(
            (assignment: any) => !assignment.returnedAt,
          );

          if (activeAssignment) {
            // Return the asset
            const returnResponse = await fetch(
              `/api/inventory/assignments/${activeAssignment.id}`,
              {
                method: "PUT",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  returnedAt: new Date().toISOString(),
                }),
              },
            );

            if (!returnResponse.ok) {
              const error = await returnResponse.json();
              toast.error(error.message || "Failed to return asset");
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to return asset:", error);
    }
  };

  if (!isOpen) return null;

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
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
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
                {asset?.id ? "Edit Asset" : "Add New Asset"}
              </h3>
              <div className="mt-2">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="form-label">
                        Asset Name <span className="required-asterisk">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`input ${
                          fieldErrors.name
                            ? "border-red-500 focus:ring-red-500"
                            : ""
                        }`}
                      />
                      {fieldErrors.name && (
                        <p className="mt-1 text-xs text-red-600">
                          {fieldErrors.name}
                        </p>
                      )}
                    </div>
                    <div>{/* Empty column where Asset ID was removed */}</div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="categoryId" className="form-label">
                        Category <span className="required-asterisk">*</span>
                      </label>
                      {categoriesLoading ? (
                        <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
                      ) : (
                        <select
                          id="categoryId"
                          name="categoryId"
                          value={formData.categoryId}
                          onChange={handleChange}
                          className={`input ${
                            fieldErrors.categoryId
                              ? "border-red-500 focus:ring-red-500"
                              : ""
                          }`}
                        >
                          <option value="">Select a category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {fieldErrors.categoryId && !categoriesLoading && (
                        <p className="mt-1 text-xs text-red-600">
                          {fieldErrors.categoryId}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="status" className="form-label">
                        Status <span className="required-asterisk">*</span>
                      </label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="input"
                      >
                        <option value="AVAILABLE">Available</option>
                        <option value="ASSIGNED">Assigned</option>
                        <option value="IN_MAINTENANCE">In Maintenance</option>
                        <option value="OUT_OF_ORDER">Out of Order</option>
                        <option value="RETIRED">Retired</option>
                        <option value="DISPOSED">Disposed</option>
                        <option value="LOST">Lost</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="purchaseDate" className="form-label">
                        Purchase Date{" "}
                        <span className="required-asterisk">*</span>
                      </label>
                      <input
                        type="date"
                        id="purchaseDate"
                        name="purchaseDate"
                        value={formData.purchaseDate}
                        onChange={handleChange}
                        className="input"
                      />
                    </div>
                    <div>
                      <label htmlFor="condition" className="form-label">
                        Condition
                      </label>
                      <select
                        id="condition"
                        name="condition"
                        value={formData.condition}
                        onChange={handleChange}
                        className="input"
                      >
                        <option value="NEW">New</option>
                        <option value="GOOD">Good</option>
                        <option value="FAIR">Fair</option>
                        <option value="POOR">Poor</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="purchasePrice" className="form-label">
                        Purchase Cost ($)
                      </label>
                      <input
                        type="number"
                        id="purchasePrice"
                        name="purchasePrice"
                        value={formData.purchasePrice}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className="input"
                      />
                    </div>
                    <div>
                      {/* Removed currentValue field as it doesn't exist in Prisma schema */}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="location" className="form-label">
                        Location
                      </label>
                      <input
                        type="text"
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="input"
                      />
                    </div>
                    <div>
                      <label htmlFor="supplier" className="form-label">
                        Supplier
                      </label>
                      <input
                        type="text"
                        id="supplier"
                        name="supplier"
                        value={formData.supplier}
                        onChange={handleChange}
                        className="input"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="warrantyEndDate" className="form-label">
                      Warranty Expiry
                    </label>
                    <input
                      type="date"
                      id="warrantyEndDate"
                      name="warrantyEndDate"
                      value={formData.warrantyEndDate}
                      onChange={handleChange}
                      className="input"
                    />
                  </div>

                  <div>
                    <label htmlFor="assignedTo" className="form-label">
                      Assign To
                    </label>
                    {employeesLoading ? (
                      <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
                    ) : (
                      <select
                        id="assignedTo"
                        name="assignedTo"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        className="input"
                      >
                        <option value="">Unassigned</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName} (
                            {employee.employeeId})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label htmlFor="notes" className="form-label">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                      className="input"
                    />
                  </div>

                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary w-full sm:w-auto sm:ml-3"
                    >
                      {loading
                        ? "Saving..."
                        : asset?.id
                          ? "Update Asset"
                          : "Create Asset"}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-secondary w-full sm:w-auto mt-3 sm:mt-0"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
