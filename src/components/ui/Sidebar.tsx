"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HomeIcon,
  UsersIcon,
  ClockIcon,
  BanknotesIcon,
  ChartBarIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  CubeIcon,
  SpeakerWaveIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  BellIcon,
  CalculatorIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { clearAuthTokenCookie } from "@/lib/cookies";
import { usePermissions } from "@/hooks/usePermission";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: HomeIcon,
    permission: "employee.read",
  },
  {
    name: "Attendance",
    href: "/dashboard/attendance",
    icon: ClockIcon,
    permission: "attendance.read",
  },
  {
    name: "Employees",
    href: "/dashboard/employees",
    icon: UsersIcon,
    permission: "employee.read_all",
  },
  {
    name: "Team Members",
    href: "/dashboard/team",
    icon: UserGroupIcon,
    permission: "employee.read",
    excludeRoles: ["ADMINISTRATOR", "HR_MANAGER"],
  },
  {
    name: "Payroll",
    href: "/dashboard/payroll",
    icon: BanknotesIcon,
    permission: "payroll.read",
    children: [
      {
        name: "Payroll Overview",
        href: "/dashboard/payroll",
        icon: BanknotesIcon,
        permission: "payroll.read",
        excludeRoles: ["EMPLOYEE"],
      },
      {
        name: "Salary Assignment",
        href: "/dashboard/payroll/salary-assignment",
        icon: UsersIcon,
        permission: "payroll.read",
        includeRoles: ["ADMINISTRATOR", "HR_MANAGER", "HR_ADMIN"],
      },
      {
        name: "Salary Templates",
        href: "/dashboard/payroll/templates",
        icon: CalculatorIcon,
        permission: "payroll.read",
        includeRoles: ["ADMINISTRATOR", "HR_MANAGER", "HR_ADMIN"],
      },
    ],
  },
  {
    name: "My Payroll",
    href: "/dashboard/employee/payroll",
    icon: DocumentTextIcon,
    permission: "payroll.view_own_slip",
    includeRoles: ["EMPLOYEE"],
  },
  {
    name: "Leave Management",
    href: "/dashboard/leave",
    icon: DocumentTextIcon,
    permission: "leave.read",
  },
  {
    name: "Performance",
    href: "/dashboard/performance",
    icon: ChartBarIcon,
    permission: "performance.read",
  },
  {
    name: "Training",
    href: "/dashboard/training",
    icon: AcademicCapIcon,
    permission: "training.read",
  },
  {
    name: "Assets",
    href: "/dashboard/inventory/assets",
    icon: CubeIcon,
    permission: "inventory.read",
  },
  {
    name: "Announcements",
    href: "/dashboard/announcements",
    icon: SpeakerWaveIcon,
    permission: "announcements.read",
  },
  {
    name: "Admin",
    href: "#",
    icon: UserGroupIcon,
    permission: "user.read",
    includeRoles: ["ADMINISTRATOR"],
    children: [
      {
        name: "User Management",
        href: "/dashboard/admin/users",
        icon: UsersIcon,
        permission: "user.read",
      },
      {
        name: "Office Times",
        href: "/dashboard/admin/office-times",
        icon: ClockIcon,
        permission: "settings.update",
      },
      {
        name: "Departments",
        href: "/dashboard/departments",
        icon: BuildingOfficeIcon,
        permission: "department.read",
      },
      {
        name: "Designations",
        href: "/dashboard/admin/designations",
        icon: BuildingOfficeIcon,
        permission: "department.read",
      },
      {
        name: "Leave Types",
        href: "/dashboard/admin/leave-types",
        icon: DocumentTextIcon,
        permission: "leave.read",
      },
      {
        name: "Holidays",
        href: "/dashboard/admin/holidays",
        icon: CalendarDaysIcon,
        permission: "leave.read",
      },
      {
        name: "Role Management",
        href: "/dashboard/admin/roles",
        icon: UserGroupIcon,
        permission: "user.read",
      },
      {
        name: "Policies",
        href: "/dashboard/admin/policies",
        icon: UserGroupIcon,
        permission: "settings.policies",
      },
      {
        name: "Notifications",
        href: "/dashboard/notifications",
        icon: BellIcon,
        permission: "user.read",
      },
    ],
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: ChartBarIcon,
    permission: "reports.read",
    excludeRoles: ["EMPLOYEE"],
  },
  {
    name: "Audit Logs",
    href: "/dashboard/audit-logs",
    icon: DocumentTextIcon,
    permission: "compliance.read_all",
    excludeRoles: ["EMPLOYEE"],
  },
];

