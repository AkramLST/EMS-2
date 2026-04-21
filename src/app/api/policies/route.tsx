import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ✅ Detect environment
const isDev = process.env.NODE_ENV === "development";

// GET: list all policies
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // ✅ BYPASS in development
    if (!isDev && !hasPermission(user.role, "settings.policies")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const policies = await prisma.permission.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(policies);
  } catch (error) {
    console.error("Get policies error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: add new policy
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // ✅ BYPASS in development
    if (!isDev && !hasPermission(user.role, "settings.policies")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name)
      return NextResponse.json(
        { message: "Policy name required" },
        { status: 400 },
      );

    const newPolicy = await prisma.permission.create({
      data: { name },
    });

    return NextResponse.json(newPolicy, { status: 201 });
  } catch (error) {
    console.error("Add policy error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
// PUT: update policy
export async function PUT(request: NextRequest) {
  const { id, name } = await request.json();

  const updated = await prisma.permission.update({
    where: { id },
    data: { name },
  });

  return NextResponse.json(updated);
}

// DELETE: delete policy
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  await prisma.permission.delete({
    where: { id: String(id) },
  });

  return NextResponse.json({ success: true });
}
