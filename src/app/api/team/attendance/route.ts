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

    // Get employee ID
    let employeeId = user.employee?.id;

    if (!employeeId) {
      return NextResponse.json({ message: "Employee profile not found" }, { status: 404 });
    }

    // Get team members based on user's role
    let teamMembers = [];

    if (user.role === "EMPLOYEE") {
      // For regular employees, get team members under the same manager
      if (!user.employee?.managerId) {
        return NextResponse.json({
          teamMembers: [],
          attendance: [],
          summary: {
            totalMembers: 0,
            presentToday: 0,
            absentToday: 0,
            lateToday: 0
          }
        });
      }

      teamMembers = await prisma.employee.findMany({
        where: {
          managerId: user.employee.managerId,
          id: { not: employeeId }, // Exclude self
          status: "ACTIVE",
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          designation: true,
          department: {
            select: {
              name: true,
            },
          },
        },
      });
    } else if (user.role === "DEPARTMENT_MANAGER" || user.role === "MANAGER") {
      // For managers, get their direct reports
      if (!employeeId) {
        return NextResponse.json({ message: "Manager profile not found" }, { status: 404 });
      }

      teamMembers = await prisma.employee.findMany({
        where: {
          managerId: employeeId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          designation: true,
          department: {
            select: {
              name: true,
            },
          },
        },
      });
    } else {
      // For HR/Admin, get all employees in their department
      const departmentId = user.employee?.departmentId;
      if (!departmentId) {
        return NextResponse.json({
          teamMembers: [],
          attendance: [],
          summary: {
            totalMembers: 0,
            presentToday: 0,
            absentToday: 0,
            lateToday: 0
          }
        });
      }

      teamMembers = await prisma.employee.findMany({
        where: {
          departmentId: departmentId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          designation: true,
          department: {
            select: {
              name: true,
            },
          },
        },
      });
    }

    // Get today's date
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get today's attendance for team members
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        employeeId: { in: teamMembers.map(member => member.id) },
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      select: {
        id: true,
        employeeId: true,
        status: true,
        clockIn: true,
        clockOut: true,
        totalHours: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
          }
        }
      },
    });

    // Calculate summary
    const summary = {
      totalMembers: teamMembers.length,
      presentToday: attendanceRecords.filter(record => record.status === "PRESENT").length,
      absentToday: attendanceRecords.filter(record => record.status === "ABSENT").length,
      lateToday: attendanceRecords.filter(record => record.status === "LATE").length,
    };

    return NextResponse.json({
      teamMembers,
      attendance: attendanceRecords,
      summary,
    });
  } catch (error) {
    console.error("Get team attendance error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
