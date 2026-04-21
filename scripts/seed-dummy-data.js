const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

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

async function seedDepartments() {
  console.log("🌱 Seeding departments...");

  const departments = [
    {
      name: "Human Resources",
      description: "HR management and employee relations",
    },
    {
      name: "Engineering",
      description: "Software development and technical operations",
    },
    { name: "Marketing", description: "Marketing and brand management" },
    {
      name: "Sales",
      description: "Sales and customer relationship management",
    },
    { name: "Finance", description: "Financial planning and accounting" },
    { name: "Operations", description: "Day-to-day business operations" },
    { name: "IT Support", description: "Technical support and infrastructure" },
    { name: "Legal", description: "Legal affairs and compliance" },
  ];

  const createdDepartments = [];
  for (const deptData of departments) {
    const existingDept = await prisma.department.findFirst({
      where: { name: deptData.name },
    });

    if (!existingDept) {
      const dept = await prisma.department.create({
        data: deptData,
      });
      createdDepartments.push(dept);
      console.log(`✅ Created department: ${dept.name}`);
    } else {
      createdDepartments.push(existingDept);
      console.log(`⏭️  Department already exists: ${deptData.name}`);
    }
  }

  console.log("✅ Departments seeding completed!");
  return createdDepartments;
}

// New function to seed designations
async function seedDesignations() {
  console.log("🌱 Seeding designations...");

  const designations = [
    {
      title: "Software Engineer",
      description: "Develops and maintains software applications",
    },
    {
      title: "Senior Software Engineer",
      description: "Leads software development projects",
    },
    { title: "Manager", description: "Manages teams and departments" },
    { title: "HR Manager", description: "Manages human resources functions" },
    {
      title: "Marketing Specialist",
      description: "Handles marketing campaigns and activities",
    },
    {
      title: "Sales Executive",
      description: "Manages sales and client relationships",
    },
    {
      title: "Finance Analyst",
      description: "Handles financial planning and analysis",
    },
    {
      title: "IT Support Specialist",
      description: "Provides technical support to employees",
    },
  ];

  const createdDesignations = [];
  for (const designationData of designations) {
    const existingDesignation = await prisma.designation.findFirst({
      where: { title: designationData.title },
    });

    if (!existingDesignation) {
      const designation = await prisma.designation.create({
        data: designationData,
      });
      createdDesignations.push(designation);
      console.log(`✅ Created designation: ${designation.title}`);
    } else {
      createdDesignations.push(existingDesignation);
      console.log(`⏭️  Designation already exists: ${designationData.title}`);
    }
  }

  console.log("✅ Designations seeding completed!");
  return createdDesignations;
}

