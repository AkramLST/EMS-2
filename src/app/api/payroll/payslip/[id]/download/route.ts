import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePayslipHtml } from "@/lib/payslip-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view payslips
    const canViewOwnSlip = hasPermission(user, "payroll.view_own_slip");
    const canViewAllSlips = hasPermission(user, "payroll.read_all");

    if (!canViewOwnSlip && !canViewAllSlips) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get the payroll record with employee details
    const payrollRecord = await prisma.payrollRecord.findUnique({
      where: { id: params.id },
      include: {
        employee: {
          include: {
            department: true,
            designation: true,
          },
        },
        salaryStructure: true,
      },
    });

    if (!payrollRecord) {
      return NextResponse.json(
        { message: "Payroll record not found" },
        { status: 404 }
      );
    }

    // If user can only view their own slips, check if this is their record
    if (canViewOwnSlip && !canViewAllSlips && user.employee?.id) {
      if (payrollRecord.employeeId !== user.employee.id) {
        return NextResponse.json(
          { message: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    // Generate and return payslip HTML content
    const payslipHtml = generatePayslipHtml(payrollRecord);

    // Return HTML content with proper content type
    return new NextResponse(payslipHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Get payslip error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
