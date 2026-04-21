import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user || !user.employee) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const applicationId = params.id;

    if (!applicationId) {
      return NextResponse.json(
        { message: "Leave application ID is required" },
        { status: 400 }
      );
    }

    // Find the leave application
    const leaveApplication = await prisma.leaveApplication.findUnique({
      where: { id: applicationId },
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

    // Check if user can delete this leave application
    // Only the owner or users with leave.delete permission can delete
    const canDeleteAll = hasPermission(user, "leave.delete");
    const isOwner = leaveApplication.employeeId === user.employee.id;

    if (!canDeleteAll && !isOwner) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Only allow deletion of pending applications
    if (leaveApplication.status !== "PENDING") {
      return NextResponse.json(
        { message: "Only pending leave applications can be deleted" },
        { status: 400 }
      );
    }

    // Delete the leave application
    await prisma.leaveApplication.delete({
      where: { id: applicationId },
    });

    // Create audit log for deletion
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        resource: "leave",
        resourceId: applicationId,
        details: `Deleted leave application: ${leaveApplication.totalDays} days from ${leaveApplication.startDate} to ${leaveApplication.endDate}`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({
      message: "Leave application deleted successfully",
    });
  } catch (error) {
    console.error("Delete leave application error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
