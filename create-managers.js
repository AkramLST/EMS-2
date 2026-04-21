import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateResetToken } from './src/lib/email.js';

const prisma = new PrismaClient();

async function createTestManagers() {
  console.log('=== Creating Test Managers ===');

  try {
    // Get existing departments and designations
    const departments = await prisma.department.findMany();
    const designations = await prisma.designation.findMany();

    if (departments.length === 0) {
      console.log('❌ No departments found. Creating test departments first...');

      // Create test departments
      const testDepartments = [
        { name: 'Engineering', description: 'Software Engineering Department' },
        { name: 'Human Resources', description: 'HR Department' },
        { name: 'Marketing', description: 'Marketing Department' },
        { name: 'Sales', description: 'Sales Department' },
        { name: 'Finance', description: 'Finance Department' }
      ];

      for (const dept of testDepartments) {
        await prisma.department.create({ data: dept });
      }

      console.log('✅ Created test departments');
    }

    if (designations.length === 0) {
      console.log('❌ No designations found. Creating test designations first...');

      // Create test designations
      const testDesignations = [
        { title: 'Software Engineer', description: 'Software Engineer role' },
        { title: 'Senior Software Engineer', description: 'Senior Software Engineer role' },
        { title: 'Engineering Manager', description: 'Engineering Manager role' },
        { title: 'HR Manager', description: 'HR Manager role' },
        { title: 'Marketing Manager', description: 'Marketing Manager role' },
        { title: 'Sales Manager', description: 'Sales Manager role' },
        { title: 'Finance Manager', description: 'Finance Manager role' },
        { title: 'Department Manager', description: 'Department Manager role' },
        { title: 'Administrator', description: 'System Administrator role' }
      ];

      for (const designation of testDesignations) {
        await prisma.designation.create({ data: designation });
      }

      console.log('✅ Created test designations');
    }

    // Get updated departments and designations
    const updatedDepartments = await prisma.department.findMany();
    const updatedDesignations = await prisma.designation.findMany();

    const engineeringDept = updatedDepartments.find(d => d.name === 'Engineering');
    const hrDept = updatedDepartments.find(d => d.name === 'Human Resources');
    const marketingDept = updatedDepartments.find(d => d.name === 'Marketing');
    const salesDept = updatedDepartments.find(d => d.name === 'Sales');
    const financeDept = updatedDepartments.find(d => d.name === 'Finance');

    const managerDesignation = updatedDesignations.find(d => d.title === 'Engineering Manager');
    const hrManagerDesignation = updatedDesignations.find(d => d.title === 'HR Manager');
    const marketingManagerDesignation = updatedDesignations.find(d => d.title === 'Marketing Manager');
    const salesManagerDesignation = updatedDesignations.find(d => d.title === 'Sales Manager');
    const financeManagerDesignation = updatedDesignations.find(d => d.title === 'Finance Manager');
    const adminDesignation = updatedDesignations.find(d => d.title === 'Administrator');

    if (!engineeringDept || !hrDept || !managerDesignation || !hrManagerDesignation) {
      console.log('❌ Required departments or designations not found');
      return;
    }

    // Create test managers
    const managers = [
      {
        email: 'john.manager@company.com',
        password: await bcrypt.hash('manager123', 10),
        role: 'DEPARTMENT_MANAGER',
        firstName: 'John',
        lastName: 'Manager',
        phone: '+1234567890',
        departmentId: engineeringDept.id,
        designationId: managerDesignation.id,
        employmentType: 'FULL_TIME',
        joinDate: new Date('2023-01-15'),
        status: 'ACTIVE'
      },
      {
        email: 'sarah.hr@company.com',
        password: await bcrypt.hash('manager123', 10),
        role: 'HR_MANAGER',
        firstName: 'Sarah',
        lastName: 'HR Manager',
        phone: '+1234567891',
        departmentId: hrDept.id,
        designationId: hrManagerDesignation.id,
        employmentType: 'FULL_TIME',
        joinDate: new Date('2023-01-10'),
        status: 'ACTIVE'
      },
      {
        email: 'admin@company.com',
        password: await bcrypt.hash('admin123', 10),
        role: 'ADMINISTRATOR',
        firstName: 'System',
        lastName: 'Administrator',
        phone: '+1234567892',
        departmentId: hrDept.id,
        designationId: adminDesignation.id,
        employmentType: 'FULL_TIME',
        joinDate: new Date('2023-01-01'),
        status: 'ACTIVE'
      }
    ];

    console.log('Creating test managers...');

    for (const managerData of managers) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: managerData.email }
      });

      if (existingUser) {
        console.log(`⚠️ User ${managerData.email} already exists, skipping...`);
        continue;
      }

      // Create user and employee in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Generate reset token
        const resetToken = generateResetToken();
        const resetTokenExp = new Date();
        resetTokenExp.setHours(resetTokenExp.getHours() + 24);

        // Create user
        const newUser = await tx.user.create({
          data: {
            email: managerData.email,
            password: managerData.password,
            role: managerData.role,
            isFirstLogin: true,
            resetToken: resetToken,
            resetTokenExp: resetTokenExp,
          },
        });

        // Generate employee ID
        const latestEmployee = await tx.employee.findFirst({
          orderBy: { id: 'desc' }
        });

        let nextEmployeeNumber = 1;
        if (latestEmployee && latestEmployee.employeeId) {
          const latestNumber = parseInt(latestEmployee.employeeId.replace('EMP', ''));
          if (!isNaN(latestNumber)) {
            nextEmployeeNumber = latestNumber + 1;
          }
        }

        const employeeId = `EMP${nextEmployeeNumber.toString().padStart(4, '0')}`;

        // Create employee
        const employee = await tx.employee.create({
          data: {
            employeeId,
            userId: newUser.id,
            firstName: managerData.firstName,
            lastName: managerData.lastName,
            email: managerData.email,
            phone: managerData.phone,
            designationId: managerData.designationId,
            departmentId: managerData.departmentId,
            employmentType: managerData.employmentType,
            joinDate: managerData.joinDate,
            status: managerData.status,
          },
          include: {
            department: true,
            designation: true,
            user: {
              select: {
                role: true
              }
            }
          }
        });

        return { user: newUser, employee };
      });

      console.log(`✅ Created manager: ${result.employee.firstName} ${result.employee.lastName} (${result.employee.employeeId}) - Role: ${result.user.role}`);
    }

    // Verify managers were created
    const createdManagers = await prisma.employee.findMany({
      where: {
        OR: [
          {
            user: {
              role: {
                in: ["DEPARTMENT_MANAGER", "HR_MANAGER", "ADMINISTRATOR"],
              },
            },
          },
          {
            designation: {
              title: {
                contains: "Manager",
                mode: "insensitive",
              },
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            role: true
          }
        },
        department: {
          select: {
            name: true
          }
        },
        designation: {
          select: {
            title: true
          }
        }
      }
    });

    console.log(`\n🎉 Successfully created ${createdManagers.length} managers:`);
    createdManagers.forEach((manager, index) => {
      console.log(`${index + 1}. ${manager.firstName} ${manager.lastName} (${manager.employeeId})`);
      console.log(`   Department: ${manager.department?.name}`);
      console.log(`   Designation: ${manager.designation?.title}`);
      console.log(`   User Role: ${manager.user?.role}`);
      console.log('');
    });

    console.log('✅ Manager dropdown should now be populated!');

  } catch (error) {
    console.error('❌ Error creating test managers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestManagers();
