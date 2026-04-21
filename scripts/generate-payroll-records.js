const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Helper function to generate random integers
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to generate random decimal
function randomDecimal(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// Helper function to get month name
function getMonthName(monthIndex) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[monthIndex];
}

async function generatePayrollRecords() {
  console.log("🌱 Generating payroll records...");

  // Get all employees with their salary structures
  const employees = await prisma.employee.findMany({
    include: {
      currentSalary: {
        where: {
          effectiveTo: null, // Get active salary structures
        },
      },
    },
  });

  if (employees.length === 0) {
    console.log("❌ No employees found. Please seed employees first.");
    return;
  }

  // Generate payroll records for the last 6 months
  const currentDate = new Date();
  const startMonth = currentDate.getMonth() - 5; // 6 months including current
  const startYear = currentDate.getFullYear();

  // For each employee, generate payroll records
  for (const employee of employees) {
    console.log(
      `Generating payroll records for ${employee.firstName} ${employee.lastName}...`
    );

    // If employee doesn't have a salary structure, create a basic one
    let salaryStructure = employee.currentSalary[0];
    if (!salaryStructure) {
      console.log(
        `No salary structure found for ${employee.firstName} ${employee.lastName}, creating one...`
      );

      // Create a basic salary structure
      const basicSalary = randomDecimal(3000, 8000);
      const hra = basicSalary * 0.4; // 40% of basic
      const transport = 1600; // Fixed transport allowance
      const medical = 1250; // Fixed medical allowance
      const special = basicSalary * 0.1; // 10% of basic
      const grossSalary = basicSalary + hra + transport + medical + special;

      // Deductions
      const pf = basicSalary * 0.12; // 12% of basic
      const pt = 200; // Profession tax
      const totalDeductions = pf + pt;
      const netSalary = grossSalary - totalDeductions;

      salaryStructure = await prisma.employeeSalaryStructure.create({
        data: {
          employeeId: employee.id,
          basicSalary: basicSalary,
          allowances: {
            hra: hra,
            transport: transport,
            medical: medical,
            special: special,
          },
          deductions: {
            pf: pf,
            pt: pt,
          },
          grossSalary: grossSalary,
          netSalary: netSalary,
          effectiveFrom: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 6,
            1
          ),
          createdBy: employee.id,
          ctc: grossSalary * 12 * 1.2, // CTC with some benefits
        },
      });
    }

    // Generate payroll records for each month
    for (let i = 0; i < 6; i++) {
      const month = (startMonth + i) % 12;
      const year = startMonth + i < 0 ? startYear - 1 : startYear;

      // Skip if payroll record already exists for this month/year
      const existingRecord = await prisma.payrollRecord.findUnique({
        where: {
          employeeId_month_year: {
            employeeId: employee.id,
            month: month + 1,
            year: year,
          },
        },
      });

      if (existingRecord) {
        console.log(
          `Payroll record already exists for ${getMonthName(month)} ${year}`
        );
        continue;
      }

      // Generate working days (assume 20-22 working days in a month)
      const workingDays = randomInt(20, 22);

      // Generate present days (90-100% of working days)
      const presentDays = Math.min(
        randomInt(Math.floor(workingDays * 0.9), workingDays),
        workingDays
      );

      // Calculate absent and leave days
      const absentDays = workingDays - presentDays;
      const leaveDays = randomInt(0, Math.min(3, absentDays));
      const actualAbsentDays = absentDays - leaveDays;

      // Calculate overtime hours (0-10 hours)
      const overtimeHours = randomDecimal(0, 10);

      // Get salary components
      const basicPay = salaryStructure.basicSalary;

      // Parse allowances and deductions if they are strings (JSON)
      let allowances = salaryStructure.allowances;
      let deductions = salaryStructure.deductions;

      if (typeof allowances === "string") {
        allowances = JSON.parse(allowances);
      }

      if (typeof deductions === "string") {
        deductions = JSON.parse(deductions);
      }

      // Calculate gross pay (pro-rated based on present days)
      const dailyBasic = basicPay / workingDays;
      const proRatedBasic = dailyBasic * presentDays;

      // Pro-rate allowances
      const proRatedHra = ((allowances.hra || 0) / workingDays) * presentDays;
      const proRatedTransport =
        ((allowances.transport || 0) / workingDays) * presentDays;
      const proRatedMedical =
        ((allowances.medical || 0) / workingDays) * presentDays;
      const proRatedSpecial =
        ((allowances.special || 0) / workingDays) * presentDays;

      const grossPay =
        proRatedBasic +
        proRatedHra +
        proRatedTransport +
        proRatedMedical +
        proRatedSpecial;

      // Calculate overtime pay (assuming 1.5x hourly rate for overtime)
      const hourlyRate = basicPay / (workingDays * 8); // Assuming 8 hours per day
      const overtimePay = overtimeHours * hourlyRate * 1.5;

      // Bonuses and penalties
      const bonuses = randomDecimal(0, 500);
      const penalties = randomDecimal(0, 200);

      // Calculate total earnings
      const totalEarnings = grossPay + overtimePay + bonuses - penalties;

      // Pro-rate deductions
      const proRatedPf = ((deductions.pf || 0) / workingDays) * presentDays;
      const proRatedPt = ((deductions.pt || 0) / workingDays) * presentDays;

      // Other deductions
      const providentFund = proRatedPf;
      const professionalTax = proRatedPt;
      const esi = randomDecimal(0, 100); // Employee State Insurance

      const totalDeductions = providentFund + professionalTax + esi;

      // Calculate net pay
      const netPay = totalEarnings - totalDeductions;

      // Pay period dates
      const payPeriodStart = new Date(year, month, 1);
      const payPeriodEnd = new Date(year, month + 1, 0); // Last day of month

      try {
        await prisma.payrollRecord.create({
          data: {
            employeeId: employee.id,
            salaryStructureId: salaryStructure.id,
            month: month + 1,
            year: year,
            payPeriodStart: payPeriodStart,
            payPeriodEnd: payPeriodEnd,
            workingDays: workingDays,
            presentDays: presentDays,
            absentDays: actualAbsentDays,
            overtimeHours: overtimeHours,
            leaveDays: leaveDays,
            basicPay: proRatedBasic,
            allowances: {
              hra: proRatedHra || 0,
              transport: proRatedTransport || 0,
              medical: proRatedMedical || 0,
              special: proRatedSpecial || 0,
            },
            grossPay: grossPay || 0,
            deductions: {
              providentFund: providentFund || 0,
              professionalTax: professionalTax || 0,
              esi: esi || 0,
            },
            overtimePay: overtimePay || 0,
            bonuses: bonuses || 0,
            penalties: penalties || 0,
            totalEarnings: totalEarnings || 0,
            totalDeductions: totalDeductions || 0,
            netPay: netPay || 0,
            taxableIncome: netPay || 0,
            incomeTax: randomDecimal(0, (netPay || 0) * 0.2) || 0,
            professionalTax: professionalTax || 0,
            providentFund: providentFund || 0,
            esi: esi || 0,
            status: "PROCESSED",
            processedAt: new Date(),
            processedBy: employee.id,
          },
        });

        console.log(
          `✅ Generated payroll record for ${getMonthName(month)} ${year}`
        );
      } catch (error) {
        console.error("Error creating payroll record:", error);
      }
    }
  }

  console.log("✅ Payroll records generation completed!");
}

async function main() {
  try {
    await generatePayrollRecords();
  } catch (error) {
    console.error("Error in main execution:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
