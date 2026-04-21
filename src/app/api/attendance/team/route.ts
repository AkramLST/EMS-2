import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttendanceStatus } from "@/lib/attendance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to access team attendance
    if (!hasPermission(user, "attendance.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get team members for the current user
    let teamMemberIds: string[] = [];

    if (user.role === "DEPARTMENT_MANAGER" && user.employee?.id) {
      // Get direct team members
      const teamMembers = await prisma.employee.findMany({
        where: {
          managerId: user.employee.id,
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      });

      teamMemberIds = teamMembers.map((member) => member.id);
      // Also include the manager's own records
      teamMemberIds.push(user.employee.id);
    } else if (user.role === "ADMINISTRATOR" || user.role === "HR_MANAGER") {
      // For admins/HR, return empty team data or all employees
      // For now, return empty to avoid performance issues
      return NextResponse.json({
        summary: {
          totalMembers: 0,
          presentToday: 0,
          absentToday: 0,
          lateToday: 0,
        },
        attendance: [],
      });
    } else {
      return NextResponse.json(
        { message: "No team data available for this role" },
        { status: 403 }
      );
    }

    if (teamMemberIds.length === 0) {
      return NextResponse.json({
        summary: {
          totalMembers: 0,
          presentToday: 0,
          absentToday: 0,
          lateToday: 0,
        },
        attendance: [],
      });
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get team members info
    const teamMembers = await prisma.employee.findMany({
      where: {
        id: {
          in: teamMemberIds,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        profileImage: true,
        department: {
          select: {
            name: true,
          },
        },
      },
    });

    // Get today's attendance records
    const todayAttendance = await prisma.attendanceRecord.findMany({
      where: {
        employeeId: {
          in: teamMemberIds,
        },
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            profileImage: true,
          },
        },
      },
    });

    // Recalculate attendance status with current office hours and grace time
    const attendanceWithRecalculatedStatus = await Promise.all(
      todayAttendance.map(async (record) => {
        if (record.clockIn) {
          // Recalculate status based on current office hours and grace time
          const attendanceStatus = await getAttendanceStatus(record.clockIn);

          return {
            ...record,
            status: attendanceStatus.status === 'ON_TIME' ? 'PRESENT' : attendanceStatus.status,
            recalculatedStatus: attendanceStatus.status,
            isOnTime: attendanceStatus.isOnTime,
            minutesLate: attendanceStatus.minutesLate,
          };
        }
        return record;
      })
    );

    // Create attendance map for quick lookup
    const attendanceMap = new Map(
      attendanceWithRecalculatedStatus.map((record) => [record.employeeId, record])
    );

    // Calculate summary with recalculated statuses
    const presentToday = attendanceWithRecalculatedStatus.filter(
      (record) => record.status === "PRESENT" || record.status === "ON_TIME"
    ).length;
    const lateToday = attendanceWithRecalculatedStatus.filter(
      (record) => record.status === "LATE"
    ).length;
    const absentToday = teamMembers.length - attendanceWithRecalculatedStatus.length;

    // Get this week's attendance (for future enhancement)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
    weekEnd.setHours(23, 59, 59, 999);

    const weekAttendance = await prisma.attendanceRecord.findMany({
      where: {
        employeeId: {
          in: teamMemberIds,
        },
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Group by day of week
    const weeklyData: any[] = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + i);

      const dayAttendance = weekAttendance.filter(
        (record) => record.date.toDateString() === dayDate.toDateString()
      );

      weeklyData.push({
        dayOfWeek: i + 1,
        date: dayDate.toISOString(),
        status: dayAttendance.length > 0 ? dayAttendance[0].status : "ABSENT",
        clockIn: dayAttendance[0]?.clockIn,
        clockOut: dayAttendance[0]?.clockOut,
        employeeId: dayAttendance[0]?.employeeId,
      });
    }

    return NextResponse.json({
      summary: {
        totalMembers: teamMembers.length,
        presentToday,
        absentToday,
        lateToday,
      },
      teamMembers: teamMembers.map((member) => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        employeeId: member.employeeId,
        profileImage: member.profileImage,
        department: member.department,
      })),
      attendance: weeklyData,
    });
  } catch (error) {
    console.error("Get team attendance error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
