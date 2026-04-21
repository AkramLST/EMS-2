"use client";

import { Fragment, useMemo, useRef, useState, type ReactNode } from "react";
import { Dialog, Transition } from "@headlessui/react";
import toast from "react-hot-toast";

interface EmployeeSummaryModalProps {
  open: boolean;
  onClose: () => void;
  employee: any;
  profileImage?: string | null;
}

interface InfoItem {
  label: string;
  value: ReactNode;
  fallback?: string;
}

interface InfoGridProps {
  items: InfoItem[];
  columns?: 2 | 3;
}

interface SectionProps {
  title: string;
  children: ReactNode;
}

interface KeyValueRowProps {
  label: string;
  value: ReactNode;
  fallback?: string;
}

const formatDate = (value?: string | Date | null) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatEmploymentType = (value?: string | null) => {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

const calculateTenure = (joinDate?: string | Date | null) => {
  if (!joinDate) return "—";
  const start = joinDate instanceof Date ? joinDate : new Date(joinDate);
  if (Number.isNaN(start.getTime())) return "—";

  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  const days = now.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const segments: string[] = [];
  if (years > 0) segments.push(`${years} yr${years > 1 ? "s" : ""}`);
  if (months > 0) segments.push(`${months} mo${months > 1 ? "s" : ""}`);
  if (segments.length === 0) segments.push("< 1 mo");

  return segments.join(" • ");
};

const formatDateRange = (
  start?: string | Date | null,
  end?: string | Date | null,
  presentLabel = "Present"
) => {
  const startLabel = formatDate(start);
  const endLabel = end ? formatDate(end) : presentLabel;
  if (startLabel === "—" && endLabel === "—") {
    return null;
  }
  return `${startLabel} — ${endLabel}`;
};

const renderValue = (value: ReactNode, fallback?: string) => {
  const fallbackText = fallback ?? "Not provided";
  if (value === null || value === undefined) {
    return <span className="text-slate-400">{fallbackText}</span>;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return <span className="text-slate-400">{fallbackText}</span>;
    }
    return trimmed;
  }
  return value;
};

const InfoGrid = ({ items, columns = 2 }: InfoGridProps) => (
  <div
    className={`grid gap-x-10 gap-y-4 ${
      columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
    }`}
  >
    {items.map((item) => (
      <div key={item.label}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {item.label}
        </p>
        <p className="mt-1 text-sm text-slate-800 leading-relaxed">
          {renderValue(item.value, item.fallback)}
        </p>
      </div>
    ))}
  </div>
);

const Section = ({ title, children }: SectionProps) => (
  <section>
    <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700">{title}</h2>
    <div className="mt-1 h-0.5 bg-gradient-to-r from-blue-700 to-blue-200" />
    <div className="mt-5 space-y-4 text-sm text-slate-700">{children}</div>
  </section>
);

const KeyValueRow = ({ label, value, fallback }: KeyValueRowProps) => (
  <div className="flex flex-col">
    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </span>
    <span className="mt-1 text-sm text-slate-800">
      {renderValue(value, fallback)}
    </span>
  </div>
);

