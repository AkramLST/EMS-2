"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, CubeIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface AssetCategory {
  id: string;
  name: string;
}

interface AssetDetails {
  id: string;
  assetCode: string;
  name: string;
  description?: string;
  categoryId: string;
  category: { id: string; name: string };
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  warrantyDetails?: string;
  vendorName?: string;
  vendorContact?: string;
  invoiceNumber?: string;
  location?: string;
  depreciationRate?: number;
  residualValue?: number;
  usefulLife?: number;
}

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.id as string;

  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [asset, setAsset] = useState<AssetDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    depreciationRate: "",
    residualValue: "",
    usefulLife: "",
  });

  useEffect(() => {
    if (assetId) {
      fetchAssetAndCategories();
    }
  }, [assetId]);

  const fetchAssetAndCategories = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const [assetResponse, categoriesResponse] = await Promise.all([
        fetch(`/api/inventory/assets/${assetId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/inventory/categories", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (assetResponse.ok) {
        const assetData = await assetResponse.json();
        const asset = assetData.asset;
        setAsset(asset);

        // Populate form with existing data
        setFormData({
          name: asset.name || "",
          description: asset.description || "",
          categoryId: asset.categoryId || "",
          serialNumber: asset.serialNumber || "",
          model: asset.model || "",
          manufacturer: asset.manufacturer || "",
          purchaseDate: asset.purchaseDate
            ? asset.purchaseDate.split("T")[0]
            : "",
          purchasePrice: asset.purchasePrice?.toString() || "",
          warrantyStartDate: asset.warrantyStartDate
            ? asset.warrantyStartDate.split("T")[0]
            : "",
          warrantyEndDate: asset.warrantyEndDate
            ? asset.warrantyEndDate.split("T")[0]
            : "",
          warrantyDetails: asset.warrantyDetails || "",
          vendorName: asset.vendorName || "",
          vendorContact: asset.vendorContact || "",
          invoiceNumber: asset.invoiceNumber || "",
          location: asset.location || "",
          depreciationRate: asset.depreciationRate?.toString() || "",
          residualValue: asset.residualValue?.toString() || "",
          usefulLife: asset.usefulLife?.toString() || "",
        });
      } else {
        toast.error("Failed to fetch asset details");
        router.push("/dashboard/inventory");
      }

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to fetch asset data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

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

      const response = await fetch(`/api/inventory/assets/${assetId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Asset updated successfully");
        router.push(`/dashboard/inventory/assets/${assetId}`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to update asset");
      }
    } catch (error) {
      console.error("Failed to update asset:", error);
      toast.error("Failed to update asset");
    } finally {
      setSaving(false);
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
      <div className="flex items-center space-x-4">
        <Link
          href={`/dashboard/inventory/assets/${assetId}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Asset Details
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CubeIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Edit Asset
              </h1>
              <p className="text-sm text-gray-500">
                Update asset information and details
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
            <Link
              href={`/dashboard/inventory/assets/${assetId}`}
              className="btn-secondary"
            >
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Updating..." : "Update Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
