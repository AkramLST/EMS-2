import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    console.log(
      "Set password request received with token:",
      token ? `${token.substring(0, 10)}...` : "null"
    );

    if (!token || !password) {
      console.log("Missing token or password");
      return NextResponse.json(
        { message: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      console.log("Password too short");
      return NextResponse.json(
        { message: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Find user by reset token (for new users)
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: {
          gt: new Date(),
        },
        isFirstLogin: true,
      },
    });

    console.log(
      "User found for token:",
      user ? `User ID: ${user.id}, Email: ${user.email}` : "null"
    );

    if (!user) {
      // Also check if token exists but user is not first login
      const anyUser = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExp: {
            gt: new Date(),
          },
        },
      });

      console.log(
        "Any user found for token:",
        anyUser
          ? `User ID: ${anyUser.id}, Email: ${anyUser.email}, isFirstLogin: ${anyUser.isFirstLogin}`
          : "null"
      );

      if (anyUser) {
        // Token is valid but user has already set password
        if (!anyUser.isFirstLogin) {
          console.log("User has already set password");
          return NextResponse.json(
            {
              message:
                "Password already set. Please login with your credentials.",
            },
            { status: 400 }
          );
        }
      }

      console.log("Invalid or expired setup token");
      return NextResponse.json(
        {
          message:
            "Invalid or expired setup token. Please contact your administrator.",
        },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log("Password hashed successfully");

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null,
        isFirstLogin: false,
      },
    });

    console.log("User updated successfully");

    return NextResponse.json(
      { message: "Password set successfully. You can now login." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password setup error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
