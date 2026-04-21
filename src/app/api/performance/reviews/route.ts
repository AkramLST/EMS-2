import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Build where clause based on user role
    let whereClause = {};
    if (user.role === "EMPLOYEE" && user.employee?.id) {
      // Regular employees can only see their own reviews
      whereClause = {
        employeeId: user.employee.id
      };
    }
    // Admin, HR Manager, and Manager roles can see all reviews (no additional filtering needed)

    const [reviews, total] = await Promise.all([
      prisma.performanceReview.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              profileImage: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.performanceReview.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get performance reviews error:", error);
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

    const data = await request.json();

    // Ensure required fields are present
    if (!data.employeeId) {
      return NextResponse.json(
        { message: "Employee ID is required" },
        { status: 400 }
      );
    }

    const review = await prisma.performanceReview.create({
      data: {
        employeeId: data.employeeId,
        reviewPeriod: data.reviewPeriod,
        reviewType: data.reviewType,
        overallRating: parseFloat(data.overallRating),
        status: data.status || "DRAFT",
        goals: data.goals || [],
        achievements: data.achievements || "",
        areasOfImprovement: data.areasOfImprovement || "",
        reviewerComments: data.reviewerComments || "",
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            profileImage: true,
          },
        },
      },
    });

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Create performance review error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
