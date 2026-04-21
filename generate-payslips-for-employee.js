const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Function to generate payslip HTML (copied from the API route)
function generatePayslipHtml(payrollRecord) {
  const employee = payrollRecord.employee;
  const allowances = payrollRecord.allowances || {};
  const deductions = payrollRecord.deductions || {};

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
    }).format(amount);
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const payslipHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payslip - ${employee.firstName} ${employee.lastName}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .payslip-container {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #ddd;
          padding: 20px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 5px;
        }
        .payslip-title {
          font-size: 18px;
          font-weight: bold;
          margin-top: 10px;
        }
        .employee-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .info-section {
          flex: 1;
        }
        .info-row {
          display: flex;
          margin-bottom: 8px;
        }
        .info-label {
          font-weight: bold;
          min-width: 120px;
        }
        .salary-breakdown {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }
        .earnings, .deductions {
          flex: 1;
          border: 1px solid #ddd;
          padding: 15px;
        }
        .section-title {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 1px solid #ddd;
        }
        .amount-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          border-top: 1px solid #ddd;
          padding-top: 8px;
          margin-top: 10px;
        }
        .net-pay {
          text-align: center;
          background-color: #f8f9fa;
          padding: 15px;
          border: 2px solid #28a745;
          margin-top: 20px;
        }
        .net-pay-amount {
          font-size: 24px;
          font-weight: bold;
          color: #28a745;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="payslip-container">
        <div class="header">
          <div class="company-name">Your Company Name</div>
          <div>123 Business Street, City, State 12345</div>
          <div class="payslip-title">SALARY SLIP</div>
          <div>For the month of ${monthNames[payrollRecord.month - 1]} ${
    payrollRecord.year
  }</div>
        </div>

        <div class="employee-info">
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Employee ID:</span>
              <span>${employee.employeeId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span>${employee.firstName} ${employee.lastName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Department:</span>
              <span>${employee.department?.name || "N/A"}</span>
            </div>
          </div>
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Pay Period:</span>
              <span>${new Date(
                payrollRecord.payPeriodStart
              ).toLocaleDateString()} to ${new Date(
    payrollRecord.payPeriodEnd
  ).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date of Payment:</span>
              <span>${new Date().toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Designation:</span>
              <span>${employee.designation?.name || "N/A"}</span>
            </div>
          </div>
        </div>

        <div class="salary-breakdown">
          <div class="earnings">
            <div class="section-title">EARNINGS</div>
            <div class="amount-row">
              <span>Basic Pay</span>
              <span>${formatCurrency(Number(payrollRecord.basicPay))}</span>
            </div>
            ${Object.entries(allowances)
              .map(
                ([key, value]) => `
              <div class="amount-row">
                <span>${key.toUpperCase()}</span>
                <span>${formatCurrency(Number(value))}</span>
              </div>
            `
              )
              .join("")}
            ${
              Number(payrollRecord.overtimePay) > 0
                ? `
              <div class="amount-row">
                <span>Overtime Pay</span>
                <span>${formatCurrency(
                  Number(payrollRecord.overtimePay)
                )}</span>
              </div>
            `
                : ""
            }
            ${
              Number(payrollRecord.bonuses) > 0
                ? `
              <div class="amount-row">
                <span>Bonuses</span>
                <span>${formatCurrency(Number(payrollRecord.bonuses))}</span>
              </div>
            `
                : ""
            }
            <div class="total-row">
              <span>GROSS EARNINGS</span>
              <span>${formatCurrency(Number(payrollRecord.grossPay))}</span>
            </div>
          </div>

          <div class="deductions">
            <div class="section-title">DEDUCTIONS</div>
            ${Object.entries(deductions)
              .filter(([key, value]) => Number(value) > 0)
              .map(
                ([key, value]) => `
              <div class="amount-row">
                <span>${key.toUpperCase()}</span>
                <span>${formatCurrency(Number(value))}</span>
              </div>
            `
              )
              .join("")}
            ${
              Number(payrollRecord.penalties) > 0
                ? `
              <div class="amount-row">
                <span>Penalties</span>
                <span>${formatCurrency(Number(payrollRecord.penalties))}</span>
              </div>
            `
                : ""
            }
            <div class="total-row">
              <span>TOTAL DEDUCTIONS</span>
              <span>${formatCurrency(
                Number(payrollRecord.totalDeductions)
              )}</span>
            </div>
          </div>
        </div>

        <div class="net-pay">
          <div>NET PAY</div>
          <div class="net-pay-amount">${formatCurrency(
            Number(payrollRecord.netPay)
          )}</div>
          <div style="margin-top: 10px; font-size: 14px;">
            <strong>In Words:</strong> ${numberToWords(
              Number(payrollRecord.netPay)
            )} Rupees Only
          </div>
        </div>

        <table style="margin-top: 20px;">
          <tr>
            <th>Statutory Information</th>
            <th>Amount</th>
          </tr>
          <tr>
            <td>Provident Fund (Employee)</td>
            <td>${formatCurrency(Number(payrollRecord.providentFund))}</td>
          </tr>
          <tr>
            <td>Professional Tax</td>
            <td>${formatCurrency(Number(payrollRecord.professionalTax))}</td>
          </tr>
          <tr>
            <td>Income Tax (TDS)</td>
            <td>${formatCurrency(Number(payrollRecord.incomeTax))}</td>
          </tr>
          ${
            Number(payrollRecord.esi) > 0
              ? `
          <tr>
            <td>ESI (Employee State Insurance)</td>
            <td>${formatCurrency(Number(payrollRecord.esi))}</td>
          </tr>
          `
              : ""
          }
        </table>

        <div class="footer">
          <p>This is a computer-generated payslip and does not require a signature.</p>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return payslipHtml;
}

function numberToWords(num) {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if (num === 0) return "Zero";

  if (num < 20) return ones[num];

  if (num < 100)
    return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");

  if (num < 1000)
    return (
      ones[Math.floor(num / 100)] +
      " Hundred" +
      (num % 100 ? " " + numberToWords(num % 100) : "")
    );

  if (num < 100000)
    return (
      numberToWords(Math.floor(num / 1000)) +
      " Thousand" +
      (num % 1000 ? " " + numberToWords(num % 1000) : "")
    );

  if (num < 10000000)
    return (
      numberToWords(Math.floor(num / 100000)) +
      " Lakh" +
      (num % 100000 ? " " + numberToWords(num % 100000) : "")
    );

  return (
    numberToWords(Math.floor(num / 10000000)) +
    " Crore" +
    (num % 10000000 ? " " + numberToWords(num % 10000000) : "")
  );
}

async function generatePayslipsForEmployee() {
  try {
    // Find the employee by email
    const employee = await prisma.employee.findFirst({
      where: {
        user: {
          email: "khurram.iiui@yahoo.com",
        },
      },
      include: {
        user: true,
        payrollRecords: true,
        department: true,
        designation: true,
      },
    });

    if (!employee) {
      console.log("Employee not found with email: khurram.iiui@yahoo.com");
      return;
    }

    console.log("Employee found:", employee.firstName, employee.lastName);
    console.log("Number of payroll records:", employee.payrollRecords.length);

    // Generate payslips for each payroll record
    for (const payrollRecord of employee.payrollRecords) {
      if (payrollRecord.payslipGenerated) {
        console.log(`Payslip already generated for record ${payrollRecord.id}`);
        continue;
      }

      console.log(
        `Generating payslip for record ${payrollRecord.id} (${payrollRecord.month}/${payrollRecord.year})`
      );

      // Generate payslip HTML content
      const payslipHtml = generatePayslipHtml({ ...payrollRecord, employee });

      // Update the payroll record with payslip information
      const payslipUrl = `/api/payroll/payslip/${payrollRecord.id}/download`;

      await prisma.payrollRecord.update({
        where: { id: payrollRecord.id },
        data: {
          payslipGenerated: true,
          payslipUrl,
        },
      });

      console.log(
        `✅ Payslip generated for ${payrollRecord.month}/${payrollRecord.year}`
      );
    }

    console.log("\nAll payslips generated successfully!");
  } catch (error) {
    console.error("Error generating payslips:", error);
  } finally {
    await prisma.$disconnect();
  }
}

generatePayslipsForEmployee();
