const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Helper function to generate random dates
function randomDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

// Helper function to generate random integers
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to generate random decimal
function randomDecimal(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

async function generateAttendanceRecords() {
  console.log("🌱 Generating attendance records...");

  // Get all employees
  const employees = await prisma.employee.findMany();

  if (employees.length === 0) {
    console.log("❌ No employees found. Please seed employees first.");
    return;
  }

  // Generate attendance records for the last 6 months
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  const endDate = new Date();

  // For each employee, generate attendance records
  for (const employee of employees) {
    console.log(
      `Generating attendance records for ${employee.firstName} ${employee.lastName}...`
    );

    // Generate records for each day in the period
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        // 90% chance of having an attendance record for working days
        if (Math.random() < 0.9) {
          // Random status with weights
          const statusWeights = [
            { status: "PRESENT", weight: 80 },
            { status: "LATE", weight: 10 },
            { status: "EARLY_DEPARTURE", weight: 5 },
            { status: "HALF_DAY", weight: 3 },
            { status: "ABSENT", weight: 2 },
          ];

          let status = "PRESENT";
          const rand = Math.random() * 100;
          let cumulativeWeight = 0;

          for (const weight of statusWeights) {
            cumulativeWeight += weight.weight;
            if (rand <= cumulativeWeight) {
              status = weight.status;
              break;
            }
          }

          // Generate clock in/out times based on status
          let clockIn = null;
          let clockOut = null;
          let totalHours = null;
          let breakTime = null;

          if (status !== "ABSENT") {
            // Normal working hours: 9 AM to 6 PM
            const workStartHour = 9;
            const workEndHour = 18;

            if (status === "LATE") {
              // Clock in between 9:30 AM and 11 AM
              const lateMinutes = randomInt(30, 120);
              clockIn = new Date(currentDate);
              clockIn.setHours(workStartHour, lateMinutes, 0, 0);
            } else if (status === "EARLY_DEPARTURE") {
              // Clock out between 3 PM and 5:30 PM
              const earlyMinutes = randomInt(0, 150);
              clockOut = new Date(currentDate);
              clockOut.setHours(workEndHour - 3, earlyMinutes, 0, 0);
              // Also set clock in time
              clockIn = new Date(currentDate);
              clockIn.setHours(workStartHour, randomInt(0, 30), 0, 0);
            } else {
              // Normal clock in time (9 AM +/- 30 minutes)
              const inMinutes = randomInt(0, 30);
              clockIn = new Date(currentDate);
              clockIn.setHours(workStartHour, inMinutes, 0, 0);

              // Normal clock out time (6 PM +/- 30 minutes)
              const outMinutes = randomInt(0, 30);
              clockOut = new Date(currentDate);
              clockOut.setHours(workEndHour, outMinutes, 0, 0);
            }

            // Calculate total hours
            if (clockIn && clockOut) {
              const diffMs = clockOut - clockIn;
              totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

              // Subtract break time (30-60 minutes)
              breakTime = randomInt(30, 60);
              totalHours = parseFloat((totalHours - breakTime / 60).toFixed(2));

              // Ensure minimum hours for half day
              if (status === "HALF_DAY") {
                totalHours = randomDecimal(3, 5);
              }
            }
          }

          try {
            await prisma.attendanceRecord.create({
              data: {
                employeeId: employee.id,
                date: new Date(currentDate),
                clockIn: clockIn,
                clockOut: clockOut,
                breakTime: breakTime,
                totalHours: totalHours,
                overtime:
                  status === "PRESENT" && totalHours > 8
                    ? randomDecimal(0, 3)
                    : 0,
                status: status,
                notes: status !== "PRESENT" ? `Marked as ${status}` : null,
              },
            });
          } catch (error) {
            console.error("Error creating attendance record:", error);
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  console.log("✅ Attendance records generation completed!");
}

async function main() {
  try {
    await generateAttendanceRecords();
  } catch (error) {
    console.error("Error in main execution:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
