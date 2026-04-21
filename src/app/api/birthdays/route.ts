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
    const days = parseInt(searchParams.get("days") || "30");

    // Calculate date range
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);

    const whereClause: any = {
      dateOfBirth: {
        not: null,
      },
      status: "ACTIVE",
    };

    const employees = await prisma.employee.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        dateOfBirth: true,
        profileImage: true,
        department: {
          select: {
            name: true,
          },
        },
      },
    });

    const birthdays = [];
    const currentYear = today.getFullYear();

    for (const employee of employees) {
      if (!employee.dateOfBirth) continue;

      const birthDate = new Date(employee.dateOfBirth);
      const birthYear = birthDate.getFullYear();

      // Create this year's birthday
      const thisYearBirthday = new Date(
        currentYear,
        birthDate.getMonth(),
        birthDate.getDate()
      );

      // If this year's birthday has passed, check next year's
      const nextYearBirthday = new Date(
        currentYear + 1,
        birthDate.getMonth(),
        birthDate.getDate()
      );

      let upcomingBirthday = thisYearBirthday;
      let birthdayYear = currentYear;

      if (thisYearBirthday < today) {
        upcomingBirthday = nextYearBirthday;
        birthdayYear = currentYear + 1;
      }

      // Check if birthday is within the requested range
      if (upcomingBirthday <= endDate) {
        const daysDifference = Math.ceil(
          (upcomingBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const birthdayInfo = {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeId: employee.employeeId,
          profileImage: employee.profileImage,
          department: employee.department?.name,
          daysUntil: daysDifference,
          turningAge: birthdayYear - birthYear,
          isToday: daysDifference === 0,
          isTomorrow: daysDifference === 1,
          isThisWeek: daysDifference <= 7,
        };

        birthdays.push(birthdayInfo);
      }
    }

    // Sort by days until birthday
    birthdays.sort((a, b) => a.daysUntil - b.daysUntil);

    return NextResponse.json({ birthdays });
  } catch (error) {
    console.error("Get birthdays error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
