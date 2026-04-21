import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIpAddress } from "@/lib/ip-utils";
import { Permission } from "@/lib/permissions";
import { markAttendanceAsLeave } from "@/lib/attendanceLeave";

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

    console.log("Leave approval permission check:", {
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

    // Find the leave application
    const leaveApplication = await prisma.leaveApplication.findUnique({
      where: { id },
      include: {
        employee: true,
        leaveType: true,
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

    // Check if user can approve this leave (department manager can only approve team members)
    // HR_MANAGER and ADMINISTRATOR can approve all leave requests
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
          { message: "You can only approve leave for your team members" },
          { status: 403 }
        );
      }
    }

    // Create audit log before approval
    console.log("Creating audit log for approval:", {
      userId: user.id,
      userRole: user.role,
      userRoles: user.roles ? user.roles.map((r: any) => r.role) : [user.role],
      userEmployee: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : "No employee",
      leaveEmployee: `${leaveApplication.employee.firstName} ${leaveApplication.employee.lastName}`,
      details: `APPROVED: Leave application approved for ${leaveApplication.employee.firstName} ${leaveApplication.employee.lastName} - ${leaveApplication.totalDays} days`,
      canApprove: canApprove,
      hasApprove: hasPermission(user, "leave.approve"),
      hasApproveTeam: hasPermission(user, "leave.approve_team")
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        resource: "leave",
        resourceId: id,
        details: `APPROVED: Leave application approved for ${leaveApplication.employee.firstName} ${leaveApplication.employee.lastName} - ${leaveApplication.totalDays} days`,
        ipAddress: getClientIpAddress(request),
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    // Update leave application and leave balance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Approve the leave application
      const updatedApplication = await tx.leaveApplication.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedBy: user.employee!.id, // Use employee.id
          approvedAt: new Date(),
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

      // Update leave balance
      const currentYear = new Date().getFullYear();
      const leaveBalance = await tx.leaveBalance.findFirst({
        where: {
          employeeId: leaveApplication.employeeId,
          leaveTypeId: leaveApplication.leaveTypeId,
          year: currentYear,
        },
      });

      if (leaveBalance) {
        await tx.leaveBalance.update({
          where: { id: leaveBalance.id },
          data: {
            used: leaveBalance.used + leaveApplication.totalDays,
            remaining: leaveBalance.remaining - leaveApplication.totalDays,
          },
        });
      }

      await markAttendanceAsLeave({
        tx,
        employeeId: leaveApplication.employeeId,
        startDate: leaveApplication.startDate,
        endDate: leaveApplication.endDate,
        leaveApplicationId: leaveApplication.id,
      });

      return updatedApplication;
    });

    // Create notification for the employee
    console.log("Creating notification for employee:", {
      userId: user.id,
      userName: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : "No employee",
      employeeUserId: result.employee.user.id,
      employeeName: `${result.employee.firstName} ${result.employee.lastName}`,
      notificationMessage: `Your leave request for ${leaveApplication.totalDays} days from ${new Date(leaveApplication.startDate).toLocaleDateString()} to ${new Date(leaveApplication.endDate).toLocaleDateString()} has been approved by ${user.employee?.firstName} ${user.employee?.lastName}.`
    });

    try {
      if (result.employee.user) {
        await prisma.notification.create({
          data: {
            userId: result.employee.user.id,
            title: "Leave Request Approved",
            message: `Your leave request for ${
              leaveApplication.totalDays
            } days from ${new Date(
              leaveApplication.startDate
            ).toLocaleDateString()} to ${new Date(
              leaveApplication.endDate
            ).toLocaleDateString()} has been approved by ${
              user.employee?.firstName
            } ${user.employee?.lastName}.`,
            type: "LEAVE_APPROVED",
            isRead: false,
          },
        });
      }
    } catch (notificationError) {
      console.error(
        "Failed to create notification for employee:",
        notificationError
      );
      // Don't fail the approval if notification creation fails
    }

    return NextResponse.json({
      message: "Leave application approved successfully",
      application: result,
    });
  } catch (error) {
    console.error("Approve leave application error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
