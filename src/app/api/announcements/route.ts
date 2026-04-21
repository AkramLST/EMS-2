import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIpAddress } from "@/lib/ip-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Allow all authenticated users to read announcements

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const active = searchParams.get("active");

    let whereClause: any = {};

    if (active === "true") {
      const now = new Date();
      whereClause = {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      };
    }

    const announcements = await prisma.announcement.findMany({
      where: whereClause,
      include: {
        author: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error("Get announcements error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, "announcements.create")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { title, content, priority, expiresAt, isActive, type } = data;

    if (!title || !content) {
      return NextResponse.json(
        { message: "Title and content are required" },
        { status: 400 }
      );
    }

    // Determine the employee ID for the announcement creator
    let createdByEmployeeId = user.employee?.id;

    // If user is an admin without an employee profile, we need to handle this
    if (!createdByEmployeeId && user.role === "ADMINISTRATOR") {
      // For admin users, we'll associate the announcement with the first HR employee
      // or create a system employee for such cases
      const hrEmployee = await prisma.employee.findFirst({
        where: {
          user: {
            role: "HR_MANAGER",
          },
        },
      });

      if (hrEmployee) {
        createdByEmployeeId = hrEmployee.id;
      } else {
        // If no HR employee found, use the first available employee
        const firstEmployee = await prisma.employee.findFirst();
        if (firstEmployee) {
          createdByEmployeeId = firstEmployee.id;
        } else {
          return NextResponse.json(
            { message: "No employee found to associate announcement with" },
            { status: 400 }
          );
        }
      }
    }

    if (!createdByEmployeeId) {
      return NextResponse.json(
        { message: "Only employees can create announcements" },
        { status: 400 }
      );
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        type: type || "GENERAL", // Use provided type or default to GENERAL
        priority: priority || "MEDIUM",
        createdBy: createdByEmployeeId, // Use employee ID for foreign key constraint
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== false,
      },
    });

    // Create audit log for creation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        resource: "announcement",
        resourceId: announcement.id,
        details: `Created announcement: ${title.trim()}`,
        ipAddress: getClientIpAddress(request),
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    // Fetch the created announcement with author information
    const announcementWithAuthor = await prisma.announcement.findUnique({
      where: { id: announcement.id },
      include: {
        author: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Announcement created successfully",
      announcement: announcementWithAuthor,
    });
  } catch (error) {
    console.error("Create announcement error:", error);
    // Handle Prisma errors specifically
    if (error instanceof Error && error.message.includes("P2003")) {
      return NextResponse.json(
        { message: "Database constraint error - employee profile required" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
