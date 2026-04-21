import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function createDepartmentSessions() {
  console.log('=== Creating Department Sessions for Manager Test ===');

  try {
    // Find department manager and their department
    const manager = await prisma.user.findFirst({
      where: {
        role: 'DEPARTMENT_MANAGER'
      },
      include: {
        employee: {
          include: {
            department: true
          }
        }
      }
    });

    if (!manager || !manager.employee || !manager.employee.departmentId) {
      console.log('❌ No department manager with valid department found');
      return;
    }

    console.log(`✅ Found department manager: ${manager.email}`);
    console.log(`   Department: ${manager.employee.department?.name}`);
    console.log(`   Department ID: ${manager.employee.departmentId}`);

    // Get employees in the manager's department
    const departmentEmployees = await prisma.employee.findMany({
      where: {
        departmentId: manager.employee.departmentId,
        userId: {
          not: manager.id // Exclude the manager themselves
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    console.log(`✅ Found ${departmentEmployees.length} employees in department (excluding manager)`);

    // Create sessions for some of these employees
    const sessionsToCreate = [];
    const statuses = ['ONLINE', 'AWAY', 'BUSY', 'ONLINE', 'AWAY'];

    for (let i = 0; i < Math.min(departmentEmployees.length, 5); i++) {
      const employee = departmentEmployees[i];
      const status = statuses[i % statuses.length];

      if (employee.userId) {
        sessionsToCreate.push({
          userId: employee.userId,
          sessionToken: randomUUID(),
          isActive: true,
          status: status,
          lastActivity: new Date(),
          deviceInfo: {
            browser: 'Chrome',
            os: 'Windows',
            device: 'Desktop'
          },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        console.log(`   📝 Creating ${status} session for ${employee.firstName} ${employee.lastName} (${employee.employeeId})`);
      }
    }

    if (sessionsToCreate.length > 0) {
      // Clear existing sessions first
      await prisma.userSession.deleteMany({});
      console.log('   🧹 Cleared existing sessions');

      // Create new sessions
      await prisma.userSession.createMany({
        data: sessionsToCreate
      });

      console.log(`✅ Created ${sessionsToCreate.length} department sessions`);
    }

    // Verify the sessions were created
    const createdSessions = await prisma.userSession.findMany({
      include: {
        user: {
          include: {
            employee: {
              include: {
                department: true
              }
            }
          }
        }
      }
    });

    console.log('\n=== Created Sessions ===');
    createdSessions.forEach((session, index) => {
      if (session.user.employee) {
        console.log(`${index + 1}. ${session.user.employee.firstName} ${session.user.employee.lastName}`);
        console.log(`   Employee ID: ${session.user.employee.employeeId}`);
        console.log(`   Department: ${session.user.employee.department?.name}`);
        console.log(`   Status: ${session.status}`);
        console.log(`   Session ID: ${session.id}`);
        console.log('');
      }
    });

    console.log('🎉 Department sessions created successfully!');
    console.log('Department manager should now see online team members in the dashboard.');

  } catch (error) {
    console.error('❌ Error creating department sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDepartmentSessions();
