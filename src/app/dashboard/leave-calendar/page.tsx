"use client";

import { useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface LeaveRequest {
  id: string;
  employee: {
    firstName: string;
    lastName: string;
  };
  startDate: string;
  endDate: string;
  leaveType: string;
  status: string;
}

export default function LeaveCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaveRequests();
  }, [currentDate]);

  const fetchLeaveRequests = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const response = await fetch(
        `/api/leave/calendar?start=${startOfMonth.toISOString()}&end=${endOfMonth.toISOString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data.leaves || []);
      }
    } catch (error) {
      console.error("Failed to fetch leave requests:", error);
      toast.error("Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getLeaveForDate = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString().split('T')[0];
    
    return leaveRequests.filter(leave => {
      const startDate = new Date(leave.startDate).toISOString().split('T')[0];
      const endDate = new Date(leave.endDate).toISOString().split('T')[0];
      return dateStr >= startDate && dateStr <= endDate && leave.status === "APPROVED";
    });
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Leave Calendar</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateMonth("prev")}
            className="btn-outline p-2"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-medium text-gray-900 min-w-48 text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={() => navigateMonth("next")}
            className="btn-outline p-2"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {dayNames.map((day) => (
            <div key={day} className="px-4 py-3 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="h-24 border-r border-b border-gray-200"></div>
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const leavesForDay = getLeaveForDate(day);
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

            return (
              <div
                key={day}
                className={`h-24 border-r border-b border-gray-200 p-1 ${
                  isToday ? "bg-blue-50" : ""
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? "text-blue-600" : "text-gray-900"
                }`}>
                  {day}
                </div>
                <div className="space-y-1 overflow-hidden">
                  {leavesForDay.slice(0, 2).map((leave, idx) => (
                    <div
                      key={`${leave.id}-${idx}`}
                      className="text-xs px-1 py-0.5 bg-red-100 text-red-800 rounded truncate"
                      title={`${leave.employee.firstName} ${leave.employee.lastName} - ${leave.leaveType}`}
                    >
                      {leave.employee.firstName} {leave.employee.lastName[0]}.
                    </div>
                  ))}
                  {leavesForDay.length > 2 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{leavesForDay.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
            <span className="text-sm text-gray-700">Approved Leave</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
            <span className="text-sm text-gray-700">Today</span>
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Leave Days</p>
              <p className="text-2xl font-semibold text-gray-900">
                {leaveRequests.reduce((total, leave) => {
                  const start = new Date(leave.startDate);
                  const end = new Date(leave.endDate);
                  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  return total + days;
                }, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Employees on Leave</p>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(leaveRequests.map(leave => leave.employee.firstName + leave.employee.lastName)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Peak Leave Day</p>
              <p className="text-2xl font-semibold text-gray-900">
                {Array.from({ length: daysInMonth }, (_, i) => i + 1)
                  .reduce((maxDay, day) => 
                    getLeaveForDate(day).length > getLeaveForDate(maxDay).length ? day : maxDay, 1
                  )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
