import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to enroll in training
    if (!hasPermission(user, "training.enroll")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // For admin users who don't have employee profiles, they can't enroll in training
    if (!user.employee) {
      return NextResponse.json(
        { message: "Employee profile required for training enrollment" },
        { status: 400 }
      );
    }

    const { programId } = await request.json();

    // Check if program exists and has capacity
    const program = await prisma.trainingProgram.findUnique({
      where: { id: programId },
      include: {
        enrollments: true,
      },
    });

    if (!program) {
      return NextResponse.json(
        { message: "Training program not found" },
        { status: 404 }
      );
    }

    if (program.enrollments.length >= (program.maxParticipants || 0)) {
      return NextResponse.json({ message: "Program is full" }, { status: 400 });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.trainingEnrollment.findUnique({
      where: {
        employeeId_programId: {
          employeeId: user.employee.id,
          programId: programId,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { message: "Already enrolled in this program" },
        { status: 400 }
      );
    }

    // Create enrollment
    const enrollment = await prisma.trainingEnrollment.create({
      data: {
        employeeId: user.employee.id,
        programId: programId,
        status: "ENROLLED",
      },
    });

    return NextResponse.json({ enrollment });
  } catch (error) {
    console.error("Training enrollment error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
