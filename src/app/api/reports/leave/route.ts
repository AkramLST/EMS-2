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

    // Check if user has permission to view leave reports
    if (!hasPermission(user, "leave.read_all") && !hasPermission(user, "leave.read")) {
      console.log("Leave report access denied for user:", {
        userId: user.id,
        userRole: user.role,
        hasLeaveReadAll: hasPermission(user, "leave.read_all"),
        hasLeaveRead: hasPermission(user, "leave.read"),
        requiredPermissions: ["leave.read_all", "leave.read"]
      });
      return NextResponse.json(
        { message: "Insufficient permissions to access leave reports" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        appliedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      };
    }

    // Test database connection and table existence
    try {
      const testQuery = await prisma.leaveApplication.findFirst();
      console.log("Leave applications table exists, sample record:", testQuery ? "Found" : "Empty table");
    } catch (dbError) {
      console.error("Database connection or table issue:", dbError);
      return NextResponse.json(
        { message: "Database connection error", error: dbError instanceof Error ? dbError.message : "Unknown database error" },
        { status: 500 }
      );
    }

    // Get user's department for filtering
    const userDepartmentId = user.employee?.departmentId;

    // Check if user is DEPARTMENT_MANAGER - if so, filter by their department
    const isDepartmentManager = user.role === "DEPARTMENT_MANAGER";
    const departmentFilter = isDepartmentManager && userDepartmentId ? { employee: { departmentId: userDepartmentId } } : {};

    console.log("Leave report API called with:", {
      userRole: user.role,
      userDepartmentId: user.employee?.departmentId,
      isDepartmentManager,
      dateFilter,
      departmentFilter,
    });

    const [pending, approved, rejected] = await Promise.all([
      prisma.leaveApplication.count({
        where: {
          ...dateFilter,
          status: "PENDING",
          ...departmentFilter,
        },
      }).catch(() => 0),
      prisma.leaveApplication.count({
        where: {
          ...dateFilter,
          status: "APPROVED",
          ...departmentFilter,
        },
      }).catch(() => 0),
      prisma.leaveApplication.count({
        where: {
          ...dateFilter,
          status: "REJECTED",
          ...departmentFilter,
        },
      }).catch(() => 0),
    ]);

    console.log("Leave report results:", {
      pending,
      approved,
      rejected,
    });

    return NextResponse.json({
      leaveReport: {
        pending,
        approved,
        rejected,
      },
      debug: {
        userRole: user.role,
        userDepartmentId: user.employee?.departmentId,
        isDepartmentManager,
        dateFilter,
        departmentFilter,
      }
    });
  } catch (error) {
    console.error("Get leave report error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
