import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addUtcDays, calculateWorkingHours, startOfDayUtc } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getPacificTimeInfo() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const map: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour);
  const minute = Number(map.minute);
  const second = Number(map.second);

  const pstNow = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const pstStartOfToday = new Date(Date.UTC(year, month - 1, day));
  const pstEndOfToday = addUtcDays(pstStartOfToday, 1);

  return {
    pstNow,
    pstStartOfToday,
    pstEndOfToday,
  };
}

function getMinutesSinceMidnight(date: Date) {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

async function getOfficeHours() {
  const officeTime = await prisma.officeTime.findFirst({
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!officeTime) {
    return {
      startMinutes: 9 * 60,
      endMinutes: 18 * 60,
    };
  }

  return {
    startMinutes:
      officeTime.startTime.getHours() * 60 + officeTime.startTime.getMinutes(),
    endMinutes:
      officeTime.endTime.getHours() * 60 + officeTime.endTime.getMinutes(),
  };
}

async function runAutoCheckout() {
  const { pstNow, pstStartOfToday, pstEndOfToday } = getPacificTimeInfo();
  const previousDay = addUtcDays(pstStartOfToday, -1);
  const previousDayEnd = pstStartOfToday;

  const officeHours = await getOfficeHours();
  const officeDurationHours = (officeHours.endMinutes - officeHours.startMinutes) / 60;

  const shouldProcessToday = getMinutesSinceMidnight(pstNow) >= officeHours.endMinutes;
  const dateFilters = shouldProcessToday
    ? [
        {
          date: {
            lt: pstStartOfToday,
          },
        },
        {
          date: {
            gte: pstStartOfToday,
            lt: pstEndOfToday,
          },
        },
      ]
    : [
        {
          date: {
            lt: pstStartOfToday,
          },
        },
      ];

  const openAttendances = await prisma.attendanceRecord.findMany({
    where: {
      OR: dateFilters,
      clockOut: null,
      clockIn: {
        not: null,
      },
    },
    include: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
          employeeId: true,
        },
      },
    },
  });

  let processed = 0;
  for (const attendance of openAttendances) {
    if (!attendance.clockIn) continue;

    const attendanceDate = startOfDayUtc(attendance.date);
    const targetClockOut = new Date(attendanceDate);
    targetClockOut.setHours(
      Math.floor(officeHours.endMinutes / 60),
      officeHours.endMinutes % 60,
      0,
      0
    );

    const totalHours = calculateWorkingHours(new Date(attendance.clockIn), targetClockOut);
    const overtimeHours = Math.max(0, totalHours - officeDurationHours);

    const existingNotes = attendance.notes ?? "";
    const autoTag = `[Auto Checkout] Automatically clocked out at ${targetClockOut.toISOString()}`;
    const mergedNotes = existingNotes.includes("[Auto Checkout]")
      ? existingNotes
      : existingNotes
      ? `${existingNotes}\n${autoTag}`
      : autoTag;

    await prisma.attendanceRecord.update({
      where: { id: attendance.id },
      data: {
        clockOut: targetClockOut,
        totalHours,
        overtime: overtimeHours > 0 ? overtimeHours : undefined,
        notes: mergedNotes,
      },
    });

    processed += 1;
    console.log(
      `Auto-checked out ${attendance.employee.firstName} ${attendance.employee.lastName} (${attendance.employee.employeeId}) for ${attendanceDate
        .toISOString()
        .split("T")[0]} at ${targetClockOut.toISOString()}`
    );
  }

  const missingTagAttendances = await prisma.attendanceRecord.findMany({
    where: {
      AND: [
        {
          OR: dateFilters,
        },
        {
          OR: [{ notes: null }, { notes: { not: { contains: "[Auto Checkout]" } } }],
        },
      ],
      clockIn: {
        not: null,
      },
      clockOut: {
        not: null,
      },
    },
    include: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
          employeeId: true,
        },
      },
    },
  });

  let tagged = 0;
  for (const attendance of missingTagAttendances) {
    if (!attendance.clockOut) continue;

    const attendanceDate = startOfDayUtc(attendance.date);
    const targetClockOut = new Date(attendanceDate);
    targetClockOut.setHours(
      Math.floor(officeHours.endMinutes / 60),
      officeHours.endMinutes % 60,
      0,
      0
    );

    const existingClockOut = new Date(attendance.clockOut);
    if (existingClockOut.getTime() !== targetClockOut.getTime()) {
      continue;
    }

    const existingNotes = attendance.notes ?? "";
    const autoTag = `[Auto Checkout] Automatically clocked out at ${targetClockOut.toISOString()}`;
    if (existingNotes.includes("[Auto Checkout]")) {
      continue;
    }

    const mergedNotes = existingNotes ? `${existingNotes}\n${autoTag}` : autoTag;

    await prisma.attendanceRecord.update({
      where: { id: attendance.id },
      data: {
        notes: mergedNotes,
      },
    });

    tagged += 1;
    console.log(
      `Tagged ${attendance.employee.firstName} ${attendance.employee.lastName} (${attendance.employee.employeeId}) as auto checkout for ${attendanceDate
        .toISOString()
        .split("T")[0]}`
    );
  }

  const allEmployees = await prisma.employee.findMany({
    where: {
      status: "ACTIVE",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeId: true,
    },
  });

  const attendedEmployeeIds = await prisma.attendanceRecord.findMany({
    where: {
      date: {
        gte: previousDay,
        lt: previousDayEnd,
      },
    },
    select: {
      employeeId: true,
    },
  });

  const attendedIds = new Set(attendedEmployeeIds.map((item) => item.employeeId));
  let absentMarked = 0;

  for (const employee of allEmployees) {
    if (attendedIds.has(employee.id)) {
      continue;
    }

    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId: employee.id,
        date: {
          gte: previousDay,
          lt: previousDayEnd,
        },
      },
    });

    if (existingRecord) {
      continue;
    }

    await prisma.attendanceRecord.create({
      data: {
        employeeId: employee.id,
        date: previousDay,
        status: "ABSENT",
        clockIn: null,
        clockOut: null,
      },
    });

    absentMarked += 1;
    console.log(
      `Marked ${employee.firstName} ${employee.lastName} (${employee.employeeId}) as absent for ${previousDay
        .toISOString()
        .split("T")[0]}`
    );
  }

  console.log("Auto-checkout process completed", {
    processed,
    tagged,
    absentMarked,
  });

  return {
    processed,
    tagged,
    absentMarked,
  };
}

async function handleRequest(request: NextRequest) {
  const expectedSecret = process.env.AUTO_CHECKOUT_SECRET;
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";

  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : undefined;

  const providedSecret =
    bearerSecret ??
    request.headers.get("x-cron-secret") ??
    request.nextUrl.searchParams.get("token");

  if (!isVercelCron && (!expectedSecret || providedSecret !== expectedSecret)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAutoCheckout();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Error in auto-checkout route", error);
    return NextResponse.json(
      { success: false, message: "Auto checkout failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