export default function EmployeeSummaryModal({
  open,
  onClose,
  employee,
  profileImage,
}: EmployeeSummaryModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);

  const fullName = useMemo(() => {
    if (!employee) return "Employee";
    return `${employee.firstName ?? ""} ${employee.middleName ?? ""} ${
      employee.lastName ?? ""
    }`
      .replace(/\s+/g, " ")
      .trim();
  }, [employee]);

  const statusLabel = useMemo(() => {
    if (!employee?.status) return "Active";
    return String(employee.status)
      .toLowerCase()
      .split("_")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  }, [employee?.status]);

  const joinDateLabel = useMemo(() => formatDate(employee?.joinDate), [employee?.joinDate]);
  const tenureLabel = useMemo(() => calculateTenure(employee?.joinDate), [employee?.joinDate]);

  const locationLabel = useMemo(() => {
    if (employee?.workLocation) return employee.workLocation;
    const parts = [employee?.address, employee?.city, employee?.state, employee?.country]
      .filter(Boolean)
      .map((part) => String(part));
    return parts.length ? parts.join(", ") : "Not specified";
  }, [employee?.address, employee?.city, employee?.country, employee?.state, employee?.workLocation]);

  const managerName = useMemo(() => {
    if (!employee?.manager) return "Not assigned";
    return `${employee.manager.firstName ?? ""} ${employee.manager.lastName ?? ""}`
      .replace(/\s+/g, " ")
      .trim();
  }, [employee?.manager]);

  const educationRecords = useMemo(() => {
    if (!Array.isArray(employee?.education)) return [] as any[];
    return employee.education.slice(0, 4);
  }, [employee?.education]);

  const experienceRecords = useMemo(() => {
    if (!Array.isArray(employee?.workExperiences)) return [] as any[];
    return employee.workExperiences.slice(0, 4);
  }, [employee?.workExperiences]);

  const employmentTypeLabel = formatEmploymentType(employee?.employmentType);
  const designationLabel = useMemo(() => {
    if (!employee) return "Employee";
    if (typeof employee.designation === "string") return employee.designation;
    return employee.designation?.title ?? "Designation";
  }, [employee]);

  const passportRecords = useMemo(
    () => (Array.isArray(employee?.passports) ? employee.passports : []),
    [employee?.passports]
  );

  const vitalsItems: InfoItem[] = [
    {
      label: "Email",
      value: employee?.email,
    },
    {
      label: "Employee Type",
      value:
        employee?.status || (employmentTypeLabel && employmentTypeLabel !== "—") ? (
          <div className="flex flex-wrap gap-2">
            {employee?.status && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-blue-700">
                {statusLabel}
              </span>
            )}
            {employmentTypeLabel && employmentTypeLabel !== "—" && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-blue-700">
                {employmentTypeLabel}
              </span>
            )}
          </div>
        ) : null,
    },
    {
      label: "Department",
      value: employee?.department?.name,
    },
    {
      label: "Hire Date",
      value:
        joinDateLabel === "—"
          ? null
          : `${joinDateLabel}${tenureLabel && tenureLabel !== "—" ? ` (${tenureLabel})` : ""}`,
    },
  ];

  const personalItems: InfoItem[] = [
    { label: "First Name", value: employee?.firstName },
    { label: "Last Name", value: employee?.lastName },
    { label: "Father Name", value: employee?.fatherName },
    { label: "CNIC", value: employee?.cnic },
    { label: "Blood Group", value: employee?.bloodGroup },
    {
      label: "Date of Birth",
      value: employee?.dateOfBirth ? formatDate(employee.dateOfBirth) : null,
    },
    { label: "Nationality", value: employee?.nationality },
    { label: "Gender", value: employee?.gender },
    { label: "Marital Status", value: employee?.maritalStatus },
  ];

  const addressItems: InfoItem[] = [
    { label: "Street", value: employee?.address },
    { label: "City", value: employee?.city },
    { label: "Province / State", value: employee?.state },
    { label: "Postal Code", value: employee?.postalCode },
    { label: "Country", value: employee?.country },
  ];

  const contactItems: InfoItem[] = [
    { label: "Work Phone", value: employee?.phone },
    { label: "Mobile Phone", value: employee?.alternatePhone },
    { label: "Work Email", value: employee?.email },
    {
      label: "LinkedIn",
      value: employee?.socialLinks?.linkedin ? (
        <a
          href={employee.socialLinks.linkedin}
          className="text-blue-600 hover:underline"
        >
          {employee.socialLinks.linkedin}
        </a>
      ) : null,
    },
    {
      label: "Twitter",
      value: employee?.socialLinks?.twitter ? (
        <a href={employee.socialLinks.twitter} className="text-blue-600 hover:underline">
          {employee.socialLinks.twitter}
        </a>
      ) : null,
    },
    {
      label: "Facebook",
      value: employee?.socialLinks?.facebook ? (
        <a href={employee.socialLinks.facebook} className="text-blue-600 hover:underline">
          {employee.socialLinks.facebook}
        </a>
      ) : null,
    },
    {
      label: "Instagram",
      value: employee?.socialLinks?.instagram ? (
        <a href={employee.socialLinks.instagram} className="text-blue-600 hover:underline">
          {employee.socialLinks.instagram}
        </a>
      ) : null,
    },
  ];

  const handlePrint = () => {
    if (!contentRef.current) {
      return;
    }

    setPrinting(true);

    const node = contentRef.current;
    const styles = Array.from(document.head.querySelectorAll("style, link[rel='stylesheet']"))
      .map((el) => el.outerHTML)
      .join("\n");

    const printWindow = window.open("", "_blank", "width=1080,height=768");

    if (!printWindow) {
      toast.error("Unable to open print preview. Please allow pop-ups and try again.");
      setPrinting(false);
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${fullName || "Employee"} – Profile</title>
          ${styles}
          <style>
            body { margin: 0; padding: 32px; background: #ffffff; color: #0f172a; }
            @media print {
              body { padding: 0; }
              .print-wrapper { box-shadow: none !important; border: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="print-wrapper">
            ${node.outerHTML}
          </div>
        </body>
      </html>`);
    printWindow.document.close();

    const handleAfterPrint = () => {
      printWindow.removeEventListener("afterprint", handleAfterPrint);
      printWindow.close();
      setPrinting(false);
    };

    printWindow.addEventListener("afterprint", handleAfterPrint);

    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (error) {
        console.error("Failed to trigger print:", error);
        toast.error("Unable to start printing. Please try again.");
        setPrinting(false);
        printWindow.close();
      }
    }, 400);
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={printing ? () => {} : onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 lg:p-8">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                  <Dialog.Title className="text-lg font-semibold text-slate-900">
                    Employee Profile Summary
                  </Dialog.Title>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePrint}
                      disabled={printing}
                      className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {printing ? "Preparing…" : "Print"}
                    </button>
                    <button
                      onClick={onClose}
                      disabled={printing}
                      className="inline-flex items-center rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="max-h-[75vh] overflow-y-auto bg-slate-50 p-6">
                  <div
                    ref={contentRef}
                    className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-blue-100 bg-white shadow-lg print:shadow-none"
                  >
                    <header className="px-10 pt-10 pb-6 bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-blue-50 text-2xl font-semibold text-blue-600">
                            {profileImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={profileImage}
                                alt={fullName}
                                className="h-full w-full object-cover"
                                crossOrigin="anonymous"
                              />
                            ) : (
                              <span>{(fullName || "E").charAt(0)}</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <h1 className="text-2xl font-semibold text-slate-900">{fullName}</h1>
                            <p className="text-sm text-slate-500">{designationLabel}</p>
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              {employmentTypeLabel && employmentTypeLabel !== "—" ? employmentTypeLabel : "Employment Type N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wide text-slate-400">Employee ID</p>
                          <p className="text-lg font-semibold text-blue-700">
                            {renderValue(employee?.employeeId)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                        <span>
                          Department: {renderValue(employee?.department?.name)}
                        </span>
                        <span>Generated: {formatDate(new Date())}</span>
                      </div>
                    </header>

                    <div className="space-y-10 px-10 pb-12 pt-8">
                      <Section title="Vitals">
                        <InfoGrid items={vitalsItems} columns={2} />
                      </Section>

                      <Section title="Personal Information">
                        <InfoGrid items={personalItems} columns={2} />
                      </Section>

                      <Section title="Manager">
                        <KeyValueRow label="Manager" value={managerName} />
                      </Section>

                      <Section title="Address">
                        <InfoGrid items={addressItems} columns={3} />
                      </Section>

                      <Section title="Contact Information">
                        <InfoGrid items={contactItems} columns={3} />
                      </Section>

                      {passportRecords.length > 0 && (
                        <Section title="Passport Information">
                          <div className="overflow-hidden rounded-lg border border-blue-100">
                            <table className="min-w-full divide-y divide-blue-100 text-sm">
                              <thead className="bg-blue-50 text-left text-xs font-semibold uppercase tracking-wide text-blue-700">
                                <tr>
                                  <th className="px-4 py-3">Passport Number</th>
                                  <th className="px-4 py-3">Issued Date</th>
                                  <th className="px-4 py-3">Expiry Date</th>
                                  <th className="px-4 py-3">Issuing Country</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-blue-50 text-slate-700">
                                {passportRecords.map((passport: any, index: number) => (
                                  <tr key={passport.id ?? `passport-${index}`} className="bg-white">
                                    <td className="px-4 py-3">
                                      {renderValue(passport.passportNumber)}
                                    </td>
                                    <td className="px-4 py-3">
                                      {passport.issuedDate ? formatDate(passport.issuedDate) : renderValue(null)}
                                    </td>
                                    <td className="px-4 py-3">
                                      {passport.expiryDate ? formatDate(passport.expiryDate) : renderValue(null)}
                                    </td>
                                    <td className="px-4 py-3">
                                      {renderValue(passport.issuingCountry)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Section>
                      )}

                      {educationRecords.length > 0 && (
                        <Section title="Education">
                          <div className="space-y-4">
                            {educationRecords.map((record: any, index: number) => (
                              <div key={record.id ?? `education-${index}`} className="space-y-1">
                                <h3 className="text-sm font-semibold text-slate-900">
                                  {record.degree || "Degree"}
                                </h3>
                                <p className="text-sm text-blue-700">
                                  {record.institution || "Institution"}
                                </p>
                                {record.major && (
                                  <p className="text-xs text-slate-500">Subject: {record.major}</p>
                                )}
                                {formatDateRange(record.startDate, record.endDate) && (
                                  <p className="text-xs text-slate-400">
                                    {formatDateRange(record.startDate, record.endDate)}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </Section>
                      )}

                      {experienceRecords.length > 0 && (
                        <Section title="Work Experience">
                          <div className="space-y-4">
                            {experienceRecords.map((experience: any, index: number) => (
                              <div key={experience.id ?? `experience-${index}`} className="space-y-1">
                                <h3 className="text-sm font-semibold text-slate-900">
                                  {experience.title || "Role"}
                                </h3>
                                <p className="text-sm text-blue-700">
                                  {experience.companyName || experience.location || "Company"}
                                </p>
                                {formatDateRange(experience.startDate, experience.endDate) && (
                                  <p className="text-xs text-slate-400">
                                    {formatDateRange(experience.startDate, experience.endDate)}
                                  </p>
                                )}
                                {experience.description && (
                                  <p className="text-sm text-slate-600 leading-relaxed">
                                    {experience.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </Section>
                      )}
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
