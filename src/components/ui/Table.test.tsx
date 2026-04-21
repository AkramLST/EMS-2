import React from "react";
import { render, screen } from "@testing-library/react";
import Table from "@/components/ui/Table";

// Mock next/router
jest.mock("next/router", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe("Table Component", () => {
  const mockData = [
    { id: 1, name: "John Doe", email: "john@example.com" },
    { id: 2, name: "Jane Smith", email: "jane@example.com" },
  ];

  const mockColumns = [
    { header: "ID", accessor: "id" },
    { header: "Name", accessor: "name" },
    { header: "Email", accessor: "email" },
  ];

  it("renders table with data", () => {
    render(
      <Table columns={mockColumns} data={mockData} showPagination={false} />
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("renders empty message when no data", () => {
    render(
      <Table
        columns={mockColumns}
        data={[]}
        showPagination={false}
        emptyMessage="No data available"
      />
    );

    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("renders pagination when enabled", () => {
    render(
      <Table
        columns={mockColumns}
        data={mockData}
        showPagination={true}
        currentPage={1}
        totalPages={2}
        totalItems={25}
        itemsPerPage={10}
      />
    );

    expect(
      screen.getByText("Showing 1 to 2 of 25 results")
    ).toBeInTheDocument();
  });

  it("does not render pagination when disabled", () => {
    render(
      <Table columns={mockColumns} data={mockData} showPagination={false} />
    );

    expect(screen.queryByText("Showing")).not.toBeInTheDocument();
  });
});
