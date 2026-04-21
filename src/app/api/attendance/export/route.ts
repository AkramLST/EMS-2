import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatDateYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTimeHHMM(d: Date | null) {
  if (!d) return "";
  return d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit" });
}

function formatHoursToHHMMSS(decimalHours: number | null | undefined) {
  if (decimalHours === null || decimalHours === undefined) return "";
  const hours = Math.floor(decimalHours);
  const minutes = Math.floor((decimalHours - hours) * 60);
  const seconds = Math.floor(((decimalHours - hours) * 60 - minutes) * 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function getPeriodRange(period: string) {
  const today = new Date();
  let start = new Date(today.getFullYear(), today.getMonth(), 1);
  let end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  if (period === "today") {
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  } else if (period === "current_week") {
    const startOfWeek = new Date(today);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    start = startOfWeek;
    end = endOfWeek;
  } else if (period === "current_month") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  } else if (period === "last_month") {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    end = new Date(today.getFullYear(), today.getMonth(), 0);
  } else if (period === "yearly") {
    start = new Date(today.getFullYear(), 0, 1);
    end = new Date(today.getFullYear(), 11, 31);
  }
  return { start, end };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "ADMINISTRATOR" && user.role !== "HR_MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const period = (searchParams.get("period") || "current_month").toString();

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
  }

  const { start, end } = getPeriodRange(period);

  const records = await prisma.attendanceRecord.findMany({
    where: {
      employeeId,
      date: {
        gte: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
        lt: new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1),
      },
    },
    orderBy: { date: "asc" },
  });

  const header = ["Date", "Status", "Clock In", "Clock Out", "Total Hours"];
  const rows = records.map((r) => [
    formatDateYYYYMMDD(new Date(r.date)),
    r.status,
    r.clockIn ? formatTimeHHMM(new Date(r.clockIn)) : "",
    r.clockOut ? formatTimeHHMM(new Date(r.clockOut)) : "",
    r.totalHours != null ? formatHoursToHHMMSS(Number(r.totalHours)) : "",
  ]);

  const csv = [header, ...rows].map((arr) => arr.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");

  const filename = `attendance_${employeeId}_${period}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
