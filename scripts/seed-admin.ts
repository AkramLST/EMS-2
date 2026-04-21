import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim() || "admin@company.com";
  const password = process.env.ADMIN_PASSWORD?.trim() || "Admin@123";
  const firstName = process.env.ADMIN_FIRST_NAME?.trim() || "Admin";
  const lastName = process.env.ADMIN_LAST_NAME?.trim() || "User";

  console.log("🔐 Seeding administrator account...");
  console.log(`ℹ️  Using email: ${email}`);

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      isFirstLogin: false,
      role: "ADMINISTRATOR",
    },
    create: {
      email,
      password: hashedPassword,
      role: "ADMINISTRATOR",
      isFirstLogin: false,
      employee: {
        create: {
          employeeId: `ADMIN-${Date.now()}`,
          firstName,
          lastName,
          email,
          designation: {
            connectOrCreate: {
              where: {
                title: "Administrator",
              },
              create: {
                title: "Administrator",
              },
            },
          },
          department: {
            connectOrCreate: {
              where: {
                name: "Executive",
              },
              create: {
                name: "Executive",
              },
            },
          },
          employmentType: "FULL_TIME",
          joinDate: new Date(),
          status: "ACTIVE",
        },
      },
    },
    include: {
      employee: true,
    },
  });

  await prisma.userRole.createMany({
    data: [
      {
        userId: user.id,
        role: "ADMINISTRATOR",
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Administrator account is ready.");
  console.log("📧 Email:", email);
  console.log("🔑 Password:", password);
}

main()
  .catch((error) => {
    console.error("❌ Failed to seed administrator:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
