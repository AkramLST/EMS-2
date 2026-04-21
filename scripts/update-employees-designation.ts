import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateEmployeesDesignation() {
  console.log("Updating employees with default designation...");

  try {
    // First, let's create a default "Employee" designation if it doesn't exist
    let defaultDesignation = await prisma.designation.findFirst({
      where: {
        title: "Employee"
      }
    });

    if (!defaultDesignation) {
      defaultDesignation = await prisma.designation.create({
        data: {
          title: "Employee",
          description: "Default employee designation"
        }
      });
      console.log("Created default 'Employee' designation");
    }

    // Since designationId is required in the schema, all employees should already have one
    // This script is mainly for creating the default designation if it doesn't exist
    console.log("Default designation is available for new employees.");

    console.log("Employee designation update completed!");
  } catch (error) {
    console.error("Error updating employee designations:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateEmployeesDesignation();