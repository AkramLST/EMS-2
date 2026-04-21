import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIpAddress } from "@/lib/ip-utils";
import { Permission } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user || !user.employee) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user has either leave.approve or leave.approve_team permission
    const canApprove =
      hasPermission(user, "leave.approve") ||
      hasPermission(user, "leave.approve_team");

    console.log("Leave rejection permission check:", {
      userId: user.id,
      userRoles: user.roles ? user.roles.map((r: any) => r.role) : [user.role],
      hasApprove: hasPermission(user, "leave.approve"),
      hasApproveTeam: hasPermission(user, "leave.approve_team"),
      canApprove,
    });

    if (!canApprove) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { comments } = body;

    // Find the leave application
    const leaveApplication = await prisma.leaveApplication.findUnique({
      where: { id },
      include: {
        employee: true,
      },
    });

    if (!leaveApplication) {
      return NextResponse.json(
        { message: "Leave application not found" },
        { status: 404 }
      );
    }

    if (leaveApplication.status !== "PENDING") {
      return NextResponse.json(
        { message: "Leave application is not pending" },
        { status: 400 }
      );
    }

    // Check if user can reject this leave (department manager can only reject team members)
    // HR_MANAGER and ADMINISTRATOR can reject all leave requests
    if (
      user.role === "DEPARTMENT_MANAGER" ||
      (user.roles &&
        user.roles.some((r: any) => r.role === "DEPARTMENT_MANAGER"))
    ) {
      // Check if the leave applicant is in the manager's team
      const isTeamMember =
        leaveApplication.employee.managerId === user.employee.id;
      if (!isTeamMember) {
        return NextResponse.json(
          { message: "You can only reject leave for your team members" },
          { status: 403 }
        );
      }
    }

    // Create audit log before rejection
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        resource: "leave",
        resourceId: id,
        details: `REJECTED: Leave application rejected for ${leaveApplication.employee.firstName} ${leaveApplication.employee.lastName} - ${leaveApplication.totalDays} days - Reason: ${comments || "No reason provided"}`,
        ipAddress: getClientIpAddress(request),
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    // Reject the leave application
    const updatedApplication = await prisma.leaveApplication.update({
      where: { id },
      data: {
        status: "REJECTED",
        approvedBy: user.employee!.id, // Use employee.id
        rejectedAt: new Date(),
        comments: comments || "No reason provided",
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
            user: true, // Include user for notification
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

    // Create notification for the employee
    try {
      if (updatedApplication.employee.user) {
        await prisma.notification.create({
          data: {
            userId: updatedApplication.employee.user.id,
            title: "Leave Request Rejected",
            message: `Your leave request for ${
              leaveApplication.totalDays
            } days from ${new Date(
              leaveApplication.startDate
            ).toLocaleDateString()} to ${new Date(
              leaveApplication.endDate
            ).toLocaleDateString()} has been rejected by ${
              user.employee?.firstName
            } ${user.employee?.lastName}. Reason: ${
              comments || "No reason provided"
            }`,
            type: "LEAVE_REJECTED",
            isRead: false,
          },
        });
      }
    } catch (notificationError) {
      console.error(
        "Failed to create notification for employee:",
        notificationError
      );
      // Don't fail the rejection if notification creation fails
    }

    return NextResponse.json({
      message: "Leave application rejected successfully",
      application: updatedApplication,
    });
  } catch (error) {
    console.error("Reject leave application error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
