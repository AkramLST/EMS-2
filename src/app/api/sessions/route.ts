import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIpAddress } from "@/lib/ip-utils";
import {
  expireStaleSessions,
  normalizeSessionStatus,
  SESSION_THRESHOLDS,
} from "@/lib/session-status";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const computeExpiry = () => new Date(Date.now() + SESSION_THRESHOLDS.offlineMs);

// POST /api/sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { deviceInfo, userAgent } = body;

    // Generate session token
    const sessionToken = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create new session
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionToken,
        deviceInfo: deviceInfo || {},
        ipAddress: getClientIpAddress(request),
        userAgent: userAgent || request.headers.get("user-agent") || "unknown",
        status: "ONLINE",
        lastActivity: new Date(),
        expiresAt: computeExpiry(),
      },
    });

    return NextResponse.json({
      message: "Session created successfully",
      session: {
        id: session.id,
        token: sessionToken,
        status: session.status,
      },
    });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/sessions - Get user sessions and status
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Normalize stale sessions before returning
    await expireStaleSessions(prisma);

    // Get active sessions for the user
    const sessions = await prisma.userSession.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      orderBy: {
        lastActivity: "desc",
      },
    });

    // Determine overall user status based on most recent session
    const now = new Date();
    const currentStatus =
      sessions.length > 0
        ? normalizeSessionStatus(
            sessions[0].status,
            sessions[0].lastActivity,
            now
          )
        : "OFFLINE";

    return NextResponse.json({
      status: currentStatus,
      sessions: sessions.map((session) => ({
        id: session.id,
        status: normalizeSessionStatus(
          session.status,
          session.lastActivity,
          now
        ),
        lastActivity: session.lastActivity,
        deviceInfo: session.deviceInfo,
      })),
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/sessions - Update session activity/status
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionToken, status, deviceInfo } = body;

    // Update session activity
    const updatedSession = await prisma.userSession.updateMany({
      where: {
        sessionToken,
        userId: user.id,
        isActive: true,
      },
      data: {
        lastActivity: new Date(),
        status: status || "ONLINE",
        deviceInfo: deviceInfo || undefined,
        expiresAt: computeExpiry(),
      },
    });

    if (updatedSession.count === 0) {
      return NextResponse.json(
        { message: "Session not found or inactive" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Session updated successfully",
      status: status || "ONLINE",
    });
  } catch (error) {
    console.error("Update session error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions - End session
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get("token");

    if (!sessionToken) {
      return NextResponse.json(
        { message: "Session token required" },
        { status: 400 }
      );
    }

    // Mark session as inactive
    const updatedSession = await prisma.userSession.updateMany({
      where: {
        sessionToken,
        userId: user.id,
      },
      data: {
        isActive: false,
        status: "OFFLINE",
        expiresAt: new Date(),
      },
    });

    if (updatedSession.count === 0) {
      return NextResponse.json(
        { message: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Session ended successfully",
    });
  } catch (error) {
    console.error("End session error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
