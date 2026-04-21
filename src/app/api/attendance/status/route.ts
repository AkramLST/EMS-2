import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttendanceStatus } from "@/lib/attendance";
import { addUtcDays, startOfDayUtc } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get employee ID - use existing or find by email
    let currentEmployeeId = user.employee?.id;
    
    if (!currentEmployeeId) {
      // Try to find existing employee record for this user
      const existingEmployee = await prisma.employee.findFirst({
        where: { 
          email: user.email
        }
      });
      
      if (existingEmployee) {
        currentEmployeeId = existingEmployee.id;
      } else {
        // Return demo status for users without employee profiles
        return NextResponse.json({
          isCurrentlyWorking: false,
          clockedInTime: null,
          attendanceRecord: null
        });
      }
    }

    const today = startOfDayUtc();

    // Find today's attendance record
    const attendanceRecord = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId: currentEmployeeId,
        date: {
          gte: today,
          lt: addUtcDays(today, 1),
        },
      },
    });

    const isCurrentlyWorking =
      attendanceRecord &&
      attendanceRecord.clockIn &&
      !attendanceRecord.clockOut;
    const clockedInTime = attendanceRecord?.clockIn || null;

    // Get detailed attendance status if record exists
    let attendanceStatus = null;
    if (attendanceRecord && attendanceRecord.clockIn) {
      attendanceStatus = await getAttendanceStatus(
        attendanceRecord.clockIn,
        attendanceRecord.clockOut || undefined
      );
    }

    return NextResponse.json({
      isCurrentlyWorking,
      clockedInTime,
      attendanceRecord: attendanceRecord
        ? {
            id: attendanceRecord.id,
            status: attendanceRecord.status,
            clockIn: attendanceRecord.clockIn,
            clockOut: attendanceRecord.clockOut,
            totalHours: attendanceRecord.totalHours,
          }
        : null,
      attendanceStatus,
    });
  } catch (error) {
    console.error("Get attendance status error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
