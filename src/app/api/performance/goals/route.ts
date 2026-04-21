import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoalStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view performance goals
    if (!hasPermission(user, "performance.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const includeAssignments = {
      assignments: {
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
      },
    };

    const canViewAllGoals = hasPermission(user, "performance.read_all");

    const whereClause = !canViewAllGoals
      ? {
          assignments: {
            some: {
              employeeId: user.employee?.id || "__none__",
            },
          },
        }
      : {};

    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        include: includeAssignments,
        where: whereClause,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.goal.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      goals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get goals error:", error);
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

    // Check if user has permission to create performance goals
    if (!hasPermission(user, "performance.create")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();

    const {
      title,
      description,
      targetDate,
      status,
      progress,
      employeeIds,
    } = data || {};

    if (!title || !description || !targetDate) {
      return NextResponse.json(
        { message: "Title, description, and target date are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { message: "At least one employee must be selected for the goal" },
        { status: 400 }
      );
    }

    const uniqueEmployeeIds = Array.from(
      new Set(
        employeeIds
          .filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0)
          .map((id: string) => id.trim())
      )
    );

    if (uniqueEmployeeIds.length === 0) {
      return NextResponse.json(
        { message: "Could not determine any valid employees for the goal" },
        { status: 400 }
      );
    }

    const targetDateValue = new Date(targetDate);
    if (Number.isNaN(targetDateValue.getTime())) {
      return NextResponse.json(
        { message: "Invalid target date provided" },
        { status: 400 }
      );
    }

    const progressValue = typeof progress === "number" ? progress : parseInt(progress || "0", 10) || 0;

    const normalizedStatus =
      typeof status === "string" && status.trim().length > 0
        ? status.trim().toUpperCase()
        : undefined;

    const goalData: {
      title: string;
      description: string;
      targetDate: Date;
      progress: number;
      status?: GoalStatus;
    } = {
      title,
      description,
      targetDate: targetDateValue,
      progress: progressValue,
    };

    if (normalizedStatus) {
      if ((Object.values(GoalStatus) as string[]).includes(normalizedStatus)) {
        goalData.status = normalizedStatus as GoalStatus;
      } else {
        return NextResponse.json(
          { message: `Invalid goal status: ${normalizedStatus}` },
          { status: 400 }
        );
      }
    }

    const goal = await prisma.$transaction(async (tx) => {
      const createdGoal = await tx.goal.create({
        data: goalData,
      });

      await tx.goalAssignment.createMany({
        data: uniqueEmployeeIds.map((employeeId) => ({
          goalId: createdGoal.id,
          employeeId,
        })),
        skipDuplicates: true,
      });

      return tx.goal.findUnique({
        where: { id: createdGoal.id },
        include: {
          assignments: {
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
          },
        },
      });
    });

    return NextResponse.json({ goal });
  } catch (error) {
    console.error("Create goal error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
