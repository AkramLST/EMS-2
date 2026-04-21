import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check user role for data filtering
    const userRole = user.role;
    const isDepartmentManager = userRole === "DEPARTMENT_MANAGER";
    const canSeeAllData = userRole === "ADMINISTRATOR" || userRole === "HR_MANAGER";

    // Format date helper
    const formatDate = (date: Date) => {
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const startOfDay = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const endOfDay = (date: Date) => {
      const d = startOfDay(date);
      d.setDate(d.getDate() + 1);
      return d;
    };

    let departmentEmployeeIds: string[] = [];

    // If user is department manager, get their team's employee IDs
    if (isDepartmentManager && user.employee?.departmentId) {
      const departmentEmployees = await prisma.employee.findMany({
        where: {
          departmentId: user.employee.departmentId,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      departmentEmployeeIds = departmentEmployees.map(emp => emp.id);
    }

    const attendanceData = await Promise.all(
      Array.from({ length: 7 }).map(async (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));

        let totalEmployees = 0;
        let presentCount = 0;

        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        if (isDepartmentManager && departmentEmployeeIds.length > 0) {
          // Department manager: only count their team members
          totalEmployees = departmentEmployeeIds.length;

          presentCount = await prisma.attendanceRecord.count({
            where: {
              employeeId: { in: departmentEmployeeIds },
              date: {
                gte: dayStart,
                lt: dayEnd,
              },
              status: { in: ["PRESENT", "LATE"] },
            },
          });
        } else if (canSeeAllData) {
          // Admin/HR: count all employees
          totalEmployees = await prisma.employee.count({
            where: { status: "ACTIVE" },
          });

          presentCount = await prisma.attendanceRecord.count({
            where: {
              date: {
                gte: dayStart,
                lt: dayEnd,
              },
              status: { in: ["PRESENT", "LATE"] },
            },
          });
        } else {
          // Employee or other roles: no attendance chart data
          totalEmployees = 0;
          presentCount = 0;
        }

        return {
          label: formatDate(date),
          percentage: totalEmployees > 0
            ? Math.round((presentCount / totalEmployees) * 100)
            : 0
        };
      })
    );

    console.log("Attendance chart data:", {
      userRole,
      isDepartmentManager,
      canSeeAllData,
      hasDepartmentData: departmentEmployeeIds.length > 0,
      dataPoints: attendanceData.length
    });

    return NextResponse.json({
      labels: attendanceData.map(d => d.label),
      datasets: [{
        label: isDepartmentManager ? "Team Attendance %" : "Attendance %",
        data: attendanceData.map(d => d.percentage),
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(139, 92, 246, 0.8)",
          "rgba(236, 72, 153, 0.8)",
          "rgba(34, 197, 94, 0.8)"
        ]
      }]
    });

  } catch (error) {
    console.error("Get attendance chart error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
