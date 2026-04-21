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

    // Check for either leave.read (for own leaves) or leave.read_all (for all leaves) permission
    const canReadAll = hasPermission(user, "leave.read_all");
    const canReadOwn = hasPermission(user, "leave.read");

    if (!canReadAll && !canReadOwn) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    let whereClause: any = {};

    // Set access controls based on permissions
    if (canReadAll) {
      // Admin and HR with leave.read_all can see all applications
      // No additional where clause needed
    } else if (canReadOwn) {
      // Regular employees and department managers with leave.read can see their own/team's applications
      if (user.role === "EMPLOYEE") {
        if (!user.employee?.id) {
          return NextResponse.json({ applications: [] });
        }
        whereClause.employeeId = user.employee.id;
      } else if (user.role === "DEPARTMENT_MANAGER" && user.employee?.id) {
        const teamMembers = await prisma.employee.findMany({
          where: {
            OR: [{ managerId: user.employee.id }, { id: user.employee.id }],
          },
          select: { id: true },
        });

        whereClause.employeeId = {
          in: teamMembers.map((member) => member.id),
        };
      }
    }

    const [applications, total] = await Promise.all([
      prisma.leaveApplication.findMany({
        where: whereClause,
        include: {
          leaveType: true,
          employee: {
            select: {
              firstName: true,
              lastName: true,
              employeeId: true,
              designation: true,
              manager: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          approvedByEmployee: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          appliedAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.leaveApplication.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get leave applications error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user || !user.employee) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, "leave.create")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { leaveTypeId, startDate, endDate, reason, totalDays } = body;

    if (!leaveTypeId || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return NextResponse.json(
        { message: "End date cannot be before start date" },
        { status: 400 },
      );
    }

    // Check for overlapping leave applications
    const overlappingLeave = await prisma.leaveApplication.findFirst({
      where: {
        employeeId: user.employee.id,
        status: {
          in: ["PENDING", "APPROVED"],
        },
        OR: [
          {
            AND: [{ startDate: { lte: start } }, { endDate: { gte: start } }],
          },
          {
            AND: [{ startDate: { lte: end } }, { endDate: { gte: end } }],
          },
          {
            AND: [{ startDate: { gte: start } }, { endDate: { lte: end } }],
          },
        ],
      },
    });

    if (overlappingLeave) {
      return NextResponse.json(
        { message: "You have overlapping leave applications for these dates" },
        { status: 400 },
      );
    }

    // Check leave balance
    const currentYear = new Date().getFullYear();
    const leaveBalance = await prisma.leaveBalance.findFirst({
      where: {
        employeeId: user.employee.id,
        leaveTypeId,
        year: currentYear,
      },
    });

    if (leaveBalance && leaveBalance.remaining < totalDays) {
      return NextResponse.json(
        {
          message: `Insufficient leave balance. Available: ${leaveBalance.remaining} days`,
        },
        { status: 400 },
      );
    }

    // Create leave application
    const leaveApplication = await prisma.leaveApplication.create({
      data: {
        employeeId: user.employee.id,
        leaveTypeId,
        startDate: start,
        endDate: end,
        totalDays,
        reason,
        status: "PENDING",
        appliedAt: new Date(),
      },
      include: {
        leaveType: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
            designation: true,
            manager: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        approvedByEmployee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create notification for the employee's manager
    try {
      // Get the employee's manager
      const employeeWithManager = await prisma.employee.findUnique({
        where: { id: user.employee.id },
        include: {
          manager: {
            include: {
              user: true,
            },
          },
        },
      });

      // Create notifications for all relevant users
      const notificationsToCreate = [];

      // 1. Notify the employee's direct manager
      if (employeeWithManager?.manager?.user) {
        notificationsToCreate.push({
          userId: employeeWithManager.manager.user.id,
          title: "New Leave Request",
          message: `${user.employee?.firstName || "Employee"} ${user.employee?.lastName || ""} has submitted a new leave request for your review.`,
          type: "LEAVE_REQUEST",
          isRead: false,
        });
      }

      // 2. Notify all HR Manager users
      const hrManagers = await prisma.user.findMany({
        where: {
          role: "HR_MANAGER",
        },
        select: {
          id: true,
        },
      });

      hrManagers.forEach((hrManager) => {
        notificationsToCreate.push({
          userId: hrManager.id,
          title: "New Leave Request",
          message: `${user.employee?.firstName || "Employee"} ${user.employee?.lastName || ""} has submitted a leave request. Please review and approve/reject.`,
          type: "LEAVE_REQUEST",
          isRead: false,
        });
      });

      // 3. Notify all Administrator users
      const administrators = await prisma.user.findMany({
        where: {
          role: "ADMINISTRATOR",
        },
        select: {
          id: true,
        },
      });

      administrators.forEach((admin) => {
        notificationsToCreate.push({
          userId: admin.id,
          title: "New Leave Request",
          message: `${user.employee?.firstName || "Employee"} ${user.employee?.lastName || ""} has submitted a leave request. Please review and approve/reject.`,
          type: "LEAVE_REQUEST",
          isRead: false,
        });
      });

      // Create all notifications in batch
      if (notificationsToCreate.length > 0) {
        await prisma.notification.createMany({
          data: notificationsToCreate,
        });
      }
    } catch (notificationError) {
      console.error(
        "Failed to create notifications for leave request:",
        notificationError,
      );
      // Don't fail the leave application if notification creation fails
    }

    // Create audit log for creation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        resource: "leave",
        resourceId: leaveApplication.id,
        details: `Submitted leave application: ${totalDays} days from ${startDate} to ${endDate}`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({
      message: "Leave application submitted successfully",
      application: leaveApplication,
    });
  } catch (error) {
    console.error("Create leave application error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
