import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get current user (employee who submitted leave request)
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        employee: {
          include: {
            department: {
              include: {
                employees: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!fullUser || !fullUser.employee) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Find department manager
    const departmentManager = fullUser.employee.department?.employees.find(
      (emp) => emp.user?.role === "DEPARTMENT_MANAGER"
    );

    if (departmentManager && departmentManager.user) {
      // Create notification for the manager
      await prisma.notification.create({
        data: {
          userId: departmentManager.user.id,
          title: "New Leave Request",
          message: `${fullUser.employee.firstName} ${fullUser.employee.lastName} has submitted a new leave request for your review.`,
          type: "LEAVE_REQUEST",
          isRead: false,
        },
      });

      // Also create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "LEAVE_REQUEST_NOTIFICATION",
          resource: "notification",
          resourceId: departmentManager.user.id,
          details: `Notification sent to manager ${departmentManager.firstName} ${departmentManager.lastName}`,
          ipAddress: request.ip || "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });
    }

    return NextResponse.json({
      message: "Notification sent successfully",
    });
  } catch (error) {
    console.error("Notification error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
