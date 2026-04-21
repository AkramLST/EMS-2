import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIpAddress } from "@/lib/ip-utils";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if the requesting user is either an admin or the user themselves
    const isAdmin = hasPermission(authUser, "user.update");
    const isSelf = authUser.id === params.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        password: hashedPassword,
        isFirstLogin: false, // Reset first login flag
      },
    });

    // Create audit log for password reset
    await prisma.auditLog.create({
      data: {
        userId: authUser.id,
        action: "UPDATE",
        resource: "user",
        resourceId: params.id,
        details: `Password reset for user: ${updatedUser.email}`,
        ipAddress: getClientIpAddress(request),
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
