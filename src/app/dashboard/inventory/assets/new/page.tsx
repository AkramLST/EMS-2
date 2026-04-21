"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, CubeIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface AssetCategory {
  id: string;
  name: string;
}

export default function NewAssetPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    serialNumber: "",
    model: "",
    manufacturer: "",
    purchaseDate: "",
    purchasePrice: "",
    warrantyStartDate: "",
    warrantyEndDate: "",
    warrantyDetails: "",
    vendorName: "",
    vendorContact: "",
    invoiceNumber: "",
    location: "",
    depreciationRate: "20",
    residualValue: "",
    usefulLife: "5",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/inventory/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const payload = {
        ...formData,
        purchasePrice: formData.purchasePrice
          ? parseFloat(formData.purchasePrice)
          : null,
        depreciationRate: formData.depreciationRate
          ? parseFloat(formData.depreciationRate)
          : null,
        residualValue: formData.residualValue
          ? parseFloat(formData.residualValue)
          : null,
        usefulLife: formData.usefulLife ? parseInt(formData.usefulLife) : null,
        purchaseDate: formData.purchaseDate || null,
        warrantyStartDate: formData.warrantyStartDate || null,
        warrantyEndDate: formData.warrantyEndDate || null,
      };

      const response = await fetch("/api/inventory/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Asset created successfully");
        router.push("/dashboard/inventory");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to create asset");
      }
    } catch (error) {
      console.error("Failed to create asset:", error);
      toast.error("Failed to create asset");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/inventory"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Inventory
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CubeIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Add New Asset
              </h1>
              <p className="text-sm text-gray-500">
                Create a new asset record for inventory tracking
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Asset Name <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category <span className="required-asterisk">*</span>
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Serial Number
                </label>
                <input
                  type="text"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Model
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Manufacturer
                </label>
                <input
                  type="text"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Financial Information
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Purchase Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="purchasePrice"
                  value={formData.purchasePrice}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Purchase Date
                </label>
                <input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Depreciation Rate (% per year)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="depreciationRate"
                  value={formData.depreciationRate}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Useful Life (years)
                </label>
                <input
                  type="number"
                  name="usefulLife"
                  value={formData.usefulLife}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Residual Value
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="residualValue"
                  value={formData.residualValue}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Vendor Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Vendor Information
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Vendor Name
                </label>
                <input
                  type="text"
                  name="vendorName"
                  value={formData.vendorName}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Vendor Contact
                </label>
                <input
                  type="text"
                  name="vendorContact"
                  value={formData.vendorContact}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Invoice Number
                </label>
                <input
                  type="text"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Warranty Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Warranty Information
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Warranty Start Date
                </label>
                <input
                  type="date"
                  name="warrantyStartDate"
                  value={formData.warrantyStartDate}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Warranty End Date
                </label>
                <input
                  type="date"
                  name="warrantyEndDate"
                  value={formData.warrantyEndDate}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Warranty Details
                </label>
                <textarea
                  name="warrantyDetails"
                  value={formData.warrantyDetails}
                  onChange={handleChange}
                  rows={3}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6">
            <Link href="/dashboard/inventory" className="btn-secondary">
              Cancel
            </Link>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Creating..." : "Create Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