export default function Sidebar({ user }: { user: any }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const role = user?.role || "EMPLOYEE";
  const { permissions, loading } = usePermissions(role);
  useEffect(() => {
    console.log("permissions re here ", permissions);
  }, [permissions]);
  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        router.push("/login");
      } else {
        clearAuthTokenCookie();
        router.push("/login");
      }
    } catch {
      clearAuthTokenCookie();
      router.push("/login");
    }
  };

  return (
    <>
      {/* Mobile */}
      <div
        className={cn(
          "fixed inset-0 flex z-40 md:hidden",
          sidebarOpen ? "block" : "hidden",
        )}
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button onClick={() => setSidebarOpen(false)}>
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>

          <SidebarContent
            user={user}
            pathname={pathname}
            onLogout={handleLogout}
            permissions={permissions}
            loading={loading}
          />
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
          <SidebarContent
            user={user}
            pathname={pathname}
            onLogout={handleLogout}
            permissions={permissions}
            loading={loading}
          />
        </div>
      </div>

      {/* Mobile Button */}
      <div className="md:hidden">
        <button onClick={() => setSidebarOpen(true)}>
          <Bars3Icon className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}

/* ✅ SAME UI — ONLY LOGIC FIXED */
function SidebarContent({
  user,
  pathname,
  onLogout,
  permissions,
  loading,
}: any) {
  const role = user?.role || "EMPLOYEE";

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading menu...</div>;
  }

  const hasAccess = (permission: string) => {
    if (role === "ADMINISTRATOR") return true;
    return permissions.includes(permission);
  };

  const filteredNavigation = navigation
    .filter((item) => {
      if (!hasAccess(item.permission)) return false;

      if (item.includeRoles && !item.includeRoles.includes(role)) return false;

      if (item.excludeRoles && item.excludeRoles.includes(role)) return false;

      return true;
    })
    .map((item) => {
      if (item.children) {
        const filteredChildren = item.children.filter((child) => {
          if (!hasAccess(child.permission)) return false;

          if (child.includeRoles && !child.includeRoles.includes(role))
            return false;

          if (child.excludeRoles && child.excludeRoles.includes(role))
            return false;

          return true;
        });

        return { ...item, children: filteredChildren };
      }
      return item;
    })
    .filter((item) => !item.children || item.children.length > 0);

  const [expandedMenus, setExpandedMenus] = useState<any>({});

  const toggleMenu = (name: string) => {
    setExpandedMenus((prev: any) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <>
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-primary-600">LST-EMS</h1>
        </div>

        <nav className="mt-5 flex-1 px-2 space-y-1">
          {filteredNavigation.map((item: any) => {
            const hasChildren = item.children?.length > 0;

            const childActive = hasChildren
              ? item.children.some((child: any) => pathname === child.href)
              : false;

            const isActive = pathname === item.href || childActive;

            const isExpanded = hasChildren
              ? (expandedMenus[item.name] ?? isActive)
              : false;

            if (hasChildren) {
              return (
                <div key={item.name}>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={cn(
                      "sidebar-item w-full flex items-center justify-between",
                      isActive && "active",
                    )}
                  >
                    <div className="flex items-center">
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </div>

                    <ChevronDownIcon
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.children.map((child: any) => {
                        const isChildActive = pathname === child.href;

                        return (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={cn(
                              "sidebar-item",
                              isChildActive && "active",
                            )}
                          >
                            <child.icon className="mr-3 h-5 w-5" />
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn("sidebar-item", isActive && "active")}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* USER INFO */}
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="w-full">
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">
              {user?.employee?.firstName} {user?.employee?.lastName}
            </p>
            <p className="text-xs text-gray-500 uppercase">
              {user?.role?.replace("_", " ")}
            </p>
          </div>

          <button
            onClick={onLogout}
            className="mt-2 w-full flex items-center px-2 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
