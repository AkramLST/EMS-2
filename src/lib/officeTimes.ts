import { prisma } from './prisma';

export async function getOfficeTimes() {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) console.log('🔍 getOfficeTimes called');
  
  const times = await prisma.officeTime.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  console.log('📊 [officeTimes] Raw database result:', times);
  console.log('📊 [officeTimes] Environment:', process.env.NODE_ENV);
  console.log('📊 [officeTimes] Database URL exists:', !!process.env.DATABASE_URL);

  // Return default times as Pakistan time strings if no records found
  if (!times) {
    console.log('⚠️ [officeTimes] No records found, returning defaults');
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

  console.log('📋 [officeTimes] Database record:', times);
  console.log('📋 [officeTimes] Raw UTC times:', {
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
  console.log('✅ [officeTimes] Pakistan time result:', result);

  return result;
}
