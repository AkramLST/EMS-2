# Employee Management System

A comprehensive Employee Management System built with Next.js, TypeScript, PostgreSQL, and Tailwind CSS.

## Features

### 👤 Employee Information Management
- Complete employee profiles with personal details
- Contact information and emergency contacts
- Employment details (designation, department, manager, status)
- Document management system
- Digital employee directory with searchable org structure

### 🕒 Attendance & Time Tracking
- Clock-in/clock-out functionality
- Work hours tracking & overtime calculation
- Leave management (apply, approve, reject, balance tracking)
- Shift scheduling & roster management
- Holiday calendar

### 💰 Payroll & Compensation
- Salary structure & pay components
- Automated payroll processing
- Payslip generation & distribution
- Tax & compliance calculations
- Expense reimbursement workflows

### 📊 Performance & Appraisals
- Goal setting & OKRs
- Performance reviews (quarterly, annual)
- 360-degree feedback
- Promotion & increment history
- Skill tracking and competency matrix

### 🎓 Training & Development
- Training modules & learning paths
- Certification tracking
- Employee upskilling progress
- Internal knowledge sharing

### 🔒 Security & Compliance
- Role-based access control (admin, HR, manager, employee)
- Audit logs
- Data encryption & compliance
- Policy acknowledgment system

### 📈 Analytics & Reporting
- Workforce demographics
- Attrition & retention reports
- Attendance & overtime reports
- Payroll summaries
- Custom dashboards with filters

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt
- **UI Components**: Headless UI, Heroicons
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd employee-management-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database and other configuration:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/employee_management"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
JWT_SECRET="your-jwt-secret-here"
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Seed the database (optional):
```bash
npx prisma db seed
```

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Database Schema

The system uses a comprehensive PostgreSQL schema with the following main entities:

- **Users & Employees**: User authentication and employee profiles
- **Departments**: Organizational structure
- **Attendance**: Time tracking and attendance records
- **Leave Management**: Leave types, applications, and balances
- **Performance**: Reviews, goals, and appraisals
- **Training**: Programs and enrollments
- **Payroll**: Salary structures and compensation
- **Documents**: File management for employee documents

## API Routes

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Employees
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `GET /api/employees/[id]` - Get employee details
- `PUT /api/employees/[id]` - Update employee
- `DELETE /api/employees/[id]` - Delete employee

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance/clock-in` - Clock in
- `POST /api/attendance/clock-out` - Clock out

### Departments
- `GET /api/departments` - List departments
- `POST /api/departments` - Create department

## User Roles

- **SUPER_ADMIN**: Full system access
- **HR_ADMIN**: HR administrative functions
- **HR_MANAGER**: HR management functions
- **MANAGER**: Team management functions
- **EMPLOYEE**: Basic employee functions

## Development

### Project Structure
```
src/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── dashboard/      # Dashboard pages
│   └── globals.css     # Global styles
├── components/         # Reusable components
├── lib/               # Utility functions
└── middleware.ts      # Authentication middleware
```

### Key Components
- **Sidebar**: Navigation component with role-based menu items
- **Header**: Top navigation with search and notifications
- **Employee Forms**: Comprehensive employee management forms
- **Attendance Tracker**: Time tracking interface

## Deployment

1. Build the application:
```bash
npm run build
```

2. Set up production database and environment variables

3. Deploy to your preferred platform (Vercel, Railway, etc.)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
