import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "payroll.read_all")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    let whereClause: any = {};

    if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    const revisions = await prisma.salaryRevision.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
            designation: true,
            department: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    });

    const totalCount = await prisma.salaryRevision.count({
      where: whereClause,
    });

    return NextResponse.json({
      revisions,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get salary revisions error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user || !user.employee) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "payroll.create")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();
    const {
      employeeId,
      revisionType,
      revisionReason,
      newBasicSalary,
      newGrossSalary,
      newNetSalary,
      newCTC,
      percentageIncrease,
      amountIncrease,
      effectiveFrom,
    } = data;

    // Validate required fields
    if (
      !employeeId ||
      !revisionType ||
      !revisionReason ||
      !newBasicSalary ||
      !newGrossSalary ||
      !newNetSalary ||
      !newCTC ||
      !effectiveFrom
    ) {
      return NextResponse.json(
        { message: "All salary revision fields are required" },
        { status: 400 }
      );
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    // Get current salary structure for previous values
    const currentSalary = await prisma.employeeSalaryStructure.findFirst({
      where: { employeeId, status: "ACTIVE" },
      orderBy: { effectiveFrom: "desc" },
    });

    const revision = await prisma.$transaction(async (tx) => {
      // Create the salary revision record
      const salaryRevision = await tx.salaryRevision.create({
        data: {
          employeeId,
          previousBasicSalary: currentSalary?.basicSalary || 0,
          previousGrossSalary: currentSalary?.grossSalary || 0,
          previousNetSalary: currentSalary?.netSalary || 0,
          previousCTC: currentSalary?.ctc || 0,
          newBasicSalary: parseFloat(newBasicSalary),
          newGrossSalary: parseFloat(newGrossSalary),
          newNetSalary: parseFloat(newNetSalary),
          newCTC: parseFloat(newCTC),
          revisionType,
          revisionReason,
          percentageIncrease: percentageIncrease
            ? parseFloat(percentageIncrease)
            : null,
          amountIncrease: amountIncrease ? parseFloat(amountIncrease) : null,
          effectiveFrom: new Date(effectiveFrom),
          approvedBy: user.employee?.id || user.id,
          approvedAt: new Date(),
          createdBy: user.employee?.id || user.id,
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              employeeId: true,
              designation: true,
            },
          },
        },
      });

      // Update or create new salary structure
      if (currentSalary) {
        // Set effective end date for current salary structure
        await tx.employeeSalaryStructure.update({
          where: { id: currentSalary.id },
          data: { effectiveTo: new Date(effectiveFrom) },
        });
      }

      // Create new salary structure with revision
      const newRevisionNumber = currentSalary
        ? currentSalary.revisionNumber + 1
        : 1;

      await tx.employeeSalaryStructure.create({
        data: {
          employeeId,
          templateId: currentSalary?.templateId,
          templateName: currentSalary?.templateName,
          basicSalary: parseFloat(newBasicSalary),
          allowances: currentSalary?.allowances || {},
          deductions: currentSalary?.deductions || {},
          grossSalary: parseFloat(newGrossSalary),
          netSalary: parseFloat(newNetSalary),
          ctc: parseFloat(newCTC),
          variablePay: currentSalary?.variablePay || 0,
          effectiveFrom: new Date(effectiveFrom),
          revisionNumber: newRevisionNumber,
          previousRevisionId: currentSalary?.id,
          revisionReason,
          createdBy: user.employee?.id || user.id,
          status: "ACTIVE",
        },
      });

      return salaryRevision;
    });

    return NextResponse.json({
      message: "Salary revision created successfully",
      revision,
    });
  } catch (error) {
    console.error("Create salary revision error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
