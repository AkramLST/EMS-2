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

async function generateLeaveRecords() {
  console.log("🌱 Generating leave records...");

  // Get all employees
  const employees = await prisma.employee.findMany();

  if (employees.length === 0) {
    console.log("❌ No employees found. Please seed employees first.");
    return;
  }

  // Get all leave types
  const leaveTypes = await prisma.leaveType.findMany();

  if (leaveTypes.length === 0) {
    console.log("❌ No leave types found. Please seed leave types first.");
    return;
  }

  // For each employee, generate leave applications
  for (const employee of employees) {
    console.log(
      `Generating leave records for ${employee.firstName} ${employee.lastName}...`
    );

    // Generate 1-5 leave applications per employee
    const numLeaves = randomInt(1, 5);

    for (let i = 0; i < numLeaves; i++) {
      // Select a random leave type
      const leaveType =
        leaveTypes[Math.floor(Math.random() * leaveTypes.length)];

      // Generate random start date (within last 6 months)
      const startDate = randomDate(
        new Date(new Date().setMonth(new Date().getMonth() - 6)),
        new Date()
      );

      // Generate random end date (1-5 days after start date)
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + randomInt(1, 5));

      // Calculate total days
      const timeDiff = endDate.getTime() - startDate.getTime();
      const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

      // Random status with weights
      const statusWeights = [
        { status: "APPROVED", weight: 70 },
        { status: "PENDING", weight: 15 },
        { status: "REJECTED", weight: 10 },
        { status: "CANCELLED", weight: 5 },
      ];

      let status = "APPROVED";
      const rand = Math.random() * 100;
      let cumulativeWeight = 0;

      for (const weight of statusWeights) {
        cumulativeWeight += weight.weight;
        if (rand <= cumulativeWeight) {
          status = weight.status;
          break;
        }
      }

      // Generate reason
      const reasons = [
        "Personal vacation",
        "Family emergency",
        "Medical appointment",
        "Home relocation",
        "Personal matters",
        "Rest and relaxation",
        "Attending conference",
        "Family function",
      ];

      const reason = reasons[Math.floor(Math.random() * reasons.length)];

      // Randomly assign approver (department manager or HR)
      const whereClause = {
        OR: [],
      };

      // Add manager condition only if employee has a manager
      if (employee.managerId) {
        whereClause.OR.push({ id: employee.managerId });
      }

      // Always add HR manager condition
      whereClause.OR.push({ user: { role: "HR_MANAGER" } });

      const approvers = await prisma.employee.findMany({
        where: whereClause,
      });

      let approvedBy = null;
      let approvedAt = null;
      let rejectedAt = null;

      if (status === "APPROVED" && approvers.length > 0) {
        const approver =
          approvers[Math.floor(Math.random() * approvers.length)];
        approvedBy = approver.userId;
        approvedAt = new Date(
          startDate.getTime() - randomInt(1, 7) * 24 * 60 * 60 * 1000
        ); // 1-7 days before start
      } else if (status === "REJECTED" && approvers.length > 0) {
        const approver =
          approvers[Math.floor(Math.random() * approvers.length)];
        approvedBy = approver.userId;
        rejectedAt = new Date(
          startDate.getTime() - randomInt(1, 3) * 24 * 60 * 60 * 1000
        ); // 1-3 days before start
      }

      try {
        const leaveApplication = await prisma.leaveApplication.create({
          data: {
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            startDate: startDate,
            endDate: endDate,
            totalDays: totalDays,
            reason: reason,
            status: status,
            appliedAt: new Date(
              startDate.getTime() - randomInt(3, 14) * 24 * 60 * 60 * 1000
            ), // 3-14 days before start
            approvedBy: approvedBy,
            approvedAt: approvedAt,
            rejectedAt: rejectedAt,
          },
        });

        console.log(
          `✅ Generated ${status} leave application for ${employee.firstName} ${employee.lastName}`
        );

        // Create leave balance if it doesn't exist
        const year = startDate.getFullYear();
        const existingBalance = await prisma.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: employee.id,
              leaveTypeId: leaveType.id,
              year: year,
            },
          },
        });

        if (!existingBalance) {
          await prisma.leaveBalance.create({
            data: {
              employeeId: employee.id,
              leaveTypeId: leaveType.id,
              year: year,
              allocated: leaveType.maxDaysPerYear,
              used: status === "APPROVED" ? totalDays : 0,
              remaining:
                leaveType.maxDaysPerYear -
                (status === "APPROVED" ? totalDays : 0),
              carryForward: 0,
            },
          });
        } else if (status === "APPROVED") {
          // Update existing balance
          await prisma.leaveBalance.update({
            where: { id: existingBalance.id },
            data: {
              used: existingBalance.used + totalDays,
              remaining: existingBalance.remaining - totalDays,
            },
          });
        }
      } catch (error) {
        console.error("Error creating leave application:", error);
      }
    }
  }

  console.log("✅ Leave records generation completed!");
}

async function main() {
  try {
    await generateLeaveRecords();
  } catch (error) {
    console.error("Error in main execution:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
