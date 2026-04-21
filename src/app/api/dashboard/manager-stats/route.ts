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

    // Only department managers should access this
    if (user.role !== "DEPARTMENT_MANAGER") {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get team size (only direct reports)
    const teamSize = await prisma.employee.count({
      where: {
        managerId: user.employee?.id,
        status: "ACTIVE",
      },
    });

    // Get present today (only team members)
    const presentToday = await prisma.attendanceRecord.count({
      where: {
        employee: {
          managerId: user.employee?.id,
        },
        date: {
          gte: today,
          lt: tomorrow,
        },
        status: "PRESENT",
      },
    });

    // Get absent today (only team members)
    const absentToday = await prisma.attendanceRecord.count({
      where: {
        employee: {
          managerId: user.employee?.id,
        },
        date: {
          gte: today,
          lt: tomorrow,
        },
        status: "ABSENT",
      },
    });

    // Get pending leave applications (only team members)
    const pendingLeaves = await prisma.leaveApplication.count({
      where: {
        employee: {
          managerId: user.employee?.id,
        },
        status: "PENDING",
      },
    });

    // Get performance reviews count (simplified)
    const performanceReviews = await prisma.performanceReview.count({
      where: {
        employee: {
          managerId: user.employee?.id,
        },
      },
    });

    // Get department name
    let departmentName = "";
    if (user.employee?.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: user.employee.departmentId },
        select: { name: true },
      });
      departmentName = department?.name || "";
    }

    return NextResponse.json({
      teamSize,
      presentToday,
      absentToday,
      pendingLeaves,
      performanceReviews,
      departmentName,
    });
  } catch (error) {
    console.error("Manager dashboard stats error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
