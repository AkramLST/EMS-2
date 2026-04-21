"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  PlusIcon, 
  ClockIcon, 
  CalendarDaysIcon, 
  UserPlusIcon,
  DocumentTextIcon,
  ChartBarIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

export default function QuickActionsBar() {
  const [isOpen, setIsOpen] = useState(false);

  const quickActions = [
    {
      name: "Add Employee",
      href: "/dashboard/employees/add",
      icon: UserPlusIcon,
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      name: "Apply Leave",
      href: "/dashboard/leave",
      icon: CalendarDaysIcon,
      color: "bg-green-500 hover:bg-green-600"
    },
    {
      name: "View Attendance",
      href: "/dashboard/attendance",
      icon: ClockIcon,
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      name: "Performance",
      href: "/dashboard/performance",
      icon: ChartBarIcon,
      color: "bg-yellow-500 hover:bg-yellow-600"
    },
    {
      name: "Reports",
      href: "/dashboard/reports",
      icon: DocumentTextIcon,
      color: "bg-red-500 hover:bg-red-600"
    }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Quick Actions Menu */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-2 space-y-2">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-white shadow-lg transition-all duration-200 transform hover:scale-105 ${action.color}`}
              onClick={() => setIsOpen(false)}
            >
              <action.icon className="h-5 w-5" />
              <span className="text-sm font-medium whitespace-nowrap">{action.name}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300 ${
          isOpen 
            ? "bg-red-500 hover:bg-red-600 rotate-45" 
            : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        {isOpen ? (
          <XMarkIcon className="h-6 w-6 text-white mx-auto" />
        ) : (
          <PlusIcon className="h-6 w-6 text-white mx-auto" />
        )}
      </button>
    </div>
  );
}
