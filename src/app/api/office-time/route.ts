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

    // Check if user has permission to view office hours
    if (!hasPermission(user, "settings.read")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const officeTime = await prisma.officeTime.findFirst({
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!officeTime) {
      return NextResponse.json({
        message: "No office hours configured",
        officeTime: null
      });
    }

    return NextResponse.json({
      officeTime: {
        id: officeTime.id,
        startTime: officeTime.startTime,
        endTime: officeTime.endTime,
        graceTime: officeTime.graceTime,
        createdAt: officeTime.createdAt,
        updatedAt: officeTime.updatedAt,
      }
    });

  } catch (error) {
    console.error("Get office time error:", error);
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

    // Check if user has permission to manage office hours
    if (!hasPermission(user, "settings.update")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { startTime, endTime, graceTime } = body;

    // Validate input
    if (!startTime || !endTime) {
      return NextResponse.json(
        { message: "Start time and end time are required" },
        { status: 400 }
      );
    }

    // Parse times
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json(
        { message: "Invalid time format" },
        { status: 400 }
      );
    }

    if (startDateTime >= endDateTime) {
      return NextResponse.json(
        { message: "Start time must be before end time" },
        { status: 400 }
      );
    }

    // Use current date with provided times
    const today = new Date();
    const finalStartTime = new Date(today);
    finalStartTime.setHours(startDateTime.getHours());
    finalStartTime.setMinutes(startDateTime.getMinutes());
    finalStartTime.setSeconds(0);
    finalStartTime.setMilliseconds(0);

    const finalEndTime = new Date(today);
    finalEndTime.setHours(endDateTime.getHours());
    finalEndTime.setMinutes(endDateTime.getMinutes());
    finalEndTime.setSeconds(0);
    finalEndTime.setMilliseconds(0);

    // Create or update office time
    const officeTime = await prisma.officeTime.upsert({
      where: {
        id: 'default' // Use a fixed ID for the main office time record
      },
      update: {
        startTime: finalStartTime,
        endTime: finalEndTime,
        graceTime: graceTime || 60,
      },
      create: {
        id: 'default',
        startTime: finalStartTime,
        endTime: finalEndTime,
        graceTime: graceTime || 60,
      },
    });

    return NextResponse.json({
      message: "Office hours updated successfully",
      officeTime: {
        id: officeTime.id,
        startTime: officeTime.startTime,
        endTime: officeTime.endTime,
        graceTime: officeTime.graceTime,
        createdAt: officeTime.createdAt,
        updatedAt: officeTime.updatedAt,
      }
    });

  } catch (error) {
    console.error("Update office time error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
