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

    if (!hasPermission(user.role, "payroll.read_all")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const revision = await prisma.salaryRevision.findUnique({
      where: { id: params.id },
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
    });

    if (!revision) {
      return NextResponse.json(
        { message: "Salary revision not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ revision });
  } catch (error) {
    console.error("Get salary revision error:", error);
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

    if (!user || !user.employee) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "payroll.update")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();
    const {
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

    // Check if revision exists
    const existingRevision = await prisma.salaryRevision.findUnique({
      where: { id: params.id },
    });

    if (!existingRevision) {
      return NextResponse.json(
        { message: "Salary revision not found" },
        { status: 404 }
      );
    }

    const updatedRevision = await prisma.salaryRevision.update({
      where: { id: params.id },
      data: {
        revisionType,
        revisionReason,
        newBasicSalary: newBasicSalary ? parseFloat(newBasicSalary) : undefined,
        newGrossSalary: newGrossSalary ? parseFloat(newGrossSalary) : undefined,
        newNetSalary: newNetSalary ? parseFloat(newNetSalary) : undefined,
        newCTC: newCTC ? parseFloat(newCTC) : undefined,
        percentageIncrease: percentageIncrease
          ? parseFloat(percentageIncrease)
          : undefined,
        amountIncrease: amountIncrease ? parseFloat(amountIncrease) : undefined,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
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

    return NextResponse.json({
      message: "Salary revision updated successfully",
      revision: updatedRevision,
    });
  } catch (error) {
    console.error("Update salary revision error:", error);
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

    if (!user || !user.employee) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "payroll.delete")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if revision exists
    const revision = await prisma.salaryRevision.findUnique({
      where: { id: params.id },
    });

    if (!revision) {
      return NextResponse.json(
        { message: "Salary revision not found" },
        { status: 404 }
      );
    }

    await prisma.salaryRevision.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: "Salary revision deleted successfully",
    });
  } catch (error) {
    console.error("Delete salary revision error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
