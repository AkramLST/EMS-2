import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthUser();
  const allowedRoles = [
    "ADMINISTRATOR",
    "SUPER_ADMIN",
    "HR_MANAGER",
    "HR_ADMIN",
  ];

  if (!user || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const times = await prisma.officeTime.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!times) {
    console.log("GET API - No office time record found, returning defaults");
    return NextResponse.json({
      startTime: "09:00", // 9:00 AM Pakistan time
      endTime: "17:00", // 5:00 PM Pakistan time
    });
  }

  // Convert Date objects to Pakistan Standard Time (UTC+5) strings
  const formatTimePakistan = (date: Date) => {
    // Add 5 hours to UTC time to get Pakistan time
    const pakistanHours = (date.getUTCHours() + 5) % 24;
    const pakistanMinutes = date.getUTCMinutes();
    return `${pakistanHours.toString().padStart(2, "0")}:${pakistanMinutes
      .toString()
      .padStart(2, "0")}`;
  };

  console.log("GET API - Database record:", times);
  console.log("GET API - Raw UTC times:", {
    startTime: times.startTime.toISOString(),
    endTime: times.endTime.toISOString(),
  });

  const result = {
    startTime: formatTimePakistan(times.startTime),
    endTime: formatTimePakistan(times.endTime),
    // Also include raw database times for debugging
    rawStartTime: times.startTime.toISOString(),
    rawEndTime: times.endTime.toISOString(),
  };
  console.log("GET API - Pakistan time result:", result);

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  const allowedRoles = [
    "ADMINISTRATOR",
    "SUPER_ADMIN",
    "HR_MANAGER",
    "HR_ADMIN",
  ];

  if (!user || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { startTime, endTime, graceTime } = await req.json();

    console.log("Received office times:", { startTime, endTime, graceTime });

    // Validate times
    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "Start and end times are required" },
        { status: 400 }
      );
    }

    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    // End must be strictly after start
    if (
      endHours < startHours ||
      (endHours === startHours && endMinutes <= startMinutes)
    ) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    // Create Date objects in Pakistan Standard Time (UTC+5)
    // We need to store the Pakistan time as UTC by subtracting 5 hours
    // Create a base date and set Pakistan time
    const baseDate = new Date("2000-01-01T00:00:00.000Z");

    const startDate = new Date(baseDate);
    const endDate = new Date(baseDate);

    // Set the Pakistan time by converting to UTC (subtract 5 hours)
    const startUTCHours = startHours - 5;
    const endUTCHours = endHours - 5;

    // Handle negative hours (times before 5 AM Pakistan time)
    if (startUTCHours < 0) {
      startDate.setUTCDate(startDate.getUTCDate() - 1);
      startDate.setUTCHours(24 + startUTCHours, startMinutes, 0, 0);
    } else {
      startDate.setUTCHours(startUTCHours, startMinutes, 0, 0);
    }

    if (endUTCHours < 0) {
      endDate.setUTCDate(endDate.getUTCDate() - 1);
      endDate.setUTCHours(24 + endUTCHours, endMinutes, 0, 0);
    } else {
      endDate.setUTCHours(endUTCHours, endMinutes, 0, 0);
    }

    // Grace time support is being rolled out; skip persisting for now to avoid schema mismatch
    // const graceTimeMinutes = graceTime ? parseInt(graceTime) : 60;

    console.log("Pakistan time input:", { startTime, endTime });
    console.log("Converted to UTC for storage:", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Persist: update the latest record if it exists, otherwise create
    const existing = await prisma.officeTime.findFirst({
      orderBy: { createdAt: "desc" },
    });
    let result;

    if (existing) {
      result = await prisma.officeTime.update({
        where: { id: existing.id },
        data: {
          startTime: startDate,
          endTime: endDate,
        },
      });
      console.log("Updated existing record:", result);
    } else {
      result = await prisma.officeTime.create({
        data: {
          startTime: startDate,
          endTime: endDate,
        },
      });
      console.log("Created new record:", result);
    }

    // Return the saved times in Pakistan timezone for confirmation
    const formatPakistanTime = (date: Date) => {
      const pakistanHours = (date.getUTCHours() + 5) % 24;
      const pakistanMinutes = date.getUTCMinutes();
      return `${pakistanHours.toString().padStart(2, "0")}:${pakistanMinutes
        .toString()
        .padStart(2, "0")}`;
    };

    return NextResponse.json({
      success: true,
      data: {
        startTime: formatPakistanTime(startDate),
        endTime: formatPakistanTime(endDate),
      },
    });
  } catch (error) {
    console.error("Error saving office times:", error);
    return NextResponse.json(
      { error: "Failed to save office times" },
      { status: 500 }
    );
  }
}