async function seedUsersAndEmployees(departments, designations) {
  console.log("🌱 Seeding users and employees...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      email: "admin@company.com",
      password: adminPassword,
      role: "ADMINISTRATOR",
      isFirstLogin: false,
    },
  });

  // Create roles for the admin user
  await prisma.userRole.createMany({
    data: [
      { userId: adminUser.id, role: "ADMINISTRATOR" },
      { userId: adminUser.id, role: "HR_MANAGER" },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create HR manager
  const hrPassword = await bcrypt.hash("hr123", 10);
  const hrUser = await prisma.user.upsert({
    where: { email: "hr@company.com" },
    update: {},
    create: {
      email: "hr@company.com",
      password: hrPassword,
      role: "HR_MANAGER",
      isFirstLogin: false,
    },
  });

  await prisma.userRole.createMany({
    data: [{ userId: hrUser.id, role: "HR_MANAGER" }],
    skipDuplicates: true,
  });

  console.log(`✅ Created HR user: ${hrUser.email}`);

  // Create department managers
  const managers = [];
  const managerNames = [
    {
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@company.com",
      departmentIndex: 1,
      designationIndex: 2, // Manager
    },
    {
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@company.com",
      departmentIndex: 2,
      designationIndex: 2, // Manager
    },
    {
      firstName: "Michael",
      lastName: "Brown",
      email: "michael.brown@company.com",
      departmentIndex: 3,
      designationIndex: 2, // Manager
    },
    {
      firstName: "Emily",
      lastName: "Davis",
      email: "emily.davis@company.com",
      departmentIndex: 4,
      designationIndex: 2, // Manager
    },
  ];

  for (let i = 0; i < managerNames.length; i++) {
    const managerData = managerNames[i];
    const password = await bcrypt.hash("manager123", 10);

    const user = await prisma.user.upsert({
      where: { email: managerData.email },
      update: {},
      create: {
        email: managerData.email,
        password: password,
        role: "DEPARTMENT_MANAGER",
        isFirstLogin: false,
      },
    });

    await prisma.userRole.createMany({
      data: [{ userId: user.id, role: "DEPARTMENT_MANAGER" }],
      skipDuplicates: true,
    });

    const employeeId = `EMP${String(i + 1001).padStart(4, "0")}`;
    const employee = await prisma.employee.upsert({
      where: { email: managerData.email },
      update: {},
      create: {
        employeeId: employeeId,
        userId: user.id,
        firstName: managerData.firstName,
        lastName: managerData.lastName,
        email: managerData.email,
        designationId: designations[managerData.designationIndex].id,
        departmentId: departments[managerData.departmentIndex].id,
        employmentType: "FULL_TIME",
        joinDate: randomDate(new Date(2020, 0, 1), new Date(2023, 11, 31)),
        status: "ACTIVE",
      },
    });

    managers.push({ user, employee });
    console.log(
      `✅ Created manager: ${managerData.firstName} ${managerData.lastName}`
    );
  }

  // Create regular employees
  const employees = [];
  const employeeNames = [
    {
      firstName: "Alice",
      lastName: "Wilson",
      email: "alice.wilson@company.com",
      departmentIndex: 1,
      designationIndex: 0, // Software Engineer
    },
    {
      firstName: "Bob",
      lastName: "Miller",
      email: "bob.miller@company.com",
      departmentIndex: 1,
      designationIndex: 0, // Software Engineer
    },
    {
      firstName: "Carol",
      lastName: "Moore",
      email: "carol.moore@company.com",
      departmentIndex: 2,
      designationIndex: 4, // Marketing Specialist
    },
    {
      firstName: "David",
      lastName: "Taylor",
      email: "david.taylor@company.com",
      departmentIndex: 2,
      designationIndex: 4, // Marketing Specialist
    },
    {
      firstName: "Eva",
      lastName: "Anderson",
      email: "eva.anderson@company.com",
      departmentIndex: 3,
      designationIndex: 5, // Sales Executive
    },
    {
      firstName: "Frank",
      lastName: "Thomas",
      email: "frank.thomas@company.com",
      departmentIndex: 3,
      designationIndex: 5, // Sales Executive
    },
    {
      firstName: "Grace",
      lastName: "Jackson",
      email: "grace.jackson@company.com",
      departmentIndex: 4,
      designationIndex: 6, // Finance Analyst
    },
    {
      firstName: "Henry",
      lastName: "White",
      email: "henry.white@company.com",
      departmentIndex: 4,
      designationIndex: 6, // Finance Analyst
    },
    {
      firstName: "Ivy",
      lastName: "Harris",
      email: "ivy.harris@company.com",
      departmentIndex: 5,
      designationIndex: 7, // IT Support Specialist
    },
    {
      firstName: "Jack",
      lastName: "Martin",
      email: "jack.martin@company.com",
      departmentIndex: 5,
      designationIndex: 7, // IT Support Specialist
    },
    {
      firstName: "Kate",
      lastName: "Thompson",
      email: "kate.thompson@company.com",
      departmentIndex: 6,
      designationIndex: 1, // Senior Software Engineer
    },
    {
      firstName: "Liam",
      lastName: "Garcia",
      email: "liam.garcia@company.com",
      departmentIndex: 6,
      designationIndex: 1, // Senior Software Engineer
    },
    {
      firstName: "Mia",
      lastName: "Martinez",
      email: "mia.martinez@company.com",
      departmentIndex: 7,
      designationIndex: 3, // HR Manager
    },
    {
      firstName: "Noah",
      lastName: "Robinson",
      email: "noah.robinson@company.com",
      departmentIndex: 7,
      designationIndex: 3, // HR Manager
    },
    {
      firstName: "Olivia",
      lastName: "Clark",
      email: "olivia.clark@company.com",
      departmentIndex: 0,
      designationIndex: 0, // Software Engineer
    },
    {
      firstName: "Paul",
      lastName: "Rodriguez",
      email: "paul.rodriguez@company.com",
      departmentIndex: 0,
      designationIndex: 0, // Software Engineer
    },
  ];

  for (let i = 0; i < employeeNames.length; i++) {
    const empData = employeeNames[i];
    const password = await bcrypt.hash("employee123", 10);

    const user = await prisma.user.upsert({
      where: { email: empData.email },
      update: {},
      create: {
        email: empData.email,
        password: password,
        role: "EMPLOYEE",
        isFirstLogin: false,
      },
    });

    await prisma.userRole.createMany({
      data: [{ userId: user.id, role: "EMPLOYEE" }],
      skipDuplicates: true,
    });

    const employeeId = `EMP${String(i + 2001).padStart(4, "0")}`;
    const employee = await prisma.employee.upsert({
      where: { email: empData.email },
      update: {},
      create: {
        employeeId: employeeId,
        userId: user.id,
        firstName: empData.firstName,
        lastName: empData.lastName,
        email: empData.email,
        designationId: designations[empData.designationIndex].id,
        departmentId: departments[empData.departmentIndex].id,
        managerId:
          managers[empData.departmentIndex % managers.length].employee.id,
        employmentType: "FULL_TIME",
        joinDate: randomDate(new Date(2021, 0, 1), new Date(2024, 5, 30)),
        status: "ACTIVE",
        phone: `+1-${randomInt(100, 999)}-${randomInt(100, 999)}-${randomInt(
          1000,
          9999
        )}`,
        dateOfBirth: randomDate(new Date(1980, 0, 1), new Date(1995, 11, 31)),
        gender: ["MALE", "FEMALE"][i % 2],
        maritalStatus: ["SINGLE", "MARRIED"][i % 2],
        address: `${randomInt(100, 999)} Main Street`,
        city: "New York",
        state: "NY",
        country: "USA",
        postalCode: `${randomInt(10000, 99999)}`,
      },
    });

    employees.push({ user, employee });
    console.log(
      `✅ Created employee: ${empData.firstName} ${empData.lastName}`
    );
  }

  console.log("✅ Users and employees seeding completed!");
  return { adminUser, hrUser, managers, employees };
}

async function seedLeaveTypes() {
  console.log("🌱 Seeding leave types...");

  const leaveTypes = [
    {
      name: "Annual Leave",
      description: "Paid time off for vacation and personal use",
      maxDaysPerYear: 20,
      carryForward: true,
      encashable: true,
    },
    {
      name: "Sick Leave",
      description: "Paid leave for illness or medical appointments",
      maxDaysPerYear: 12,
      carryForward: false,
      encashable: false,
    },
    {
      name: "Maternity Leave",
      description: "Leave for childbirth and care",
      maxDaysPerYear: 90,
      carryForward: false,
      encashable: false,
    },
    {
      name: "Paternity Leave",
      description: "Leave for newborn care",
      maxDaysPerYear: 15,
      carryForward: false,
      encashable: false,
    },
    {
      name: "Bereavement Leave",
      description: "Leave for family bereavement",
      maxDaysPerYear: 5,
      carryForward: false,
      encashable: false,
    },
  ];

  const createdLeaveTypes = [];
  for (const leaveTypeData of leaveTypes) {
    const existingLeaveType = await prisma.leaveType.findFirst({
      where: { name: leaveTypeData.name },
    });

    if (!existingLeaveType) {
      const leaveType = await prisma.leaveType.create({
        data: leaveTypeData,
      });
      createdLeaveTypes.push(leaveType);
      console.log(`✅ Created leave type: ${leaveType.name}`);
    } else {
      createdLeaveTypes.push(existingLeaveType);
      console.log(`⏭️  Leave type already exists: ${leaveTypeData.name}`);
    }
  }

  console.log("✅ Leave types seeding completed!");
  return createdLeaveTypes;
}

async function seedLeaveBalances(employees, leaveTypes) {
  console.log("🌱 Seeding leave balances...");

  for (const emp of employees) {
    const year = new Date().getFullYear();

    for (const leaveType of leaveTypes) {
      const existingBalance = await prisma.leaveBalance.findFirst({
        where: {
          employeeId: emp.employee.id,
          leaveTypeId: leaveType.id,
          year: year,
        },
      });

      if (!existingBalance) {
        const allocated = leaveType.maxDaysPerYear;
        const used = randomInt(0, Math.floor(allocated / 2));
        const remaining = allocated - used;

        await prisma.leaveBalance.create({
          data: {
            employeeId: emp.employee.id,
            leaveTypeId: leaveType.id,
            year: year,
            allocated: allocated,
            used: used,
            remaining: remaining,
            carryForward: 0,
          },
        });

        console.log(
          `✅ Created leave balance for ${emp.employee.firstName} ${emp.employee.lastName} - ${leaveType.name}: ${remaining}/${allocated}`
        );
      }
    }
  }

  console.log("✅ Leave balances seeding completed!");
}

async function seedHolidays() {
  console.log("🌱 Seeding holidays...");

  const currentYear = new Date().getFullYear();
  const holidays = [
    {
      name: "New Year's Day",
      date: new Date(currentYear, 0, 1),
      type: "NATIONAL",
      description: "New Year celebration",
      isOptional: false,
    },
    {
      name: "Martin Luther King Jr. Day",
      date: new Date(currentYear, 0, 15),
      type: "NATIONAL",
      description: "Civil rights leader commemoration",
      isOptional: false,
    },
    {
      name: "Presidents' Day",
      date: new Date(currentYear, 1, 19),
      type: "NATIONAL",
      description: "Presidents' Day",
      isOptional: false,
    },
    {
      name: "Memorial Day",
      date: new Date(currentYear, 4, 27),
      type: "NATIONAL",
      description: "Memorial Day",
      isOptional: false,
    },
    {
      name: "Independence Day",
      date: new Date(currentYear, 6, 4),
      type: "NATIONAL",
      description: "Independence Day",
      isOptional: false,
    },
    {
      name: "Labor Day",
      date: new Date(currentYear, 8, 2),
      type: "NATIONAL",
      description: "Labor Day",
      isOptional: false,
    },
    {
      name: "Thanksgiving Day",
      date: new Date(currentYear, 10, 28),
      type: "NATIONAL",
      description: "Thanksgiving Day",
      isOptional: false,
    },
    {
      name: "Christmas Day",
      date: new Date(currentYear, 11, 25),
      type: "NATIONAL",
      description: "Christmas Day",
      isOptional: false,
    },
  ];

  for (const holidayData of holidays) {
    const existingHoliday = await prisma.holiday.findFirst({
      where: {
        name: holidayData.name,
        date: holidayData.date,
      },
    });

    if (!existingHoliday) {
      const holiday = await prisma.holiday.create({
        data: holidayData,
      });
      console.log(`✅ Created holiday: ${holiday.name}`);
    } else {
      console.log(`⏭️  Holiday already exists: ${holidayData.name}`);
    }
  }

  console.log("✅ Holidays seeding completed!");
}

async function seedAttendanceRecords(employees) {
  console.log("🌱 Seeding attendance records...");

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 30); // Last 30 days

  for (const emp of employees) {
    // Create attendance records for the last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      // Skip weekends
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const existingRecord = await prisma.attendanceRecord.findFirst({
        where: {
          employeeId: emp.employee.id,
          date: date,
        },
      });

      if (!existingRecord) {
        // Randomly decide if employee was absent (10% chance)
        const isAbsent = Math.random() < 0.1;

        if (isAbsent) {
          await prisma.attendanceRecord.create({
            data: {
              employeeId: emp.employee.id,
              date: date,
              status: "ABSENT",
            },
          });
        } else {
          // Create present record with clock in/out times
          const clockInHour = randomInt(8, 10);
          const clockInMinute = randomInt(0, 59);
          const clockIn = new Date(date);
          clockIn.setHours(clockInHour, clockInMinute, 0, 0);

          const clockOutHour = randomInt(17, 19);
          const clockOutMinute = randomInt(0, 59);
          const clockOut = new Date(date);
          clockOut.setHours(clockOutHour, clockOutMinute, 0, 0);

          await prisma.attendanceRecord.create({
            data: {
              employeeId: emp.employee.id,
              date: date,
              clockIn: clockIn,
              clockOut: clockOut,
              status: "PRESENT",
              totalHours: parseFloat(
                ((clockOut - clockIn) / (1000 * 60 * 60)).toFixed(2)
              ),
            },
          });
        }

        console.log(
          `✅ Created attendance record for ${emp.employee.firstName} ${
            emp.employee.lastName
          } on ${date.toISOString().split("T")[0]}`
        );
      }
    }
  }

  console.log("✅ Attendance records seeding completed!");
}

