const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedAssetCategories() {
  console.log("🌱 Seeding asset categories...");

  const categories = [
    {
      name: "IT Equipment",
      description: "Computers, laptops, servers, and IT hardware",
    },
    {
      name: "Office Equipment",
      description: "Printers, scanners, projectors, and office devices",
    },
    {
      name: "Furniture",
      description: "Desks, chairs, cabinets, and office furniture",
    },
    {
      name: "Vehicles",
      description: "Company cars, trucks, and transportation assets",
    },
    {
      name: "Machinery",
      description: "Manufacturing equipment and industrial machinery",
    },
    {
      name: "Software Licenses",
      description: "Software licenses and digital assets",
    },
    {
      name: "Tools",
      description: "Hand tools, power tools, and maintenance equipment",
    },
    {
      name: "Mobile Devices",
      description: "Smartphones, tablets, and mobile accessories",
    },
    {
      name: "Audio Visual",
      description: "Cameras, microphones, speakers, and AV equipment",
    },
    {
      name: "Safety Equipment",
      description: "Safety gear, protective equipment, and emergency supplies",
    },
  ];

  for (const categoryData of categories) {
    const existingCategory = await prisma.assetCategory.findFirst({
      where: { name: categoryData.name },
    });

    if (!existingCategory) {
      const category = await prisma.assetCategory.create({
        data: categoryData,
      });
      console.log(`✅ Created category: ${category.name}`);
    } else {
      console.log(`⏭️  Category already exists: ${categoryData.name}`);
    }
  }

  console.log("✅ Asset categories seeding completed!");
}

async function main() {
  try {
    await seedAssetCategories();
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
