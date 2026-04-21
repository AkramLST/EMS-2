import { prisma } from './prisma';

export interface AttendanceStatusResult {
  status: 'ON_TIME' | 'PRESENT' | 'LATE' | 'EARLY_DEPARTURE' | 'ABSENT' | 'HALF_DAY';
  isOnTime: boolean;
  isEarlyDeparture: boolean;
  minutesLate: number;
  minutesEarly: number;
}

/**
 * Get office hours and determine attendance status based on check-in/check-out time
 */
export async function getAttendanceStatus(
  checkInTime?: Date,
  checkOutTime?: Date
): Promise<AttendanceStatusResult> {
  try {
    // Get the latest office hours with grace time
    const officeTimes = await prisma.officeTime.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!officeTimes) {
      // Default office hours if none set
      const defaultStartTime = new Date();
      defaultStartTime.setHours(9, 0, 0, 0); // 9:00 AM

      const defaultEndTime = new Date();
      defaultEndTime.setHours(17, 0, 0, 0); // 5:00 PM

      return calculateAttendanceStatus(defaultStartTime, defaultEndTime, checkInTime, checkOutTime, 60);
    }

    // Ensure graceTime exists (fallback to 60 if not set)
    const graceTime = officeTimes.graceTime || 60;

    return calculateAttendanceStatus(
      officeTimes.startTime,
      officeTimes.endTime,
      checkInTime,
      checkOutTime,
      graceTime
    );
  } catch (error) {
    console.error('Error getting office hours for attendance status:', error);

    // Fallback to default hours
    const defaultStartTime = new Date();
    defaultStartTime.setHours(9, 0, 0, 0);

    const defaultEndTime = new Date();
    defaultEndTime.setHours(17, 0, 0, 0);

    return calculateAttendanceStatus(defaultStartTime, defaultEndTime, checkInTime, checkOutTime, 60);
  }
}

function calculateAttendanceStatus(
  officeStartTime: Date,
  officeEndTime: Date,
  checkInTime?: Date,
  checkOutTime?: Date,
  graceTimeMinutes: number = 60
): AttendanceStatusResult {
  const result: AttendanceStatusResult = {
    status: 'ABSENT',
    isOnTime: false,
    isEarlyDeparture: false,
    minutesLate: 0,
    minutesEarly: 0
  };

  if (!checkInTime) {
    return result;
  }

  // Extract time components (hours and minutes only, ignore date)
  const officeStart = officeStartTime.getHours() * 60 + officeStartTime.getMinutes();
  const officeEnd = officeEndTime.getHours() * 60 + officeEndTime.getMinutes();
  const checkIn = checkInTime.getHours() * 60 + checkInTime.getMinutes();
  const checkOut = checkOutTime ? checkOutTime.getHours() * 60 + checkOutTime.getMinutes() : null;

  // Calculate late threshold: configurable grace time after office start
  const lateThreshold = officeStart + graceTimeMinutes;

  // Calculate lateness
  if (checkIn <= officeStart) {
    // On time or early - check if early
    result.isOnTime = true;
    result.status = 'ON_TIME';
    result.minutesLate = 0;
  } else if (checkIn <= lateThreshold) {
    // Within grace period
    result.isOnTime = true;
    result.status = 'PRESENT';
    result.minutesLate = checkIn - officeStart;
  } else {
    // Late
    result.minutesLate = checkIn - officeStart;
    result.status = 'LATE';
    result.isOnTime = false;
  }

  // Calculate early departure if check-out time is provided
  if (checkOut !== null && checkOut < officeEnd) {
    result.minutesEarly = officeEnd - checkOut;
    result.isEarlyDeparture = true;

    // If early departure is more than 4 hours, consider it half day
    if (result.minutesEarly >= 240) { // 4 hours
      result.status = 'HALF_DAY';
    } else {
      // For early departure, maintain the original status but add early departure flag
      // Don't change ON_TIME or PRESENT to EARLY_DEPARTURE
      if (result.status === 'LATE') {
        result.status = 'LATE'; // Keep LATE status
      }
      // ON_TIME and PRESENT stay as they are when there's early departure
    }
  }

  return result;
}

/**
 * Get office hours for display
 */
export async function getOfficeTimes() {
  try {
    const times = await prisma.officeTime.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!times) {
      return {
        startTime: '09:00', // 9:00 AM Pakistan time
        endTime: '17:00'    // 5:00 PM Pakistan time
      };
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

    return {
      startTime: formatTimePakistan(times.startTime),
      endTime: formatTimePakistan(times.endTime),
      // Also include raw database times for debugging
      rawStartTime: times.startTime.toISOString(),
      rawEndTime: times.endTime.toISOString(),
    };
  } catch (error) {
    console.error('Error getting office times:', error);
    return {
      startTime: '09:00',
      endTime: '17:00'
    };
  }
}