async function seedAssets(assetCategories) {
  console.log("🌱 Seeding assets...");

  const assets = [
    {
      name: 'MacBook Pro 16"',
      assetCode: "LAP001",
      categoryId: assetCategories[0].id,
      status: "ASSIGNED",
      condition: "GOOD",
      purchasePrice: 2499.99,
    },
    {
      name: "Dell XPS 15",
      assetCode: "LAP002",
      categoryId: assetCategories[0].id,
      status: "AVAILABLE",
      condition: "EXCELLENT",
      purchasePrice: 1899.99,
    },
    {
      name: "HP LaserJet Pro",
      assetCode: "PRN001",
      categoryId: assetCategories[1].id,
      status: "ASSIGNED",
      condition: "GOOD",
      purchasePrice: 299.99,
    },
    {
      name: "Ergonomic Office Chair",
      assetCode: "CHR001",
      categoryId: assetCategories[2].id,
      status: "ASSIGNED",
      condition: "GOOD",
      purchasePrice: 499.99,
    },
    {
      name: "Standing Desk",
      assetCode: "DSK001",
      categoryId: assetCategories[2].id,
      status: "AVAILABLE",
      condition: "EXCELLENT",
      purchasePrice: 799.99,
    },
    {
      name: "iPhone 14 Pro",
      assetCode: "PHN001",
      categoryId: assetCategories[7].id,
      status: "ASSIGNED",
      condition: "GOOD",
      purchasePrice: 999.99,
    },
    {
      name: "Samsung Galaxy S23",
      assetCode: "PHN002",
      categoryId: assetCategories[7].id,
      status: "AVAILABLE",
      condition: "NEW",
      purchasePrice: 899.99,
    },
    {
      name: "Logitech Webcam",
      assetCode: "CAM001",
      categoryId: assetCategories[8].id,
      status: "ASSIGNED",
      condition: "GOOD",
      purchasePrice: 129.99,
    },
  ];

  const createdAssets = [];
  for (const assetData of assets) {
    const existingAsset = await prisma.asset.findFirst({
      where: { assetCode: assetData.assetCode },
    });

    if (!existingAsset) {
      const asset = await prisma.asset.create({
        data: {
          ...assetData,
          purchaseDate: randomDate(new Date(2022, 0, 1), new Date(2024, 5, 30)),
          warrantyEndDate: new Date(
            new Date().setFullYear(new Date().getFullYear() + 2)
          ),
        },
      });
      createdAssets.push(asset);
      console.log(`✅ Created asset: ${asset.name}`);
    } else {
      createdAssets.push(existingAsset);
      console.log(`⏭️  Asset already exists: ${assetData.name}`);
    }
  }

  console.log("✅ Assets seeding completed!");
  return createdAssets;
}

