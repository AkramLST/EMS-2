import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePayslipHtml } from "@/lib/payslip-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view payslips
    // Employees can view their own payslips with payroll.view_own_slip permission
    // Others need payroll.read_all permission
    const canViewOwnSlip = hasPermission(user, "payroll.view_own_slip");
    const canViewAllSlips = hasPermission(user, "payroll.read_all");

    if (!canViewOwnSlip && !canViewAllSlips) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    // Build where clause based on user permissions
    const where: any = {};

    // If user can only view their own slips, filter by their employee ID
    if (canViewOwnSlip && !canViewAllSlips && user.employee?.id) {
      where.employeeId = user.employee.id;
    }

    // Add month/year filters if provided
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    const [payrollRecords, total] = await Promise.all([
      prisma.payrollRecord.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              designation: true,
              department: {
                select: {
                  name: true,
                },
              },
            },
          },
          salaryStructure: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payrollRecord.count({ where }),
    ]);

    return NextResponse.json({
      payrollRecords,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get payroll records error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { payrollRecordId } = data;

    if (!payrollRecordId) {
      return NextResponse.json(
        { message: "Payroll record ID is required" },
        { status: 400 }
      );
    }

    const canViewAllSlips = hasPermission(user, "payroll.read_all");
    const canViewOwnSlip = hasPermission(user, "payroll.view_own_slip");

    if (!canViewAllSlips && !canViewOwnSlip) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get the payroll record with employee details
    const payrollRecord = await prisma.payrollRecord.findUnique({
      where: { id: payrollRecordId },
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

    if (!canViewAllSlips) {
      const employeeId = user.employee?.id;

      if (!employeeId || payrollRecord.employeeId !== employeeId) {
        return NextResponse.json(
          { message: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    // Generate payslip HTML content
    const payslipHtml = generatePayslipHtml(payrollRecord);

    // In a real implementation, you would:
    // 1. Convert HTML to PDF using a library like puppeteer or jsPDF
    // 2. Save the PDF to cloud storage (AWS S3, Google Cloud Storage, etc.)
    // 3. Update the payroll record with the payslip URL
    // 4. Send email notification to employee

    // For now, we'll simulate the process and return success
    const payslipUrl = `/api/payroll/payslip/${payrollRecordId}/download`;

    await prisma.payrollRecord.update({
      where: { id: payrollRecordId },
      data: {
        payslipGenerated: true,
        payslipUrl,
      },
    });

    return NextResponse.json({
      message: "Payslip generated successfully",
      payslipUrl,
      payslipHtml, // For preview purposes
    });
  } catch (error) {
    console.error("Generate payslip error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
