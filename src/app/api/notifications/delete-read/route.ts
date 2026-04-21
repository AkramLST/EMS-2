import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Delete all read notifications for the user
    await prisma.notification.deleteMany({
      where: {
        userId: user.id,
        isRead: true,
      },
    });

    return NextResponse.json({
      message: "Read notifications deleted",
    });
  } catch (error) {
    console.error("Delete read notifications error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
