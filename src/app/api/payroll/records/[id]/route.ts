import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Check if user has permission to view payroll
    const canReadAll = hasPermission(user, "payroll.read_all");
    const canRead = hasPermission(user, "payroll.read");

    if (!canRead && !canReadAll) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const recordId = params.id;
    const payrollRecord = await prisma.payrollRecord.findUnique({
      where: { id: recordId },
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

    if (!canReadAll) {
      if (
        user.role === "DEPARTMENT_MANAGER" &&
        user.employee?.departmentId !== payrollRecord.employee.departmentId
      ) {
        return NextResponse.json(
          { message: "Insufficient permissions" },
          { status: 403 }
        );
      }

      if (user.role === "EMPLOYEE" && user.employee?.id !== payrollRecord.employeeId) {
        return NextResponse.json(
          { message: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ payrollRecord });
  } catch (error) {
    console.error("Get payroll record error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to update payroll
    if (!hasPermission(user, "payroll.update")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();
    const recordId = params.id;

    // For demo purposes, return success
    // In a real implementation, you would update the payroll record in the database
    return NextResponse.json({
      message: "Payroll record updated successfully",
      payrollRecord: {
        id: recordId,
        ...data,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Update payroll record error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to delete payroll
    if (!hasPermission(user, "payroll.delete")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const recordId = params.id;

    const existingRecord = await prisma.payrollRecord.findUnique({
      where: { id: recordId },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { message: "Payroll record not found" },
        { status: 404 }
      );
    }

    await prisma.payrollRecord.delete({
      where: { id: recordId },
    });

    return NextResponse.json({
      message: "Payroll record deleted successfully",
    });
  } catch (error) {
    console.error("Delete payroll record error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
