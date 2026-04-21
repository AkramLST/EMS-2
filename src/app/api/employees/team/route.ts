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

    if (!hasPermission(user, "employee.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // For employees, show team members under the same manager
    if (user.role === "EMPLOYEE") {
      if (!user.employee?.managerId) {
        return NextResponse.json({ teamMembers: [] });
      }

      const teamMembers = await prisma.employee.findMany({
        where: {
          managerId: user.employee.managerId,
          id: { not: user.employee.id }, // Exclude self
          status: "ACTIVE",
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          designation: true,
          email: true,
          phone: true,
          joinDate: true,
          profileImage: true,
          department: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          firstName: "asc",
        },
      });

      // Get manager information
      const manager = await prisma.employee.findUnique({
        where: { id: user.employee.managerId },
        select: {
          firstName: true,
          lastName: true,
          designation: true,
          employeeId: true,
        },
      });

      return NextResponse.json({
        teamMembers,
        manager,
        totalCount: teamMembers.length,
      });
    }

    // For managers and above, show their direct reports
    if (user.role === "DEPARTMENT_MANAGER" && user.employee?.id) {
      const teamMembers = await prisma.employee.findMany({
        where: {
          managerId: user.employee.id,
          status: "ACTIVE",
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          designation: true,
          email: true,
          phone: true,
          joinDate: true,
          profileImage: true,
          department: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          firstName: "asc",
        },
      });

      return NextResponse.json({
        teamMembers,
        manager: {
          firstName: user.employee.firstName,
          lastName: user.employee.lastName,
          designation: user.employee.designation,
          employeeId: user.employee.employeeId,
        },
        totalCount: teamMembers.length,
      });
    }

    // For HR and Admin roles, show department-wide teams
    if (user.role === "HR_MANAGER" || user.role === "ADMINISTRATOR") {
      const { searchParams } = new URL(request.url);
      const departmentId = searchParams.get("departmentId");

      let whereClause: any = {
        status: "ACTIVE",
      };

      if (departmentId) {
        whereClause.departmentId = departmentId;
      }

      const teamMembers = await prisma.employee.findMany({
        where: whereClause,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          designation: true,
          email: true,
          phone: true,
          joinDate: true,
          profileImage: true,
          department: {
            select: {
              name: true,
            },
          },
          manager: {
            select: {
              firstName: true,
              lastName: true,
              employeeId: true,
            },
          },
        },
        orderBy: [{ department: { name: "asc" } }, { firstName: "asc" }],
      });

      return NextResponse.json({
        teamMembers,
        totalCount: teamMembers.length,
      });
    }

    return NextResponse.json({ teamMembers: [] });
  } catch (error) {
    console.error("Get team members error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
