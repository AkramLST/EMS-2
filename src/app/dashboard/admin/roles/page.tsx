"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function RoleManagementPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [checkedPolicies, setCheckedPolicies] = useState<
    Record<string, boolean>
  >({});

  // Fetch all policies
  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/policies");
      const data = await res.json();

      setPolicies(data);

      // Initialize all checkboxes to false
      const initialChecks: Record<string, boolean> = {};
      data.forEach((p: any) => (initialChecks[p.id] = false));
      setCheckedPolicies(initialChecks);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  // ✅ Open modal + fetch role permissions
  const openRoleModal = async (role: string) => {
    setSelectedRole(role);

    try {
      const res = await fetch(
        `/api/role-permissions?role=${encodeURIComponent(role)}`,
      );
      const data = await res.json();

      if (res.ok) {
        const selectedIds = data.permissions;

        const updatedChecks: Record<string, boolean> = {};
        policies.forEach((p: any) => {
          updatedChecks[p.id] = selectedIds.includes(p.id);
        });

        setCheckedPolicies(updatedChecks);
      }

      // Open modal AFTER data is ready
      setShowModal(true);
    } catch (err) {
      console.error("Failed to fetch role permissions", err);
      setShowModal(true); // still open modal even if API fails
    }
  };

  // Save policies
  const savePolicies = async () => {
    if (!selectedRole) return;

    try {
      const selectedPolicyIds = Object.entries(checkedPolicies)
        .filter(([_, checked]) => checked)
        .map(([id]) => id);

      const res = await fetch("/api/role-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          policies: selectedPolicyIds,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        closeModal();
      } else {
        toast.error(data.message || "Failed to save policies");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save policies");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRole(null);
  };

  const togglePolicy = (id: string) => {
    setCheckedPolicies((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Role Management</h1>

      {/* Role Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          "Administrator",
          "HR Manager",
          "Department Manager",
          "Employee",
          "Payroll Officer",
          "System Auditor",
        ].map((role) => (
          <div
            key={role}
            className="bg-white rounded-lg p-6 shadow cursor-pointer hover:shadow-lg transition"
            onClick={() => openRoleModal(role)}
          >
            <h2 className="font-semibold text-lg">{role}</h2>
            <p className="text-gray-600 mt-1">Click to view/edit policies</p>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black bg-opacity-50 py-10">
          <div className="bg-white rounded-lg w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 p-6 shadow-lg relative">
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
              onClick={closeModal}
            >
              ✖
            </button>

            {/* Role Info */}
            <h3 className="text-2xl font-bold mb-2">{selectedRole}</h3>
            <p className="text-gray-600 mb-4">
              Manage permissions for the {selectedRole} role.
            </p>
            <hr className="mb-6" />

            {/* Policies Table */}
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left border-b">Policy Name</th>
                    <th className="p-3 text-left border-b">Description</th>
                    <th className="p-3 text-left border-b">Created At</th>
                    <th className="p-3 text-center border-b">Enabled</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((policy) => (
                    <tr key={policy.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{policy.name}</td>
                      <td className="p-3 text-gray-600">
                        {policy.description || "-"}
                      </td>
                      <td className="p-3 text-gray-500">
                        {new Date(policy.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={checkedPolicies[policy.id] || false}
                          onChange={() => togglePolicy(policy.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <button
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                onClick={savePolicies}
              >
                Save Policies
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
