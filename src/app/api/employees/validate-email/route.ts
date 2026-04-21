import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Check if email exists in User table
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    // Check if email exists in Employee table
    const existingEmployee = await prisma.employee.findFirst({
      where: { email },
    });

    const emailExists = existingUser || existingEmployee;

    return NextResponse.json({
      exists: !!emailExists,
      message: emailExists
        ? "This email is already registered"
        : "Email is available",
    });
  } catch (error) {
    console.error("Email validation error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
