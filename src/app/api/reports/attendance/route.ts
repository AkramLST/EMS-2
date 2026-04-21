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

    // Check if user has permission to access reports
    if (!hasPermission(user, "reports.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Restrict access to non-employee roles only
    if (user.role === "EMPLOYEE") {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get user's department for filtering
    const userDepartmentId = user.employee?.departmentId;

    // Check if user is DEPARTMENT_MANAGER - if so, filter by their department
    const isDepartmentManager = user.role === "DEPARTMENT_MANAGER";
    const departmentFilter = isDepartmentManager && userDepartmentId ? { departmentId: userDepartmentId } : {};

    // Get total employees (filtered for department managers)
    const totalEmployees = await prisma.employee.count({
      where: {
        status: "ACTIVE",
        ...departmentFilter,
      },
    });

    // Get today's attendance (filtered for department managers)
    const todayAttendance = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        employee: {
          ...departmentFilter,
        },
      },
    });

    const presentToday = todayAttendance.filter(
      (a) => a.status === "PRESENT"
    ).length;
    const absentToday = todayAttendance.filter(
      (a) => a.status === "ABSENT"
    ).length;
    const lateToday = todayAttendance.filter((a) => a.status === "LATE").length;

    // Get department-wise data (filtered for department managers)
    const departments = await prisma.department.findMany({
      where: isDepartmentManager && userDepartmentId ? { id: userDepartmentId } : {},
      include: {
        employees: {
          where: { status: "ACTIVE" },
          include: {
            attendanceRecords: {
              where: {
                date: {
                  gte: today,
                  lt: tomorrow,
                },
                status: "PRESENT",
              },
            },
          },
        },
      },
    });

    const departmentReport = departments.map((dept) => ({
      name: dept.name,
      employeeCount: dept.employees.length,
      presentCount: dept.employees.filter(
        (emp) => emp.attendanceRecords.length > 0
      ).length,
    }));

    return NextResponse.json({
      attendanceReport: {
        totalEmployees,
        presentToday,
        absentToday,
        lateToday,
      },
      departmentReport,
    });
  } catch (error) {
    console.error("Get attendance report error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
