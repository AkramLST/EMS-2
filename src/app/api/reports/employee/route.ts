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

    // Restrict access to non-employee roles only
    if (user.role === "EMPLOYEE") {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if user has permission to view reports
    if (!hasPermission(user, "reports.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Get user's department for filtering
    const userDepartmentId = user.employee?.departmentId;

    // Check if user is DEPARTMENT_MANAGER - if so, filter by their department
    const isDepartmentManager = user.role === "DEPARTMENT_MANAGER";
    const departmentFilter = isDepartmentManager && userDepartmentId ? { departmentId: userDepartmentId } : {};

    console.log("Employee report API called with:", {
      userRole: user.role,
      userDepartmentId: user.employee?.departmentId,
      isDepartmentManager,
      departmentFilter,
    });

    // Get employee statistics (filtered for department managers)
    const totalEmployees = await prisma.employee.count({
      where: departmentFilter,
    });
    const activeEmployees = await prisma.employee.count({
      where: {
        status: "ACTIVE",
        ...departmentFilter,
      },
    });
    const inactiveEmployees = await prisma.employee.count({
      where: {
        status: "INACTIVE",
        ...departmentFilter,
      },
    });
    const terminatedEmployees = await prisma.employee.count({
      where: {
        status: "TERMINATED",
        ...departmentFilter,
      },
    });

    // Get department-wise employee count (filtered for department managers)
    const departments = await prisma.department.findMany({
      where: isDepartmentManager && userDepartmentId ? { id: userDepartmentId } : {},
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    const departmentStats = departments.map((dept) => ({
      name: dept.name,
      employeeCount: dept._count.employees,
    }));

    // Get employment type statistics (filtered for department managers)
    const employmentTypeStats = await prisma.employee.groupBy({
      by: ["employmentType"],
      where: departmentFilter,
      _count: {
        employmentType: true,
      },
    });

    // Get recent hires (within last 30 days if no date range specified, filtered for department managers)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentHires = await prisma.employee.count({
      where: {
        joinDate: {
          gte: startDate ? new Date(startDate) : thirtyDaysAgo,
          lte: endDate ? new Date(endDate) : new Date(),
        },
        ...departmentFilter,
      },
    });

    return NextResponse.json({
      employeeReport: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        terminatedEmployees,
        recentHires,
      },
      departmentStats,
      employmentTypeStats: employmentTypeStats.map((stat) => ({
        type: stat.employmentType,
        count: stat._count.employmentType,
      })),
      debug: {
        userRole: user.role,
        userDepartmentId: user.employee?.departmentId,
        isDepartmentManager,
        departmentFilter,
      }
    });
  } catch (error) {
    console.error("Get employee report error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
