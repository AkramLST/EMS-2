# Employee Management System - Complete Application Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Authentication Flow](#authentication-flow)
4. [Role-Based Application Flows](#role-based-application-flows)
5. [Feature-Specific Workflows](#feature-specific-workflows)
6. [API Documentation](#api-documentation)
7. [Database Schema](#database-schema)
8. [Technical Architecture](#technical-architecture)

---

## System Overview

### Project Information

- **Technology Stack**: Next.js 14, React 18, TypeScript, PostgreSQL, Prisma ORM, Tailwind CSS
- **Architecture**: Full-stack web application with API routes and server-side rendering
- **Authentication**: JWT-based with bcrypt password hashing
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Vercel/Railway compatible

### Core Features

- Employee Information Management
- Attendance & Time Tracking with Real-time Clock
- Comprehensive Payroll & Compensation System
- Performance Management & Appraisals
- Training & Development Programs
- Inventory & Asset Management
- Advanced Analytics & Reporting
- Role-Based Access Control (RBAC)

---

## User Roles & Permissions

### 1. ADMINISTRATOR (Super Admin)

**Description**: Full control over the system including user management, role assignment, company configuration, and security management.

**Permissions**:

- All system permissions (full access)
- User management and role assignment
- System configuration
- Security management
- Data backup and restore
- Audit trail access

**Dashboard Access**:

- Complete statistics dashboard
- All menu items accessible
- System administration tools

### 2. HR_MANAGER

**Description**: Manages employee lifecycle including onboarding, profile maintenance, leave/attendance management, performance reviews, and payroll setup.

**Permissions**:

- Employee CRUD operations
- Attendance management
- Leave management and approval
- Payroll setup and processing
- Performance review management
- Training program management
- Department management
- Reports generation

**Dashboard Access**:

- HR-specific statistics
- Employee management tools
- Payroll processing interface
- Performance tracking

### 3. DEPARTMENT_MANAGER

**Description**: Oversees department/team with approval authority for leave and attendance requests, task assignment, and team performance tracking.

**Permissions**:

- Team member management (view/edit)
- Leave approval for team members
- Attendance oversight
- Performance review (team members)
- Training assignment
- Department reports

**Dashboard Access**:

- Department-specific statistics
- Team management interface
- Approval workflows
- Department reports

### 4. EMPLOYEE

**Description**: Regular staff with access to personal data management, leave applications, attendance submission, and salary slip viewing.

**Permissions**:

- Personal profile management
- Attendance marking (clock-in/out)
- Leave applications
- Payslip viewing
- Training enrollment
- Performance review participation

**Dashboard Access**:

- Personal statistics only
- Limited menu access
- Self-service features

### 5. PAYROLL_OFFICER

**Description**: Finance-focused role with salary structure configuration, payroll processing, compliance reports, and financial auditing capabilities.

**Permissions**:

- Salary structure management
- Payroll processing
- Financial reports
- Compliance reporting
- Tax calculations
- Payslip generation

**Dashboard Access**:

- Payroll-specific statistics
- Financial reporting tools
- Salary management interface

### 6. SYSTEM_AUDITOR

**Description**: Read-only oversight role with access to employee records, payroll logs, compliance reporting, and audit trails.

**Permissions**:

- Read-only access to all records
- Audit trail viewing
- Compliance reports
- System logs access
- Data export capabilities

**Dashboard Access**:

- Audit-specific dashboard
- Read-only interfaces
- Compliance monitoring tools

---

## Authentication Flow

### Login Process

1. **User Access**: Navigate to `/login`
2. **Credential Entry**: Email and password input
3. **Server Validation**:
   - Validate credentials against database
   - Check user status (active/inactive)
   - Verify role permissions
4. **JWT Token Generation**: Create secure JWT token
5. **Cookie Setting**: Set authentication cookie with security flags
6. **Role-Based Redirect**: Redirect to appropriate dashboard based on role
7. **Session Management**: Maintain session with automatic token refresh

### Registration Process (Admin Only)

1. **Admin Access**: Only HR_MANAGER and ADMINISTRATOR can create accounts
2. **Employee Data Entry**: Complete employee information form
3. **User Account Creation**:
   - Generate user account with default password ('employee123')
   - Hash password with bcrypt
   - Assign appropriate role
4. **Email Notification**: Send welcome email with login instructions
5. **Profile Completion**: Employee completes profile on first login

### Logout Process

1. **User Initiation**: Click logout from header dropdown
2. **Token Invalidation**: Clear authentication cookies
3. **Session Cleanup**: Remove client-side session data
4. **Redirect**: Return to login page

---

## Role-Based Application Flows

### ADMINISTRATOR Flow

#### Dashboard Overview

```
Login → Admin Dashboard → Full System Access
├── Employee Management (Full CRUD)
├── Department Management
├── Role & Permission Management
├── System Configuration
├── Payroll Administration
├── Inventory Management
├── Reports & Analytics
├── Audit Trails
└── Security Settings
```

#### Key Workflows

1. **User Management**:

   - Create/Edit/Delete user accounts
   - Assign/Modify roles and permissions
   - Reset passwords
   - Activate/Deactivate accounts

2. **System Configuration**:

   - Company settings
   - Holiday calendar management
   - Leave type configuration
   - Department structure setup

3. **Security Management**:
   - Role-based access control
   - Permission matrix management
   - Security audit reviews

### HR_MANAGER Flow

#### Dashboard Overview

```
Login → HR Dashboard → HR Operations
├── Employee Lifecycle Management
├── Attendance Oversight
├── Leave Management & Approval
├── Payroll Processing
├── Performance Management
├── Training Programs
├── Recruitment (if applicable)
└── HR Reports
```

#### Key Workflows

1. **Employee Onboarding**:

   ```
   New Hire Request → Create Employee Profile → Generate User Account →
   Assign Department & Role → Setup Salary Structure → Send Welcome Email
   ```

2. **Payroll Processing**:

   ```
   Month End → Attendance Review → Salary Calculations →
   Deductions Processing → Payslip Generation → Approval → Distribution
   ```

3. **Leave Management**:
   ```
   Leave Request Review → Manager Consultation → Approval/Rejection →
   Calendar Update → Employee Notification
   ```

### DEPARTMENT_MANAGER Flow

#### Dashboard Overview

```
Login → Manager Dashboard → Team Management
├── Team Member Overview
├── Leave Approval Queue
├── Attendance Monitoring
├── Performance Reviews
├── Training Assignments
└── Department Reports
```

#### Key Workflows

1. **Leave Approval Process**:

   ```
   Leave Request Notification → Review Request Details →
   Check Team Coverage → Approve/Reject → Employee Notification
   ```

2. **Performance Management**:

   ```
   Review Cycle Start → Set Goals → Regular Check-ins →
   Mid-term Review → Final Evaluation → Rating Submission
   ```

3. **Team Attendance Monitoring**:
   ```
   Daily Attendance Review → Irregular Pattern Detection →
   Manager Investigation → Corrective Action → HR Escalation (if needed)
   ```

### EMPLOYEE Flow

#### Dashboard Overview

```
Login → Employee Dashboard → Self-Service Portal
├── Personal Information Management
├── Attendance Marking (Clock In/Out)
├── Leave Applications
├── Payslip Downloads
├── Training Enrollment
├── Performance Reviews
└── Team Information
```

#### Key Workflows

1. **Daily Attendance**:

   ```
   Login → Dashboard → Clock In → Work Activities →
   Break Management → Clock Out → Timesheet Review
   ```

2. **Leave Application**:

   ```
   Leave Planning → Application Submission → Manager Notification →
   Approval Tracking → Calendar Integration → Leave Taking
   ```

3. **Profile Management**:
   ```
   Profile Access → Information Review → Edit Personal Details →
   Document Upload → Save Changes → Verification
   ```

### PAYROLL_OFFICER Flow

#### Dashboard Overview

```
Login → Payroll Dashboard → Financial Operations
├── Salary Structure Management
├── Monthly Payroll Processing
├── Tax Calculations
├── Statutory Compliance
├── Payslip Generation
├── Financial Reports
└── Audit Trails
```

#### Key Workflows

1. **Monthly Payroll Processing**:

   ```
   Month-End Trigger → Attendance Data Collection →
   Salary Calculations → Tax Deductions → Statutory Deductions →
   Final Validation → Payslip Generation → Bank File Preparation
   ```

2. **Salary Structure Management**:
   ```
   Template Creation → Component Definition →
   Employee Assignment → Calculation Testing → Approval → Implementation
   ```

### SYSTEM_AUDITOR Flow

#### Dashboard Overview

```
Login → Audit Dashboard → Monitoring & Compliance
├── System Activity Logs
├── Data Access Reports
├── Compliance Monitoring
├── Security Audit
├── Data Integrity Checks
└── Audit Reports
```

#### Key Workflows

1. **Compliance Monitoring**:

   ```
   Scheduled Review → Data Collection → Compliance Check →
   Issue Identification → Report Generation → Stakeholder Notification
   ```

2. **Audit Trail Review**:
   ```
   Audit Request → Log Analysis → Pattern Detection →
   Risk Assessment → Report Compilation → Management Briefing
   ```

---

## Feature-Specific Workflows

### Attendance Management

#### Clock-In/Clock-Out Process

```
Employee Login → Dashboard → Clock In Button →
Real-time Timer Start → Work Period → Clock Out Button →
Automatic Calculation → Time Sheet Update
```

#### Attendance Monitoring (Admin/HR)

```
Attendance Dashboard → Filter Selection (Today/Week/Month/Year) →
Employee Selection → Attendance History Review →
Irregular Pattern Detection → Corrective Action
```

#### Features:

- Real-time clock with hours:minutes:seconds display
- Automatic overtime calculation
- Attendance status tracking (Present, Absent, Late, Half-day)
- Admin view of individual employee records
- Filter options: Today, This Week, This Month, This Year
- Click-outside dropdown behavior

### Leave Management

#### Employee Leave Application

```
Leave Planning → Leave Type Selection → Date Range Selection →
Reason Entry → Manager Assignment → Submission →
Approval Tracking → Calendar Integration
```

#### Manager Approval Process

```
Leave Request Notification → Request Details Review →
Team Impact Assessment → Approval Decision →
Employee Notification → Calendar Update
```

#### Features:

- Multiple leave types (Casual, Sick, Annual, Maternity, etc.)
- Leave balance tracking
- Approval workflow with email notifications
- Calendar integration
- Leave history and reports

### Payroll System

#### Salary Template Management

```
Template Creation → Component Definition (Basic, Allowances, Deductions) →
Percentage/Fixed Amount Setup → Role Assignment →
Testing & Validation → Template Activation
```

#### Employee Salary Assignment

```
Employee Selection → Template Selection → Salary Input →
Real-time Calculation → Custom Adjustments →
Review & Approval → Structure Assignment
```

#### Monthly Payroll Processing

```
Month-End Trigger → Employee Data Collection →
Attendance Integration → Salary Calculations →
Tax & Statutory Deductions → Final Review →
Payslip Generation → Distribution
```

#### Salary Revision System

```
Revision Request → Current Salary Review →
New Salary Calculation → Justification Entry →
Approval Workflow → Implementation → History Update
```

#### Features:

- Reusable salary templates
- Automated tax calculations (Income Tax, PF, Professional Tax)
- Real-time salary calculations
- Comprehensive payslip generation
- Salary revision tracking with complete history
- Monthly payroll runs with attendance integration

### Performance Management

#### Goal Setting Process

```
Review Cycle Start → Goal Definition →
Manager Discussion → Goal Assignment →
Progress Tracking → Mid-term Review → Final Evaluation
```

#### Performance Review Workflow

```
Review Period Setup → Self-Assessment →
Manager Evaluation → Peer Feedback (optional) →
Rating Compilation → Development Planning →
Review Documentation
```

### Training & Development

#### Training Program Management

```
Program Creation → Content Development →
Participant Assignment → Schedule Setup →
Progress Tracking → Completion Certification →
Effectiveness Evaluation
```

#### Employee Training Enrollment

```
Available Programs Review → Interest Expression →
Manager Approval → Enrollment Confirmation →
Training Participation → Assessment → Certification
```

### Inventory & Asset Management

#### Asset Management Workflow

```
Asset Registration → Category Assignment →
Location Tracking → Employee Assignment →
Maintenance Scheduling → Lifecycle Management →
Disposal/Transfer
```

#### Maintenance Management

```
Maintenance Schedule Creation → Service Provider Assignment →
Maintenance Execution → Cost Tracking →
Performance Evaluation → Next Schedule Planning
```

#### Features:

- Complete asset lifecycle management
- Assignment tracking with employee mapping
- Maintenance scheduling (Preventive, Corrective, Emergency, Warranty)
- Real-time inventory monitoring
- Comprehensive asset reports

---

## API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout
- `POST /api/auth/register` - User registration (Admin only)
- `GET /api/auth/me` - Get current user info

### Employee Management

- `GET /api/employees` - List all employees
- `POST /api/employees` - Create new employee
- `GET /api/employees/[id]` - Get employee details
- `PUT /api/employees/[id]` - Update employee
- `DELETE /api/employees/[id]` - Delete employee

### Attendance Management

- `GET /api/attendance/history` - Get attendance history
- `POST /api/attendance/clock-in` - Clock in
- `POST /api/attendance/clock-out` - Clock out
- `GET /api/attendance/status` - Get current status

### Leave Management

- `GET /api/leave/applications` - Get leave applications
- `POST /api/leave/applications` - Submit leave application
- `PUT /api/leave/applications/[id]` - Update leave status
- `GET /api/leave/types` - Get leave types
- `GET /api/leave/balance` - Get leave balance

### Payroll System

- `GET /api/payroll/templates` - Get salary templates
- `POST /api/payroll/templates` - Create salary template
- `GET /api/payroll/employee-salary` - Get employee salaries
- `POST /api/payroll/employee-salary` - Assign salary structure
- `POST /api/payroll/calculate` - Calculate salary
- `GET /api/payroll/revisions` - Get salary revisions
- `POST /api/payroll/revisions` - Create salary revision
- `POST /api/payroll/monthly-run` - Process monthly payroll
- `POST /api/payroll/payslip` - Generate payslip
- `GET /api/payroll/records` - Get payroll records

### Performance Management

- `GET /api/performance/reviews` - Get performance reviews
- `POST /api/performance/reviews` - Create performance review
- `GET /api/performance/goals` - Get performance goals
- `POST /api/performance/goals` - Create performance goal

### Training Management

- `GET /api/training/programs` - Get training programs
- `POST /api/training/programs` - Create training program
- `POST /api/training/enroll` - Enroll in training

### Inventory Management

- `GET /api/inventory/assets` - Get all assets
- `POST /api/inventory/assets` - Create new asset
- `PUT /api/inventory/assets/[id]` - Update asset
- `DELETE /api/inventory/assets/[id]` - Delete asset
- `POST /api/inventory/assignments` - Assign asset
- `GET /api/inventory/maintenance` - Get maintenance records
- `POST /api/inventory/maintenance` - Schedule maintenance

### Reports & Analytics

- `GET /api/reports/attendance` - Attendance reports
- `GET /api/reports/payroll` - Payroll reports
- `GET /api/reports/performance` - Performance reports
- `GET /api/reports/inventory` - Inventory reports

---

## Database Schema

### Core Tables

#### Users Table

```sql
- id: String (Primary Key)
- email: String (Unique)
- password: String (Hashed)
- role: Enum (ADMINISTRATOR, HR_MANAGER, DEPARTMENT_MANAGER, EMPLOYEE, PAYROLL_OFFICER, SYSTEM_AUDITOR)
- isActive: Boolean
- createdAt: DateTime
- updatedAt: DateTime
```

#### Employees Table

```sql
- id: String (Primary Key)
- userId: String (Foreign Key → Users)
- employeeId: String (Unique)
- firstName: String
- lastName: String
- email: String
- phone: String
- dateOfBirth: DateTime
- hireDate: DateTime
- designation: String
- departmentId: String (Foreign Key → Departments)
- managerId: String (Foreign Key → Employees)
- salaryStructures: Relation[]
- attendanceRecords: Relation[]
- leaveApplications: Relation[]
```

#### Departments Table

```sql
- id: String (Primary Key)
- name: String (Unique)
- description: String
- managerId: String (Foreign Key → Employees)
- employees: Relation[]
```

#### AttendanceRecords Table

```sql
- id: String (Primary Key)
- employeeId: String (Foreign Key → Employees)
- date: DateTime
- clockIn: DateTime
- clockOut: DateTime
- totalHours: Decimal
- overtime: Decimal
- status: Enum (PRESENT, ABSENT, LATE, HALF_DAY)
- notes: String
```

#### LeaveApplications Table

```sql
- id: String (Primary Key)
- employeeId: String (Foreign Key → Employees)
- leaveTypeId: String (Foreign Key → LeaveTypes)
- startDate: DateTime
- endDate: DateTime
- totalDays: Integer
- reason: String
- status: Enum (PENDING, APPROVED, REJECTED)
- approvedBy: String (Foreign Key → Employees)
```

#### SalaryTemplates Table

```sql
- id: String (Primary Key)
- name: String (Unique)
- description: String
- targetRole: String
- targetDepartment: String
- basicSalaryPercent: Decimal
- basicSalaryFixed: Decimal
- isPercentageBased: Boolean
- allowancesTemplate: JSON
- deductionsTemplate: JSON
- isActive: Boolean
```

#### EmployeeSalaryStructures Table

```sql
- id: String (Primary Key)
- employeeId: String (Foreign Key → Employees)
- templateId: String (Foreign Key → SalaryTemplates)
- basicSalary: Decimal
- allowances: JSON
- deductions: JSON
- grossSalary: Decimal
- netSalary: Decimal
- ctc: Decimal
- effectiveFrom: DateTime
- effectiveTo: DateTime
- status: Enum (DRAFT, ACTIVE, INACTIVE)
- revisionNumber: Integer
```

#### SalaryRevisions Table

```sql
- id: String (Primary Key)
- employeeId: String (Foreign Key → Employees)
- previousBasicSalary: Decimal
- newBasicSalary: Decimal
- previousGrossSalary: Decimal
- newGrossSalary: Decimal
- revisionType: Enum (INCREMENT, PROMOTION, ADJUSTMENT, CORRECTION)
- revisionReason: String
- percentageIncrease: Decimal
- effectiveFrom: DateTime
- approvedBy: String (Foreign Key → Employees)
```

#### PayrollRecords Table

```sql
- id: String (Primary Key)
- employeeId: String (Foreign Key → Employees)
- salaryStructureId: String (Foreign Key → EmployeeSalaryStructures)
- month: Integer
- year: Integer
- workingDays: Integer
- presentDays: Integer
- grossPay: Decimal
- totalDeductions: Decimal
- netPay: Decimal
- status: Enum (GENERATED, PROCESSED, APPROVED)
- payslipGenerated: Boolean
- payslipUrl: String
```

### Inventory Tables

#### Assets Table

```sql
- id: String (Primary Key)
- assetId: String (Unique)
- name: String
- categoryId: String (Foreign Key → AssetCategories)
- description: String
- purchaseDate: DateTime
- purchasePrice: Decimal
- currentValue: Decimal
- vendorId: String (Foreign Key → Vendors)
- status: Enum (AVAILABLE, ASSIGNED, MAINTENANCE, DISPOSED)
- location: String
- condition: Enum (EXCELLENT, GOOD, FAIR, POOR)
```

#### AssetAssignments Table

```sql
- id: String (Primary Key)
- assetId: String (Foreign Key → Assets)
- employeeId: String (Foreign Key → Employees)
- assignedDate: DateTime
- returnDate: DateTime
- purpose: String
- status: Enum (ACTIVE, RETURNED, LOST, DAMAGED)
```

#### MaintenanceRecords Table

```sql
- id: String (Primary Key)
- assetId: String (Foreign Key → Assets)
- maintenanceType: Enum (PREVENTIVE, CORRECTIVE, EMERGENCY, WARRANTY, UPGRADE)
- scheduledDate: DateTime
- completedDate: DateTime
- description: String
- cost: Decimal
- serviceProvider: String
- status: Enum (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)
```

---

## Technical Architecture

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Layer     │    │   Database      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   (PostgreSQL)  │
│   - React       │    │   - Auth        │    │   - Prisma ORM  │
│   - TypeScript  │    │   - Business    │    │   - Relations   │
│   - Tailwind    │    │   - Logic       │    │   - Indexes     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Security Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client        │    │   Middleware    │    │   Server        │
│   - JWT Token   │◄──►│   - Auth Check  │◄──►│   - Role Based  │
│   - Secure      │    │   - Role Valid  │    │   - Permissions │
│   - Cookies     │    │   - Route Guard │    │   - Data Access │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow Architecture

```
User Action → Component → API Call → Middleware → Route Handler →
Prisma → Database → Response → Component → UI Update
```

### File Structure

```
src/
├── app/
│   ├── api/                 # API Routes
│   │   ├── auth/           # Authentication
│   │   ├── employees/      # Employee Management
│   │   ├── attendance/     # Attendance System
│   │   ├── payroll/        # Payroll System
│   │   ├── leave/          # Leave Management
│   │   ├── performance/    # Performance Management
│   │   ├── training/       # Training Programs
│   │   ├── inventory/      # Inventory Management
│   │   └── reports/        # Reports & Analytics
│   ├── dashboard/          # Protected Pages
│   │   ├── attendance/     # Attendance Pages
│   │   ├── employees/      # Employee Pages
│   │   ├── payroll/        # Payroll Pages
│   │   ├── performance/    # Performance Pages
│   │   ├── training/       # Training Pages
│   │   ├── inventory/      # Inventory Pages
│   │   ├── reports/        # Reports Pages
│   │   └── settings/       # Settings Pages
│   ├── login/              # Login Page
│   └── register/           # Registration Page
├── components/
│   ├── ui/                 # Reusable Components
│   └── layout/             # Layout Components
├── lib/
│   ├── auth.ts            # Authentication Utils
│   ├── prisma.ts          # Database Client
│   ├── permissions.ts     # Permission System
│   └── utils.ts           # General Utils
└── middleware.ts          # Route Protection
```

---

## Deployment Guide

### Environment Setup

```bash
# Clone repository
git clone [repository-url]
cd employee-management-system

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Configure database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL="postgresql://username:password@localhost:5432/employee_db"
JWT_SECRET="your-secret-key-here"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Production Deployment

```bash
# Build application
npm run build

# Start production server
npm run start
```

### Database Migration

```bash
# Generate migration
npx prisma migrate dev --name init

# Reset database
npx prisma migrate reset

# Deploy to production
npx prisma migrate deploy
```

---

## Troubleshooting Guide

### Common Issues

1. **Authentication Issues**

   - Verify JWT_SECRET is set
   - Check cookie security settings
   - Validate user roles and permissions

2. **Database Connection**

   - Verify DATABASE_URL format
   - Check PostgreSQL service status
   - Validate Prisma schema

3. **Permission Errors**

   - Check user role assignments
   - Verify permission matrix
   - Review middleware configuration

4. **Performance Issues**
   - Optimize database queries
   - Implement caching strategies
   - Review API response times

### Support Contacts

- **Technical Support**: [support-email]
- **System Administrator**: [admin-email]
- **Documentation Updates**: [docs-email]

---

## Version History

### Version 1.0.0 (Current)

- Complete employee management system
- Role-based access control
- Attendance tracking with real-time clock
- Comprehensive payroll system
- Performance management
- Training programs
- Inventory management
- Advanced reporting

### Planned Features (Future Versions)

- Mobile application
- Advanced analytics dashboard
- Integration with external HR systems
- Automated backup system
- Advanced security features
- Multi-language support

---

_This documentation covers the complete Employee Management System with all role-based flows, features, and technical details. For specific implementation details or customization requirements, please refer to the codebase or contact the development team._

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Total Pages**: Comprehensive coverage of all system aspects

---

## Appendices

### Appendix A: Permission Matrix

[Detailed permission matrix for each role]

### Appendix B: API Reference

[Complete API endpoint documentation]

### Appendix C: Database Schema Details

[Detailed database schema with relationships]

### Appendix D: Security Guidelines

[Security best practices and guidelines]

### Appendix E: Performance Optimization

[Performance tuning and optimization guide]