async function seedAssetAssignments(assets, employees) {
  console.log("🌱 Seeding asset assignments...");

  // Assign some assets to employees
  const assignments = [
    { assetIndex: 0, employeeIndex: 0 }, // MacBook to first employee
    { assetIndex: 2, employeeIndex: 1 }, // Printer to second employee
    { assetIndex: 3, employeeIndex: 2 }, // Chair to third employee
    { assetIndex: 5, employeeIndex: 3 }, // iPhone to fourth employee
    { assetIndex: 7, employeeIndex: 4 }, // Webcam to fifth employee
  ];

  for (const assignment of assignments) {
    const asset = assets[assignment.assetIndex];
    const employee = employees[assignment.employeeIndex];

    const existingAssignment = await prisma.assetAssignment.findFirst({
      where: {
        assetId: asset.id,
        employeeId: employee.employee.id,
        status: "ASSIGNED",
      },
    });

    if (!existingAssignment) {
      await prisma.assetAssignment.create({
        data: {
          assetId: asset.id,
          employeeId: employee.employee.id,
          assignedDate: randomDate(new Date(2023, 0, 1), new Date(2024, 5, 30)),
          status: "ASSIGNED",
          assignedBy: employee.employee.id, // In real app, this would be manager ID
        },
      });

      // Update asset status
      await prisma.asset.update({
        where: { id: asset.id },
        data: { status: "ASSIGNED" },
      });

      console.log(
        `✅ Assigned ${asset.name} to ${employee.employee.firstName} ${employee.employee.lastName}`
      );
    }
  }

  console.log("✅ Asset assignments seeding completed!");
}

