"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  CalculatorIcon,
  UserGroupIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface SalaryTemplate {
  id: string;
  name: string;
  description?: string;
  targetRole?: string;
  targetDepartment?: string;
  basicSalaryPercent?: number;
  basicSalaryFixed?: number;
  isPercentageBased: boolean;
  allowancesTemplate: any;
  deductionsTemplate: any;
  isActive: boolean;
  createdAt: string;
}

type AllowanceConfig = { type: string; value: string };

type AllowancesMap = {
  houseRentUtilities: AllowanceConfig;
  medicalAllowance: AllowanceConfig;
  fuelAllowance: AllowanceConfig;
};

type AllowanceKey = keyof AllowancesMap;

const ALLOWANCE_LABELS: Record<AllowanceKey, string> = {
  houseRentUtilities: "House Rent & Utilities",
  medicalAllowance: "Medical Allowance",
  fuelAllowance: "Fuel Allowance",
};

const DEFAULT_ALLOWANCES: AllowancesMap = {
  houseRentUtilities: { type: "percentage", value: "" },
  medicalAllowance: { type: "fixed", value: "" },
  fuelAllowance: { type: "fixed", value: "" },
};

const normalizeAllowances = (source: any): AllowancesMap => {
  if (!source || typeof source !== "object") {
    return { ...DEFAULT_ALLOWANCES };
  }

  const result: Partial<AllowancesMap> = {};

  (Object.keys(DEFAULT_ALLOWANCES) as AllowanceKey[]).forEach((key) => {
    const fallback = DEFAULT_ALLOWANCES[key];
    const legacyKey =
      key === "houseRentUtilities"
        ? "hra"
        : key === "medicalAllowance"
        ? "medical"
        : "transport";

    const value = source[key] ?? source[legacyKey];

    if (value && typeof value === "object") {
      result[key] = {
        type: value.type ?? fallback.type,
        value: value.value?.toString() ?? fallback.value,
      };
    } else {
      result[key] = { ...fallback };
    }
  });

  return result as AllowancesMap;
};

type DeductionConfig = { type: string; value: string };

interface TemplateForm {
  name: string;
  description: string;
  targetRole: string;
  targetDepartment: string;
  basicSalaryPercent: string;
  basicSalaryFixed: string;
  isPercentageBased: boolean;
  allowances: AllowancesMap;
  deductions: {
    incomeTax: DeductionConfig;
  };
}

