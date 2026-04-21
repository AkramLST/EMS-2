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

    const canReadAll = hasPermission(user, "payroll.read_all");
    const canRead = hasPermission(user, "payroll.read");

    // Check if user has permission to view salary structures
    if (!canRead && !canReadAll) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const structureId = params.id;

    const salaryStructure = await prisma.salaryStructure.findUnique({
      where: { id: structureId },
      include: {
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    if (!salaryStructure) {
      return NextResponse.json(
        { message: "Salary structure not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ salaryStructure });
  } catch (error) {
    console.error("Get salary structure error:", error);
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

    // Check if user has permission to update salary structures
    if (!hasPermission(user, "payroll.update")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();
    const structureId = params.id;

    const salaryStructure = await prisma.salaryStructure.update({
      where: { id: structureId },
      data: {
        name: data.name,
        basicSalary: data.basicSalary,
        allowances: data.allowances,
        deductions: data.deductions,
        grossSalary: data.grossSalary,
        netSalary: data.netSalary,
        effectiveFrom: data.effectiveFrom
          ? new Date(data.effectiveFrom)
          : undefined,
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      },
    });

    return NextResponse.json({
      message: "Salary structure updated successfully",
      salaryStructure,
    });
  } catch (error) {
    console.error("Update salary structure error:", error);
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

    // Check if user has permission to delete salary structures
    if (!hasPermission(user, "payroll.delete")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const structureId = params.id;

    // Check if salary structure is in use
    const employeesUsingStructure = await prisma.employee.count({
      where: { salaryStructureId: structureId },
    });

    if (employeesUsingStructure > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete salary structure. It is currently assigned to ${employeesUsingStructure} employee(s).`,
        },
        { status: 400 }
      );
    }

    await prisma.salaryStructure.delete({
      where: { id: structureId },
    });

    return NextResponse.json({
      message: "Salary structure deleted successfully",
    });
  } catch (error) {
    console.error("Delete salary structure error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
