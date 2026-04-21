import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view training programs
    if (!hasPermission(user, "training.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const [programs, total] = await Promise.all([
      prisma.trainingProgram.findMany({
        include: {
          enrollments: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.trainingProgram.count(),
    ]);

    return NextResponse.json({
      programs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get training programs error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMINISTRATOR") {
      return NextResponse.json(
        { message: "Only administrators can create training programs" },
        { status: 403 }
      );
    }

    const data = await request.json();

    const program = await prisma.trainingProgram.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        duration: parseInt(data.duration),
        maxParticipants: parseInt(data.maxParticipants),
      },
      include: {
        enrollments: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({ program });
  } catch (error) {
    console.error("Create training program error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
