import { Prisma } from "@prisma/client";

interface MarkLeaveAttendanceParams {
  tx: Prisma.TransactionClient;
  employeeId: string;
  startDate: Date;
  endDate: Date;
  leaveApplicationId: string;
}

function getDatesInRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= end.getTime()) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export async function markAttendanceAsLeave({
  tx,
  employeeId,
  startDate,
  endDate,
  leaveApplicationId,
}: MarkLeaveAttendanceParams): Promise<void> {
  const dates = getDatesInRange(startDate, endDate);
  const leaveStatus = "ON_LEAVE" as any;

  for (const date of dates) {
    const createData = {
      employeeId,
      date,
      status: leaveStatus,
      clockIn: null,
      clockOut: null,
      breakTime: null,
      totalHours: null,
      overtime: null,
      notes: null,
      clockInLatitude: null,
      clockInLongitude: null,
      clockInLocation: null,
      clockInLocationSource: null,
      leaveApplicationId,
    } as any;

    const updateData = {
      status: leaveStatus,
      clockIn: null,
      clockOut: null,
      breakTime: null,
      totalHours: null,
      overtime: null,
      notes: null,
      clockInLatitude: null,
      clockInLongitude: null,
      clockInLocation: null,
      clockInLocationSource: null,
      leaveApplicationId,
    } as any;

    await tx.attendanceRecord.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date,
        },
      },
      create: createData,
      update: updateData,
    });
  }
}
