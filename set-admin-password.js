const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function setAdminPassword() {
  const prisma = new PrismaClient();

  try {
    // Find the admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        email: "admin@ems.com",
      },
    });

    if (!adminUser) {
      console.log("Admin user not found");
      return;
    }

    // Set a new password
    const newPassword = "admin123";
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the user with the new password
    await prisma.user.update({
      where: {
        id: adminUser.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    console.log("✅ Admin password set successfully");
    console.log("Email:", adminUser.email);
    console.log("New password:", newPassword);
  } catch (error) {
    console.error("Error setting admin password:", error);
  } finally {
    await prisma.$disconnect();
  }
}

setAdminPassword();
