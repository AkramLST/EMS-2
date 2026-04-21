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

    // Check if user has permission to view salary templates
    const canReadAll = hasPermission(user, "payroll.read_all");
    const canRead = hasPermission(user, "payroll.read");

    if (!canReadAll && !canRead) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const templates = await prisma.salaryTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Get salary templates error:", error);
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

    // Check if user has permission to create salary templates
    if (!hasPermission(user, "payroll.create")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();
    const {
      name,
      description,
      targetRole,
      targetDepartment,
      basicSalaryPercent,
      basicSalaryFixed,
      isPercentageBased,
      allowancesTemplate,
      deductionsTemplate,
    } = data;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { message: "Template name is required" },
        { status: 400 }
      );
    }

    // Check if template name already exists
    const existingTemplate = await prisma.salaryTemplate.findUnique({
      where: { name },
    });

    if (existingTemplate) {
      return NextResponse.json(
        { message: "Template name already exists" },
        { status: 400 }
      );
    }

    const template = await prisma.salaryTemplate.create({
      data: {
        name,
        description,
        targetRole,
        targetDepartment,
        basicSalaryPercent: basicSalaryPercent
          ? parseFloat(basicSalaryPercent)
          : null,
        basicSalaryFixed: basicSalaryFixed
          ? parseFloat(basicSalaryFixed)
          : null,
        isPercentageBased: Boolean(isPercentageBased),
        allowancesTemplate,
        deductionsTemplate,
        createdBy: user.employee.id,
      },
    });

    return NextResponse.json({
      message: "Salary template created successfully",
      template,
    });
  } catch (error) {
    console.error("Create salary template error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
