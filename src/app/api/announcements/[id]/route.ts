import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIpAddress } from "@/lib/ip-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, "announcements.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id: params.id },
      include: {
        author: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!announcement) {
      return NextResponse.json(
        { message: "Announcement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error("Get announcement error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, "announcements.update")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { title, content, priority, expiresAt, isActive } = data;

    if (!title || !content) {
      return NextResponse.json(
        { message: "Title and content are required" },
        { status: 400 }
      );
    }

    // Check if announcement exists
    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id: params.id },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { message: "Announcement not found" },
        { status: 404 }
      );
    }

    const announcement = await prisma.announcement.update({
      where: { id: params.id },
      data: {
        title: title.trim(),
        content: content.trim(),
        type: "GENERAL", // Set default type
        priority: priority || "MEDIUM",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== false,
      },
    });

    // Create audit log for update
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        resource: "announcement",
        resourceId: params.id,
        details: `Updated announcement: ${title.trim()}`,
        ipAddress: getClientIpAddress(request),
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    // Fetch the updated announcement with author information
    const announcementWithAuthor = await prisma.announcement.findUnique({
      where: { id: params.id },
      include: {
        author: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Announcement updated successfully",
      announcement: announcementWithAuthor,
    });
  } catch (error) {
    console.error("Update announcement error:", error);
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

    if (!hasPermission(user, "announcements.delete")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if announcement exists and get its details for audit log
    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id: params.id },
      include: {
        author: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { message: "Announcement not found" },
        { status: 404 }
      );
    }

    // Create audit log before deletion
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        resource: "announcement",
        resourceId: params.id,
        details: `Deleted announcement: ${existingAnnouncement.title}`,
        ipAddress: getClientIpAddress(request),
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    await prisma.announcement.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Delete announcement error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
