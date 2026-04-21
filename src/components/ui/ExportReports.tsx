"use client";

import { useState } from "react";
import { DocumentArrowDownIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ExportReportsProps {
  reportType: "attendance" | "payroll" | "employees" | "performance";
  data: any[];
  filename?: string;
}

export default function ExportReports({ reportType, data, filename }: ExportReportsProps) {
  const [exporting, setExporting] = useState(false);

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString();
      
      // Add header
      doc.setFontSize(20);
      doc.text(`${reportType.toUpperCase()} REPORT`, 20, 20);
      doc.setFontSize(12);
      doc.text(`Generated on: ${currentDate}`, 20, 30);

      let tableData: any[] = [];
      let headers: string[] = [];

      switch (reportType) {
        case "attendance":
          headers = ["Employee", "Date", "Clock In", "Clock Out", "Hours", "Status"];
          tableData = data.map(record => [
            `${record.employee?.firstName} ${record.employee?.lastName}`,
            new Date(record.date).toLocaleDateString(),
            record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : "-",
            record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : "-",
            record.hoursWorked || "0",
            record.status
          ]);
          break;

        case "employees":
          headers = ["ID", "Name", "Email", "Department", "Designation", "Status"];
          tableData = data.map(emp => [
            emp.employeeId,
            `${emp.firstName} ${emp.lastName}`,
            emp.email,
            emp.department?.name || "-",
            emp.designation,
            emp.status
          ]);
          break;

        case "payroll":
          headers = ["Employee", "Basic Salary", "Allowances", "Deductions", "Net Salary"];
          tableData = data.map(payroll => [
            `${payroll.employee?.firstName} ${payroll.employee?.lastName}`,
            `$${payroll.basicSalary}`,
            `$${payroll.allowances}`,
            `$${payroll.deductions}`,
            `$${payroll.netSalary}`
          ]);
          break;

        case "performance":
          headers = ["Employee", "Review Period", "Rating", "Status"];
          tableData = data.map(review => [
            `${review.employee?.firstName} ${review.employee?.lastName}`,
            review.reviewPeriod,
            `${review.overallRating}/5`,
            review.status
          ]);
          break;
      }

      // Add table
      (doc as any).autoTable({
        head: [headers],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      // Save PDF
      const pdfFilename = filename || `${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(pdfFilename);
      
      toast.success(`PDF exported successfully: ${pdfFilename}`);
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = () => {
    setExporting(true);
    try {
      let csvContent = "";
      let headers: string[] = [];

      switch (reportType) {
        case "attendance":
          headers = ["Employee", "Date", "Clock In", "Clock Out", "Hours", "Status"];
          csvContent = [
            headers.join(","),
            ...data.map(record => [
              `"${record.employee?.firstName} ${record.employee?.lastName}"`,
              new Date(record.date).toLocaleDateString(),
              record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : "",
              record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : "",
              record.hoursWorked || "0",
              record.status
            ].join(","))
          ].join("\n");
          break;

        case "employees":
          headers = ["ID", "First Name", "Last Name", "Email", "Department", "Designation", "Status"];
          csvContent = [
            headers.join(","),
            ...data.map(emp => [
              emp.employeeId,
              emp.firstName,
              emp.lastName,
              emp.email,
              emp.department?.name || "",
              emp.designation,
              emp.status
            ].join(","))
          ].join("\n");
          break;

        case "payroll":
          headers = ["Employee", "Basic Salary", "Allowances", "Deductions", "Net Salary"];
          csvContent = [
            headers.join(","),
            ...data.map(payroll => [
              `"${payroll.employee?.firstName} ${payroll.employee?.lastName}"`,
              payroll.basicSalary,
              payroll.allowances,
              payroll.deductions,
              payroll.netSalary
            ].join(","))
          ].join("\n");
          break;

        case "performance":
          headers = ["Employee", "Review Period", "Rating", "Status"];
          csvContent = [
            headers.join(","),
            ...data.map(review => [
              `"${review.employee?.firstName} ${review.employee?.lastName}"`,
              review.reviewPeriod,
              review.overallRating,
              review.status
            ].join(","))
          ].join("\n");
          break;
      }

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success("Excel file exported successfully");
    } catch (error) {
      console.error("Excel export failed:", error);
      toast.error("Failed to export Excel file");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={exportToPDF}
        disabled={exporting || data.length === 0}
        className="btn-outline text-sm"
      >
        <DocumentTextIcon className="h-4 w-4 mr-1" />
        {exporting ? "Exporting..." : "Export PDF"}
      </button>
      
      <button
        onClick={exportToExcel}
        disabled={exporting || data.length === 0}
        className="btn-outline text-sm"
      >
        <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
        {exporting ? "Exporting..." : "Export Excel"}
      </button>
    </div>
  );
}