export default function SalaryTemplatesPage() {
  const allowedRoles = ["ADMINISTRATOR", "HR_MANAGER", "HR_ADMIN"];
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [templates, setTemplates] = useState<SalaryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SalaryTemplate | null>(
    null
  );
  const [viewingTemplate, setViewingTemplate] = useState<SalaryTemplate | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState<TemplateForm>({
    name: "",
    description: "",
    targetRole: "",
    targetDepartment: "",
    basicSalaryPercent: "",
    basicSalaryFixed: "",
    isPercentageBased: true,
    allowances: { ...DEFAULT_ALLOWANCES },
    deductions: {
      incomeTax: { type: "percentage", value: "" },
    },
  });

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (!response.ok) {
          router.push("/login");
          return;
        }

        const data = await response.json();
        const role = data?.user?.role;

        if (!role || !allowedRoles.includes(role)) {
          toast.error("You do not have permission to view this page");
          router.push("/dashboard");
          return;
        }

        setAuthorized(true);
      } catch (error) {
        console.error("Access verification failed", error);
        router.push("/dashboard");
      } finally {
        setCheckingAccess(false);
      }
    };

    verifyAccess();
  }, [router]);

  useEffect(() => {
    if (!authorized) {
      return;
    }
    fetchTemplates();
  }, [authorized]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/payroll/templates", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        console.error("Salary templates request failed", response.status);
        setTemplates([]);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const templateData = {
        name: formData.name,
        description: formData.description,
        targetRole: formData.targetRole,
        targetDepartment: formData.targetDepartment,
        basicSalaryPercent: formData.isPercentageBased
          ? formData.basicSalaryPercent
          : null,
        basicSalaryFixed: !formData.isPercentageBased
          ? formData.basicSalaryFixed
          : null,
        isPercentageBased: formData.isPercentageBased,
        allowancesTemplate: formData.allowances,
        deductionsTemplate: formData.deductions,
      };

      const url = editingTemplate
        ? `/api/payroll/templates/${editingTemplate.id}`
        : "/api/payroll/templates";
      const method = editingTemplate ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templateData),
      });

      if (response.ok) {
        toast.success(
          editingTemplate
            ? "Template updated successfully"
            : "Template created successfully"
        );
        setShowModal(false);
        resetForm();
        fetchTemplates();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to save template");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to save template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (template: SalaryTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      targetRole: template.targetRole || "",
      targetDepartment: template.targetDepartment || "",
      basicSalaryPercent: template.basicSalaryPercent?.toString() || "",
      basicSalaryFixed: template.basicSalaryFixed?.toString() || "",
      isPercentageBased: template.isPercentageBased,
      allowances: normalizeAllowances(template.allowancesTemplate),
      deductions:
        template.deductionsTemplate && template.deductionsTemplate.incomeTax
          ? {
              incomeTax: {
                type: template.deductionsTemplate.incomeTax.type ?? "percentage",
                value: template.deductionsTemplate.incomeTax.value?.toString() ?? "",
              },
            }
          : { incomeTax: { type: "percentage", value: "" } },
    });
    setShowModal(true);
  };

  const handleDelete = async (templateId: string) => {
    if (!window.confirm("Are you sure you want to delete this template?")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/payroll/templates/${templateId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Template deleted successfully");
        fetchTemplates();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete template");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete template");
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      targetRole: "",
      targetDepartment: "",
      basicSalaryPercent: "",
      basicSalaryFixed: "",
      isPercentageBased: true,
      allowances: { ...DEFAULT_ALLOWANCES },
      deductions: {
        incomeTax: { type: "percentage", value: "" },
      },
    });
    setEditingTemplate(null);
  };

  const updateAllowance = (key: AllowanceKey, field: string, value: string) => {
    setFormData({
      ...formData,
      allowances: {
        ...formData.allowances,
        [key]: {
          ...formData.allowances[key as keyof typeof formData.allowances],
          [field]: value,
        },
      },
    });
  };

  const updateDeduction = (key: string, field: string, value: string) => {
    setFormData({
      ...formData,
      deductions: {
        ...formData.deductions,
        [key]: {
          ...formData.deductions[key as keyof typeof formData.deductions],
          [field]: value,
        },
      },
    });
  };

  if (checkingAccess || (!authorized && !loading)) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="bg-gray-200 h-96 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Salary Templates
          </h1>
          <p className="text-gray-600">
            Create and manage reusable salary structures for different roles and
            departments
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Template</span>
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  {template.name}
                </h3>
                {template.description && (
                  <p className="text-sm text-gray-600 mb-2">
                    {template.description}
                  </p>
                )}
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  {template.targetRole && (
                    <div className="flex items-center">
                      <BriefcaseIcon className="h-3 w-3 mr-1" />
                      {template.targetRole}
                    </div>
                  )}
                  {template.targetDepartment && (
                    <div className="flex items-center">
                      <UserGroupIcon className="h-3 w-3 mr-1" />
                      {template.targetDepartment}
                    </div>
                  )}
                </div>
              </div>
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  template.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {template.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Basic Salary:</span>
                <span className="font-medium">
                  {template.isPercentageBased
                    ? `${template.basicSalaryPercent}% of gross`
                    : `PKR ${template.basicSalaryFixed?.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Type:</span>
                <span className="font-medium">
                  {template.isPercentageBased
                    ? "Percentage-based"
                    : "Fixed amount"}
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setViewingTemplate(template);
                  setShowViewModal(true);
                }}
                className="flex-1 btn-secondary text-sm"
                title="View Details"
              >
                <EyeIcon className="h-4 w-4 mr-1" />
                View
              </button>
              <button
                onClick={() => handleEdit(template)}
                className="flex-1 btn-secondary text-sm"
                title="Edit Template"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(template.id)}
                className="px-3 py-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                title="Delete Template"
                disabled={deleting}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <CalculatorIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No salary templates
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first salary template for different
            roles.
          </p>
          <div className="mt-6">
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Template
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Template Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-gray-900">
                {editingTemplate ? "Edit Template" : "Create Salary Template"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Role
                  </label>
                  <input
                    type="text"
                    value={formData.targetRole}
                    onChange={(e) =>
                      setFormData({ ...formData, targetRole: e.target.value })
                    }
                    className="input"
                    placeholder="e.g., Software Engineer, Manager"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="input"
                    placeholder="Brief description of this template"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Department
                  </label>
                  <input
                    type="text"
                    value={formData.targetDepartment}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targetDepartment: e.target.value,
                      })
                    }
                    className="input"
                    placeholder="e.g., Engineering, Marketing"
                  />
                </div>
              </div>

              {/* Basic Salary Configuration */}
              <div className="border rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Basic Salary Configuration
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.isPercentageBased}
                        onChange={() =>
                          setFormData({ ...formData, isPercentageBased: true })
                        }
                        className="mr-2"
                      />
                      Percentage of Gross Salary
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!formData.isPercentageBased}
                        onChange={() =>
                          setFormData({ ...formData, isPercentageBased: false })
                        }
                        className="mr-2"
                      />
                      Fixed Amount
                    </label>
                  </div>

                  {formData.isPercentageBased ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Basic Salary Percentage
                      </label>
                      <input
                        type="number"
                        value={formData.basicSalaryPercent}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            basicSalaryPercent: e.target.value,
                          })
                        }
                        className="input w-32"
                        placeholder="50"
                        min="0"
                        max="100"
                      />
                      <span className="ml-2 text-sm text-gray-500">
                        % of gross salary
                      </span>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fixed Basic Salary Amount
                      </label>
                      <input
                        type="number"
                        value={formData.basicSalaryFixed}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            basicSalaryFixed: e.target.value,
                          })
                        }
                        className="input w-48"
                        placeholder="50000"
                        min="0"
                      />
                      <span className="ml-2 text-sm text-gray-500">PKR</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Allowances Configuration */}
              <div className="border rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Allowances Configuration
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.entries(formData.allowances) as [AllowanceKey, AllowanceConfig][]).map(
                    ([allowanceKey, config]) => (
                      <div key={allowanceKey} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {ALLOWANCE_LABELS[allowanceKey]}
                        </label>
                        <div className="flex space-x-2">
                          <select
                            value={config.type}
                            onChange={(e) =>
                              updateAllowance(allowanceKey, "type", e.target.value)
                            }
                            className="input w-32"
                          >
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed</option>
                          </select>
                          <input
                            type="number"
                            value={config.value}
                            onChange={(e) =>
                              updateAllowance(allowanceKey, "value", e.target.value)
                            }
                            className="input flex-1"
                            placeholder={
                              config.type === "percentage" ? "20" : "5000"
                            }
                            min="0"
                          />
                          <span className="flex items-center text-sm text-gray-500">
                            {config.type === "percentage" ? "%" : "PKR"}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Deductions Configuration */}
              <div className="border rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Deductions Configuration
                </h4>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Income Tax
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={formData.deductions.incomeTax.type}
                      onChange={(e) =>
                        updateDeduction("incomeTax", "type", e.target.value)
                      }
                      className="input w-32"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed</option>
                    </select>
                    <input
                      type="number"
                      value={formData.deductions.incomeTax.value}
                      onChange={(e) =>
                        updateDeduction("incomeTax", "value", e.target.value)
                      }
                      className="input flex-1"
                      placeholder={
                        formData.deductions.incomeTax.type === "percentage"
                          ? "12"
                          : "2000"
                      }
                      min="0"
                    />
                    <span className="flex items-center text-sm text-gray-500">
                      {formData.deductions.incomeTax.type === "percentage"
                        ? "%"
                        : "PKR"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={submitting}
                >
                  {submitting
                    ? "Saving..."
                    : editingTemplate
                    ? "Update Template"
                    : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Template Modal */}
      {showViewModal && viewingTemplate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-gray-900">
                Template Details: {viewingTemplate.name}
              </h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">
                  Basic Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Name:
                    </span>
                    <p className="text-sm text-gray-900">
                      {viewingTemplate.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Status:
                    </span>
                    <span
                      className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        viewingTemplate.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {viewingTemplate.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {viewingTemplate.targetRole && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Target Role:
                      </span>
                      <p className="text-sm text-gray-900">
                        {viewingTemplate.targetRole}
                      </p>
                    </div>
                  )}
                  {viewingTemplate.targetDepartment && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Target Department:
                      </span>
                      <p className="text-sm text-gray-900">
                        {viewingTemplate.targetDepartment}
                      </p>
                    </div>
                  )}
                </div>
                {viewingTemplate.description && (
                  <div className="mt-3">
                    <span className="text-sm font-medium text-gray-500">
                      Description:
                    </span>
                    <p className="text-sm text-gray-900">
                      {viewingTemplate.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Salary Structure */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">
                  Basic Salary
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium">
                    {viewingTemplate.isPercentageBased
                      ? `${viewingTemplate.basicSalaryPercent}% of gross salary`
                      : `PKR ${viewingTemplate.basicSalaryFixed?.toLocaleString()} (Fixed amount)`}
                  </p>
                </div>
              </div>

              {/* Allowances */}
              {viewingTemplate.allowancesTemplate && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">
                    Allowances
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {Object.entries(normalizeAllowances(viewingTemplate.allowancesTemplate)).map(
                      ([key, config]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-sm font-medium">
                            {ALLOWANCE_LABELS[key as AllowanceKey]}:
                          </span>
                          <span className="text-sm">
                            {config.value || "0"}
                            {config.type === "percentage" ? "%" : " PKR"}
                            {config.type === "percentage" ? " of gross" : ""}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Deductions */}
              {viewingTemplate.deductionsTemplate && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">
                    Deductions
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {Object.entries(viewingTemplate.deductionsTemplate).map(
                      ([key, config]: [string, any]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-sm font-medium capitalize">
                            {key} Deduction:
                          </span>
                          <span className="text-sm">
                            {config.value}
                            {config.type === "percentage" ? "%" : " PKR"}
                            {config.type === "percentage" ? " of gross" : ""}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="w-full btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
