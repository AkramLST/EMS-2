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

    if (!hasPermission(user, "leave.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    if (!startParam || !endParam) {
      return NextResponse.json(
        { message: "Start and end dates are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(startParam);
    const endDate = new Date(endParam);

    // Fetch approved leave applications within the date range
    const leaveApplications = await prisma.leaveApplication.findMany({
      where: {
        status: "APPROVED",
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } },
            ],
          },
        ],
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        leaveType: {
          select: {
            name: true,
          },
        },
      },
    });

    // Fetch holidays within the date range
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return NextResponse.json({
      leaves: leaveApplications.map((leave) => ({
        id: leave.id,
        employee: {
          firstName: leave.employee.firstName,
          lastName: leave.employee.lastName,
        },
        startDate: leave.startDate,
        endDate: leave.endDate,
        leaveType: leave.leaveType.name,
        status: leave.status,
      })),
      holidays: holidays.map((holiday) => ({
        id: holiday.id,
        name: holiday.name,
        date: holiday.date,
        type: holiday.type,
        isOptional: holiday.isOptional,
      })),
    });
  } catch (error) {
    console.error("Get leave calendar error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
