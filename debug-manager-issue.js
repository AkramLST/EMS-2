import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugManagerIssue() {
  console.log('=== Debugging Manager Online Users Issue ===');

  try {
    // Check all users with management roles
    const managers = await prisma.user.findMany({
      where: {
        role: {
          in: ['DEPARTMENT_MANAGER', 'HR_MANAGER', 'ADMINISTRATOR']
        }
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            departmentId: true,
            department: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    console.log(`Found ${managers.length} users with management roles:`);
    managers.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Has Employee Profile: ${!!user.employee}`);
      if (user.employee) {
        console.log(`   Employee ID: ${user.employee.employeeId}`);
        console.log(`   Department: ${user.employee.department?.name || 'NO DEPARTMENT'}`);
        console.log(`   Department ID: ${user.employee.departmentId || 'NULL'}`);
      }
      console.log('');
    });

    // Check employees in each department
    const departments = await prisma.department.findMany({
      include: {
        employees: {
          include: {
            user: {
              select: {
                role: true
              }
            }
          }
        }
      }
    });

    console.log('=== Department Breakdown ===');
    departments.forEach((dept, index) => {
      console.log(`${index + 1}. ${dept.name} (${dept.id})`);
      console.log(`   Total Employees: ${dept.employees.length}`);

      const deptManagers = dept.employees.filter(emp =>
        emp.user?.role === 'DEPARTMENT_MANAGER' ||
        emp.user?.role === 'HR_MANAGER' ||
        emp.user?.role === 'ADMINISTRATOR'
      );

      console.log(`   Managers: ${deptManagers.length}`);
      deptManagers.forEach(manager => {
        console.log(`   - ${manager.firstName} ${manager.lastName} (${manager.user?.role})`);
      });
      console.log('');
    });

    // Check active sessions
    const activeSessions = await prisma.userSession.findMany({
      where: {
        isActive: true,
        status: {
          in: ['ONLINE', 'AWAY', 'BUSY']
        }
      },
      include: {
        user: {
          include: {
            employee: {
              select: {
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
        }
      }
    });

    console.log(`=== Active Sessions (${activeSessions.length}) ===`);
    activeSessions.forEach((session, index) => {
      console.log(`${index + 1}. ${session.user.employee?.firstName} ${session.user.employee?.lastName}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Department: ${session.user.employee?.department?.name || 'NO DEPARTMENT'}`);
      console.log(`   User ID: ${session.userId}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error debugging manager issue:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugManagerIssue();
