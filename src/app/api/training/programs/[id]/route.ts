import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to delete training programs
    if (!hasPermission(user.role, "training.delete")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const programId = params.id;

    // Check if program exists
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

    // Check if there are active enrollments
    const activeEnrollments = program.enrollments.filter(
      (enrollment) => enrollment.status !== "DROPPED"
    );

    if (activeEnrollments.length > 0) {
      return NextResponse.json(
        {
          message:
            "Cannot delete program with active enrollments. Please cancel all enrollments first.",
        },
        { status: 400 }
      );
    }

    // Delete the program (enrollments will be deleted due to cascade)
    await prisma.trainingProgram.delete({
      where: { id: programId },
    });

    return NextResponse.json({
      message: "Training program deleted successfully",
    });
  } catch (error) {
    console.error("Delete training program error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const programId = params.id;

    const program = await prisma.trainingProgram.findUnique({
      where: { id: programId },
      include: {
        enrollments: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!program) {
      return NextResponse.json(
        { message: "Training program not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ program });
  } catch (error) {
    console.error("Get training program error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
