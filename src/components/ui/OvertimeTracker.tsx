"use client";

import { useState, useEffect } from "react";
import { ClockIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface OvertimeSession {
  id: string;
  date: string;
  regularHours: number;
  overtimeHours: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string;
}

export default function OvertimeTracker() {
  const [overtimeSessions, setOvertimeSessions] = useState<OvertimeSession[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [overtimeReason, setOvertimeReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOvertimeSessions();
  }, []);

  const fetchOvertimeSessions = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/attendance/overtime", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setOvertimeSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Failed to fetch overtime sessions:", error);
    }
  };

  const requestOvertimeApproval = async () => {
    if (!overtimeReason.trim()) {
      toast.error("Please provide a reason for overtime");
      return;
    }

    setLoading(true);
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch("/api/attendance/overtime/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: overtimeReason,
          date: new Date().toISOString().split('T')[0]
        }),
      });

      if (response.ok) {
        toast.success("Overtime request submitted for approval");
        setOvertimeReason("");
        setShowRequestForm(false);
        fetchOvertimeSessions();
      } else {
        toast.error("Failed to submit overtime request");
      }
    } catch (error) {
      console.error("Overtime request failed:", error);
      toast.error("Failed to submit overtime request");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "REJECTED":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED": return "bg-green-100 text-green-800";
      case "REJECTED": return "bg-red-100 text-red-800";
      default: return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">⏰ Overtime Tracking</h3>
        <button
          onClick={() => setShowRequestForm(!showRequestForm)}
          className="btn-primary text-sm"
        >
          Request Overtime
        </button>
      </div>

      {/* Overtime Request Form */}
      {showRequestForm && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Request Overtime Approval</h4>
          <textarea
            value={overtimeReason}
            onChange={(e) => setOvertimeReason(e.target.value)}
            placeholder="Reason for overtime work..."
            className="w-full p-3 border border-gray-300 rounded-md text-sm"
            rows={3}
          />
          <div className="flex space-x-2 mt-3">
            <button
              onClick={requestOvertimeApproval}
              disabled={loading}
              className="btn-primary text-sm"
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
            <button
              onClick={() => setShowRequestForm(false)}
              className="btn-outline text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Overtime Sessions */}
      <div className="space-y-3">
        {overtimeSessions.length > 0 ? (
          overtimeSessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(session.status)}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(session.date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-600">
                    Regular: {session.regularHours}h | Overtime: {session.overtimeHours}h
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{session.reason}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(session.status)}`}>
                {session.status}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <ClockIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No overtime sessions</p>
          </div>
        )}
      </div>
    </div>
  );
}