async function seedSalaryStructures() {
  console.log("🌱 Seeding salary structures...");

  const salaryStructures = [
    {
      name: "Software Engineer Level 1",
      basicSalary: 60000,
      grossSalary: 75000,
      netSalary: 68000,
      effectiveFrom: new Date(),
    },
    {
      name: "Software Engineer Level 2",
      basicSalary: 80000,
      grossSalary: 100000,
      netSalary: 90000,
      effectiveFrom: new Date(),
    },
    {
      name: "Manager Level 1",
      basicSalary: 100000,
      grossSalary: 125000,
      netSalary: 110000,
      effectiveFrom: new Date(),
    },
  ];

  const createdStructures = [];
  for (const structureData of salaryStructures) {
    const existingStructure = await prisma.salaryStructure.findFirst({
      where: { name: structureData.name },
    });

    if (!existingStructure) {
      const structure = await prisma.salaryStructure.create({
        data: {
          ...structureData,
          allowances: JSON.stringify({
            hra: 15000,
            transport: 2400,
            medical: 1500,
          }),
          deductions: JSON.stringify({
            pf: 7200,
            tax: 8000,
          }),
        },
      });
      createdStructures.push(structure);
      console.log(`✅ Created salary structure: ${structure.name}`);
    } else {
      createdStructures.push(existingStructure);
      console.log(`⏭️  Salary structure already exists: ${structureData.name}`);
    }
  }

  console.log("✅ Salary structures seeding completed!");
  return createdStructures;
}

