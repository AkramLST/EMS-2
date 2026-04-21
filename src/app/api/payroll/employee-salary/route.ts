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

    if (!hasPermission(user, "payroll.read_all")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    let whereClause: any = {};

    if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    const salaryStructures = await prisma.employeeSalaryStructure.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
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
    });

    return NextResponse.json({ salaryStructures });
  } catch (error) {
    console.error("Get employee salary structures error:", error);
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

    if (!hasPermission(user, "payroll.create")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();
    const {
      employeeId,
      templateId,
      grossSalary,
      basicSalary,
      allowances,
      deductions,
      variablePay,
      effectiveFrom,
      revisionReason,
    } = data;

    // Validate required fields
    if (!employeeId || !effectiveFrom) {
      return NextResponse.json(
        { message: "Employee ID and effective date are required" },
        { status: 400 }
      );
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true },
    });

    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    let templateData = null;
    let calculatedSalary = {
      basicSalary: parseFloat(basicSalary || "0"),
      allowances: allowances || {},
      deductions: deductions || {},
      grossSalary: parseFloat(grossSalary || "0"),
    };

    // If template is provided, use it for calculations
    if (templateId) {
      const template = await prisma.salaryTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return NextResponse.json(
          { message: "Template not found" },
          { status: 404 }
        );
      }

      templateData = template;

      // Calculate salary based on template
      if (template.isPercentageBased && template.basicSalaryPercent) {
        calculatedSalary.basicSalary =
          (parseFloat(grossSalary) * Number(template.basicSalaryPercent)) / 100;
      } else if (template.basicSalaryFixed) {
        calculatedSalary.basicSalary = Number(template.basicSalaryFixed);
      }

      // Apply template allowances and deductions
      const allowancesTemplate = template.allowancesTemplate as any;
      const deductionsTemplate = template.deductionsTemplate as any;

      // Calculate allowances
      const calculatedAllowances: any = {};
      if (allowancesTemplate) {
        Object.entries(allowancesTemplate).forEach(
          ([key, config]: [string, any]) => {
            if (config.type === "percentage") {
              calculatedAllowances[key] =
                (parseFloat(grossSalary) * parseFloat(config.value)) / 100;
            } else {
              calculatedAllowances[key] = parseFloat(config.value);
            }
          }
        );
      }

      // Calculate deductions
      const calculatedDeductions: any = {};
      if (deductionsTemplate) {
        Object.entries(deductionsTemplate).forEach(
          ([key, config]: [string, any]) => {
            if (config.type === "percentage") {
              calculatedDeductions[key] =
                (parseFloat(grossSalary) * parseFloat(config.value)) / 100;
            } else {
              calculatedDeductions[key] = parseFloat(config.value);
            }
          }
        );
      }

      calculatedSalary.allowances = calculatedAllowances;
      calculatedSalary.deductions = calculatedDeductions;
    }

    // Calculate totals
    const totalAllowances = Object.values(calculatedSalary.allowances).reduce(
      (sum: number, val: any) => sum + parseFloat(val || 0),
      0
    );
    const totalDeductions = Object.values(calculatedSalary.deductions).reduce(
      (sum: number, val: any) => sum + parseFloat(val || 0),
      0
    );
    const netSalary = calculatedSalary.grossSalary - totalDeductions;
    const ctc = calculatedSalary.grossSalary + totalAllowances;

    // Get the latest revision number for this employee
    const latestRevision = await prisma.employeeSalaryStructure.findFirst({
      where: { employeeId },
      orderBy: { revisionNumber: "desc" },
    });

    const revisionNumber = latestRevision
      ? latestRevision.revisionNumber + 1
      : 1;

    // Create the salary structure
    const salaryStructure = await prisma.employeeSalaryStructure.create({
      data: {
        employeeId,
        templateId,
        templateName: templateData?.name,
        basicSalary: calculatedSalary.basicSalary,
        allowances: calculatedSalary.allowances,
        deductions: calculatedSalary.deductions,
        grossSalary: calculatedSalary.grossSalary,
        netSalary,
        ctc,
        variablePay: parseFloat(variablePay || "0"),
        effectiveFrom: new Date(effectiveFrom),
        revisionNumber,
        revisionReason: revisionReason || "Initial salary assignment",
        createdBy: user.employee?.id || user.id,
        status: "ACTIVE",
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            designation: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Salary structure assigned successfully",
      salaryStructure,
    });
  } catch (error) {
    console.error("Assign salary structure error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
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
      id,
      templateId,
      grossSalary,
      basicSalary,
      allowances,
      deductions,
      variablePay,
      effectiveFrom,
      revisionReason,
      status,
      manualAllowances,
      manualDeductions,
    } = data;

    if (!id) {
      return NextResponse.json(
        { message: "Salary assignment ID is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.employeeSalaryStructure.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Salary assignment not found" },
        { status: 404 }
      );
    }

    const grossValue = grossSalary !== undefined
      ? parseFloat(grossSalary)
      : Number(existing.grossSalary);

    let templateToUse: string | null | undefined;
    if (templateId !== undefined) {
      templateToUse = templateId ? String(templateId) : null;
    } else {
      templateToUse = existing.templateId;
    }

    let calculatedBasic =
      basicSalary !== undefined
        ? parseFloat(basicSalary)
        : Number(existing.basicSalary);
    const providedAllowances =
      manualAllowances !== undefined
        ? (manualAllowances as Record<string, number | string>)
        : allowances;
    const providedDeductions =
      manualDeductions !== undefined
        ? (manualDeductions as Record<string, number | string>)
        : deductions;

    let calculatedAllowances =
      providedAllowances !== undefined
        ? providedAllowances
        : ((existing.allowances as any) || {});
    let calculatedDeductions =
      providedDeductions !== undefined
        ? providedDeductions
        : ((existing.deductions as any) || {});
    let templateData: any = null;

    if (templateToUse) {
      const template = await prisma.salaryTemplate.findUnique({
        where: { id: templateToUse },
      });

      if (!template) {
        return NextResponse.json(
          { message: "Template not found" },
          { status: 404 }
        );
      }

      templateData = template;

      if (template.isPercentageBased && template.basicSalaryPercent) {
        calculatedBasic =
          (grossValue * Number(template.basicSalaryPercent)) / 100;
      } else if (template.basicSalaryFixed) {
        calculatedBasic = Number(template.basicSalaryFixed);
      }

      const allowancesTemplate = template.allowancesTemplate as any;
      const deductionsTemplate = template.deductionsTemplate as any;

      calculatedAllowances = {};
      if (allowancesTemplate) {
        Object.entries(allowancesTemplate).forEach(
          ([key, config]: [string, any]) => {
            if (config.type === "percentage") {
              calculatedAllowances[key] =
                (grossValue * parseFloat(config.value)) / 100;
            } else {
              calculatedAllowances[key] = parseFloat(config.value);
            }
          }
        );
      }

      calculatedDeductions = {};
      if (deductionsTemplate) {
        Object.entries(deductionsTemplate).forEach(
          ([key, config]: [string, any]) => {
            if (config.type === "percentage") {
              calculatedDeductions[key] =
                (grossValue * parseFloat(config.value)) / 100;
            } else {
              calculatedDeductions[key] = parseFloat(config.value);
            }
          }
        );
      }
    }

    const totalAllowances = Object.values(calculatedAllowances || {}).reduce(
      (sum: number, val: any) => sum + parseFloat(val || 0),
      0
    );
    const totalDeductions = Object.values(calculatedDeductions || {}).reduce(
      (sum: number, val: any) => sum + parseFloat(val || 0),
      0
    );

    const netSalary = grossValue - totalDeductions;
    const ctc = grossValue + totalAllowances;

    const updated = await prisma.employeeSalaryStructure.update({
      where: { id },
      data: {
        templateId: templateToUse ?? null,
        templateName: templateData?.name ?? existing.templateName,
        basicSalary: calculatedBasic,
        allowances: calculatedAllowances,
        deductions: calculatedDeductions,
        grossSalary: grossValue,
        netSalary,
        ctc,
        variablePay:
          variablePay !== undefined
            ? parseFloat(variablePay)
            : existing.variablePay,
        effectiveFrom: effectiveFrom
          ? new Date(effectiveFrom)
          : existing.effectiveFrom,
        revisionReason: revisionReason ?? existing.revisionReason,
        status: status ?? existing.status,
      },
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
      },
    });

    return NextResponse.json({
      message: "Salary assignment updated successfully",
      salaryStructure: updated,
    });
  } catch (error) {
    console.error("Update salary assignment error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, "payroll.delete")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Salary assignment ID is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.employeeSalaryStructure.findUnique({
      where: { id },
      include: {
        payrollRecords: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Salary assignment not found" },
        { status: 404 }
      );
    }

    if (existing.payrollRecords && existing.payrollRecords.length > 0) {
      return NextResponse.json(
        {
          message:
            "Cannot delete salary assignment because payroll records exist for this structure",
        },
        { status: 400 }
      );
    }

    await prisma.employeeSalaryStructure.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Salary assignment deleted successfully",
    });
  } catch (error) {
    console.error("Delete salary assignment error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
