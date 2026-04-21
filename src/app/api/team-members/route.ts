import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!user || !user.employee) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Only department managers can view their team
    if (user.role !== "DEPARTMENT_MANAGER") {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    // Get team members directly assigned to this manager
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
        email: true,
        profileImage: true,
        designation: true,
        attendanceRecords: {
          where: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    // Format team members data with attendance info
    const formattedTeamMembers = teamMembers.map((member) => {
      const todayAttendance = member.attendanceRecords[0];
      return {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        employeeId: member.employeeId,
        email: member.email,
        position: member.designation, // Changed from member.position to member.designation
        profileImage: member.profileImage,
        isPresent: todayAttendance?.status === "PRESENT" || false,
        clockInTime: todayAttendance?.clockIn || null,
        clockOutTime: todayAttendance?.clockOut || null,
      };
    });

    return NextResponse.json({
      teamMembers: formattedTeamMembers,
    });
  } catch (error) {
    console.error("Team members fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
