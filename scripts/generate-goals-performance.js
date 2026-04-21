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

// Helper function to generate random decimal
function randomDecimal(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

async function generateGoalsAndPerformanceReviews() {
  console.log("🌱 Generating goals and performance reviews...");

  // Get all employees
  const employees = await prisma.employee.findMany();

  if (employees.length === 0) {
    console.log("❌ No employees found. Please seed employees first.");
    return;
  }

  // For each employee, generate goals and performance reviews
  for (const employee of employees) {
    console.log(
      `Generating goals and performance reviews for ${employee.firstName} ${employee.lastName}...`
    );

    // Generate 3-5 goals per employee
    const numGoals = randomInt(3, 5);

    for (let i = 0; i < numGoals; i++) {
      // Generate goal data
      const goalTitles = [
        "Improve coding efficiency",
        "Complete professional certification",
        "Enhance team collaboration",
        "Reduce bug count by 20%",
        "Increase customer satisfaction scores",
        "Lead a project successfully",
        "Improve documentation quality",
        "Mentor junior developers",
        "Learn new technology stack",
        "Optimize database queries",
      ];

      const goalDescriptions = [
        "Focus on writing cleaner, more efficient code",
        "Pursue relevant professional certifications",
        "Work on improving communication and teamwork",
        "Implement better testing practices to reduce bugs",
        "Strive to exceed customer expectations in all interactions",
        "Take ownership of a key project and deliver successfully",
        "Create comprehensive and clear technical documentation",
        "Provide guidance and support to less experienced team members",
        "Acquire skills in emerging technologies relevant to our work",
        "Identify and implement database performance improvements",
      ];

      const title = goalTitles[Math.floor(Math.random() * goalTitles.length)];
      const description =
        goalDescriptions[Math.floor(Math.random() * goalDescriptions.length)];

      // Generate target date (within next 3-12 months)
      const targetDate = randomDate(
        new Date(new Date().setMonth(new Date().getMonth() + 3)),
        new Date(new Date().setMonth(new Date().getMonth() + 12))
      );

      // Random status with weights
      const statusWeights = [
        { status: "NOT_STARTED", weight: 20 },
        { status: "IN_PROGRESS", weight: 50 },
        { status: "COMPLETED", weight: 25 },
        { status: "CANCELLED", weight: 5 },
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

      // Generate progress (0-100%)
      let progress = 0;
      if (status === "NOT_STARTED") {
        progress = 0;
      } else if (status === "IN_PROGRESS") {
        progress = randomInt(20, 80);
      } else if (status === "COMPLETED") {
        progress = 100;
      }

      try {
        await prisma.goal.create({
          data: {
            employeeId: employee.id,
            title: title,
            description: description,
            targetDate: targetDate,
            status: status,
            progress: progress,
          },
        });

        console.log(`✅ Generated goal: ${title}`);
      } catch (error) {
        console.error("Error creating goal:", error);
      }
    }

    // Generate 1-2 performance reviews per employee
    const numReviews = randomInt(1, 2);

    for (let i = 0; i < numReviews; i++) {
      // Generate review data
      const reviewTypes = ["QUARTERLY", "HALF_YEARLY", "ANNUAL"];
      const reviewType =
        reviewTypes[Math.floor(Math.random() * reviewTypes.length)];

      const reviewPeriods = [
        "Q1 2024",
        "Q2 2024",
        "Q3 2024",
        "Q4 2024",
        "H1 2024",
        "H2 2024",
        "FY 2024",
      ];
      const reviewPeriod =
        reviewPeriods[Math.floor(Math.random() * reviewPeriods.length)];

      // Generate overall rating (1.0-5.0)
      const overallRating = randomDecimal(2.5, 5.0);

      // Generate goals JSON (simplified)
      const goals = [
        { name: "Quality of Work", rating: randomDecimal(3.0, 5.0) },
        { name: "Productivity", rating: randomDecimal(3.0, 5.0) },
        { name: "Team Collaboration", rating: randomDecimal(3.0, 5.0) },
        { name: "Communication Skills", rating: randomDecimal(3.0, 5.0) },
        { name: "Problem Solving", rating: randomDecimal(3.0, 5.0) },
      ];

      // Generate review text
      const achievements = [
        "Consistently delivered high-quality work on time",
        "Successfully led the XYZ project to completion",
        "Improved team communication through regular check-ins",
        "Implemented process improvements that saved 10 hours per week",
        "Mentored two junior developers who have shown significant improvement",
      ];

      const areasOfImprovement = [
        "Could benefit from additional training in new technologies",
        "Needs to improve time management for complex tasks",
        "Should take more initiative in team meetings",
        "Could work on providing more detailed project updates",
        "Would benefit from leadership development opportunities",
      ];

      const reviewerComments = [
        "Strong technical skills and reliable team member",
        "Shows great potential for growth and leadership",
        "Consistent performer with room for advancement",
        "Valuable contributor to the team's success",
        "Demonstrates commitment to continuous learning",
      ];

      // Random status with weights
      const reviewStatusWeights = [
        { status: "DRAFT", weight: 10 },
        { status: "SUBMITTED", weight: 30 },
        { status: "COMPLETED", weight: 60 },
      ];

      let reviewStatus = "COMPLETED";
      const reviewRand = Math.random() * 100;
      let reviewCumulativeWeight = 0;

      for (const weight of reviewStatusWeights) {
        reviewCumulativeWeight += weight.weight;
        if (reviewRand <= reviewCumulativeWeight) {
          reviewStatus = weight.status;
          break;
        }
      }

      try {
        await prisma.performanceReview.create({
          data: {
            employeeId: employee.id,
            reviewPeriod: reviewPeriod,
            reviewType: reviewType,
            overallRating: overallRating,
            goals: goals,
            achievements:
              achievements[Math.floor(Math.random() * achievements.length)],
            areasOfImprovement:
              areasOfImprovement[
                Math.floor(Math.random() * areasOfImprovement.length)
              ],
            reviewerComments:
              reviewerComments[
                Math.floor(Math.random() * reviewerComments.length)
              ],
            status: reviewStatus,
          },
        });

        console.log(
          `✅ Generated ${reviewType} performance review for ${reviewPeriod}`
        );
      } catch (error) {
        console.error("Error creating performance review:", error);
      }
    }
  }

  console.log("✅ Goals and performance reviews generation completed!");
}

async function main() {
  try {
    await generateGoalsAndPerformanceReviews();
  } catch (error) {
    console.error("Error in main execution:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
