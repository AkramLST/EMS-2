import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PayrollStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const canReadAll = hasPermission(user, "payroll.read_all");
    const canRead = hasPermission(user, "payroll.read");

    // Check basic payroll read permission
    if (!canRead && !canReadAll) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const employeeId = searchParams.get("employeeId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    // Build base where clause
    const where: any = {};
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    // Apply role-based filtering
    let payrollWhere = { ...where };

    // If user doesn't have payroll.read_all, apply department filtering
    if (!canReadAll) {
      if (user.role === "DEPARTMENT_MANAGER" && user.employee?.departmentId) {
        // Department managers can only see payroll records for employees in their department
        payrollWhere.employee = {
          departmentId: user.employee.departmentId,
        };
      } else if (user.role === "EMPLOYEE" && user.employee) {
        // Employees can only see their own payroll records
        payrollWhere.employeeId = user.employee.id;
      } else {
        // For other roles without read_all, return empty result
        payrollWhere.id = "non-existent-id";
      }
    }

    const [payrollRecords, total] = await Promise.all([
      prisma.payrollRecord.findMany({
        where: payrollWhere,
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
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
      prisma.payrollRecord.count({ where: payrollWhere }),
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

    if (!user || !user.employee) {
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
      month,
      year,
      basicPay,
      allowances,
      deductions,
      overtimeHours,
      bonuses,
      penalties,
    } = data;

    // Validate required fields
    if (!employeeId || !month || !year) {
      return NextResponse.json(
        { message: "Employee ID, month, and year are required" },
        { status: 400 }
      );
    }

    const employeeIdentifier = employeeId.toString().trim();

    // Look up employee by either internal database ID or public employee code
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { id: employeeIdentifier },
          { employeeId: employeeIdentifier },
          { email: employeeIdentifier },
        ],
      },
      include: {
        currentSalary: {
          where: { status: "ACTIVE" },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    // Check if payroll record already exists for this employee and period
    const existingRecord = await prisma.payrollRecord.findFirst({
      where: {
        employeeId: employee.id,
        month: parseInt(month),
        year: parseInt(year),
      },
    });

    if (existingRecord) {
      return NextResponse.json(
        {
          message: "Payroll record already exists for this employee and period",
        },
        { status: 400 }
      );
    }

    // Get the active salary structure
    const salaryStructure = employee.currentSalary[0];
    if (!salaryStructure) {
      return NextResponse.json(
        { message: "No active salary structure found for employee" },
        { status: 400 }
      );
    }

    // Get attendance records for the month
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        employeeId: employee.id,
        date: {
          gte: new Date(parseInt(year), parseInt(month) - 1, 1),
          lt: new Date(parseInt(year), parseInt(month), 1),
        },
      },
    });

    // Calculate attendance
    const requestedWorkingDays = data.workingDays
      ? Number(data.workingDays)
      : undefined;
    const workingDaysInMonth = Number.isFinite(requestedWorkingDays as number)
      ? Number(requestedWorkingDays)
      : getWorkingDays(
          new Date(parseInt(year), parseInt(month) - 1, 1),
          new Date(parseInt(year), parseInt(month), 0)
        );

    const requestedPresentDays = data.presentDays
      ? Number(data.presentDays)
      : undefined;
    const calculatedPresentDays = attendanceRecords.filter(
      (record) => record.status === "PRESENT" || record.status === "LATE"
    ).length;
    const presentDays = Number.isFinite(requestedPresentDays as number)
      ? Math.min(Number(requestedPresentDays), workingDaysInMonth)
      : calculatedPresentDays;
    const absentDays = Math.max(workingDaysInMonth - presentDays, 0);

    // Calculate salary components
    const baseBasicSalary =
      basicPay !== undefined && basicPay !== null && basicPay !== ""
        ? Number(basicPay)
        : Number.parseFloat(salaryStructure.basicSalary.toString());
    const basicSalary = Number.isFinite(baseBasicSalary) ? baseBasicSalary : 0;

    const resolveComponentSource = (
      input: any,
      fallback: Record<string, any> | null | undefined,
      defaultKey: string
    ) => {
      if (input === undefined || input === null || input === "") {
        return (fallback as Record<string, any>) ?? {};
      }

      if (typeof input === "object" && !Array.isArray(input)) {
        const entries = Object.entries(input as Record<string, any>).filter(
          ([, value]) => value !== undefined && value !== null && value !== ""
        );

        if (entries.length === 0) {
          return (fallback as Record<string, any>) ?? {};
        }

        return Object.fromEntries(entries);
      }

      return { [defaultKey]: toNumericValue(input) };
    };

    const allowanceSource = resolveComponentSource(
      allowances,
      salaryStructure.allowances as Record<string, any> | null,
      "manualAllowance"
    );
    const deductionSource = resolveComponentSource(
      deductions,
      salaryStructure.deductions as Record<string, any> | null,
      "manualDeduction"
    );

    const normalizedAllowances = normalizeNumericMap(allowanceSource);
    const normalizedDeductions = normalizeNumericMap(deductionSource);

    // Calculate pro-rated salary based on attendance
    let attendanceRatio = workingDaysInMonth > 0 ? presentDays / workingDaysInMonth : 1;

    // If there are no attendance records recorded for the period, default to full salary
    if (attendanceRecords.length === 0) {
      attendanceRatio = 1;
    }
    const proRatedBasicPay = basicSalary * attendanceRatio;

    // Calculate allowances
    let totalAllowances = 0;
    const allowanceBreakdown: any = {};
    Object.entries(normalizedAllowances).forEach(([key, value]) => {
      const amount = value * attendanceRatio;
      allowanceBreakdown[key] = amount;
      totalAllowances += amount;
    });

    // Calculate overtime pay (1.5x hourly rate)
    const hourlyRate = workingDaysInMonth > 0 ? basicSalary / (workingDaysInMonth * 8) : 0;
    const overtimeHoursValue = toNumericValue(overtimeHours);
    const overtimePay = overtimeHoursValue * hourlyRate * 1.5;

    // Gross pay calculation
    const grossPay =
      proRatedBasicPay +
      totalAllowances +
      overtimePay +
      toNumericValue(bonuses);

    // Calculate deductions
    let totalDeductions = 0;
    const deductionBreakdown: any = {};
    Object.entries(normalizedDeductions).forEach(([key, value]) => {
      const amount = value;
      deductionBreakdown[key] = amount;
      totalDeductions += amount;
    });

    // Add additional deductions
    const penaltyValue = toNumericValue(penalties);
    totalDeductions += penaltyValue;

    // Final net pay
    const roundedBasicPay = Math.round(proRatedBasicPay);
    const roundedAllowances = Math.round(totalAllowances);
    const roundedOvertime = Math.round(overtimePay);
    const roundedBonuses = Math.round(toNumericValue(bonuses));
    const roundedGrossPay =
      roundedBasicPay + roundedAllowances + roundedOvertime + roundedBonuses;

    const roundedTotalDeductions = Math.round(totalDeductions);
    const roundedNetPay = Math.max(roundedGrossPay - roundedTotalDeductions, 0);

    // Create payroll record
    const payrollRecord = await prisma.payrollRecord.create({
      data: {
        employee: {
          connect: { id: employee.id },
        },
        salaryStructure: {
          connect: { id: salaryStructure.id },
        },
        month: parseInt(month),
        year: parseInt(year),
        payPeriodStart: new Date(parseInt(year), parseInt(month) - 1, 1),
        payPeriodEnd: new Date(parseInt(year), parseInt(month), 0),
        workingDays: workingDaysInMonth,
        presentDays,
        absentDays,
        overtimeHours: overtimeHoursValue,
        leaveDays: 0, // Can be calculated from leave records
        basicPay: roundedBasicPay,
        allowances: allowanceBreakdown,
        grossPay: roundedGrossPay,
        deductions: deductionBreakdown,
        overtimePay: roundedOvertime,
        bonuses: roundedBonuses,
        penalties: Math.round(penaltyValue),
        totalEarnings: roundedGrossPay,
        totalDeductions: roundedTotalDeductions,
        netPay: roundedNetPay,
        taxableIncome: roundedGrossPay,
        status: PayrollStatus.GENERATED, // Use the correct enum value
        processedBy: user.employee.id,
      },
    });

    return NextResponse.json({
      message: "Payroll record created successfully",
      payrollRecord: {
        id: payrollRecord.id,
        employeeId: payrollRecord.employeeId,
        month: payrollRecord.month,
        year: payrollRecord.year,
        netPay: payrollRecord.netPay,
        status: payrollRecord.status,
        processedAt: payrollRecord.processedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create payroll record error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

function getWorkingDays(startDate: Date, endDate: Date): number {
  let workingDays = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

function toNumericValue(value: any): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "object" && value !== null) {
    if ("value" in (value as any)) {
      const nestedValue = Number((value as any).value);
      if (Number.isFinite(nestedValue)) {
        return nestedValue;
      }
    }

    if (typeof (value as any).toString === "function") {
      const stringValue = (value as any).toString();
      const parsed = Number(stringValue);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeNumericMap(source: Record<string, any>): Record<string, number> {
  return Object.entries(source).reduce<Record<string, number>>((acc, [key, value]) => {
    acc[key] = toNumericValue(value);
    return acc;
  }, {} as Record<string, number>);
}
