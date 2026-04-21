"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import StatusIndicator from "@/components/ui/StatusIndicator";

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  email: string;
  phone?: string;
  designation: string;
  department: string;
  joinDate: string;
  employmentType: string;
  status: string;
  profileImage?: string | null; // Profile image URL or path
}

interface TeamManager {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  designation: string;
  department: string;
  email: string;
}

interface TeamData {
  teamMembers: TeamMember[];
  teamManager: TeamManager;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    search: string;
    status: string;
  };
}

export default function TeamPage() {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchTeamData();
  }, [currentPage, searchQuery, statusFilter]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        search: searchQuery,
        status: statusFilter,
      });

      const response = await fetch(`/api/team?${params.toString()}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeamData(data);
      } else if (response.status === 401) {
        toast.error("Please log in to access team data");
        router.push("/login");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to fetch team data");
      }
    } catch (error) {
      console.error("Failed to fetch team data:", error);
      toast.error("Failed to fetch team data");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTeamData();
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
            Present
          </span>
        );
      case "ABSENT":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <div className="w-2 h-2 bg-red-400 rounded-full mr-1"></div>
            Absent
          </span>
        );
      case "LATE":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <div className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></div>
            Late
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <div className="w-2 h-2 bg-gray-400 rounded-full mr-1"></div>
            Unknown
          </span>
        );
    }
  };

  const getEmploymentTypeColor = (type: string) => {
    switch (type) {
      case "FULL_TIME":
        return "bg-blue-100 text-blue-800";
      case "PART_TIME":
        return "bg-green-100 text-green-800";
      case "CONTRACT":
        return "bg-yellow-100 text-yellow-800";
      case "INTERN":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="text-center py-12">
        <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No team data</h3>
        <p className="mt-1 text-sm text-gray-500">
          Unable to load team member information.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              Team Members
            </h1>
            <p className="mt-1 text-gray-600">
              Manage and view your team members
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total Members</div>
            <div className="text-2xl font-bold text-gray-900">
              {teamData.pagination.total}
            </div>
          </div>
        </div>
      </div>

      {/* Team Manager Info */}
      {teamData.teamManager && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Avatar
                employeeId={teamData.teamManager.id}
                employeeName={`${teamData.teamManager.firstName} ${teamData.teamManager.lastName}`}
                size="md"
                showLink={true}
                className="ring-2 ring-blue-200"
              />
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">
                {teamData.teamManager.firstName} {teamData.teamManager.lastName}
              </div>
              <div className="text-sm text-gray-500">
                {teamData.teamManager.designation} • {teamData.teamManager.department}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search team members..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="PRESENT">Present Today</option>
              <option value="ABSENT">Absent Today</option>
            </select>
          </div>
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-4">
            {teamData.teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No team members found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery || statusFilter !== "ALL"
                    ? "Try adjusting your search or filter criteria."
                    : "You don't have any team members in your department yet."}
                </p>
              </div>
            ) : (
              teamData.teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Avatar
                          employeeId={member.id}
                          employeeName={`${member.firstName} ${member.lastName}`}
                          profileImage={member.profileImage}
                          size="md"
                          showLink={true}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {member.employeeId}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {member.designation}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center text-sm text-gray-500">
                            <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                            {member.department}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <CalendarDaysIcon className="h-4 w-4 mr-1" />
                            Joined {new Date(member.joinDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEmploymentTypeColor(member.employmentType)}`}>
                            {member.employmentType.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="mt-1">
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <EnvelopeIcon className="h-4 w-4" />
                            <span className="truncate max-w-xs">{member.email}</span>
                          </div>
                          {member.phone && (
                            <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                              <PhoneIcon className="h-4 w-4" />
                              <span>{member.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {teamData.pagination.pages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(teamData.pagination.pages, currentPage + 1))}
              disabled={currentPage === teamData.pagination.pages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {(currentPage - 1) * teamData.pagination.limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * teamData.pagination.limit, teamData.pagination.total)}
                </span>{" "}
                of{" "}
                <span className="font-medium">{teamData.pagination.total}</span>{" "}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {[...Array(Math.min(5, teamData.pagination.pages))].map((_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  if (pageNum > teamData.pagination.pages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === currentPage
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(teamData.pagination.pages, currentPage + 1))}
                  disabled={currentPage === teamData.pagination.pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
