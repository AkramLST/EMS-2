import React, { ReactNode } from "react";
import Pagination from "@/components/ui/Pagination";

interface TableColumn {
  header: string | ReactNode;
  accessor: string;
  render?: (value: any, row: any) => ReactNode;
  className?: string;
  primary?: boolean;
}

interface TableProps {
  columns: TableColumn[];
  data: any[];
  showPagination?: boolean;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  className?: string;
  emptyMessage?: string;
  paginationClassName?: string;
  itemsPerPageTextClassName?: string;
}

export default function Table({
  columns,
  data,
  showPagination = true,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 5,
  onPageChange = () => {},
  onItemsPerPageChange = () => {},
  className = "",
  emptyMessage = "No data available",
  paginationClassName = "",
  itemsPerPageTextClassName = "",
}: TableProps) {
  return (
    <div
      className={`bg-white shadow overflow-hidden sm:rounded-lg ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.className || ""
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {columns.map((column, colIndex) => {
                    const isPrimaryColumn =
                      typeof column.primary === "boolean"
                        ? column.primary
                        : colIndex === 0;

                    const baseTextClass = isPrimaryColumn
                      ? "font-medium text-gray-900"
                      : "text-gray-500";

                    const preventWrapClass = column.className?.includes(
                      "whitespace-nowrap"
                    )
                      ? ""
                      : "break-words max-w-[300px] overflow-hidden text-ellipsis";

                    return (
                      <td
                        key={colIndex}
                        className={`px-6 py-4 text-sm ${baseTextClass} ${
                          column.className || ""
                        } ${preventWrapClass}`}
                      >
                        {column.render
                          ? column.render(row[column.accessor], row)
                          : row[column.accessor]}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination && data.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
          className={paginationClassName}
          itemsPerPageTextClassName={itemsPerPageTextClassName}
        />
      )}
    </div>
  );
}
