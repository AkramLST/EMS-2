import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, "payroll.read_all")) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { templateId, grossSalary, customAllowances, customDeductions } =
      data;

    if (!templateId || !grossSalary) {
      return NextResponse.json(
        { message: "Template ID and gross salary are required" },
        { status: 400 }
      );
    }

    // Get the template
    const template = await prisma.salaryTemplate.findUnique({
      where: { id: templateId, isActive: true },
    });

    if (!template) {
      return NextResponse.json(
        { message: "Template not found" },
        { status: 404 }
      );
    }

    const grossAmount = parseFloat(grossSalary);
    let basicSalary = 0;

    // Calculate basic salary
    if (template.isPercentageBased && template.basicSalaryPercent) {
      basicSalary = (grossAmount * Number(template.basicSalaryPercent)) / 100;
    } else if (template.basicSalaryFixed) {
      basicSalary = Number(template.basicSalaryFixed);
    }

    // Calculate allowances from template
    const allowancesTemplate = template.allowancesTemplate as any;
    const calculatedAllowances: any = {};
    let totalAllowances = 0;

    if (allowancesTemplate) {
      Object.entries(allowancesTemplate).forEach(
        ([key, config]: [string, any]) => {
          let amount = 0;
          if (config.type === "percentage") {
            amount = (grossAmount * parseFloat(config.value)) / 100;
          } else {
            amount = parseFloat(config.value);
          }
          calculatedAllowances[key] = amount;
          totalAllowances += amount;
        }
      );
    }

    // Add custom allowances
    if (customAllowances) {
      Object.entries(customAllowances).forEach(
        ([key, value]: [string, any]) => {
          const amount = parseFloat(value || 0);
          calculatedAllowances[key] = amount;
          totalAllowances += amount;
        }
      );
    }

    // Calculate deductions from template
    const deductionsTemplate = template.deductionsTemplate as any;
    const calculatedDeductions: any = {};
    let totalDeductions = 0;

    if (deductionsTemplate) {
      Object.entries(deductionsTemplate).forEach(
        ([key, config]: [string, any]) => {
          let amount = 0;
          if (config.type === "percentage") {
            amount = (grossAmount * parseFloat(config.value)) / 100;
          } else {
            amount = parseFloat(config.value);
          }
          calculatedDeductions[key] = amount;
          totalDeductions += amount;
        }
      );
    }

    // Add custom deductions
    if (customDeductions) {
      Object.entries(customDeductions).forEach(
        ([key, value]: [string, any]) => {
          const amount = parseFloat(value || 0);
          calculatedDeductions[key] = amount;
          totalDeductions += amount;
        }
      );
    }

    // Calculate final amounts
    const netSalary = grossAmount - totalDeductions;
    const ctc = grossAmount + totalAllowances;

    // Calculate tax estimates (simplified)
    let incomeTax = 0;
    let professionalTax = 0;
    let providentFund = 0;

    // PF calculation (12% of basic salary, max limit)
    const pfRate = 0.12;
    const pfMaxLimit = 21600; // Annual limit as per current rules
    providentFund = Math.min(basicSalary * 12 * pfRate, pfMaxLimit) / 12;

    // Professional tax (varies by state, using average)
    if (grossAmount > 10000) {
      professionalTax = 200;
    }

    // Income tax (simplified calculation)
    const annualIncome = netSalary * 12;
    if (annualIncome > 250000) {
      const taxableIncome = annualIncome - 250000;
      if (taxableIncome <= 250000) {
        incomeTax = (taxableIncome * 0.05) / 12;
      } else if (taxableIncome <= 750000) {
        incomeTax = (250000 * 0.05 + (taxableIncome - 250000) * 0.1) / 12;
      } else {
        incomeTax =
          (250000 * 0.05 + 500000 * 0.1 + (taxableIncome - 750000) * 0.15) / 12;
      }
    }

    const calculation = {
      template: {
        id: template.id,
        name: template.name,
        isPercentageBased: template.isPercentageBased,
      },
      grossSalary: grossAmount,
      basicSalary,
      allowances: calculatedAllowances,
      totalAllowances,
      deductions: calculatedDeductions,
      totalDeductions,
      netSalary,
      ctc,
      taxEstimates: {
        incomeTax: Math.round(incomeTax),
        professionalTax,
        providentFund: Math.round(providentFund),
      },
      breakdown: {
        basicSalaryPercent: template.isPercentageBased
          ? Number(template.basicSalaryPercent)
          : null,
        allowanceBreakdown: allowancesTemplate,
        deductionBreakdown: deductionsTemplate,
      },
    };

    return NextResponse.json({ calculation });
  } catch (error) {
    console.error("Calculate salary error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
