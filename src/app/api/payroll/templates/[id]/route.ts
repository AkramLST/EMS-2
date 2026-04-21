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

    if (!hasPermission(user, "payroll.read_all")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const template = await prisma.salaryTemplate.findUnique({
      where: { id: params.id },
    });

    if (!template) {
      return NextResponse.json(
        { message: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Get salary template error:", error);
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

    if (!hasPermission(user, "payroll.update")) {
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
      isActive,
    } = data;

    // Check if template exists
    const existingTemplate = await prisma.salaryTemplate.findUnique({
      where: { id: params.id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { message: "Template not found" },
        { status: 404 }
      );
    }

    // Check if name is being changed and if it conflicts
    if (name && name !== existingTemplate.name) {
      const nameConflict = await prisma.salaryTemplate.findUnique({
        where: { name },
      });

      if (nameConflict) {
        return NextResponse.json(
          { message: "Template name already exists" },
          { status: 400 }
        );
      }
    }

    const updatedTemplate = await prisma.salaryTemplate.update({
      where: { id: params.id },
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
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return NextResponse.json({
      message: "Template updated successfully",
      template: updatedTemplate,
    });
  } catch (error) {
    console.error("Update salary template error:", error);
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

    if (!hasPermission(user, "payroll.delete")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if template exists
    const template = await prisma.salaryTemplate.findUnique({
      where: { id: params.id },
    });

    if (!template) {
      return NextResponse.json(
        { message: "Template not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.salaryTemplate.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Delete salary template error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
