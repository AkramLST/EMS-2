import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { isRead } = await request.json();

    const notification = await prisma.notification.update({
      where: {
        id: params.id,
        userId: user.id,
      },
      data: { isRead },
    });

    return NextResponse.json({ notification });
  } catch (error) {
    console.error("Notification update error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await prisma.notification.delete({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    return NextResponse.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Notification delete error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
