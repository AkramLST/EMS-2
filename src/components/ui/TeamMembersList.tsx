"use client";

import { useState, useEffect } from "react";
import {
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import Avatar from "@/components/ui/Avatar";

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  email: string;
  position: string;
  isPresent: boolean;
  clockInTime?: string;
  clockOutTime?: string;
  profileImage?: string | null;
}

interface TeamMembersListProps {
  userRole: string;
}

export default function TeamMembersList({ userRole }: TeamMembersListProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === "DEPARTMENT_MANAGER") {
      fetchTeamMembers();
    }
  }, [userRole]);

  const fetchTeamMembers = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/team-members", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.teamMembers || []);
      }
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    } finally {
      setLoading(false);
    }
  };

  if (userRole !== "DEPARTMENT_MANAGER") {
    return null;
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <UserGroupIcon className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-medium text-gray-900">My Team</h3>
        <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
          {teamMembers.length} members
        </span>
      </div>

      {teamMembers.length === 0 ? (
        <div className="text-center py-8">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-500">No team members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 h-10 w-10">
                    <Avatar
                      employeeId={member.id}
                      employeeName={`${member.firstName} ${member.lastName}`}
                      profileImage={member.profileImage}
                      size="md"
                      showLink={true}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </h4>
                    <p className="text-xs text-gray-500">{member.employeeId}</p>
                    <p className="text-xs text-gray-600">{member.position}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {member.isPresent ? (
                    <div className="flex items-center space-x-1">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-green-600 font-medium">Present</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <XCircleIcon className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-red-600 font-medium">Absent</span>
                    </div>
                  )}
                </div>
              </div>

              {member.isPresent && (
                <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-medium text-gray-700">Clock In:</span>
                    <p className="text-gray-900">
                      {member.clockInTime
                        ? new Date(member.clockInTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Clock Out:</span>
                    <p className="text-gray-900">
                      {member.clockOutTime
                        ? new Date(member.clockOutTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Working"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
