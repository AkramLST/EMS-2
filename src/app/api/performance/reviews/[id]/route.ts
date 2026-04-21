import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const reviewId = params.id;

    // Validate required fields
    if (!data.employeeId) {
      return NextResponse.json(
        { message: "Employee ID is required" },
        { status: 400 }
      );
    }

    // Check if the review exists
    const existingReview = await prisma.performanceReview.findUnique({
      where: { id: reviewId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    if (!existingReview) {
      return NextResponse.json(
        { message: "Performance review not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to edit this review
    const hasPermission =
      user.role === "ADMINISTRATOR" ||
      user.role === "HR_MANAGER" ||
      user.role === "MANAGER" ||
      existingReview.employeeId === user.employee?.id;

    if (!hasPermission) {
      return NextResponse.json(
        { message: "Insufficient permissions to edit this review" },
        { status: 403 }
      );
    }

    // Update the review
    const updatedReview = await prisma.performanceReview.update({
      where: { id: reviewId },
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
          },
        },
      },
    });

    return NextResponse.json({ review: updatedReview });
  } catch (error) {
    console.error("Update performance review error:", error);
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

    const reviewId = params.id;

    const review = await prisma.performanceReview.findUnique({
      where: { id: reviewId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json(
        { message: "Performance review not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to view this review
    const hasPermission =
      user.role === "ADMINISTRATOR" ||
      user.role === "HR_MANAGER" ||
      user.role === "MANAGER" ||
      review.employeeId === user.employee?.id;

    if (!hasPermission) {
      return NextResponse.json(
        { message: "Insufficient permissions to view this review" },
        { status: 403 }
      );
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Get performance review error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const reviewId = params.id;

    // Check if the review exists
    const existingReview = await prisma.performanceReview.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      return NextResponse.json(
        { message: "Performance review not found" },
        { status: 404 }
      );
    }

    // Only admins can delete reviews
    if (user.role !== "ADMINISTRATOR" && user.role !== "HR_MANAGER") {
      return NextResponse.json(
        { message: "Insufficient permissions to delete this review" },
        { status: 403 }
      );
    }

    await prisma.performanceReview.delete({
      where: { id: reviewId },
    });

    return NextResponse.json({ message: "Performance review deleted successfully" });
  } catch (error) {
    console.error("Delete performance review error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
