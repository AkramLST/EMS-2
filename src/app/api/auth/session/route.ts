import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the latest active session for the user
    const session = await prisma.userSession.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
      orderBy: {
        lastActivity: "desc",
      },
    });

    return NextResponse.json({
      status: session?.status || "OFFLINE",
      lastActivity: session?.lastActivity,
    });
  } catch (error) {
    console.error("[Session API] Error getting session:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { status } = await request.json();

    if (!["ONLINE", "AWAY", "BUSY", "OFFLINE"].includes(status)) {
      return NextResponse.json(
        { message: "Invalid status" },
        { status: 400 }
      );
    }

    // Update or create session
    const existingSession = await prisma.userSession.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
      orderBy: {
        lastActivity: "desc",
      },
    });

    if (existingSession) {
      // Update existing session
      const updatedSession = await prisma.userSession.update({
        where: {
          id: existingSession.id,
        },
        data: {
          status: status as any,
          lastActivity: new Date(),
        },
      });

      return NextResponse.json({
        status: updatedSession.status,
        lastActivity: updatedSession.lastActivity,
      });
    } else {
      // Create new session if none exists
      const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newSession = await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionToken,
          status: status as any,
          lastActivity: new Date(),
          deviceInfo: {
            userAgent: request.headers.get("user-agent") || "unknown",
            platform: "web",
          },
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });

      return NextResponse.json({
        status: newSession.status,
        lastActivity: newSession.lastActivity,
      });
    }
  } catch (error) {
    console.error("[Session API] Error updating session:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
