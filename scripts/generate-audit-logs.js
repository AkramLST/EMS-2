const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Helper function to generate random dates
function randomDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

// Helper function to generate random IP addresses
function randomIP() {
  return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(
    0,
    255
  )}.${randomInt(0, 255)}`;
}

// Helper function to generate random integers
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to generate random user agents
function randomUserAgent() {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/91.0.864.59",
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function generateAuditLogs() {
  console.log("🌱 Generating audit logs...");

  // Get all users
  const users = await prisma.user.findMany({
    include: {
      employee: true,
    },
  });

  if (users.length === 0) {
    console.log("❌ No users found. Please seed users first.");
    return;
  }

  // Define actions and resources
  const actions = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"];
  const resources = [
    "employee",
    "department",
    "leave",
    "attendance",
    "payroll",
    "performance",
    "training",
    "asset",
    "announcement",
    "user",
  ];

  // Generate 200 random audit logs
  for (let i = 0; i < 200; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const resource = resources[Math.floor(Math.random() * resources.length)];

    // Generate realistic details based on action and resource
    let details = "";
    switch (action) {
      case "CREATE":
        details = `Created new ${resource} record`;
        break;
      case "UPDATE":
        details = `Updated ${resource} record with ID: ${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        break;
      case "DELETE":
        details = `Deleted ${resource} record with ID: ${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        break;
      case "LOGIN":
        details = `User logged in from IP: ${randomIP()}`;
        break;
      case "LOGOUT":
        details = `User logged out`;
        break;
      default:
        details = `Performed ${action} on ${resource}`;
    }

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: action,
          resource: resource,
          resourceId: Math.random().toString(36).substr(2, 9),
          details: details,
          ipAddress: randomIP(),
          userAgent: randomUserAgent(),
          timestamp: randomDate(new Date(2024, 0, 1), new Date()),
        },
      });

      if (i % 20 === 0) {
        console.log(`✅ Generated ${i + 1} audit logs...`);
      }
    } catch (error) {
      console.error("Error creating audit log:", error);
    }
  }

  console.log("✅ Audit logs generation completed!");
}

async function main() {
  try {
    await generateAuditLogs();
  } catch (error) {
    console.error("Error in main execution:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