async function seedEmployeeSalaryStructures(employees, salaryStructures) {
  console.log("🌱 Seeding employee salary structures...");

  // Fetch employees with their designations
  const employeesWithDesignations = await prisma.employee.findMany({
    include: {
      designation: true,
    },
  });

  for (let i = 0; i < employeesWithDesignations.length; i++) {
    const emp = employeesWithDesignations[i];
    // Assign salary structures based on position
    let structureIndex;
    // Check if the employee's designation includes "Manager"
    if (emp.designation && emp.designation.title.includes("Manager")) {
      structureIndex = 2; // Manager structure
    } else if (i % 2 === 0) {
      structureIndex = 1; // Level 2 engineer
    } else {
      structureIndex = 0; // Level 1 engineer
    }

    const structure = salaryStructures[structureIndex];

    // Check if a salary structure already exists for this employee
    const existingSalary = await prisma.employeeSalaryStructure.findFirst({
      where: {
        employeeId: emp.id,
      },
    });

    if (!existingSalary) {
      await prisma.employeeSalaryStructure.create({
        data: {
          employeeId: emp.id,
          basicSalary: structure.basicSalary,
          grossSalary: structure.grossSalary,
          netSalary: structure.netSalary,
          allowances: structure.allowances,
          deductions: structure.deductions,
          ctc: structure.grossSalary * 1.2,
          effectiveFrom: new Date(new Date().getFullYear(), 0, 1),
          createdBy: emp.id,
          status: "ACTIVE",
        },
      });

      console.log(
        `✅ Assigned salary structure to ${emp.firstName} ${emp.lastName}`
      );
    } else {
      console.log(
        `⏭️  Salary structure already exists for ${emp.firstName} ${emp.lastName}`
      );
    }
  }

  console.log("✅ Employee salary structures seeding completed!");
}

