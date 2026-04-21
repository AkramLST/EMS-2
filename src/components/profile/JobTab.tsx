"use client";

import {
  BriefcaseIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface JobTabProps {
  employee: any;
  formatDate: (dateString: string) => string;
  calculateTenure: (joinDate: string) => string;
}

export default function JobTab({ employee, formatDate, calculateTenure }: JobTabProps) {
  const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
    FULL_TIME: "Full Time",
    PART_TIME: "Part Time",
    CONTRACT: "Contract",
    INTERN: "Intern",
  };

  const formatEmploymentType = (value?: string | null) => {
    if (!value) return null;
    return EMPLOYMENT_TYPE_LABELS[value] ?? value
      .toLowerCase()
      .split(" ")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  };

  const formatDisplayDate = (value?: string | Date | null) => {
    if (!value) return null;
    const asString = value instanceof Date ? value.toISOString() : value;
    return formatDate(asString);
  };

  interface TimelineEntry {
    isCurrent: boolean;
    role: string | null;
    designationTitle: string | null;
    department: string | null;
    employmentType: string | null;
    startDate: string | Date | null;
    endDate: string | Date | null;
    changeReason: string | null;
  }

  const jobHistoryRecords = Array.isArray(employee.jobHistory)
    ? employee.jobHistory
    : [];
  const hasActiveHistory = jobHistoryRecords.some((history: any) => !history.endDate);

  const currentTimelineEntry: TimelineEntry | null = !hasActiveHistory
    ? {
        isCurrent: true,
        role:
          typeof employee.designation === "string"
            ? employee.designation
            : employee.designation?.title,
        designationTitle:
          typeof employee.designation === "string"
            ? employee.designation
            : employee.designation?.title ?? null,
        department: employee.department?.name ?? null,
        employmentType: employee.employmentType ?? null,
        startDate: employee.joinDate,
        endDate: null,
        changeReason: "Currently assigned role",
      }
    : null;

  const historicalEntries: TimelineEntry[] = jobHistoryRecords.map((history: any) => ({
    isCurrent: !history.endDate,
    role: history.title || history.designationTitle || null,
    designationTitle:
      history.designationTitle ?? history.designation?.title ?? history.title ?? null,
    department: history.departmentName ?? history.department?.name ?? null,
    employmentType: history.employmentType ?? null,
    startDate: history.startDate ?? null,
    endDate: history.endDate ?? null,
    changeReason: history.changeReason ?? null,
  }));

  const timelineEntries: TimelineEntry[] = [currentTimelineEntry, ...historicalEntries].filter(
    Boolean
  ) as TimelineEntry[];

  return (
    <div className="space-y-6">
      {/* Employment Information */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
            <BriefcaseIcon className="h-3 w-3 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-blue-600">Employment Information</h3>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold tracking-wide text-slate-500">
                <th className="px-5 py-3 text-left capitalize">Effective Date</th>
                <th className="px-5 py-3 text-left capitalize">Location</th>
                <th className="px-5 py-3 text-left capitalize">Division</th>
                <th className="px-5 py-3 text-left capitalize">Department</th>
                <th className="px-5 py-3 text-left capitalize">Job Title</th>
                <th className="px-5 py-3 text-left capitalize">Reports To</th>
              </tr>
            </thead>
            <tbody className="bg-white text-slate-700">
              <tr className="border-t border-slate-100">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    <span>{employee.joinDate ? formatDate(employee.joinDate) : "—"}</span>
                  </div>
                </td>
                <td className="px-5 py-4 capitalize">
                  {employee.workLocation || employee.city || "Not specified"}
                </td>
                <td className="px-5 py-4 capitalize">
                  {employee.department?.name || "Not assigned"}
                </td>
                <td className="px-5 py-4 capitalize">
                  {employee.department?.name || "Not assigned"}
                </td>
                <td className="px-5 py-4 capitalize">
                  {typeof employee.designation === "string"
                    ? employee.designation
                    : employee.designation?.title || "Not specified"}
                </td>
                <td className="px-5 py-4 capitalize">
                  {employee.manager
                    ? `${employee.manager.firstName} ${employee.manager.lastName}`
                    : "Not assigned"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Job History */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
          </div>
          <h3 className="text-lg font-semibold text-blue-600">Job History</h3>
        </div>

        <div className="relative space-y-4">
          <span
            className="pointer-events-none absolute left-1.5 top-0 h-full w-0.5 bg-slate-200"
            aria-hidden="true"
          ></span>
          {timelineEntries.map((entry, index) => {
            const startLabel = formatDisplayDate(entry.startDate) ?? "Start date not available";
            const endLabel = formatDisplayDate(entry.endDate) ?? "Present";
            const employmentLabel = formatEmploymentType(entry.employmentType);
            const reasonItems = entry.changeReason
              ? entry.changeReason
                  .split("|")
                  .map((item: string) => item.trim())
                  .filter((item: string) => item.length > 0)
              : [];

            return (
              <div
                key={index === 0 && entry.isCurrent ? "current" : `history-${index}`}
                className="relative pl-8"
              >
                <span
                  className={`absolute left-0 top-2 h-3 w-3 rounded-full border-2 ${
                    entry.isCurrent
                      ? "border-blue-500 bg-blue-500/20"
                      : "border-slate-300 bg-slate-100"
                  }`}
                ></span>
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                        {startLabel} — {endLabel}
                      </p>
                      <h4 className="mt-1 text-lg font-semibold text-slate-900 capitalize">
                        {entry.role || "Role not specified"}
                      </h4>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        entry.isCurrent
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {entry.isCurrent ? "Current" : "Previous"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                    {entry.designationTitle && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 capitalize">
                        <BriefcaseIcon className="h-3 w-3" />
                        {entry.designationTitle}
                      </span>
                    )}
                    {entry.department && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 capitalize">
                        <BuildingOfficeIcon className="h-3 w-3" />
                        {entry.department}
                      </span>
                    )}
                    {employmentLabel && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                        <ClockIcon className="h-3 w-3" />
                        {employmentLabel}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-1 text-sm text-slate-700">
                    {reasonItems.length > 0 ? (
                      reasonItems.map((item: string, idx: number) => (
                        <p key={idx} className="flex items-start gap-2">
                          <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400"></span>
                          <span>{item}</span>
                        </p>
                      ))
                    ) : (
                      <p className="text-slate-500">No additional notes recorded for this change.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {jobHistoryRecords.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <BriefcaseIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No previous positions recorded</p>
              <p className="text-sm">Job history will appear here when available</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
