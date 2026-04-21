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

    // Check if user has permission to view salary structures
    if (!hasPermission(user, "payroll.read") && !hasPermission(user, "payroll.read_all")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const salaryStructures = await prisma.salaryStructure.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("Salary structures query:", {
      userRole: user.role,
      hasPayrollReadAll: hasPermission(user, "payroll.read_all"),
      hasPayrollRead: hasPermission(user, "payroll.read"),
      structuresCount: salaryStructures.length,
    });

    return NextResponse.json({ salaryStructures });
  } catch (error) {
    console.error("Get salary structures error:", error);
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

    // Check if user has permission to create salary structures
    if (!hasPermission(user, "payroll.create")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();

    const salaryStructure = await prisma.salaryStructure.create({
      data: {
        name: data.name,
        basicSalary: data.basicSalary,
        allowances: data.allowances,
        deductions: data.deductions,
        grossSalary: data.grossSalary,
        netSalary: data.netSalary,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      },
    });

    return NextResponse.json({
      message: "Salary structure created successfully",
      salaryStructure,
    });
  } catch (error) {
    console.error("Create salary structure error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
