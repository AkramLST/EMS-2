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

    // Check if user has permission to access attendance
    if (!hasPermission(user, "attendance.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today";
    const employeeId = searchParams.get("employeeId") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Calculate date ranges based on period
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case "today":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "current_week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // End of current week (Saturday)
        endDate.setHours(23, 59, 59, 999);
        break;

      case "current_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;

      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
    }

    let whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Validate Prisma client
    if (!prisma) {
      console.error("Prisma client not initialized");
      return NextResponse.json(
        { message: "Database connection error" },
        { status: 500 }
      );
    }

    // Role-based filtering
    if (user.role === "EMPLOYEE") {
      // Employees can only see their own records
      if (!user.employee?.id) {
        return NextResponse.json(
          { message: "Employee profile not found" },
        );
      }
      whereClause.employeeId = user.employee.id;
    } else if (user.role === "DEPARTMENT_MANAGER" && user.employee?.id) {
      const teamMembers = await prisma.employee.findMany({
        where: { managerId: user.employee.id },
        select: { id: true },
      });
      const teamMemberIds = teamMembers.map((member) => member.id);
      const allowedIds = Array.from(new Set([user.employee.id, ...teamMemberIds]));

      if (employeeId) {
        if (!allowedIds.includes(employeeId)) {
          return NextResponse.json(
            { message: "You do not have access to this employee's attendance" },
            { status: 403 }
          );
        }
        whereClause.employeeId = employeeId;
      } else {
        whereClause.employeeId = { in: allowedIds };
      }
    } else {
      // Admin/HR (and other privileged roles) can optionally filter by employeeId
      if (employeeId) {
        whereClause.employeeId = employeeId;
      }
    }

    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
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

    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: whereClause,
        orderBy: [{ date: "desc" }],
        skip,
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              profileImage: true,
              designation: {
                select: { title: true },
              },
            },
          },
        },
      }),
      prisma.attendanceRecord.count({ where: whereClause }),
    ]);

    const formattedRecords = records.map((record) => {
      const dateObj = record.date;
      const day = dateObj.getDay();
      const isWeekend = day === 0 || day === 6;
      const isPublicHoliday = publicHolidayDates.has(dateObj.toDateString());
      const status = isPublicHoliday
        ? "PUBLIC_HOLIDAY"
        : isWeekend && record.status === "ABSENT"
        ? "HOLIDAY"
        : record.status;

      return {
        id: record.id,
        date: record.date,
        status,
        clockIn: record.clockIn,
        clockOut: record.clockOut,
        totalHours: record.totalHours,
        notes: record.notes,
        clockInLatitude: record.clockInLatitude,
        clockInLongitude: record.clockInLongitude,
        clockInLocation: record.clockInLocation,
        clockInLocationSource: record.clockInLocationSource,
        employee: record.employee
          ? {
              id: record.employee.id,
              firstName: record.employee.firstName,
              lastName: record.employee.lastName,
              employeeId: record.employee.employeeId,
              profileImage: record.employee.profileImage,
              designation: record.employee.designation
                ? { title: record.employee.designation.title }
                : null,
            }
          : undefined,
      };
    });

    return NextResponse.json({
      records: formattedRecords,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("Get attendance history error:", error);
    // Return a more detailed error message for debugging
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
