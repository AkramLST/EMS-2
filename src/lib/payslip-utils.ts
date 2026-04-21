export function generatePayslipHtml(payrollRecord: any): string {
  const employee = payrollRecord.employee;
  const allowances = payrollRecord.allowances || {};
  const deductions = payrollRecord.deductions || {};

  const formatCurrency = (amount: number) => {
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
          margin-bottom: 20px;
        }
        .info-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px 40px;
        }
        .info-row {
          display: flex;
          flex-direction: row;
          align-items: baseline;
          margin-bottom: 8px;
          text-align: left;
        }
        .info-label {
          font-weight: bold;
          min-width: 130px;
          flex-shrink: 0;
        }
        .info-value {
          flex: 1;
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
          <div class="company-name">Linesquare Technologies (SMC-Private) Limited</div>
          <div class="payslip-title">SALARY SLIP</div>
          <div>${monthNames[payrollRecord.month - 1]} ${
    payrollRecord.year
  }</div>
        </div>

        <div class="employee-info">
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Employee Name:</span>
              <span class="info-value">${employee.firstName} ${
    employee.lastName
  }</span>
            </div>
            <div class="info-row">
              <span class="info-label">Employee ID:</span>
              <span class="info-value">${employee.employeeId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Designation:</span>
              <span class="info-value">${
                typeof employee.designation === "string"
                  ? employee.designation
                  : employee.designation?.title ?? "Not specified"
              }</span>
            </div>
            <div class="info-row">
              <span class="info-label">Department:</span>
              <span class="info-value">${employee.department.name}</span>
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
                <span>${key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}</span>
                <span>${formatCurrency(Number(value))}</span>
              </div>
            `
              )
              .join("")}
            ${
              Number(payrollRecord.overtimePay) > 0
                ? `
              <div class="amount-row">
                <span>Overtime Pay (${Number(
                  payrollRecord.overtimeHours
                ).toFixed(1)} hrs)</span>
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
              <span>TOTAL EARNINGS</span>
              <span>${formatCurrency(
                Number(payrollRecord.totalEarnings)
              )}</span>
            </div>
          </div>

          <div class="deductions">
            <div class="section-title">DEDUCTIONS</div>
            ${Object.entries(deductions)
              .map(
                ([key, value]) => `
              <div class="amount-row">
                <span>${key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}</span>
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

function numberToWords(num: number): string {
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

  const scales = ["", "Thousand", "Lakh", "Crore"];

  if (num === 0) return "Zero";

  let result = "";
  let scaleIndex = 0;

  while (num > 0) {
    let chunk = 0;

    if (scaleIndex === 0) {
      chunk = num % 1000;
      num = Math.floor(num / 1000);
    } else {
      chunk = num % 100;
      num = Math.floor(num / 100);
    }

    if (chunk !== 0) {
      let chunkText = "";

      if (scaleIndex === 0) {
        // Handle hundreds
        if (chunk >= 100) {
          chunkText += ones[Math.floor(chunk / 100)] + " Hundred ";
          chunk %= 100;
        }
      }

      // Handle tens and ones
      if (chunk >= 20) {
        chunkText += tens[Math.floor(chunk / 10)] + " ";
        chunk %= 10;
      }

      if (chunk > 0) {
        chunkText += ones[chunk] + " ";
      }

      result = chunkText + scales[scaleIndex] + " " + result;
    }

    scaleIndex++;
  }

  return result.trim();
}
