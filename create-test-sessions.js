import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function createTestUserSessions() {
  console.log('=== Creating Test User Sessions ===');

  try {
    // Get all users with employee profiles
    const users = await prisma.user.findMany({
      where: {
        employee: {
          isNot: null
        }
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    console.log(`Found ${users.length} users with employee profiles`);

    // Clear existing sessions first
    await prisma.userSession.deleteMany({});
    console.log('Cleared existing sessions');

    // Create sessions for some users (simulate some being online)
    const sessionsToCreate = [];
    const statuses = ['ONLINE', 'AWAY', 'BUSY'];

    for (let i = 0; i < Math.min(users.length, 5); i++) {
      const user = users[i];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      sessionsToCreate.push({
        userId: user.id,
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
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      });

      console.log(`Creating session for ${user.employee?.firstName} ${user.employee?.lastName} (${user.email}) - Status: ${status}`);
    }

    // Create the sessions
    if (sessionsToCreate.length > 0) {
      await prisma.userSession.createMany({
        data: sessionsToCreate
      });
      console.log(`✅ Created ${sessionsToCreate.length} test sessions`);
    }

    // Verify sessions were created
    const createdSessions = await prisma.userSession.findMany({
      include: {
        user: {
          include: {
            employee: {
              select: {
                firstName: true,
                lastName: true,
                employeeId: true
              }
            }
          }
        }
      }
    });

    console.log('\n=== Created Sessions ===');
    createdSessions.forEach(session => {
      console.log(`- ${session.user.employee?.firstName} ${session.user.employee?.lastName} (${session.user.employee?.employeeId}): ${session.status}`);
    });

    console.log('\n🎉 Test sessions created successfully!');
    console.log('You should now see online users in the dashboard.');

  } catch (error) {
    console.error('❌ Error creating test sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUserSessions();
