import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getClientIpAddress } from "@/lib/ip-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, "user.delete")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const userIdToDelete = params?.id;

    if (!userIdToDelete) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    if (userIdToDelete === user.id) {
      return NextResponse.json(
        { message: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userIdToDelete },
      include: {
        employee: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      if (existingUser.employee?.id) {
        await tx.employee.delete({
          where: { id: existingUser.employee.id },
        });
      }

      await tx.user.delete({
        where: { id: userIdToDelete },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "DELETE",
          resource: "user",
          resourceId: userIdToDelete,
          details: `Deleted user: ${existingUser.email}`,
          ipAddress: getClientIpAddress(request),
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { message: "User not found or already deleted" },
          { status: 404 }
        );
      }

      if (error.code === "P2003") {
        return NextResponse.json(
          {
            message:
              "Cannot delete user because it is referenced by other records",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          message: `Database error occurred: ${error.code}. ${error.message}`,
        },
        { status: 500 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { message: `Failed to delete user: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Failed to delete user. Please try again." },
      { status: 500 }
    );
  }
}
