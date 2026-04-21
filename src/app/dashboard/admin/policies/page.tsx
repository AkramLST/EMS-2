"use client";
import React, { useEffect, useState } from "react";

const Page = () => {
  const [policies, setPolicies] = useState<any[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editPolicy, setEditPolicy] = useState<any>(null);

  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/policies");
      const data = await res.json();
      setPolicies(data);
      setFilteredPolicies(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  // 🔍 Search filter
  useEffect(() => {
    const filtered = policies.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    );
    setFilteredPolicies(filtered);
  }, [search, policies]);

  const handleSubmit = async () => {
    if (!name) return setError("Policy name required");

    try {
      const res = await fetch("/api/policies", {
        method: editPolicy ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editPolicy?.id,
          name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return setError(data.message || "Something went wrong");
      }

      closeModal();
      fetchPolicies();
    } catch (err) {
      console.error(err);
      setError("Request failed");
    }
  };

  const deletePolicy = async (id: string) => {
    if (!confirm("Are you sure?")) return;

    try {
      await fetch(`/api/policies?id=${id}`, {
        method: "DELETE",
      });
      fetchPolicies();
    } catch (err) {
      console.error(err);
    }
  };

  const openAdd = () => {
    setEditPolicy(null);
    setName("");
    setShowModal(true);
  };

  const openEdit = (policy: any) => {
    setEditPolicy(policy);
    setName(policy.name);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditPolicy(null);
    setName("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-gray-800">
              Policy Management
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Manage your policies efficiently. Create, update, and organize
              policies in one place.
            </p>
          </div>

          {/* Search + Add */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search policies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none px-4 py-2 rounded-lg w-64 text-sm"
            />

            <button
              onClick={openAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow-sm"
            >
              + Add Policy
            </button>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          {/* Table */}
          {loading ? (
            <div className="p-6 text-center text-gray-500">
              Loading policies...
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-400 text-lg">
                No matching policies found
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="p-4 text-left font-medium">Policy Name</th>
                  <th className="p-4 text-left font-medium">Created Date</th>
                  <th className="p-4 text-right font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredPolicies.map((policy) => (
                  <tr
                    key={policy.id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="p-4 font-medium text-gray-800">
                      {policy.name}
                    </td>

                    <td className="p-4 text-gray-500">
                      {new Date(policy.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => openEdit(policy)}
                        className="px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deletePolicy(policy.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {editPolicy ? "Update Policy" : "Add Policy"}
            </h2>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter policy name"
              className="w-full border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none p-2.5 rounded-lg mb-2"
            />

            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                {editPolicy ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
