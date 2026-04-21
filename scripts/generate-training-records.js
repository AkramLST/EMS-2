const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Helper function to generate random dates
function randomDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

// Helper function to generate random integers
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generateTrainingRecords() {
  console.log("🌱 Generating training programs and learning records...");

  // Get all employees
  const employees = await prisma.employee.findMany();

  if (employees.length === 0) {
    console.log("❌ No employees found. Please seed employees first.");
    return;
  }

  // Create training programs if they don't exist
  const existingPrograms = await prisma.trainingProgram.findMany();

  let trainingPrograms = [];

  if (existingPrograms.length === 0) {
    console.log("Creating new training programs...");

    const programData = [
      {
        title: "Leadership Development",
        description:
          "Enhance leadership and management skills for team leads and managers",
        duration: 16, // hours
        type: "LEADERSHIP",
        instructor: "Dr. Sarah Johnson",
        maxParticipants: 20,
      },
      {
        title: "Advanced React Development",
        description:
          "Deep dive into advanced React concepts and best practices",
        duration: 24, // hours
        type: "TECHNICAL",
        instructor: "Michael Chen",
        maxParticipants: 30,
      },
      {
        title: "Data Security and Privacy",
        description:
          "Understanding data protection regulations and security best practices",
        duration: 8, // hours
        type: "COMPLIANCE",
        instructor: "Robert Davis",
        maxParticipants: 50,
      },
      {
        title: "Effective Communication Skills",
        description:
          "Improve interpersonal and presentation communication skills",
        duration: 12, // hours
        type: "SOFT_SKILLS",
        instructor: "Jennifer Wilson",
        maxParticipants: 25,
      },
      {
        title: "Cloud Infrastructure Management",
        description: "Learn to manage and optimize cloud-based infrastructure",
        duration: 20, // hours
        type: "TECHNICAL",
        instructor: "David Brown",
        maxParticipants: 20,
      },
      {
        title: "Project Management Fundamentals",
        description:
          "Introduction to project management principles and methodologies",
        duration: 14, // hours
        type: "SOFT_SKILLS",
        instructor: "Lisa Anderson",
        maxParticipants: 30,
      },
    ];

    for (const program of programData) {
      // Generate start and end dates
      const startDate = randomDate(
        new Date(),
        new Date(new Date().setMonth(new Date().getMonth() + 3))
      );
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + Math.ceil(program.duration / 8)); // Assuming 8 hours per day

      try {
        const newProgram = await prisma.trainingProgram.create({
          data: {
            ...program,
            startDate: startDate,
            endDate: endDate,
            status: "SCHEDULED",
          },
        });

        trainingPrograms.push(newProgram);
        console.log(`✅ Created training program: ${program.title}`);
      } catch (error) {
        console.error("Error creating training program:", error);
      }
    }
  } else {
    trainingPrograms = existingPrograms;
  }

  if (trainingPrograms.length === 0) {
    console.log("❌ No training programs available.");
    return;
  }

  // For each employee, generate training enrollments
  for (const employee of employees) {
    console.log(
      `Generating training records for ${employee.firstName} ${employee.lastName}...`
    );

    // Each employee enrolls in 1-3 programs
    const numEnrollments = randomInt(1, 3);
    const shuffledPrograms = [...trainingPrograms].sort(
      () => 0.5 - Math.random()
    );
    const selectedPrograms = shuffledPrograms.slice(0, numEnrollments);

    for (const program of selectedPrograms) {
      // Random status with weights
      const statusWeights = [
        { status: "ENROLLED", weight: 30 },
        { status: "IN_PROGRESS", weight: 40 },
        { status: "COMPLETED", weight: 25 },
        { status: "DROPPED", weight: 5 },
      ];

      let status = "IN_PROGRESS";
      const rand = Math.random() * 100;
      let cumulativeWeight = 0;

      for (const weight of statusWeights) {
        cumulativeWeight += weight.weight;
        if (rand <= cumulativeWeight) {
          status = weight.status;
          break;
        }
      }

      // Generate progress based on status
      let progress = 0;
      if (status === "IN_PROGRESS") {
        progress = randomInt(20, 80);
      } else if (status === "COMPLETED") {
        progress = 100;
      }

      // Generate completion date if completed
      let completedAt = null;
      let certificateUrl = null;

      if (status === "COMPLETED") {
        completedAt = randomDate(program.startDate, program.endDate);
        certificateUrl = `https://company.com/certificates/${employee.id}-${program.id}.pdf`;
      }

      try {
        // Check if enrollment already exists
        const existingEnrollment = await prisma.trainingEnrollment.findUnique({
          where: {
            employeeId_programId: {
              employeeId: employee.id,
              programId: program.id,
            },
          },
        });

        if (existingEnrollment) {
          console.log(
            `⏭️  ${employee.firstName} ${employee.lastName} already enrolled in ${program.title}`
          );
          continue;
        }

        await prisma.trainingEnrollment.create({
          data: {
            employeeId: employee.id,
            programId: program.id,
            status: status,
            progress: progress,
            completedAt: completedAt,
            certificateUrl: certificateUrl,
            enrolledAt: randomDate(
              new Date(program.startDate.getTime() - 30 * 24 * 60 * 60 * 1000),
              program.startDate
            ),
          },
        });

        console.log(
          `✅ Enrolled ${employee.firstName} ${employee.lastName} in ${program.title} (${status})`
        );
      } catch (error) {
        console.error("Error creating training enrollment:", error);
      }
    }
  }

  console.log(
    "✅ Training programs and learning records generation completed!"
  );
}

async function main() {
  try {
    await generateTrainingRecords();
  } catch (error) {
    console.error("Error in main execution:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
