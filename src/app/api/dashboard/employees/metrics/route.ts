import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Disable caching for this route to always get fresh data
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

interface EmployeeWithJoinDate {
  joinDate: Date;
}

export async function GET() {
  try {
    // Get total employees
    const totalEmployees = await prisma.employee.count();

    // Get active employees (status = ACTIVE)
    const activeEmployees = await prisma.employee.count({
      where: {
        status: "ACTIVE",
      },
    });

    // Get inactive employees (status = INACTIVE)
    const inactiveEmployees = await prisma.employee.count({
      where: {
        status: "INACTIVE",
      },
    });

    // Get new hires this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newHires = await prisma.employee.count({
      where: {
        joinDate: {
          gte: startOfMonth,
        },
      },
    });

    // Calculate employee growth percentage (current month vs previous month)
    const endOfLastMonth = new Date(startOfMonth);
    endOfLastMonth.setDate(0); // Last day of previous month

    const startOfLastMonth = new Date(endOfLastMonth);
    startOfLastMonth.setDate(1);

    const previousMonthCount = await prisma.employee.count({
      where: {
        joinDate: {
          lt: startOfMonth,
          gte: startOfLastMonth,
        },
      },
    });

    const growthPercentage =
      previousMonthCount > 0
        ? ((newHires - previousMonthCount) / previousMonthCount) * 100
        : newHires > 0
        ? 100
        : 0; // Handle zero division and new company cases

    // Get average tenure in years
    const employeesWithTenure = await prisma.employee.findMany({
      where: {
        joinDate: {
          not: undefined,
        },
      },
      select: {
        joinDate: true,
      },
    });

    const avgTenureInMs =
      employeesWithTenure.length > 0
        ? employeesWithTenure.reduce(
            (sum: number, employee: EmployeeWithJoinDate) => {
              return (
                sum +
                (new Date().getTime() - new Date(employee.joinDate).getTime())
              );
            },
            0
          ) / employeesWithTenure.length
        : 0;

    const avgTenure =
      Math.round((avgTenureInMs / (1000 * 60 * 60 * 24 * 365)) * 10) / 10;

    return NextResponse.json({
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      newHires,
      avgTenure,
      growthPercentage: Math.round(growthPercentage * 10) / 10,
      openPositions: 0, // Can be implemented later
      genderDiversity: { male: 0, female: 0, other: 0 }, // Placeholder - can be implemented later
    });
  } catch (error) {
    console.error("Failed to fetch employee metrics:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch employee metrics",
        details: error instanceof Error ? error.message : "Unknown error",
        stack:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.stack
              : undefined
            : undefined,
      },
      { status: 500 }
    );
  }
}
