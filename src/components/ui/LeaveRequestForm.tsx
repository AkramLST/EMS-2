"use client";

import { useState, useEffect } from "react";
import { CalendarDaysIcon, XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { clearAuthTokenCookie, getCookie } from "@/lib/cookies";

interface LeaveRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface LeaveType {
  id: string;
  name: string;
  description: string;
  maxDaysPerYear: number;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
  isOptional: boolean;
}

interface LeaveBalance {
  id: string;
  leaveTypeId: string;
  allocated: number;
  used: number;
  remaining: number;
  year: number;
}

export default function LeaveRequestForm({
  isOpen,
  onClose,
  onSuccess,
}: LeaveRequestFormProps) {
  const [formData, setFormData] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Fetch leave types, holidays, and leave balances from the database
  useEffect(() => {
    if (isOpen) {
      fetchData();
      // Clear errors when opening the form
      setFieldErrors({
        leaveTypeId: "",
        startDate: "",
        endDate: "",
        reason: "",
      });
    }
  }, [isOpen]);

  const fetchData = async () => {
    setFetchingData(true);
    try {
      // Fetch leave types
      const typesResponse = await fetch("/api/leave/types", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (typesResponse.ok) {
        const typesData = await typesResponse.json();
        setLeaveTypes(typesData.leaveTypes || []);

        // Set default leave type if available
        if (typesData.leaveTypes && typesData.leaveTypes.length > 0) {
          setFormData((prev) => ({
            ...prev,
            leaveTypeId: typesData.leaveTypes[0].id,
          }));
        }
      }

      // Fetch holidays
      const holidaysResponse = await fetch("/api/holidays", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (holidaysResponse.ok) {
        const holidaysData = await holidaysResponse.json();
        setHolidays(holidaysData.holidays || []);
      }

      // Fetch leave balances
      const balancesResponse = await fetch("/api/leave/balances", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (balancesResponse.ok) {
        const balancesData = await balancesResponse.json();
        setLeaveBalances(balancesData.balances || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load required data");
    } finally {
      setFetchingData(false);
    }
  };

  // Calculate working days between two dates, excluding weekends and holidays
  const calculateWorkingDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return 0;
    }

    let workingDays = 0;
    const currentDate = new Date(start);

    // Convert holidays to a Set for faster lookup
    const holidayDates = new Set(
      holidays.map(
        (holiday) => new Date(holiday.date).toISOString().split("T")[0]
      )
    );

    // Iterate through each day
    while (currentDate <= end) {
      // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
      const dayOfWeek = currentDate.getDay();

      // Check if it's a weekday (Monday to Friday)
      if (dayOfWeek > 0 && dayOfWeek < 6) {
        // Check if it's not a holiday
        const currentDateStr = currentDate.toISOString().split("T")[0];
        if (!holidayDates.has(currentDateStr)) {
          workingDays++;
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  };

  // Recalculate days when dates change
  useEffect(() => {
    const days = calculateWorkingDays(formData.startDate, formData.endDate);
    setCalculatedDays(days);
  }, [formData.startDate, formData.endDate, holidays]);

  const validateForm = () => {
    const errors = {
      leaveTypeId: "",
      startDate: "",
      endDate: "",
      reason: "",
    };

    let isValid = true;

    if (!formData.leaveTypeId) {
      errors.leaveTypeId = "Leave type is required";
      isValid = false;
    }

    if (!formData.startDate) {
      errors.startDate = "Start date is required";
      isValid = false;
    }

    if (!formData.endDate) {
      errors.endDate = "End date is required";
      isValid = false;
    }

    if (!formData.reason.trim()) {
      errors.reason = "Reason is required";
      isValid = false;
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        errors.endDate = "End date must be after start date";
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Additional validation for leave balance
    const selectedLeaveType = leaveTypes.find(
      (type) => type.id === formData.leaveTypeId
    );
    const selectedBalance = leaveBalances.find(
      (balance) => balance.leaveTypeId === formData.leaveTypeId
    );

    if (selectedBalance && calculatedDays > selectedBalance.remaining) {
      toast.error(
        `You only have ${selectedBalance.remaining} days remaining for ${
          selectedLeaveType?.name || "this leave type"
        }.`
      );
      return;
    }

    if (calculatedDays === 0) {
      toast.error(
        "No working days selected. Please select weekdays that are not holidays."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/leave/applications", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          totalDays: calculatedDays,
        }),
      });

      if (response.ok) {
        toast.success("Leave request submitted successfully");
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to submit leave request");
      }
    } catch (error) {
      console.error("Failed to submit leave request:", error);
      toast.error("Failed to submit leave request");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    // Clear error when user starts typing
    if ((fieldErrors as any)[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: "" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <CalendarDaysIcon className="h-5 w-5 mr-2 text-primary-600" />
            Request Leave
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave Type <span className="required-asterisk">*</span>
            </label>
            {fetchingData ? (
              <div className="input w-full flex items-center justify-center py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                <span className="ml-2 text-sm text-gray-500">Loading...</span>
              </div>
            ) : (
              <select
                name="leaveTypeId"
                value={formData.leaveTypeId}
                onChange={handleChange}
                className={`input w-full ${
                  fieldErrors.leaveTypeId
                    ? "border-red-500 focus:ring-red-500"
                    : ""
                }`}
              >
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} (Remaining:{" "}
                    {leaveBalances.find((b) => b.leaveTypeId === type.id)
                      ?.remaining || 0}{" "}
                    days)
                  </option>
                ))}
              </select>
            )}
            {fieldErrors.leaveTypeId && !fetchingData && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.leaveTypeId}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="required-asterisk">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={`input w-full ${
                  fieldErrors.startDate
                    ? "border-red-500 focus:ring-red-500"
                    : ""
                }`}
                min={new Date().toISOString().split("T")[0]}
              />
              {fieldErrors.startDate && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.startDate}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date <span className="required-asterisk">*</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className={`input w-full ${
                  fieldErrors.endDate ? "border-red-500 focus:ring-red-500" : ""
                }`}
                min={
                  formData.startDate || new Date().toISOString().split("T")[0]
                }
              />
              {fieldErrors.endDate && (
                <p className="mt-1 text-xs text-red-600">
                  {fieldErrors.endDate}
                </p>
              )}
            </div>
          </div>

          {formData.startDate && formData.endDate && (
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-700">
                Working days (excluding weekends and holidays): {calculatedDays}{" "}
                days
              </p>
              {calculatedDays === 0 && (
                <p className="text-sm text-red-600 mt-1">
                  No working days selected. Please select weekdays that are not
                  holidays.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="required-asterisk">*</span>
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={3}
              className={`input w-full ${
                fieldErrors.reason ? "border-red-500 focus:ring-red-500" : ""
              }`}
              placeholder="Please provide a reason for your leave request..."
            />
            {fieldErrors.reason && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.reason}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || fetchingData || calculatedDays === 0}
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
