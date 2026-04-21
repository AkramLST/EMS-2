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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ALL";
    const skip = (page - 1) * limit;

    // Check if user is department manager
    const isDepartmentManager = user.role === "DEPARTMENT_MANAGER";

    if (!isDepartmentManager || !user.employee?.departmentId) {
      return NextResponse.json({
        message:
          "Access denied. Only department managers can view team members.",
        teamMembers: [],
        pagination: { page: 1, limit, total: 0, pages: 0 },
        teamManager: null,
      });
    }

    console.log("Team API - User:", {
      email: user.email,
      role: user.role,
      departmentId: user.employee.departmentId,
    });

    // Build where clause for team members
    let whereClause: any = {
      departmentId: user.employee.departmentId,
      status: "ACTIVE",
    };

    // Add search filter
    if (search) {
      whereClause.OR = [
        {
          firstName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          employeeId: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Filter by attendance status if specified
    if (status !== "ALL") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (status === "PRESENT") {
        // Get employees who have attendance record for today with PRESENT or LATE status
        const presentEmployeeIds = await prisma.attendanceRecord
          .findMany({
            where: {
              date: {
                gte: today,
                lt: tomorrow,
              },
              status: {
                in: ["PRESENT", "LATE"],
              },
            },
            select: { employeeId: true },
          })
          .then((records) => records.map((r) => r.employeeId));

        whereClause.id = {
          in: presentEmployeeIds,
        };
      } else if (status === "ABSENT") {
        // Get employees who don't have attendance record for today
        const allTeamEmployeeIds = await prisma.employee
          .findMany({
            where: { departmentId: user.employee.departmentId },
            select: { id: true },
          })
          .then((employees) => employees.map((e) => e.id));

        const presentEmployeeIds = await prisma.attendanceRecord
          .findMany({
            where: {
              date: {
                gte: today,
                lt: tomorrow,
              },
              status: {
                in: ["PRESENT", "LATE"],
              },
            },
            select: { employeeId: true },
          })
          .then((records) => records.map((r) => r.employeeId));

        whereClause.id = {
          in: allTeamEmployeeIds.filter(
            (id) => !presentEmployeeIds.includes(id)
          ),
        };
      }
    }

    // Get team members with pagination
    const [teamMembers, total] = await Promise.all([
      prisma.employee.findMany({
        where: whereClause,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          email: true,
          phone: true,
          joinDate: true,
          employmentType: true,
          status: true,
          profileImage: true, // Include profile image
          department: {
            select: {
              name: true,
            },
          },
          designation: {
            select: {
              title: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        skip,
        take: limit,
      }),
      prisma.employee.count({
        where: whereClause,
      }),
    ]);

    // Get team manager info (the current user)
    const teamManager = {
      id: user.employee.id,
      firstName: user.employee.firstName,
      lastName: user.employee.lastName,
      employeeId: user.employee.employeeId,
      designation: user.employee.designation?.title || "Department Manager",
      department: user.employee.department?.name || "Unknown",
      email: user.email,
    };

    // Transform the data for frontend
    const transformedTeamMembers = teamMembers.map((member) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      employeeId: member.employeeId,
      email: member.user?.email || member.email,
      phone: member.phone,
      designation: member.designation?.title || "Not assigned",
      department: member.department?.name || "Unknown",
      joinDate: member.joinDate.toISOString().split("T")[0],
      employmentType: member.employmentType,
      status: member.status,
      profileImage: member.profileImage, // Include actual profile image
    }));

    console.log("Team API - Results:", {
      totalMembers: total,
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit),
      searchQuery: search,
      statusFilter: status,
      membersReturned: transformedTeamMembers.length,
    });

    return NextResponse.json({
      teamMembers: transformedTeamMembers,
      teamManager,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        search,
        status,
      },
    });
  } catch (error) {
    console.error("Team members API error:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        teamMembers: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        teamManager: null,
      },
      { status: 500 }
    );
  }
}
