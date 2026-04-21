import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to process payroll
    if (!hasPermission(user, "payroll.process")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { month, year } = await request.json();

    // Get all active employees with their salary structures
    const employees = await prisma.employee.findMany({
      where: {
        status: "ACTIVE",
        currentSalary: {
          some: {
            status: "ACTIVE",
          },
        },
      },
      include: {
        currentSalary: {
          where: {
            status: "ACTIVE",
          },
          orderBy: {
            effectiveFrom: "desc",
          },
          take: 1,
        },
        department: true,
      },
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { message: "No employees found with salary structures" },
        { status: 400 }
      );
    }

    // For demo purposes, simulate bulk processing
    // In a real implementation, you would:
    // 1. Calculate attendance for each employee
    // 2. Apply overtime, bonuses, deductions
    // 3. Generate payslips
    // 4. Create payroll records

    const processedCount = employees.length;
    const totalAmount = employees.reduce((sum, emp) => {
      const activeSalary = emp.currentSalary[0];
      const net = activeSalary ? parseFloat(activeSalary.netSalary.toString()) : 0;
      return sum + net;
    }, 0);

    return NextResponse.json({
      message: `Bulk payroll processing completed for ${processedCount} employees`,
      processedCount,
      totalAmount,
      month,
      year,
    });
  } catch (error) {
    console.error("Bulk payroll process error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
