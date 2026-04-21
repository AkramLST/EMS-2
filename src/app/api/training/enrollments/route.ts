import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user || !user.employee) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      prisma.trainingEnrollment.findMany({
        where: {
          employeeId: user.employee.id,
        },
        include: {
          program: {
            select: {
              title: true,
              type: true,
              duration: true,
            },
          },
        },
        orderBy: {
          enrolledAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.trainingEnrollment.count({
        where: {
          employeeId: user.employee.id,
        },
      }),
    ]);

    return NextResponse.json({
      enrollments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get training enrollments error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
