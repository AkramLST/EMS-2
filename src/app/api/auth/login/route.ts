import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, generateToken } from "@/lib/auth";
import { getClientIpAddress } from "@/lib/ip-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe = false } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 },
      );
    }

    // Add error handling for Prisma operations
    let user;
    try {
      // Find user with employee data
      user = await prisma.user.findUnique({
        where: { email },
        include: {
          employee: {
            include: {
              department: true,
              manager: true,
            },
          },
        },
      });
    } catch (prismaError) {
      console.error("[Login API] Prisma error:", prismaError);
      return NextResponse.json(
        { message: "Database connection error" },
        { status: 500 },
      );
    }

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 },
      );
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Prevent inactive employees from logging in
    if (
      user.employee &&
      ["INACTIVE", "TERMINATED"].includes(user.employee.status)
    ) {
      return NextResponse.json(
        {
          message:
            "Your account is not active. Please contact your administrator for assistance.",
        },
        { status: 403 },
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create user session for online/offline tracking
    try {
      const sessionToken = `session_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionToken,
          deviceInfo: {
            userAgent: request.headers.get("user-agent") || "unknown",
            platform: "web",
          },
          ipAddress: getClientIpAddress(request),
          userAgent: request.headers.get("user-agent") || "unknown",
          status: "ONLINE",
          lastActivity: new Date(),
        },
      });

      console.log("[Login API] User session created:", sessionToken);
    } catch (sessionError) {
      console.error("[Login API] Failed to create session:", sessionError);
      // Don't fail login if session creation fails
    }

    // Create audit log for login
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        resource: "user",
        resourceId: user.id,
        details: `User logged in: ${user.email}`,
        ipAddress: getClientIpAddress(request),
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    // Create response with JSON data (without returning the token)
    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: user.employee,
      },
    });

    const isProduction = process.env.NODE_ENV === "production";

    // Set cookie expiration based on rememberMe
    const maxAge = rememberMe
      ? 60 * 60 * 24 * 30 // 30 days for "Remember me"
      : 60 * 60 * 24 * 7; // 7 days for regular session

    response.cookies.set({
      name: "auth-token",
      value: token,
      path: "/",
      maxAge,
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax", // Changed from "strict" to "lax" for cross-origin compatibility
    });

    return response;
  } catch (error) {
    console.error("[Login API] Login error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
