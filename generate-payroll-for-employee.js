const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function generatePayrollForEmployee() {
  try {
    // Find the employee by email
    const employee = await prisma.employee.findFirst({
      where: {
        user: {
          email: "khurram.iiui@yahoo.com",
        },
      },
      include: {
        user: true,
        currentSalary: true,
      },
    });

    if (!employee) {
      console.log("Employee not found with email: khurram.iiui@yahoo.com");
      return;
    }

    console.log("Employee found:");
    console.log("ID:", employee.id);
    console.log("Name:", employee.firstName, employee.lastName);

    // Check if employee has a salary structure
    if (!employee.currentSalary || employee.currentSalary.length === 0) {
      console.log("Employee does not have a salary structure");
      return;
    }

    const salaryStructure = employee.currentSalary[0];
    console.log("Using salary structure ID:", salaryStructure.id);

    // Generate payroll records for the last 6 months
    const currentDate = new Date();
    const startMonth = currentDate.getMonth() - 5; // 6 months including current
    const startYear = currentDate.getFullYear();

    console.log("\nGenerating payroll records for the last 6 months...");

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
        console.log(`Payroll record already exists for ${month + 1}/${year}`);
        continue;
      }

      // Generate working days (assume 20-22 working days in a month)
      const workingDays = Math.floor(Math.random() * 3) + 20; // 20-22 days

      // Generate present days (90-100% of working days)
      const presentDays = Math.min(
        Math.floor(Math.random() * Math.floor(workingDays * 0.1)) +
          Math.floor(workingDays * 0.9),
        workingDays
      );

      // Calculate absent and leave days
      const absentDays = workingDays - presentDays;
      const leaveDays = Math.floor(Math.random() * Math.min(3, absentDays));
      const actualAbsentDays = absentDays - leaveDays;

      // Calculate overtime hours (0-10 hours)
      const overtimeHours = Math.random() * 10;

      // Get salary components
      const basicPay = Number(salaryStructure.basicSalary);

      // Parse allowances and deductions if they are strings (JSON)
      let allowances = salaryStructure.allowances;
      let deductions = salaryStructure.deductions;

      if (typeof allowances === "string") {
        allowances = JSON.parse(allowances);
      }

      if (typeof deductions === "string") {
        deductions = JSON.parse(deductions);
      }

      // Pro-rate salary components based on attendance
      const proRatedBasic = (basicPay / workingDays) * presentDays;

      // Pro-rate allowances
      const proRatedHra = ((allowances.hra || 0) / workingDays) * presentDays;
      const proRatedTransport =
        ((allowances.transport || 0) / workingDays) * presentDays;
      const proRatedMedical =
        ((allowances.medical || 0) / workingDays) * presentDays;
      const proRatedSpecial =
        ((allowances.special || 0) / workingDays) * presentDays;

      // Calculate gross pay
      const grossPay =
        proRatedBasic +
        proRatedHra +
        proRatedTransport +
        proRatedMedical +
        proRatedSpecial;

      // Calculate overtime pay (assuming 1.5x hourly rate)
      const hourlyRate = basicPay / (workingDays * 8); // Assuming 8 hours per day
      const overtimePay = overtimeHours * hourlyRate * 1.5;

      // Bonuses and penalties
      const bonuses = Math.random() * 500; // Random bonus up to 500
      const penalties = Math.random() * 200; // Random penalty up to 200

      // Pro-rate deductions
      const proRatedPf = ((deductions.pf || 0) / workingDays) * presentDays;
      const proRatedPt = ((deductions.pt || 0) / workingDays) * presentDays;
      const proRatedTax = ((deductions.tax || 0) / workingDays) * presentDays;

      // Other deductions
      const providentFund = proRatedPf;
      const professionalTax = proRatedPt;
      const incomeTax = proRatedTax;
      const esi = Math.random() * 100; // Employee State Insurance

      const totalDeductions =
        providentFund + professionalTax + incomeTax + esi + penalties;

      // Calculate net pay
      const totalEarnings = grossPay + overtimePay + bonuses;
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
              incomeTax: incomeTax || 0,
              esi: esi || 0,
              penalties: penalties || 0,
            },
            overtimePay: overtimePay || 0,
            bonuses: bonuses || 0,
            penalties: penalties || 0,
            totalEarnings: totalEarnings || 0,
            totalDeductions: totalDeductions || 0,
            netPay: netPay || 0,
            taxableIncome: netPay || 0,
            incomeTax: incomeTax || 0,
            professionalTax: professionalTax || 0,
            providentFund: providentFund || 0,
            esi: esi || 0,
            status: "PROCESSED",
            processedAt: new Date(),
            processedBy: employee.id,
          },
        });

        console.log(`✅ Generated payroll record for ${month + 1}/${year}`);
      } catch (error) {
        console.error("Error creating payroll record:", error);
      }
    }

    console.log("\nPayroll records generated successfully for employee!");
  } catch (error) {
    console.error("Error generating payroll for employee:", error);
  } finally {
    await prisma.$disconnect();
  }
}

generatePayrollForEmployee();
