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

    // Check if user has permission to view payroll stats
    if (!hasPermission(user, "payroll.read") && !hasPermission(user, "payroll.read_all")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Build department filter for department managers
    let departmentFilter = {};
    if (!hasPermission(user, "payroll.read_all") && user.role === "DEPARTMENT_MANAGER" && user.employee?.departmentId) {
      departmentFilter = { departmentId: user.employee.departmentId };
    }

    // Get total employees (with department filter if applicable)
    const totalEmployees = await prisma.employee.count({
      where: {
        status: "ACTIVE",
        ...departmentFilter,
      },
    });

    // Get processed payrolls count (with department filter if applicable)
    const processedPayrolls = await prisma.payrollRecord.count({
      where: {
        status: PayrollStatus.PROCESSED,
        employee: departmentFilter,
      },
    });

    // Get pending payrolls count (with department filter if applicable)
    // Since there's no PENDING status, we'll count GENERATED and PROCESSING as pending
    const pendingPayrolls = await prisma.payrollRecord.count({
      where: {
        status: {
          in: [PayrollStatus.GENERATED, PayrollStatus.PROCESSING]
        },
        employee: departmentFilter,
      },
    });

    // Calculate total payroll amount (with department filter if applicable)
    const payrollAmountResult = await prisma.payrollRecord.aggregate({
      where: {
        status: PayrollStatus.PROCESSED,
        employee: departmentFilter,
      },
      _sum: {
        netPay: true,
      },
    });

    const totalPayrollAmount = payrollAmountResult._sum.netPay || 0;

    const stats = {
      totalEmployees,
      processedPayrolls,
      pendingPayrolls,
      totalPayrollAmount,
    };

    console.log("Payroll stats query:", {
      userRole: user.role,
      userDepartmentId: user.employee?.departmentId,
      hasPayrollReadAll: hasPermission(user.role, "payroll.read_all"),
      hasPayrollRead: hasPermission(user.role, "payroll.read"),
      departmentFilter,
      stats,
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Get payroll stats error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
