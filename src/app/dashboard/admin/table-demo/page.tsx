"use client";

import { useState } from "react";
import Table from "@/components/ui/Table";
import { PlusIcon } from "@heroicons/react/24/outline";

interface DemoItem {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

export default function TableDemoPage() {
  const [showPagination, setShowPagination] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems] = useState(42);

  // Generate demo data
  const demoData: DemoItem[] = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: i % 3 === 0 ? "Admin" : i % 3 === 1 ? "Manager" : "Employee",
    status:
      i % 4 === 0
        ? "Active"
        : i % 4 === 1
        ? "Inactive"
        : i % 4 === 2
        ? "Pending"
        : "Suspended",
  }));

  const columns = [
    {
      header: "ID",
      accessor: "id",
      className: "w-1/12", // ~8% width
    },
    {
      header: "Name",
      accessor: "name",
      className: "w-2/5", // 40% width
    },
    {
      header: "Email",
      accessor: "email",
      className: "w-1/5", // 20% width
    },
    {
      header: "Role",
      accessor: "role",
      className: "w-1/5", // 20% width
    },
    {
      header: "Status",
      accessor: "status",
      className: "w-1/12", // ~8% width
      render: (value: string) => {
        let statusClass = "bg-gray-100 text-gray-800";
        if (value === "Active") statusClass = "bg-green-100 text-green-800";
        if (value === "Inactive") statusClass = "bg-red-100 text-red-800";
        if (value === "Pending") statusClass = "bg-yellow-100 text-yellow-800";
        if (value === "Suspended")
          statusClass = "bg-purple-100 text-purple-800";

        return (
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}
          >
            {value}
          </span>
        );
      },
    },
  ];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Table Component Demo
          </h1>
          <p className="text-gray-600">
            Demonstration of the reusable Table component with configurable
            pagination
          </p>
        </div>
        <button className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Item
        </button>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Table Configuration
        </h2>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showPagination"
            checked={showPagination}
            onChange={(e) => setShowPagination(e.target.checked)}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded"
          />
          <label
            htmlFor="showPagination"
            className="ml-2 block text-sm text-gray-900"
          >
            Show Pagination
          </label>
        </div>
      </div>

      {/* Demo Table */}
      <Table
        columns={columns}
        data={demoData}
        showPagination={showPagination}
        currentPage={currentPage}
        totalPages={Math.ceil(totalItems / itemsPerPage)}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        emptyMessage="No items found"
      />
    </div>
  );
}
