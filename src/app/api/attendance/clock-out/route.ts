import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateWorkingHours, addUtcDays, startOfDayUtc } from "@/lib/utils";
import { getAttendanceStatus } from "@/lib/attendance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Log request details for debugging
    console.log("[Clock Out] Request received");
    console.log(
      "[Clock Out] Request headers:",
      Object.fromEntries(request.headers)
    );
    console.log(
      "[Clock Out] Content-Type:",
      request.headers.get("content-type")
    );

    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.log("[Clock Out] Invalid content type:", contentType);
      return NextResponse.json(
        { message: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

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
        return NextResponse.json(
          { message: "No employee profile found. Please contact HR." },
          { status: 403 }
        );
      }
    }

    // Check if employee is active
    const employee = await prisma.employee.findUnique({
      where: { id: currentEmployeeId },
      select: { status: true, firstName: true, lastName: true },
    });

    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    if (employee.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "Only active employees can clock out" },
        { status: 403 }
      );
    }

    // Add error handling for JSON parsing
    let requestData;
    try {
      console.log("[Clock Out] Attempting to parse request body");
      requestData = await request.json();
      console.log("[Clock Out] Parsed request data:", requestData);
    } catch (jsonError) {
      console.error("[Clock Out] JSON parsing error:", jsonError);
      // Log the raw body for debugging
      try {
        const text = await request.text();
        console.log("[Clock Out] Raw request body:", text);
      } catch (textError) {
        console.log("[Clock Out] Error reading raw body:", textError);
      }
      return NextResponse.json(
        { message: "Invalid request data format" },
        { status: 400 }
      );
    }

    const { clockOut } = requestData || {};
    const today = startOfDayUtc();

    // Find today's attendance record
    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId: currentEmployeeId,
        date: {
          gte: today,
          lt: addUtcDays(today, 1),
        },
      },
    });

    if (!existingRecord || !existingRecord.clockIn) {
      return NextResponse.json(
        { message: "Must clock in first" },
        { status: 400 }
      );
    }

    if (existingRecord.clockOut) {
      return NextResponse.json(
        { message: "Already clocked out today" },
        { status: 400 }
      );
    }

    const clockOutTime = new Date(clockOut || new Date());
    const totalHours = calculateWorkingHours(
      existingRecord.clockIn,
      clockOutTime
    );

    // Get attendance status to check for early departure
    const attendanceStatus = await getAttendanceStatus(
      existingRecord.clockIn,
      clockOutTime
    );

    console.log('Clock Out Status Check:', {
      clockOutTime: clockOutTime.toISOString(),
      status: attendanceStatus.status,
      isEarlyDeparture: attendanceStatus.isEarlyDeparture,
      minutesEarly: attendanceStatus.minutesEarly,
      totalHours
    });

    // Map string status to Prisma enum
    const mapStatusToEnum = (status: string) => {
      switch (status) {
        case 'ON_TIME':
          return 'ON_TIME';
        case 'PRESENT':
          return 'PRESENT';
        case 'LATE':
          return 'LATE';
        case 'EARLY_DEPARTURE':
          return 'EARLY_DEPARTURE';
        case 'HALF_DAY':
          return 'HALF_DAY';
        case 'ABSENT':
          return 'ABSENT';
        default:
          return 'PRESENT'; // Default fallback
      }
    };
    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: existingRecord.id },
      data: {
        clockOut: clockOutTime,
        totalHours: totalHours,
        status: mapStatusToEnum(attendanceStatus.status) as any,
      },
    });

    console.log('✅ Clock out successful for record:', updatedRecord.id);

    return NextResponse.json({
      success: true,
      record: updatedRecord,
      statusCheck: {
        clockOutTime: clockOutTime.toISOString(),
        status: attendanceStatus.status,
        isEarlyDeparture: attendanceStatus.isEarlyDeparture,
        minutesEarly: attendanceStatus.minutesEarly,
        totalHours
      }
    });
  } catch (error) {
    console.error("[Clock Out] Unexpected error:", error);

    // Log more details about the error
    if (error instanceof Error) {
      console.error("[Clock Out] Error message:", error.message);
      console.error("[Clock Out] Error stack:", error.stack);
    }

    // Check if it's a Prisma error
    if (error && typeof error === 'object' && 'code' in error && error.code) {
      console.error("[Clock Out] Prisma error code:", error.code);
      console.error("[Clock Out] Prisma error meta:", (error as any).meta);
    }

    return NextResponse.json(
      {
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? (error as Error)?.message : undefined
      },
      { status: 500 }
    );
  }
}
