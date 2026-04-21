import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetManagerPassword() {
  console.log('=== Resetting Department Manager Password ===');

  try {
    // Find the department manager
    const manager = await prisma.user.findFirst({
      where: {
        email: 'john.manager@company.com'
      }
    });

    if (!manager) {
      console.log('❌ Department manager not found. Creating new account...');

      // Get required IDs
      const engineeringDept = await prisma.department.findFirst({
        where: { name: 'Engineering' }
      });

      const managerDesignation = await prisma.designation.findFirst({
        where: { title: 'Engineering Manager' }
      });

      if (!engineeringDept || !managerDesignation) {
        console.log('❌ Required department or designation not found');
        return;
      }

      // Create the manager account
      const hashedPassword = await bcrypt.hash('manager123', 10);

      const newUser = await prisma.user.create({
        data: {
          email: 'john.manager@company.com',
          password: hashedPassword,
          role: 'DEPARTMENT_MANAGER',
          isFirstLogin: true
        }
      });

      // Create employee profile
      const employee = await prisma.employee.create({
        data: {
          employeeId: 'MGR0001',
          userId: newUser.id,
          firstName: 'John',
          lastName: 'Manager',
          email: 'john.manager@company.com',
          phone: '+1234567890',
          designationId: managerDesignation.id,
          departmentId: engineeringDept.id,
          employmentType: 'FULL_TIME',
          joinDate: new Date('2023-01-15'),
          status: 'ACTIVE'
        }
      });

      console.log('✅ Created department manager account:');
      console.log('   Email: john.manager@company.com');
      console.log('   Password: manager123');
      console.log('   Employee ID: MGR0001');
      console.log('   Department: Engineering');

      return;
    }

    console.log('✅ Found existing department manager');
    console.log(`   Email: ${manager.email}`);
    console.log(`   Current role: ${manager.role}`);

    // Reset password to known value
    const newPassword = 'manager123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: manager.id },
      data: {
        password: hashedPassword,
        isFirstLogin: true
      }
    });

    console.log('✅ Password reset successful!');
    console.log(`   New password: ${newPassword}`);
    console.log(`   Email: ${manager.email}`);

    // Verify the password works
    const updatedUser = await prisma.user.findUnique({
      where: { id: manager.id }
    });

    const passwordMatch = await bcrypt.compare(newPassword, updatedUser.password);
    console.log(`   Password verification: ${passwordMatch ? '✅ SUCCESS' : '❌ FAILED'}`);

  } catch (error) {
    console.error('❌ Error resetting manager password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetManagerPassword();
