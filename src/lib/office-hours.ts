import { prisma } from "@/lib/prisma";

/**
 * Get office hours from database
 * @returns Promise with office hours or null if not configured
 */
export async function getOfficeHours() {
  try {
    const officeTime = await prisma.officeTime.findFirst({
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!officeTime) {
      console.warn('No office hours configured in database');
      return null;
    }

    return {
      startTime: officeTime.startTime,
      endTime: officeTime.endTime,
      graceTime: officeTime.graceTime,
    };
  } catch (error) {
    console.error('Error fetching office hours:', error);
    return null;
  }
}

/**
 * Get office end time for today
 * @returns Promise with office end time or default 6:00 PM
 */
export async function getOfficeEndTime() {
  try {
    const officeHours = await getOfficeHours();

    if (officeHours) {
      // Convert database time to today's date
      const today = new Date();
      const endTime = new Date(today);
      endTime.setHours(officeHours.endTime.getHours());
      endTime.setMinutes(officeHours.endTime.getMinutes());
      endTime.setSeconds(officeHours.endTime.getSeconds());

      return endTime;
    }

    // Fallback to 6:00 PM if no office hours found
    console.warn('No office hours found, using default 6:00 PM');
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0);

  } catch (error) {
    console.error('Error getting office end time:', error);
    // Fallback to 6:00 PM
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0);
  }
}

/**
 * Check if current time is within office hours
 * @returns Promise with boolean indicating if within office hours
 */
export async function isWithinOfficeHours() {
  try {
    const officeHours = await getOfficeHours();

    if (!officeHours) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = officeHours.startTime.getHours() * 60 + officeHours.startTime.getMinutes();
    const endTime = officeHours.endTime.getHours() * 60 + officeHours.endTime.getMinutes();

    return currentTime >= startTime && currentTime <= endTime;

  } catch (error) {
    console.error('Error checking office hours:', error);
    return false;
  }
}
