import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttendanceStatus } from "@/lib/attendance";
import { getOfficeEndTime } from "@/lib/office-hours";
import { addUtcDays, startOfDayUtc } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LocationSource = "GPS" | "IP" | "MANUAL";

const getClientIp = (request: NextRequest): string | null => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || null;
  }

  // next/server exposes the IP via request.ip in some runtimes
  const ip = (request as unknown as { ip?: string }).ip;
  if (ip && ip.length > 0) {
    return ip;
  }

  return null;
};

const isPrivateIp = (ip: string | null) => {
  if (!ip) return true;
  return (
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
  );
};

const fetchLocationFromIp = async (ip: string | null) => {
  const useGenericEndpoint = isPrivateIp(ip);
  const url = useGenericEndpoint
    ? "https://ipapi.co/json/"
    : `https://ipapi.co/${ip}/json/`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      // Explicit timeout guard via AbortController could be considered, omitted for brevity
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    const latitude = data?.latitude ?? data?.lat;
    const longitude = data?.longitude ?? data?.lon;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      return {
        label: [data?.city, data?.region, data?.country_name]
          .filter(Boolean)
          .join(", ")
          .trim(),
      };
    }

    const label = [data?.city, data?.region, data?.country_name]
      .filter(Boolean)
      .join(", ")
      .trim();

    return {
      latitude,
      longitude,
      label: label.length > 0 ? label : `${latitude}, ${longitude}`,
    };
  } catch (error) {
    console.error("[Clock In] Failed to fetch IP-based location", error);
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    // Log request details for debugging
    console.log("[Clock In] Request received");
    console.log(
      "[Clock In] Request headers:",
      Object.fromEntries(request.headers)
    );
    console.log(
      "[Clock In] Content-Type:",
      request.headers.get("content-type")
    );

    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.log("[Clock In] Invalid content type:", contentType);
      return NextResponse.json(
        { message: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get employee ID - use existing or find by email
    let currentEmployeeId = user.employee?.id;

    if (!currentEmployeeId) {
      // Try to find existing employee record for this user
      const existingEmployee = await prisma.employee.findFirst({
        where: {
          email: user.email,
        },
      });

      if (existingEmployee) {
        currentEmployeeId = existingEmployee.id;
      } else {
        return NextResponse.json(
          { message: "No employee profile found. Please contact HR." },
          { status: 403 }
        );
      }
    }

    // Check if employee is active
    const employee = await prisma.employee.findUnique({
      where: { id: currentEmployeeId },
      select: { status: true, firstName: true, lastName: true },
    });

    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    if (employee.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "Only active employees can clock in" },
        { status: 403 }
      );
    }

    // Add error handling for JSON parsing
    let requestData;
    try {
      console.log("[Clock In] Attempting to parse request body");
      requestData = await request.json();
      console.log("[Clock In] Parsed request data:", requestData);
    } catch (jsonError) {
      console.error("[Clock In] JSON parsing error:", jsonError);
      // Log the raw body for debugging
      try {
        const text = await request.text();
        console.log("[Clock In] Raw request body:", text);
      } catch (textError) {
        console.log("[Clock In] Error reading raw body:", textError);
      }
      return NextResponse.json(
        { message: "Invalid request data format" },
        { status: 400 }
      );
    }

    const { clockIn, location, locationSource } = requestData || {};
    const today = startOfDayUtc();

    const clockInTime = new Date(clockIn || new Date());

    if (Number.isNaN(clockInTime.getTime())) {
      return NextResponse.json(
        { message: "Invalid clock-in time provided" },
        { status: 400 }
      );
    }

    try {
      const officeEndTime = await getOfficeEndTime();
      if (clockInTime.getTime() >= officeEndTime.getTime()) {
        return NextResponse.json(
          {
            message:
              "You cannot mark attendance after office hours have ended.",
          },
          { status: 400 }
        );
      }
    } catch (officeTimeError) {
      console.error(
        "[Clock In] Failed to determine office end time:",
        officeTimeError
      );
    }

    // Check if already clocked in today
    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId: currentEmployeeId,
        date: {
          gte: today,
          lt: addUtcDays(today, 1),
        },
      },
    });

    if (existingRecord && existingRecord.clockIn) {
      return NextResponse.json(
        { message: "Already clocked in today" },
        { status: 400 }
      );
    }

    // Get attendance status based on office hours
    const attendanceStatus = await getAttendanceStatus(clockInTime);

    console.log("Attendance Status Check:", {
      clockInTime: clockInTime.toISOString(),
      status: attendanceStatus.status,
      isOnTime: attendanceStatus.isOnTime,
      minutesLate: attendanceStatus.minutesLate,
      minutesEarly: attendanceStatus.minutesEarly,
    });

    // Map string status to Prisma enum
    const mapStatusToEnum = (status: string) => {
      switch (status) {
        case "ON_TIME":
          return "ON_TIME";
        case "PRESENT":
          return "PRESENT";
        case "LATE":
          return "LATE";
        case "EARLY_DEPARTURE":
          return "EARLY_DEPARTURE";
        case "HALF_DAY":
          return "HALF_DAY";
        case "ABSENT":
          return "ABSENT";
        default:
          return "PRESENT"; // Default fallback
      }
    };

    const requestedSource =
      typeof locationSource === "string"
        ? (locationSource.toUpperCase() as LocationSource)
        : undefined;

    const locationDataFromPayload = (() => {
      if (!location || typeof location !== "object") {
        return null;
      }

      const { latitude, longitude, accuracy, label } = location as Record<
        string,
        any
      >;
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return null;
      }

      const accuracyText =
        typeof accuracy === "number" ? ` (±${Math.round(accuracy)}m)` : "";
      const locationLabel =
        typeof label === "string" && label.trim().length > 0
          ? label
          : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}${accuracyText}`;

      return {
        clockInLatitude: latitude,
        clockInLongitude: longitude,
        clockInLocation: locationLabel,
        clockInLocationSource: "GPS" as LocationSource,
      };
    })();

    let locationData: {
      clockInLatitude?: number;
      clockInLongitude?: number;
      clockInLocation?: string;
      clockInLocationSource: LocationSource;
    } | null = locationDataFromPayload;

    const clientIp = getClientIp(request);
    const ipLookup = await fetchLocationFromIp(clientIp);

    if (!locationData && ipLookup) {
      const hasCoordinates =
        typeof ipLookup.latitude === "number" &&
        typeof ipLookup.longitude === "number" &&
        !Number.isNaN(ipLookup.latitude) &&
        !Number.isNaN(ipLookup.longitude);

      const computedLabel =
        ipLookup.label && ipLookup.label.length > 0
          ? ipLookup.label
          : hasCoordinates
          ? `${(ipLookup.latitude as number).toFixed(6)}, ${(
              ipLookup.longitude as number
            ).toFixed(6)}`
          : undefined;

      locationData = {
        clockInLocationSource: "IP",
        ...(hasCoordinates
          ? {
              clockInLatitude: ipLookup.latitude as number,
              clockInLongitude: ipLookup.longitude as number,
            }
          : {}),
        ...(computedLabel ? { clockInLocation: computedLabel } : {}),
      };
    }

    if (!locationData) {
      locationData = {
        clockInLocationSource: (requestedSource ?? "IP") as LocationSource,
      };
    }

    if (ipLookup && ipLookup.label && !locationData.clockInLocation) {
      locationData.clockInLocation = ipLookup.label;
    }

    // Ensure location source carries through even if some fields are null
    if (!locationData.clockInLocationSource) {
      locationData.clockInLocationSource = requestedSource ?? "GPS";
    }

    if (existingRecord) {
      // Update existing record
      const updatedRecord = await prisma.attendanceRecord.update({
        where: { id: existingRecord.id },
        data: {
          clockIn: clockInTime,
          status: mapStatusToEnum(attendanceStatus.status) as any,
          ...(locationData ?? {}),
        },
      });
      return NextResponse.json({ record: updatedRecord });
    } else {
      // Create new record
      const record = await prisma.attendanceRecord.create({
        data: {
          employeeId: currentEmployeeId,
          date: today,
          clockIn: clockInTime,
          status: mapStatusToEnum(attendanceStatus.status) as any,
          ...(locationData ?? {}),
        },
      });
      return NextResponse.json({ record });
    }
  } catch (error) {
    console.error("[Clock In] Unexpected error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
