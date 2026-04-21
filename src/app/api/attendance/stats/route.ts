import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOfficeTimes } from "@/lib/officeTimes";

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
          email: user.email,
        },
      });

      if (existingEmployee) {
        currentEmployeeId = existingEmployee.id;
      } else {
        // Return demo data for users without employee profiles
        return NextResponse.json({
          todayStatus: "Present",
          todayPercentage: 75,
          averageHours: "8h 15mins",
          averageCheckIn: "09:15 AM",
          onTimePercentage: 95.5,
          averageCheckOut: "18:30 PM",
          monthlyStats: {
            onTime: 22,
            workFromHome: 3,
            lateAttendance: 2,
            absent: 1,
            totalDays: 28,
          },
        });
      }
    }

    // Check if admin/manager is viewing another employee's data
    const { searchParams } = new URL(request.url);
    const employeeIdParam = searchParams.get("employeeId");
    let targetEmployeeId = currentEmployeeId;

    if (
      employeeIdParam &&
      user.employee?.id !== employeeIdParam &&
      (user.role === "ADMINISTRATOR" ||
        user.role === "HR_MANAGER" ||
        user.role === "DEPARTMENT_MANAGER")
    ) {
      // Find the employee by ID for validation
      const targetEmployee = await prisma.employee.findUnique({
        where: { id: employeeIdParam },
        select: {
          id: true,
          managerId: true,
        },
      });

      if (!targetEmployee) {
        return NextResponse.json(
          { message: "Employee not found" },
          { status: 404 }
        );
      }

      if (user.role === "ADMINISTRATOR" || user.role === "HR_MANAGER") {
        targetEmployeeId = employeeIdParam;
      } else if (
        user.role === "DEPARTMENT_MANAGER" &&
        user.employee?.id &&
        targetEmployee.managerId === user.employee.id
      ) {
        targetEmployeeId = employeeIdParam;
      } else {
        return NextResponse.json(
          { message: "Insufficient permissions to view this employee" },
          { status: 403 }
        );
      }
    }
    const today = new Date();
    // Parse period from query string
    const period = (searchParams.get("period") || "current_month").toString();

    // Compute date range for the requested period
    let periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
    let periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    if (period === "today") {
      periodStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      periodEnd = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
    } else if (period === "current_week") {
      const startOfWeek = new Date(today);
      startOfWeek.setHours(0, 0, 0, 0);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      periodStart = startOfWeek;
      periodEnd = endOfWeek;
    } else if (period === "current_month") {
      periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
      periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (period === "last_month") {
      periodStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      periodEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (period === "yearly") {
      periodStart = new Date(today.getFullYear(), 0, 1);
      periodEnd = new Date(today.getFullYear(), 11, 31);
    }

    // Automatically mark absent after 6PM if no attendance
    const currentTime = new Date();
    if (currentTime.getHours() >= 18) {
      const hasAttendance = await prisma.attendanceRecord.findFirst({
        where: {
          employeeId: targetEmployeeId,
          date: {
            gte: new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate()
            ),
            lt: new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate() + 1
            ),
          },
          status: { in: ["PRESENT", "LATE"] },
        },
      });

      if (!hasAttendance) {
        await prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: targetEmployeeId,
              date: new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate()
              ),
            },
          },
          create: {
            employeeId: targetEmployeeId,
            date: new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate()
            ),
            status: "ABSENT",
          },
          update: {
            status: "ABSENT",
          },
        });

        // Attempt to send notification (ignore failures in server context)
        try {
          // In server routes, relative URLs may fail; skip if it throws
          await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: "Attendance Marked Absent",
              message: `You were automatically marked absent for ${today.toLocaleDateString()} at 6PM.`,
              type: "warning",
            }),
          });
        } catch (e) {
          console.warn("Notification dispatch skipped (server context)", e);
        }

        // Removed toast notification as it's not a valid server-side code
      }
    }

    // Get today's attendance
    const todayAttendance = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId: targetEmployeeId,
        date: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() + 1
          ),
        },
      },
    });

    // Get attendance records for selected period
    const monthlyRecords = await prisma.attendanceRecord.findMany({
      where: {
        employeeId: targetEmployeeId,
        date: {
          gte: new Date(
            periodStart.getFullYear(),
            periodStart.getMonth(),
            periodStart.getDate()
          ),
          lt: new Date(
            periodEnd.getFullYear(),
            periodEnd.getMonth(),
            periodEnd.getDate() + 1
          ),
        },
      },
    });

    // Calculate working days (excluding weekends and holidays)
    const calculateWorkingDays = async (startDate: Date, endDate: Date) => {
      let workingDays = 0;
      const currentDate = new Date(startDate);

      // Get holidays for the period
      const holidays = await prisma.holiday.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const holidayDates = holidays.map((h) => h.date.toDateString());

      while (currentDate <= endDate) {
        // Skip weekends (Saturday = 6, Sunday = 0)
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          // Skip holidays
          if (!holidayDates.includes(currentDate.toDateString())) {
            workingDays++;
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return workingDays;
    };

    const totalWorkingDays = await calculateWorkingDays(periodStart, periodEnd);
    const onTimeRecords = monthlyRecords.filter(
      (record) =>
        record.status === "PRESENT" &&
        record.clockIn &&
        new Date(record.clockIn).getHours() <= 9
    );
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        date: true,
        isOptional: true,
      },
    });

    const publicHolidayDates = new Set(
      holidays
        .filter((holiday) => !holiday.isOptional)
        .map((holiday) => holiday.date.toDateString())
    );

    const isWeekend = (date: Date) => {
      const day = date.getDay();
      return day === 0 || day === 6;
    };
    const isPublicHoliday = (date: Date) => publicHolidayDates.has(date.toDateString());

    const lateRecords = monthlyRecords.filter(
      (record) => record.status === "LATE"
    );
    const holidayAbsentRecords = monthlyRecords.filter((record) => {
      const recordDate = record.date instanceof Date ? record.date : new Date(record.date);
      return (
        record.status === "ABSENT" &&
        (isPublicHoliday(recordDate) || isWeekend(recordDate))
      );
    });
    const absentRecords = monthlyRecords.filter((record) => {
      const recordDate = record.date instanceof Date ? record.date : new Date(record.date);
      return (
        record.status === "ABSENT" &&
        !isPublicHoliday(recordDate) &&
        !isWeekend(recordDate)
      );
    });
    const onLeaveRecords = monthlyRecords.filter(
      (record) => String(record.status) === "ON_LEAVE"
    );
    const workFromHomeRecords = monthlyRecords.filter(
      (record) => record.status === "PRESENT" // Assuming work from home is tracked differently
    );
    const autoCheckoutRecords = monthlyRecords.filter((record) => {
      if (!record.notes) return false;
      const notesValue = typeof record.notes === "string" ? record.notes : String(record.notes);
      return notesValue.includes("[Auto Checkout]");
    });

    // Calculate averages (fallback to clockIn/clockOut diff if totalHours is missing)
    const workedHourValues: number[] = monthlyRecords
      .filter(
        (record) => record.status === "PRESENT" || record.status === "LATE"
      )
      .map((record) => {
        if (record.totalHours !== null && record.totalHours !== undefined) {
          return Number(record.totalHours) || 0;
        }
        if (record.clockIn && record.clockOut) {
          const diffMs = record.clockOut.getTime() - record.clockIn.getTime();
          return diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
        }
        return 0;
      })
      .filter((h) => h > 0);

    const avgHours =
      workedHourValues.length > 0
        ? workedHourValues.reduce((sum, h) => sum + h, 0) /
          workedHourValues.length
        : 0;

    // Type-safe average check-in calculation
    const validCheckIns = monthlyRecords.filter(
      (r) =>
        r.clockIn !== null && (r.status === "PRESENT" || r.status === "LATE")
    ) as Array<{ clockIn: Date }>;

    const checkInTimes = validCheckIns.map((r) => {
      const clockIn = r.clockIn;
      return {
        hours: clockIn.getHours(),
        minutes: clockIn.getMinutes(),
        totalMinutes: clockIn.getHours() * 60 + clockIn.getMinutes(),
      };
    });

    const avgCheckInMinutes =
      checkInTimes.length > 0
        ? checkInTimes.reduce((sum, time) => sum + time.totalMinutes, 0) /
          checkInTimes.length
        : 0;

    const avgCheckInHours24 = Math.floor(avgCheckInMinutes / 60);
    const avgCheckInMins = Math.round(avgCheckInMinutes % 60);
    const avgCheckInHours12 = avgCheckInHours24 % 12 || 12;
    const avgCheckInPeriod = avgCheckInHours24 >= 12 ? "PM" : "AM";

    const averageCheckIn =
      checkInTimes.length > 0
        ? `${avgCheckInHours12.toString().padStart(2, "0")}:${avgCheckInMins
            .toString()
            .padStart(2, "0")} ${avgCheckInPeriod}`
        : "--:--";

    // Type-safe average check-out calculation
    const validCheckOuts = monthlyRecords.filter(
      (r) =>
        r.clockOut !== null &&
        (r.status === "PRESENT" || r.status === "LATE") &&
        r.clockIn !== null // Ensure they clocked in
    ) as Array<{ clockOut: Date }>;

    const checkOutTimes = validCheckOuts.map((r) => {
      const clockOut = r.clockOut;
      return {
        hours: clockOut.getHours(),
        minutes: clockOut.getMinutes(),
        totalMinutes: clockOut.getHours() * 60 + clockOut.getMinutes(),
      };
    });

    const avgCheckOutMinutes =
      checkOutTimes.length > 0
        ? checkOutTimes.reduce((sum, time) => sum + time.totalMinutes, 0) /
          checkOutTimes.length
        : 0;

    const avgCheckOutHours24 = Math.floor(avgCheckOutMinutes / 60);
    const avgCheckOutMins = Math.round(avgCheckOutMinutes % 60);
    const avgCheckOutHours12 = avgCheckOutHours24 % 12 || 12;
    const avgCheckOutPeriod = avgCheckOutHours24 >= 12 ? "PM" : "AM";

    const averageCheckOut =
      checkOutTimes.length > 0
        ? `${avgCheckOutHours12.toString().padStart(2, "0")}:${avgCheckOutMins
            .toString()
            .padStart(2, "0")} ${avgCheckOutPeriod}`
        : "--:--";

    // Get office hours (support both Date and "HH:MM" string formats)
    const { startTime: officeStart, endTime: officeEnd } =
      await getOfficeTimes();
    const toHour = (val: unknown) => {
      if (!val) return 9; // default 9 AM
      if (val instanceof Date) return val.getHours();
      if (typeof val === "string") {
        const [hStr] = val.split(":");
        const h = parseInt(hStr || "9", 10);
        if (Number.isNaN(h)) return 9;
        return h;
      }
      return 9;
    };
    const officeStartHour = toHour(officeStart);
    const officeEndHour = toHour(officeEnd);

    // Calculate today's percentage (hours worked / office hours * 100)
    const officeHours = officeEndHour - officeStartHour;
    const todayPercentage = todayAttendance?.totalHours
      ? Math.min(
          Math.round((Number(todayAttendance.totalHours) / officeHours) * 100),
          100
        )
      : 0;

    const stats = {
      todayStatus: todayAttendance?.status || "Absent",
      todayPercentage,
      averageHours: `${Math.floor(avgHours)}h ${Math.round(
        (avgHours % 1) * 60
      )}mins`,
      averageCheckIn,
      onTimePercentage:
        totalWorkingDays > 0
          ? Math.round((onTimeRecords.length / totalWorkingDays) * 100)
          : 0,
      averageCheckOut,
      monthlyStats: {
        onTime: onTimeRecords.length,
        workFromHome: workFromHomeRecords.length,
        lateAttendance: lateRecords.length,
        absent: absentRecords.length,
        onLeave: onLeaveRecords.length,
        holiday: holidayAbsentRecords.length,
        autoCheckout: autoCheckoutRecords.length,
        totalDays: totalWorkingDays,
      },
    };

    // Debug summary (visible in server logs)
    console.log("Attendance stats computed:", {
      targetEmployeeId,
      period,
      totalRecords: monthlyRecords.length,
      workedHourValues: workedHourValues.length,
      avgHours,
      todayPercentage,
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Get attendance stats error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
