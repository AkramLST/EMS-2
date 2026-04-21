import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailTemplates, generateResetToken, createResetLink } from "@/lib/email";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json(
        { message: "If an account with that email exists, a reset link has been sent." },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExp
      }
    });

    // Send reset email
    const userName = user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email;
    const resetLink = createResetLink(resetToken, false);
    const emailTemplate = emailTemplates.passwordReset(userName, resetLink);

    const emailSent = await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });

    if (!emailSent) {
      console.error("Failed to send reset email to:", user.email);
    }

    return NextResponse.json(
      { message: "If an account with that email exists, a reset link has been sent." },
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

export async function PUT(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { message: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Find user by reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null,
        isFirstLogin: false
      }
    });

    return NextResponse.json(
      { message: "Password updated successfully" },
      { status: 200 }
    );

  } catch (error) {
    console.error("Password update error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
