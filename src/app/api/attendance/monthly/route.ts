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

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    // Get employee ID based on user role
    let employeeId: string;
    
    if (user.role === "EMPLOYEE") {
      // Employees can only see their own records
      if (!user.employee?.id) {
        return NextResponse.json(
          { message: "Employee profile not found" },
          { status: 400 }
        );
      }
      employeeId = user.employee.id;
    } else {
      // For other roles, use their employee profile if available
      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
      });

      if (!employee) {
        return NextResponse.json(
          { message: "Employee profile not found" },
          { status: 404 }
        );
      }
      employeeId = employee.id;
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1); // First day of month
    const endDate = new Date(year, month, 0); // Last day of month
    
    // For debugging: also try fetching all records for this employee
    const allRecords = await prisma.attendanceRecord.findMany({
      where: { employeeId: employeeId },
      orderBy: { date: "desc" },
      take: 5
    });
    console.log(`All recent records for employee:`, allRecords.map(r => ({ date: r.date, status: r.status })));

    // Fetch attendance records for the month
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        employeeId: employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    console.log(`Fetching attendance for employee ${employeeId}, ${year}-${month}`);
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`Found ${attendanceRecords.length} attendance records`);

    // Calculate summary statistics
    const summary = {
      present: 0,
      late: 0,
      absent: 0,
      onLeave: 0,
      holiday: 0,
      total: attendanceRecords.length,
    };

    attendanceRecords.forEach((record) => {
      const status = String(record.status);
      const day = record.date.getDay();
      const isWeekend = day === 0 || day === 6;

      if (status === "ABSENT" && isWeekend) {
        summary.holiday++;
        return;
      }

      switch (status) {
        case "PRESENT":
          summary.present++;
          break;
        case "LATE":
          summary.late++;
          break;
        case "ABSENT":
          summary.absent++;
          break;
        case "ON_LEAVE":
          summary.onLeave++;
          break;
      }
    });

    // Format records for frontend
    const records = attendanceRecords.map((record) => ({
      date: record.date.toISOString().split("T")[0],
      status:
        String(record.status) === "ABSENT" &&
        (record.date.getDay() === 0 || record.date.getDay() === 6)
          ? "HOLIDAY"
          : String(record.status),
      clockIn: record.clockIn?.toISOString(),
      clockOut: record.clockOut?.toISOString(),
    }));

    return NextResponse.json({
      summary,
      records,
      month,
      year,
    });
  } catch (error) {
    console.error("Get monthly attendance error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
