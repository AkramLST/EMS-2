"use client";

import { useState } from "react";
import { 
  DocumentArrowDownIcon, 
  DocumentArrowUpIcon, 
  PencilSquareIcon,
  TrashIcon,
  CheckIcon
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
}

interface BulkEmployeeActionsProps {
  selectedEmployees: string[];
  employees: Employee[];
  onRefresh: () => void;
  onClearSelection: () => void;
}

export default function BulkEmployeeActions({ 
  selectedEmployees, 
  employees, 
  onRefresh, 
  onClearSelection 
}: BulkEmployeeActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleBulkExport = () => {
    const selectedData = employees.filter(emp => selectedEmployees.includes(emp.id));
    
    const csvContent = [
      "First Name,Last Name,Email,Status",
      ...selectedData.map(emp => 
        `${emp.firstName},${emp.lastName},${emp.email},${emp.status}`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${selectedData.length} employees`);
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    setLoading(true);
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/employees/bulk-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeIds: selectedEmployees,
          updates: { status: newStatus }
        }),
      });

      if (response.ok) {
        toast.success(`Updated ${selectedEmployees.length} employees`);
        onRefresh();
        onClearSelection();
      } else {
        toast.error("Failed to update employees");
      }
    } catch (error) {
      console.error("Bulk update failed:", error);
      toast.error("Failed to update employees");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedEmployees.length} employees? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/employees/bulk-delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeIds: selectedEmployees
        }),
      });

      if (response.ok) {
        toast.success(`Deleted ${selectedEmployees.length} employees`);
        onRefresh();
        onClearSelection();
      } else {
        toast.error("Failed to delete employees");
      }
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast.error("Failed to delete employees");
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split("\n");
        const headers = lines[0].split(",");
        
        if (!headers.includes("firstName") || !headers.includes("lastName") || !headers.includes("email")) {
          toast.error("CSV must contain firstName, lastName, and email columns");
          return;
        }

        const employees = lines.slice(1).map(line => {
          const values = line.split(",");
          const employee: any = {};
          headers.forEach((header, index) => {
            employee[header.trim()] = values[index]?.trim();
          });
          return employee;
        }).filter(emp => emp.firstName && emp.lastName && emp.email);

        const token = document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth-token="))
          ?.split("=")[1];

        const response = await fetch("/api/employees/bulk-import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ employees }),
        });

        if (response.ok) {
          const data = await response.json();
          toast.success(`Imported ${data.imported} employees successfully`);
          onRefresh();
        } else {
          toast.error("Failed to import employees");
        }
      } catch (error) {
        console.error("Import failed:", error);
        toast.error("Failed to import employees");
      }
    };
    reader.readAsText(file);
  };

  if (selectedEmployees.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <CheckIcon className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-gray-900">
            {selectedEmployees.length} selected
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleBulkExport}
            className="btn-outline text-sm"
            disabled={loading}
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
            Export
          </button>

          <label className="btn-outline text-sm cursor-pointer">
            <DocumentArrowUpIcon className="h-4 w-4 mr-1" />
            Import
            <input
              type="file"
              accept=".csv"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>

          <select
            onChange={(e) => e.target.value && handleBulkStatusUpdate(e.target.value)}
            className="btn-outline text-sm"
            defaultValue=""
            disabled={loading}
          >
            <option value="">Update Status</option>
            <option value="ACTIVE">Set Active</option>
            <option value="INACTIVE">Set Inactive</option>
            <option value="TERMINATED">Set Terminated</option>
          </select>

          <button
            onClick={handleBulkDelete}
            className="btn-secondary text-sm bg-red-600 hover:bg-red-700"
            disabled={loading}
          >
            <TrashIcon className="h-4 w-4 mr-1" />
            Delete
          </button>

          <button
            onClick={onClearSelection}
            className="btn-outline text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
