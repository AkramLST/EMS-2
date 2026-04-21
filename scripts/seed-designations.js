const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedDesignations() {
  const designations = [
    "Accounts Executive",
    "AI/ML Engineer",
    "Architect (Solution / Enterprise / Technical)",
    "Associate Engineer",
    "Associate Product Manager",
    "Associate Software Engineer",
    "Business Analyst",
    "Business Development Executive (BDE)",
    "Business Development Manager (BDM)",
    "Chairman",
    "Chief Executive Officer (CEO)",
    "Chief Financial Officer (CFO)",
    "Chief Information Officer (CIO)",
    "Chief Information Security Officer (CISO)",
    "Chief Operating Officer (COO)",
    "Chief Technology Officer (CTO)",
    "Cloud Engineer",
    "Cybersecurity Analyst",
    "Data Analyst",
    "Data Engineer",
    "Data Scientist",
    "Delivery Manager",
    "Developer (Frontend / Backend / Full Stack / Mobile)",
    "DevOps Engineer",
    "Digital Marketing Specialist",
    "Director (Engineering / Product / HR / Operations / Finance)",
    "Distinguished Engineer",
    "Enterprise Architect",
    "Finance Analyst",
    "Finance Manager",
    "Founder / Co-founder",
    "Head of HR",
    "Head of Marketing",
    "Head of Operations",
    "HR Associate",
    "HR Business Partner",
    "HR Executive",
    "HR Manager",
    "Intern / Trainee",
    "IT Manager",
    "IT Support Engineer",
    "Lead Engineer / Tech Lead",
    "Learning & Development Manager",
    "Manager (Engineering / Project / Product / QA / HR)",
    "Marketing Manager",
    "Module Lead",
    "Network Engineer",
    "Operations Manager",
    "Payroll Specialist",
    "Principal Engineer",
    "Product Manager",
    "Product Owner",
    "Program Manager",
    "Project Manager",
    "QA Engineer / Test Engineer",
    "QA Lead / Test Lead",
    "QA Manager / Test Manager",
    "Recruiter / Talent Acquisition Specialist",
    "Security Engineer",
    "Senior Architect",
    "Senior Business Analyst",
    "Senior Developer / Senior Software Engineer",
    "Senior HR Manager",
    "Senior Manager (Sales / Marketing / Finance)",
    "Senior QA Engineer",
    "Senior Software Engineer",
    "Software Engineer",
    "Solution Architect",
    "Scrum Master",
    "Social Media Manager",
    "System Administrator",
    "Team Lead",
    "Technical Writer",
    "Trainee Engineer",
    "UI/UX Designer",
    "Vice President (VP)",
  ];

  console.log("Seeding designations...");

  try {
    for (const title of designations) {
      // Check if designation already exists
      const existingDesignation = await prisma.designation.findFirst({
        where: {
          title: {
            equals: title,
            mode: "insensitive",
          },
        },
      });

      if (!existingDesignation) {
        await prisma.designation.create({
          data: {
            title,
            description: null,
          },
        });
        console.log(`Added designation: ${title}`);
      } else {
        console.log(`Designation already exists: ${title}`);
      }
    }

    console.log("Designation seeding completed!");
  } catch (error) {
    console.error("Error seeding designations:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDesignations();
