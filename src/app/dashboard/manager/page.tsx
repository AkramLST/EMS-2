"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UsersIcon,
  ClockIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface ManagerStats {
  teamSize: number;
  presentToday: number;
  absentToday: number;
  pendingLeaves: number;
  performanceReviews: number;
  departmentName: string;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  designation: string;
  status: string;
  attendanceToday: boolean;
}

export default function ManagerDashboard() {
  const [stats, setStats] = useState<ManagerStats>({
    teamSize: 0,
    presentToday: 0,
    absentToday: 0,
    pendingLeaves: 0,
    performanceReviews: 0,
    departmentName: "",
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchManagerData();
  }, []);

  const fetchManagerData = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const [statsRes, teamRes] = await Promise.all([
        fetch("/api/dashboard/manager-stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/employees/team", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (teamRes.ok) {
        const data = await teamRes.json();
        setTeamMembers(data.teamMembers || []);
      }
    } catch (error) {
      console.error("Failed to fetch manager data:", error);
      toast.error("Failed to load manager dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            📊 Manager Dashboard
          </h1>
          <p className="text-gray-600">
            {stats.departmentName} Department Management
          </p>
        </div>
        <div className="flex space-x-3">
          <Link href="/dashboard/performance" className="btn-primary flex items-center">
            <TrophyIcon className="h-5 w-5 mr-2" />
            Performance Reviews
          </Link>
          <Link href="/dashboard/leave" className="btn-outline flex items-center">
            <CalendarDaysIcon className="h-5 w-5 mr-2" />
            Leave Requests
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Team Size</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.teamSize}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Present Today</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.presentToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Absent Today</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.absentToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <CalendarDaysIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Leaves</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingLeaves}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Overview */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Team Overview</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {member.employeeId} • {member.designation}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      member.attendanceToday 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {member.attendanceToday ? 'Present' : 'Absent'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {teamMembers.length === 0 && (
            <div className="text-center py-8">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No team members found</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/dashboard/attendance"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Attendance</h3>
              <p className="text-sm text-gray-600">Track team attendance</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/leave"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Leave Management</h3>
              <p className="text-sm text-gray-600">Approve/reject leave requests</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/performance"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <TrophyIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Performance</h3>
              <p className="text-sm text-gray-600">Review team performance</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
