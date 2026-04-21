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
    const date = searchParams.get("date");
    const employeeIdParam = searchParams.get("employeeId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    console.log("API received date parameter:", date);
    console.log("API received employeeId parameter:", employeeIdParam);

    let whereClause: any = {};

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      console.log("Original date parameter:", date);
      console.log("Parsed start date:", startDate);
      console.log("Parsed end date:", endDate);
      console.log("Start date toISOString():", startDate.toISOString());
      console.log("End date toISOString():", endDate.toISOString());

      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    } else {
      console.log("No date parameter provided, whereClause:", whereClause);
    }

    // Handle employeeId parameter for admin/manager users
    if (employeeIdParam) {
      // Check if user has permission to view this employee's data
      if (
        user.role === "ADMINISTRATOR" ||
        user.role === "HR_MANAGER" ||
        user.role === "DEPARTMENT_MANAGER"
      ) {
        whereClause.employeeId = employeeIdParam;
      } else {
        return NextResponse.json(
          { message: "Insufficient permissions to view this employee's data" },
          { status: 403 }
        );
      }
    } else {
      // Role-based filtering when no specific employee is requested
      if (user.role === "EMPLOYEE" && user.employee?.id) {
        // Employees can only see their own attendance
        whereClause.employeeId = user.employee.id;
      } else if (user.role === "DEPARTMENT_MANAGER" && user.employee?.id) {
        // Department managers can only see their direct team members' attendance
        const teamMemberIds = await prisma.employee.findMany({
          where: {
            managerId: user.employee.id,
            status: "ACTIVE",
          },
          select: {
            id: true,
          },
        });

        const teamMemberIdArray = teamMemberIds.map((member) => member.id);
        // Also include the manager's own records
        teamMemberIdArray.push(user.employee.id);

        whereClause.employeeId = {
          in: teamMemberIdArray,
        };
      }
    }

    console.log("Final whereClause:", JSON.stringify(whereClause, null, 2));

    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: whereClause,
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
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.attendanceRecord.count({ where: whereClause }),
    ]);

    console.log("Found records count:", records.length);
    console.log("Total count:", total);

    return NextResponse.json({
      records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get attendance error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
