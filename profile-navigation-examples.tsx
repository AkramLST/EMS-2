// Example: How to navigate to employee profiles
// This can be added to any employee list component

import Link from 'next/link';

// In an employee list component:
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}

interface EmployeeListProps {
  employees: Employee[];
}

const EmployeeList = ({ employees }: EmployeeListProps) => {
  return (
    <div className="space-y-4">
      {employees.map((employee) => (
        <div key={employee.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
          <div>
            <h3 className="font-medium">{employee.firstName} {employee.lastName}</h3>
            <p className="text-sm text-gray-500">{employee.employeeId}</p>
          </div>
          <Link
            href={`/dashboard/profile?id=${employee.id}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View Profile
          </Link>
        </div>
      ))}
    </div>
  );
};

// Usage examples:
const navigationExamples = {
  // 1. Own profile (no ID parameter)
  ownProfile: '/dashboard/profile',

  // 2. Specific employee profile
  employeeProfile: '/dashboard/profile?id=EMP001',

  // 3. From employee list with dynamic ID
  dynamicProfile: (employeeId: string) => `/dashboard/profile?id=${employeeId}`,

  // 4. With additional query parameters
  profileWithTab: (employeeId: string, tab: string) =>
    `/dashboard/profile?id=${employeeId}&tab=${tab}`
};

export { EmployeeList, navigationExamples };
