"use client";

import Link from "next/link";

export default function TableDocumentationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Table Component Documentation</h1>
        <p className="text-gray-600">
          A reusable table component with configurable pagination for the Employee Management System
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Overview</h2>
        <p className="text-gray-700 mb-4">
          The Table component is a reusable UI component that displays data in a tabular format with optional pagination.
          It provides a consistent look and feel across the application while offering flexibility in configuration.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Features</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>Configurable pagination (can be enabled/disabled)</li>
          <li>Customizable columns with header labels and data accessors</li>
          <li>Custom cell rendering functions for complex data</li>
          <li>Built-in pagination controls with page navigation</li>
          <li>Items per page selection (10, 20, 50, 100)</li>
          <li>Empty state handling</li>
          <li>Responsive design</li>
        </ul>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Installation</h2>
        <p className="text-gray-700 mb-4">
          The Table component is automatically available in the project. Import it in your component:
        </p>
        <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
          <code>{`import Table from "@/components/ui/Table";`}</code>
        </pre>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Usage</h2>
        
        <h3 className="text-md font-medium text-gray-800 mb-2">Basic Usage</h3>
        <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto mb-4">
          <code>{`<Table
  columns={columns}
  data={data}
/>`}</code>
        </pre>

        <h3 className="text-md font-medium text-gray-800 mb-2">With Pagination</h3>
        <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto mb-4">
          <code>{`<Table
  columns={columns}
  data={data}
  showPagination={true}
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalItems}
  itemsPerPage={itemsPerPage}
  onPageChange={handlePageChange}
  onItemsPerPageChange={handleItemsPerPageChange}
/>`}</code>
        </pre>

        <h3 className="text-md font-medium text-gray-800 mb-2">Without Pagination</h3>
        <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto mb-4">
          <code>{`<Table
  columns={columns}
  data={data}
  showPagination={false}
/>`}</code>
        </pre>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Props</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prop</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Default</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">columns</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">TableColumn[]</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">required</td>
                <td className="px-6 py-4 text-sm text-gray-500">Array of column definitions</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">data</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">any[]</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">required</td>
                <td className="px-6 py-4 text-sm text-gray-500">Array of data objects to display</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">showPagination</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">boolean</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">true</td>
                <td className="px-6 py-4 text-sm text-gray-500">Whether to show pagination controls</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">currentPage</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">number</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1</td>
                <td className="px-6 py-4 text-sm text-gray-500">Current page number (used with pagination)</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">totalPages</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">number</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1</td>
                <td className="px-6 py-4 text-sm text-gray-500">Total number of pages (used with pagination)</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">totalItems</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">number</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">0</td>
                <td className="px-6 py-4 text-sm text-gray-500">Total number of items (used with pagination)</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">itemsPerPage</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">number</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">10</td>
                <td className="px-6 py-4 text-sm text-gray-500">Number of items to show per page (used with pagination)</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">onPageChange</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">function</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{"() => {}"}</td>
                <td className="px-6 py-4 text-sm text-gray-500">Callback function when page changes</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">onItemsPerPageChange</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">function</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{"() => {}"}</td>
                <td className="px-6 py-4 text-sm text-gray-500">Callback function when items per page changes</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">className</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">string</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">""</td>
                <td className="px-6 py-4 text-sm text-gray-500">Additional CSS classes to apply to the table container</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">emptyMessage</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">string</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">"No data available"</td>
                <td className="px-6 py-4 text-sm text-gray-500">Message to display when no data is available</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Column Definition</h2>
        <p className="text-gray-700 mb-4">
          Each column in the columns array should have the following properties:
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">header</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">string</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Yes</td>
                <td className="px-6 py-4 text-sm text-gray-500">The column header text</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">accessor</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">string</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Yes</td>
                <td className="px-6 py-4 text-sm text-gray-500">The key to access the data for this column</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">render</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">function</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">No</td>
                <td className="px-6 py-4 text-sm text-gray-500">Custom render function for the cell content</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">className</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">string</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">No</td>
                <td className="px-6 py-4 text-sm text-gray-500">Additional CSS classes to apply to the column cells</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Examples</h2>
        <p className="text-gray-700 mb-4">
          See the <Link href="/dashboard/admin/table-demo" className="text-primary-600 hover:text-primary-800">Table Demo Page</Link> for a live example.
        </p>
      </div>
    </div>
  );
}