import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    const { month, year } = data;

    if (!month || !year) {
      return NextResponse.json(
        { message: "Month and year are required" },
        { status: 400 }
      );
    }

    // Check if payroll already exists for this month/year
    const existingPayroll = await prisma.payrollRecord.findFirst({
      where: { month: parseInt(month), year: parseInt(year) },
    });

    if (existingPayroll) {
      return NextResponse.json(
        { message: "Payroll already processed for this month" },
        { status: 400 }
      );
    }

    // Get all employees with active salary structures
    const employees = await prisma.employee.findMany({
      include: {
        currentSalary: {
          where: { status: "ACTIVE" },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
        attendanceRecords: {
          where: {
            date: {
              gte: new Date(parseInt(year), parseInt(month) - 1, 1),
              lt: new Date(parseInt(year), parseInt(month), 1),
            },
          },
        },
        department: true,
      },
    });

    const payrollRecords = [];
    const payPeriodStart = new Date(parseInt(year), parseInt(month) - 1, 1);
    const payPeriodEnd = new Date(parseInt(year), parseInt(month), 0);
    const workingDaysInMonth = getWorkingDays(payPeriodStart, payPeriodEnd);

    for (const employee of employees) {
      if (employee.currentSalary.length === 0) {
        continue; // Skip employees without salary structure
      }

      const salaryStructure = employee.currentSalary[0];
      const attendanceRecords = employee.attendanceRecords;

      // Calculate attendance
      const presentDays = attendanceRecords.filter(
        (record) => record.status === "PRESENT" || record.status === "LATE"
      ).length;
      const absentDays = workingDaysInMonth - presentDays;
      const overtimeHours = attendanceRecords.reduce(
        (total, record) => total + Number(record.overtime || 0),
        0
      );

      // Calculate salary components
      const basicPay = Number(salaryStructure.basicSalary);
      const allowances = salaryStructure.allowances as any;
      const deductions = salaryStructure.deductions as any;

      // Calculate pro-rated salary based on attendance
      const attendanceRatio = presentDays / workingDaysInMonth;
      const proRatedBasicPay = basicPay * attendanceRatio;

      // Calculate allowances
      let totalAllowances = 0;
      const allowanceBreakdown: any = {};
      if (allowances) {
        Object.entries(allowances).forEach(([key, value]: [string, any]) => {
          const amount = Number(value) * attendanceRatio;
          allowanceBreakdown[key] = amount;
          totalAllowances += amount;
        });
      }

      // Calculate overtime pay (1.5x hourly rate)
      const hourlyRate = basicPay / (workingDaysInMonth * 8);
      const overtimePay = overtimeHours * hourlyRate * 1.5;

      // Gross pay calculation
      const grossPay = proRatedBasicPay + totalAllowances + overtimePay;

      // Calculate deductions
      let totalDeductions = 0;
      const deductionBreakdown: any = {};
      if (deductions) {
        Object.entries(deductions).forEach(([key, value]: [string, any]) => {
          const amount = Number(value);
          deductionBreakdown[key] = amount;
          totalDeductions += amount;
        });
      }

      // Calculate statutory deductions
      const providentFund = Math.min(proRatedBasicPay * 0.12, 1800); // 12% of basic, max 1800/month
      const professionalTax = grossPay > 10000 ? 200 : 0;
      const esi = grossPay <= 21000 ? grossPay * 0.0075 : 0; // 0.75% if salary <= 21000

      totalDeductions += providentFund + professionalTax + esi;
      deductionBreakdown.providentFund = providentFund;
      deductionBreakdown.professionalTax = professionalTax;
      if (esi > 0) deductionBreakdown.esi = esi;

      // Calculate tax (simplified)
      const annualGross = grossPay * 12;
      let incomeTax = 0;
      if (annualGross > 250000) {
        const taxableIncome = annualGross - 250000;
        if (taxableIncome <= 250000) {
          incomeTax = (taxableIncome * 0.05) / 12;
        } else if (taxableIncome <= 750000) {
          incomeTax = (250000 * 0.05 + (taxableIncome - 250000) * 0.1) / 12;
        } else {
          incomeTax =
            (250000 * 0.05 + 500000 * 0.1 + (taxableIncome - 750000) * 0.15) /
            12;
        }
      }

      totalDeductions += incomeTax;
      if (incomeTax > 0) deductionBreakdown.incomeTax = incomeTax;

      // Final net pay
      const netPay = grossPay - totalDeductions;
      const totalEarnings = grossPay;

      const payrollRecord = await prisma.payrollRecord.create({
        data: {
          employeeId: employee.id,
          salaryStructureId: salaryStructure.id,
          month: parseInt(month),
          year: parseInt(year),
          payPeriodStart,
          payPeriodEnd,
          workingDays: workingDaysInMonth,
          presentDays,
          absentDays,
          overtimeHours,
          leaveDays: 0, // Can be calculated from leave records
          basicPay: proRatedBasicPay,
          allowances: allowanceBreakdown,
          grossPay,
          deductions: deductionBreakdown,
          overtimePay,
          bonuses: 0, // Can be added later
          penalties: 0, // Can be added later
          totalEarnings,
          totalDeductions,
          netPay,
          taxableIncome: grossPay,
          incomeTax,
          professionalTax,
          providentFund,
          esi,
          status: "GENERATED",
          processedBy: user.employee.id,
        },
      });

      payrollRecords.push(payrollRecord);
    }

    return NextResponse.json({
      message: `Payroll processed successfully for ${payrollRecords.length} employees`,
      processedCount: payrollRecords.length,
      payrollRecords: payrollRecords.map((record) => ({
        id: record.id,
        employeeId: record.employeeId,
        netPay: record.netPay,
        status: record.status,
      })),
    });
  } catch (error) {
    console.error("Process monthly payroll error:", error);
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
