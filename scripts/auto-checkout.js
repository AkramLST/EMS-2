// Auto checkout script that runs at midnight to check out employees who forgot
// Uses office hours from database instead of hardcoded values

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getOfficeHoursFromDb() {
  try {
    const officeTime = await prisma.officeTime.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!officeTime) {
      console.warn('No office hours configured in database');
      return null;
    }

    return officeTime;
  } catch (error) {
    console.error('Error fetching office hours:', error);
    return null;
  }
}

function calculateWorkingHours(clockIn, clockOut, breakTime = 0) {
  const diffMs = clockOut.getTime() - clockIn.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.max(0, diffHours - breakTime / 60);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

async function autoCheckout() {
  try {
    console.log('Running auto-checkout process...');

    const today = startOfDay(new Date());
    const previousDay = startOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000));
    const previousDayEnd = endOfDay(previousDay);
    const tomorrow = endOfDay(today);

    const officeHours = await getOfficeHoursFromDb();
    const officeStartMinutes = officeHours
      ? officeHours.startTime.getHours() * 60 + officeHours.startTime.getMinutes()
      : 9 * 60;
    const officeEndMinutes = officeHours
      ? officeHours.endTime.getHours() * 60 + officeHours.endTime.getMinutes()
      : 18 * 60;

    const openAttendances = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          lt: today,
        },
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

    console.log(`Found ${openAttendances.length} attendance records without checkout`);

    for (const attendance of openAttendances) {
      const attendanceDate = startOfDay(attendance.date);
      const recordDayLabel = attendanceDate.toISOString().split('T')[0];

      const targetClockOut = new Date(attendanceDate);
      targetClockOut.setHours(Math.floor(officeEndMinutes / 60), officeEndMinutes % 60, 0, 0);

      const finalClockOut = targetClockOut;

      const totalHours = calculateWorkingHours(new Date(attendance.clockIn), finalClockOut);

      const overtimeHours = Math.max(0, totalHours - (officeEndMinutes - officeStartMinutes) / 60);

      const updatedNotes = attendance.notes || "";
      const autoTag = `[Auto Checkout] Automatically clocked out at ${finalClockOut.toISOString()}`;

      const mergedNotes = updatedNotes.includes("[Auto Checkout]")
        ? updatedNotes
        : updatedNotes
        ? `${updatedNotes}\n${autoTag}`
        : autoTag;

      await prisma.attendanceRecord.update({
        where: { id: attendance.id },
        data: {
          clockOut: finalClockOut,
          totalHours,
          overtime: overtimeHours > 0 ? overtimeHours : undefined,
          notes: mergedNotes,
        },
      });

      console.log(
        `Auto-checked out ${attendance.employee.firstName} ${attendance.employee.lastName} (${attendance.employee.employeeId}) for ${recordDayLabel} at ${finalClockOut.toISOString()}`
      );
    }

    const missingTagAttendances = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          lt: today,
        },
        clockIn: {
          not: null,
        },
        clockOut: {
          not: null,
        },
        OR: [
          { notes: null },
          { notes: { not: { contains: "[Auto Checkout]" } } },
        ],
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

    for (const attendance of missingTagAttendances) {
      const attendanceDate = startOfDay(attendance.date);
      const targetClockOut = new Date(attendanceDate);
      targetClockOut.setHours(Math.floor(officeEndMinutes / 60), officeEndMinutes % 60, 0, 0);

      const existingClockOut = attendance.clockOut ? new Date(attendance.clockOut) : null;

      if (!existingClockOut || existingClockOut.getTime() !== targetClockOut.getTime()) {
        continue;
      }

      const updatedNotes = attendance.notes || "";
      const autoTag = `[Auto Checkout] Automatically clocked out at ${targetClockOut.toISOString()}`;

      if (updatedNotes.includes("[Auto Checkout]")) {
        continue;
      }

      const mergedNotes = updatedNotes
        ? `${updatedNotes}\n${autoTag}`
        : autoTag;

      await prisma.attendanceRecord.update({
        where: { id: attendance.id },
        data: {
          notes: mergedNotes,
        },
      });

      console.log(
        `Tagged ${attendance.employee.firstName} ${attendance.employee.lastName} (${attendance.employee.employeeId}) as auto checkout for ${attendanceDate
          .toISOString()
          .split('T')[0]}`
      );
    }

    // Mark employees as absent if they didn't check in at all
    const allEmployees = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
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

    const attendedIds = attendedEmployeeIds.map(a => a.employeeId);
    const absentEmployees = allEmployees.filter(emp => !attendedIds.includes(emp.id));

    // Create absent records for employees who didn't check in
    for (const employee of absentEmployees) {
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
        console.log(
          `Skipping absent record for ${employee.firstName} ${employee.lastName} (${employee.employeeId}) - record already exists`
        );
        continue;
      }

      await prisma.attendanceRecord.create({
        data: {
          employeeId: employee.id,
          date: previousDay,
          status: 'ABSENT',
          clockIn: null,
          clockOut: null,
        },
      });

      console.log(
        `Marked ${employee.firstName} ${employee.lastName} (${employee.employeeId}) as absent`
      );
    }

    console.log('Auto-checkout process completed successfully');
  } catch (error) {
    console.error('Error in auto-checkout process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the auto-checkout process
autoCheckout();
