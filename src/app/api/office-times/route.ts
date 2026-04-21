import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

// Public read-only endpoint to fetch office times for all authenticated/unauthenticated clients
// Returns Pakistan Standard Time (UTC+5) HH:MM strings
export async function GET() {
  try {
    // Require any authenticated user
    const user = await getAuthUser();
    if (!user) {
      console.log("Office times API: Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Office times API: Fetching office hours from database", {
      databaseUrlDefined: Boolean(process.env.DATABASE_URL),
      nodeEnv: process.env.NODE_ENV,
    });
    const times = await prisma.officeTime.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!times) {
      console.log(
        "Office times API: No office hours found in database, using defaults"
      );
      // Default fallback if not configured yet
      return NextResponse.json({
        startTime: "09:00",
        endTime: "17:00",
      });
    }

    console.log("Office times API: Found office hours in database", {
      startTime: times.startTime,
      endTime: times.endTime,
      graceTime: times.graceTime,
      startIso: times.startTime?.toISOString?.(),
      endIso: times.endTime?.toISOString?.(),
    });

    const formatPakistan = (date: Date) => {
      // Add 5 hours to UTC time to get Pakistan time
      const pakistanHours = (date.getUTCHours() + 5) % 24;
      const pakistanMinutes = date.getUTCMinutes();
      return `${pakistanHours.toString().padStart(2, "0")}:${pakistanMinutes
        .toString()
        .padStart(2, "0")}`;
    };

    return NextResponse.json({
      startTime: formatPakistan(times.startTime),
      endTime: formatPakistan(times.endTime),
    });
  } catch (err) {
    console.error("Failed to read office times:", err);
    if (err && typeof err === "object" && "code" in err) {
      console.error("Prisma error code:", (err as any).code);
      console.error("Prisma error meta:", (err as any).meta);
    }
    // Graceful fallback to defaults
    return NextResponse.json({ startTime: "09:00", endTime: "17:00" });
  }
}
