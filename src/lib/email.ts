import nodemailer from "nodemailer";

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    console.log("Attempting to send email...");
    console.log("Email configuration:", {
      host: process.env.EMAIL_SERVER_HOST,
      port: process.env.EMAIL_SERVER_PORT,
      user: process.env.EMAIL_SERVER_USER,
      from: process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER,
    });

    const mailOptions = {
      from: `"${process.env.COMPANY_NAME || "Employee Management System"}" <${
        process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER
      }>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    console.log("Sending email to:", options.to);
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
}

// Email templates
export const emailTemplates = {
  welcomeUser: (
    name: string,
    resetLink: string,
    companyName: string = "Employee Management System"
  ) => ({
    subject: `Welcome to ${companyName} - Set Your Password`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${companyName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${companyName}</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>Your account has been created successfully! To get started, you need to set up your password.</p>
            
            <p>Click the button below to set your password and access your account:</p>
            
            <a href="${resetLink}" class="button">Set My Password</a>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4f46e5;">${resetLink}</p>
            
            <p><strong>Important:</strong> This link will expire in 24 hours for security reasons.</p>
            
            <p>If you have any questions or need assistance, please contact your administrator.</p>
            
            <p>Best regards,<br>The ${companyName} Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to ${companyName}!
      
      Hello ${name},
      
      Your account has been created successfully! To get started, you need to set up your password.
      
      Please visit the following link to set your password:
      ${resetLink}
      
      This link will expire in 24 hours for security reasons.
      
      If you have any questions or need assistance, please contact your administrator.
      
      Best regards,
      The ${companyName} Team
    `,
  }),

  passwordReset: (
    name: string,
    resetLink: string,
    companyName: string = "Employee Management System"
  ) => ({
    subject: "Password Reset Request",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>We received a request to reset your password for your ${companyName} account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <a href="${resetLink}" class="button">Reset My Password</a>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #dc2626;">${resetLink}</p>
            
            <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
            
            <p>If you didn't request this password reset, please ignore this email or contact your administrator if you have concerns.</p>
            
            <p>Best regards,<br>The ${companyName} Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Password Reset Request
      
      Hello ${name},
      
      We received a request to reset your password for your ${companyName} account.
      
      Please visit the following link to reset your password:
      ${resetLink}
      
      This link will expire in 1 hour for security reasons.
      
      If you didn't request this password reset, please ignore this email or contact your administrator if you have concerns.
      
      Best regards,
      The ${companyName} Team
    `,
  }),
};

// Utility function to generate password reset token
export function generateResetToken(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

// Utility function to create reset link
export function createResetLink(
  token: string,
  isNewUser: boolean = false
): string {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const path = isNewUser ? "/auth/set-password" : "/auth/reset-password";
  return `${baseUrl}${path}?token=${token}`;
}
