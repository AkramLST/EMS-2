const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function updateEmployeesDesignation() {
  console.log("Updating employees with default designation...");

  try {
    // First, let's create a default "Employee" designation if it doesn't exist
    let defaultDesignation = await prisma.designation.findFirst({
      where: {
        title: "Employee",
      },
    });

    if (!defaultDesignation) {
      defaultDesignation = await prisma.designation.create({
        data: {
          title: "Employee",
          description: "Default employee designation",
        },
      });
      console.log("Created default 'Employee' designation");
    }

    // Update all employees that don't have a designationId to use the default
    const employeesWithoutDesignation = await prisma.employee.findMany({
      where: {
        designationId: null,
      },
    });

    console.log(
      `Found ${employeesWithoutDesignation.length} employees without designation`
    );

    for (const employee of employeesWithoutDesignation) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          designationId: defaultDesignation.id,
        },
      });
      console.log(
        `Updated employee ${employee.firstName} ${employee.lastName} with default designation`
      );
    }

    console.log("Employee designation update completed!");
  } catch (error) {
    console.error("Error updating employee designations:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateEmployeesDesignation();
