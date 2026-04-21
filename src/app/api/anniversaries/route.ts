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
    const days = parseInt(searchParams.get("days") || "30", 10);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    let employees;
    try {
      employees = await prisma.employee.findMany({
        where: {
          status: "ACTIVE",
        },
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          joinDate: true,
          profileImage: true,
        },
      });
    } catch (dbError) {
      console.error("Prisma query error in anniversaries:", dbError);
      return NextResponse.json(
        { message: "Database error", error: String(dbError) },
        { status: 500 }
      );
    }

    const anniversaries = [] as {
      id: string;
      employeeId: string;
      firstName: string;
      lastName: string;
      joinDate: string;
      years: number;
      daysUntil: number;
      profileImage?: string | null;
    }[];

    for (const employee of employees) {
      if (!employee.joinDate) continue;

      const joinDateValue =
        employee.joinDate instanceof Date
          ? employee.joinDate
          : new Date(employee.joinDate);

      if (Number.isNaN(joinDateValue.getTime())) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "Skipping invalid join date for employee",
            employee.employeeId,
            employee.joinDate
          );
        }
        continue;
      }

      const joinYear = joinDateValue.getFullYear();

      const thisYear = today.getFullYear();
      const thisYearAnniversary = new Date(
        thisYear,
        joinDateValue.getMonth(),
        joinDateValue.getDate()
      );
      thisYearAnniversary.setHours(0, 0, 0, 0);

      let upcomingAnniversary = thisYearAnniversary;
      let anniversaryYear = thisYear;

      if (thisYearAnniversary < today) {
        upcomingAnniversary = new Date(thisYearAnniversary);
        upcomingAnniversary.setFullYear(thisYear + 1);
        anniversaryYear = thisYear + 1;
      }

      if (upcomingAnniversary > endDate) continue;

      const years = anniversaryYear - joinYear;
      if (years <= 0) continue;

      const daysUntil = Math.ceil(
        (upcomingAnniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      anniversaries.push({
        id: employee.id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        joinDate: joinDateValue.toISOString(),
        years,
        daysUntil,
        profileImage: employee.profileImage,
      });
    }

    anniversaries.sort((a, b) => a.daysUntil - b.daysUntil);

    return NextResponse.json({ anniversaries });
  } catch (error) {
    console.error("Get anniversaries error:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
      console.error("Error message:", error.message);
    }
    return NextResponse.json(
      { 
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