// New function to seed payroll records
async function seedPayrollRecords(employees) {
  console.log("🌱 Seeding payroll records...");

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-11, so 0 = January

  // For demo purposes, let's create payroll records for the last 3 months
  for (let monthOffset = 1; monthOffset <= 3; monthOffset++) {
    const month = currentMonth - monthOffset;
    const year = month < 0 ? currentYear - 1 : currentYear;
    const adjustedMonth = month < 0 ? 12 + month : month + 1; // Convert to 1-12

    for (const emp of employees) {
      // Get the employee's current salary structure
      const salaryStructure = await prisma.employeeSalaryStructure.findFirst({
        where: {
          employeeId: emp.employee.id,
        },
        orderBy: {
          effectiveFrom: "desc",
        },
      });

      if (!salaryStructure) {
        console.log(
          `⏭️  No salary structure for ${emp.employee.firstName} ${emp.employee.lastName}, skipping payroll record`
        );
        continue;
      }

      // Check if payroll record already exists
      const existingRecord = await prisma.payrollRecord.findFirst({
        where: {
          employeeId: emp.employee.id,
          month: adjustedMonth,
          year: year,
        },
      });

      if (existingRecord) {
        console.log(
          `⏭️  Payroll record already exists for ${emp.employee.firstName} ${emp.employee.lastName} for ${adjustedMonth}/${year}`
        );
        continue;
      }

      // Get attendance records for the month
      const startDate = new Date(year, adjustedMonth - 1, 1);
      const endDate = new Date(year, adjustedMonth, 0);

      const attendanceRecords = await prisma.attendanceRecord.findMany({
        where: {
          employeeId: emp.employee.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Calculate attendance
      const workingDaysInMonth = getWorkingDays(startDate, endDate);
      const presentDays = attendanceRecords.filter(
        (record) => record.status === "PRESENT" || record.status === "LATE"
      ).length;
      const absentDays = workingDaysInMonth - presentDays;

      // Calculate salary components
      const basicSalary = parseFloat(salaryStructure.basicSalary.toString());

      // Parse allowances and deductions from JSON
      const allowances = JSON.parse(salaryStructure.allowances.toString());
      const deductions = JSON.parse(salaryStructure.deductions.toString());

      // Calculate pro-rated salary based on attendance
      const attendanceRatio =
        workingDaysInMonth > 0 ? presentDays / workingDaysInMonth : 1;
      const proRatedBasicPay = basicSalary * attendanceRatio;

      // Calculate allowances
      let totalAllowances = 0;
      const allowanceBreakdown = {};
      Object.entries(allowances).forEach(([key, value]) => {
        const amount = parseFloat(value) * attendanceRatio;
        allowanceBreakdown[key] = amount;
        totalAllowances += amount;
      });

      // Calculate deductions
      let totalDeductions = 0;
      const deductionBreakdown = {};
      Object.entries(deductions).forEach(([key, value]) => {
        const amount = parseFloat(value);
        deductionBreakdown[key] = amount;
        totalDeductions += amount;
      });

      // Calculate overtime (random for demo)
      const overtimeHours = Math.random() * 10; // 0-10 hours
      const hourlyRate = basicSalary / (workingDaysInMonth * 8);
      const overtimePay = overtimeHours * hourlyRate * 1.5;

      // Bonuses and penalties (random for demo)
      const bonuses = Math.random() * 500; // 0-500 bonus
      const penalties = Math.random() * 200; // 0-200 penalty

      // Gross pay calculation
      const grossPay =
        proRatedBasicPay + totalAllowances + overtimePay + bonuses;

      // Final net pay
      const netPay = grossPay - totalDeductions - penalties;

      // Create payroll record
      await prisma.payrollRecord.create({
        data: {
          employeeId: emp.employee.id,
          salaryStructureId: salaryStructure.id,
          month: adjustedMonth,
          year: year,
          payPeriodStart: startDate,
          payPeriodEnd: endDate,
          workingDays: workingDaysInMonth,
          presentDays: presentDays,
          absentDays: absentDays,
          overtimeHours: parseFloat(overtimeHours.toFixed(2)),
          leaveDays: 0,
          basicPay: parseFloat(proRatedBasicPay.toFixed(2)),
          allowances: allowanceBreakdown,
          grossPay: parseFloat(grossPay.toFixed(2)),
          deductions: deductionBreakdown,
          overtimePay: parseFloat(overtimePay.toFixed(2)),
          bonuses: parseFloat(bonuses.toFixed(2)),
          penalties: parseFloat(penalties.toFixed(2)),
          totalEarnings: parseFloat(grossPay.toFixed(2)),
          totalDeductions: parseFloat((totalDeductions + penalties).toFixed(2)),
          netPay: parseFloat(netPay.toFixed(2)),
          taxableIncome: parseFloat(grossPay.toFixed(2)),
          status: "GENERATED",
          processedBy: emp.employee.id,
        },
      });

      console.log(
        `✅ Created payroll record for ${emp.employee.firstName} ${emp.employee.lastName} for ${adjustedMonth}/${year}`
      );
    }
  }

  console.log("✅ Payroll records seeding completed!");
}

// Helper function to calculate working days
function getWorkingDays(startDate, endDate) {
  let workingDays = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

async function seedTrainingPrograms() {
  console.log("🌱 Seeding training programs...");

  const trainingPrograms = [
    {
      title: "Leadership Development",
      description: "Advanced leadership and management skills training",
      duration: 16,
      type: "LEADERSHIP",
      startDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 2)),
      status: "SCHEDULED",
      maxParticipants: 20,
    },
    {
      title: "Technical Skills Workshop",
      description: "Hands-on technical skills development",
      duration: 8,
      type: "TECHNICAL",
      startDate: new Date(new Date().setDate(new Date().getDate() + 10)),
      endDate: new Date(new Date().setDate(new Date().getDate() + 11)),
      status: "SCHEDULED",
      maxParticipants: 30,
    },
    {
      title: "Compliance Training",
      description: "Company policies and regulatory compliance",
      duration: 4,
      type: "COMPLIANCE",
      startDate: new Date(new Date().setDate(new Date().getDate() + 5)),
      endDate: new Date(new Date().setDate(new Date().getDate() + 5)),
      status: "SCHEDULED",
      maxParticipants: 50,
    },
  ];

  const createdPrograms = [];
  for (const programData of trainingPrograms) {
    const existingProgram = await prisma.trainingProgram.findFirst({
      where: { title: programData.title },
    });

    if (!existingProgram) {
      const program = await prisma.trainingProgram.create({
        data: programData,
      });
      createdPrograms.push(program);
      console.log(`✅ Created training program: ${program.title}`);
    } else {
      createdPrograms.push(existingProgram);
      console.log(`⏭️  Training program already exists: ${programData.title}`);
    }
  }

  console.log("✅ Training programs seeding completed!");
  return createdPrograms;
}

async function seedTrainingEnrollments(employees, trainingPrograms) {
  console.log("🌱 Seeding training enrollments...");

  // Enroll employees in training programs
  for (let i = 0; i < employees.length && i < 10; i++) {
    const emp = employees[i];
    const program = trainingPrograms[i % trainingPrograms.length];

    const existingEnrollment = await prisma.trainingEnrollment.findFirst({
      where: {
        employeeId: emp.employee.id,
        programId: program.id,
      },
    });

    if (!existingEnrollment) {
      await prisma.trainingEnrollment.create({
        data: {
          employeeId: emp.employee.id,
          programId: program.id,
          enrolledAt: new Date(),
          status: "ENROLLED",
        },
      });

      console.log(
        `✅ Enrolled ${emp.employee.firstName} ${emp.employee.lastName} in ${program.title}`
      );
    }
  }

  console.log("✅ Training enrollments seeding completed!");
}

async function seedAnnouncements(employees) {
  console.log("🌱 Seeding announcements...");

  const announcements = [
    {
      title: "Company Holiday Schedule",
      content:
        "Please note the upcoming holiday schedule for the next quarter. All employees are expected to review and plan accordingly.",
      type: "GENERAL",
      priority: "MEDIUM",
      createdBy: employees[0].employee.id, // First manager
    },
    {
      title: "New Office Policy",
      content:
        "Effective immediately, all employees must wear ID badges at all times while in the office premises.",
      type: "POLICY",
      priority: "HIGH",
      createdBy: employees[0].employee.id,
    },
    {
      title: "Team Building Event",
      content:
        "Join us for our quarterly team building event next Friday. Lunch will be provided.",
      type: "EVENT",
      priority: "LOW",
      createdBy: employees[0].employee.id,
    },
  ];

  for (const announcementData of announcements) {
    const existingAnnouncement = await prisma.announcement.findFirst({
      where: { title: announcementData.title },
    });

    if (!existingAnnouncement) {
      await prisma.announcement.create({
        data: {
          ...announcementData,
          publishedAt: new Date(),
        },
      });
      console.log(`✅ Created announcement: ${announcementData.title}`);
    } else {
      console.log(`⏭️  Announcement already exists: ${announcementData.title}`);
    }
  }

  console.log("✅ Announcements seeding completed!");
}

async function main() {
  try {
    console.log("🌱 Starting database seeding...");

    // Seed departments first
    const departments = await seedDepartments();

    // NEW: Seed designations
    const designations = await seedDesignations();

    // Seed users and employees
    const { adminUser, hrUser, managers, employees } =
      await seedUsersAndEmployees(departments, designations);
    const allEmployees = [...managers, ...employees];

    // Seed leave types
    const leaveTypes = await seedLeaveTypes();

    // Seed leave balances
    await seedLeaveBalances(employees, leaveTypes);

    // Seed holidays
    await seedHolidays();

    // Seed attendance records
    await seedAttendanceRecords(employees);

    // Seed asset categories (already exists in seed-categories.js)
    const assetCategories = await prisma.assetCategory.findMany();

    // Seed assets
    const assets = await seedAssets(assetCategories);

    // Seed asset assignments
    await seedAssetAssignments(assets, employees);

    // Seed salary structures
    const salaryStructures = await seedSalaryStructures();

    // Seed employee salary structures
    await seedEmployeeSalaryStructures(employees, salaryStructures);

    // NEW: Seed payroll records
    await seedPayrollRecords(employees);

    // Seed training programs
    const trainingPrograms = await seedTrainingPrograms();

    // Seed training enrollments
    await seedTrainingEnrollments(employees, trainingPrograms);

    // Seed announcements
    await seedAnnouncements(managers);

    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
