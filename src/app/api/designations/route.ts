import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/designations - Get all designations
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has appropriate permissions (ADMINISTRATOR, HR_MANAGER, or SYSTEM_AUDITOR)
    const hasPermission =
      user.role === "ADMINISTRATOR" ||
      user.role === "HR_MANAGER" ||
      user.role === "SYSTEM_AUDITOR";

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limitParam = searchParams.get("limit");
    const search = searchParams.get("search") || "";

    // If limit is set to "all", fetch all designations without pagination
    const fetchAll = limitParam === "all";
    const limit = fetchAll ? undefined : parseInt(limitParam || "10");
    const skip = fetchAll ? undefined : (page - 1) * (limit || 0);

    // Build where clause for search
    const whereClause: any = {};
    if (search) {
      whereClause.title = {
        contains: search,
        mode: "insensitive",
      };
    }

    const [designations, total] = await Promise.all([
      prisma.designation.findMany({
        where: whereClause,
        orderBy: { title: "asc" },
        skip,
        take: limit,
      }),
      prisma.designation.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      designations,
      pagination: fetchAll
        ? undefined
        : {
            currentPage: page,
            totalPages: Math.ceil(total / (limit || 1)),
            totalItems: total,
            itemsPerPage: limit,
          },
    });
  } catch (error) {
    console.error("Failed to fetch designations:", error);
    return NextResponse.json(
      { error: "Failed to fetch designations" },
      { status: 500 }
    );
  }
}

// POST /api/designations - Create a new designation
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has appropriate permissions (ADMINISTRATOR or HR_MANAGER)
    const hasPermission =
      user.role === "ADMINISTRATOR" || user.role === "HR_MANAGER";

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Check if designation already exists
    const existingDesignation = await prisma.designation.findFirst({
      where: {
        title: {
          equals: title,
          mode: "insensitive",
        },
      },
    });

    if (existingDesignation) {
      return NextResponse.json(
        { error: "Designation with this title already exists" },
        { status: 400 }
      );
    }

    // Create new designation
    const designation = await prisma.designation.create({
      data: {
        title,
        description: description || null,
      },
    });

    return NextResponse.json(designation, { status: 201 });
  } catch (error) {
    console.error("Failed to create designation:", error);
    return NextResponse.json(
      { error: "Failed to create designation" },
      { status: 500 }
    );
  }
}

// PUT /api/designations/:id - Update a designation
