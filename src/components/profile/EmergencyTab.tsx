"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";

interface EmergencyTabProps {
  employee: any;
}

type Contact = {
  id: string;
  name: string;
  relation: string;
  phone: string;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  isLegacy?: boolean;
};

type ContactFormState = {
  id: string | null;
  name: string;
  relation: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
};

const EMPTY_FORM: ContactFormState = {
  id: null,
  name: "",
  relation: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmergencyTab({ employee }: EmergencyTabProps) {
  const initialContacts: Contact[] = useMemo(() => {
    const apiContacts: Contact[] = Array.isArray(employee?.emergencyContacts)
      ? employee.emergencyContacts
      : [];

    return apiContacts.map((contact: any) => ({
      id: contact.id,
      name: contact.name ?? "",
      relation: contact.relation ?? "",
      phone: contact.phone ?? "",
      email: contact.email ?? null,
      addressLine1: contact.addressLine1 ?? null,
      addressLine2: contact.addressLine2 ?? null,
      city: contact.city ?? null,
      state: contact.state ?? null,
      postalCode: contact.postalCode ?? null,
      isLegacy: Boolean(contact.isLegacy),
    }));
  }, [employee?.emergencyContacts]);

  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    setContacts(initialContacts);
  }, [initialContacts]);

  const openModal = (contact?: Contact) => {
    if (contact) {
      setForm({
        id: contact.id,
        name: contact.name,
        relation: contact.relation,
        phone: contact.phone,
        email: contact.email ?? "",
        addressLine1: contact.addressLine1 ?? "",
        addressLine2: contact.addressLine2 ?? "",
        city: contact.city ?? "",
        state: contact.state ?? "",
        postalCode: contact.postalCode ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Contact name is required";
    if (!form.relation.trim())
      nextErrors.relation = "Relationship is required";
    if (!form.phone.trim()) nextErrors.phone = "Phone number is required";
    if (form.email && !EMAIL_PATTERN.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const createContact = async () => {
    const response = await fetch("/api/profile/emergency-contacts", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        relation: form.relation.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        addressLine1: form.addressLine1.trim() || null,
        addressLine2: form.addressLine2.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        postalCode: form.postalCode.trim() || null,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.message || "Failed to create emergency contact");
    }

    const data = await response.json();
    return data.contact as Contact;
  };

  const updateContact = async (id: string) => {
    const response = await fetch(`/api/profile/emergency-contacts/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        relation: form.relation.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        addressLine1: form.addressLine1.trim() || null,
        addressLine2: form.addressLine2.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        postalCode: form.postalCode.trim() || null,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.message || "Failed to update emergency contact");
    }

    const data = await response.json();
    return data.contact as Contact;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);

      let savedContact: Contact;
      if (form.id && !form.id.startsWith("legacy-")) {
        savedContact = await updateContact(form.id);
        toast.success("Emergency contact updated successfully");
      } else {
        savedContact = await createContact();
        toast.success("Emergency contact added successfully");

        if (form.id?.startsWith("legacy-")) {
          await clearLegacyContact();
        }
      }

      const updatedContacts = contacts.some((c) => c.id === savedContact.id)
        ? contacts.map((c) => (c.id === savedContact.id ? savedContact : c))
        : [...contacts.filter((c) => !c.isLegacy), savedContact];

      setContacts(updatedContacts);

      setShowModal(false);
    } catch (error: any) {
      console.error("Emergency contact save error:", error);
      toast.error(error?.message || "Failed to save emergency contact");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (contact: Contact) => {
    setContactToDelete(contact);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;

    try {
      setDeleteLoading(true);

      if (contactToDelete.isLegacy) {
        await clearLegacyContact();
        const updatedContacts = contacts.filter((c) => c.id !== contactToDelete.id);
        setContacts(updatedContacts);
        toast.success("Emergency contact removed successfully");
        setShowDeleteModal(false);
        setContactToDelete(null);
        return;
      }

      const response = await fetch(`/api/profile/emergency-contacts/${contactToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to remove emergency contact");
      }

      const updatedContacts = contacts.filter((c) => c.id !== contactToDelete.id);
      setContacts(updatedContacts);
      toast.success("Emergency contact removed successfully");
      setShowDeleteModal(false);
      setContactToDelete(null);
    } catch (error: any) {
      console.error("Emergency contact delete error:", error);
      toast.error(error?.message || "Failed to remove emergency contact");
    } finally {
      setDeleteLoading(false);
    }
  };

  const clearLegacyContact = async () => {
    await fetch("/api/profile", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        updates: {
          emergencyContactName: null,
          emergencyContactRelation: null,
          emergencyContactPhone: null,
          emergencyContactEmail: null,
          emergencyContactAddressLine1: null,
          emergencyContactAddressLine2: null,
          emergencyContactCity: null,
          emergencyContactState: null,
          emergencyContactPostalCode: null,
        },
      }),
    }).catch(() => undefined);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
              <ExclamationTriangleIcon className="h-3 w-3 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Emergency Contacts
            </h3>
          </div>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
            Add Contact
          </button>
        </div>

        {contacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-600">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Relationship</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white text-sm text-gray-700">
                {contacts.map((contact) => (
                  <tr key={contact.id} className={contact.isLegacy ? "bg-blue-50/40" : ""}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {contact.name || "—"}
                      {contact.isLegacy && (
                        <span className="ml-2 text-xs text-blue-600">Legacy</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{contact.relation || "—"}</td>
                    <td className="px-4 py-3">{contact.phone || "—"}</td>
                    <td className="px-4 py-3">{contact.email || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>{contact.addressLine1 || "—"}</p>
                        {contact.addressLine2 && <p>{contact.addressLine2}</p>}
                        <p>
                          {[contact.city, contact.state, contact.postalCode]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => openModal(contact)}
                          className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:border-blue-300 hover:text-blue-600"
                          title="Edit contact"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(contact)}
                          className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
                          title="Remove contact"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
            <p className="text-sm text-gray-600">
              No emergency contacts yet. Add at least one contact so we can reach someone in case of an emergency.
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {form.id && !form.id.startsWith("legacy-")
                    ? "Update Emergency Contact"
                    : "Add Emergency Contact"}
                </h3>
                <p className="text-sm text-gray-500">
                  Provide details for the person to reach in case of emergency.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 transition hover:text-gray-600"
                disabled={saving}
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Contact Name*
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={`input w-full ${errors.name ? "border-red-300" : ""}`}
                    placeholder="e.g. John Doe"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Relationship*
                  </label>
                  <input
                    type="text"
                    value={form.relation}
                    onChange={(e) =>
                      setForm({ ...form, relation: e.target.value })
                    }
                    className={`input w-full ${
                      errors.relation ? "border-red-300" : ""
                    }`}
                    placeholder="e.g. Spouse, Parent"
                  />
                  {errors.relation && (
                    <p className="mt-1 text-xs text-red-600">{errors.relation}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Primary Phone*
                  </label>
                  <div className="relative">
                    <PhoneIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={`input w-full pl-10 ${
                        errors.phone ? "border-red-300" : ""
                      }`}
                      placeholder="e.g. +92 300 1234567"
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`input w-full ${
                      errors.email ? "border-red-300" : ""
                    }`}
                    placeholder="Optional email"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={form.addressLine1}
                  onChange={(e) =>
                    setForm({ ...form, addressLine1: e.target.value })
                  }
                  className="input w-full"
                  placeholder="Street address, P.O. box"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={form.addressLine2}
                  onChange={(e) =>
                    setForm({ ...form, addressLine2: e.target.value })
                  }
                  className="input w-full"
                  placeholder="Apartment, suite, unit"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="input w-full"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    State / Province
                  </label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="input w-full"
                    placeholder="State or province"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={(e) =>
                      setForm({ ...form, postalCode: e.target.value })
                    }
                    className="input w-full"
                    placeholder="ZIP / Postal code"
                  />
                </div>
              </div>

              {form.id?.startsWith("legacy-") && (
                <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  This contact was migrated from the previous single-contact data. Saving will convert it into the new format.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <button
                onClick={closeModal}
                className="btn btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`btn btn-primary ${saving ? "opacity-60" : ""}`}
              >
                {saving ? "Saving..." : "Save Contact"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && contactToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-gray-900">
                Remove Emergency Contact
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                This will permanently remove <span className="font-medium text-gray-900">{contactToDelete.name || "this contact"}</span> from your emergency contacts list.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Are you sure you want to continue?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <button
                onClick={() => {
                  if (deleteLoading) return;
                  setShowDeleteModal(false);
                  setContactToDelete(null);
                }}
                className="btn btn-secondary"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className={`btn btn-danger ${deleteLoading ? "opacity-60" : ""}`}
              >
                {deleteLoading ? "Removing..." : "Remove Contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
