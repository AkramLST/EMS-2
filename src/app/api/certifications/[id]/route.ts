import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_ROLES = new Set(["ADMINISTRATOR", "HR_MANAGER"]);

const CERTIFICATION_STATUS_VALUES = [
  "IN_PROGRESS",
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
] as const;

type CertificationStatus = (typeof CERTIFICATION_STATUS_VALUES)[number];

const CERTIFICATION_STATUS_SET = new Set<CertificationStatus>(
  CERTIFICATION_STATUS_VALUES
);

const normalizeCertificationStatus = (
  value?: string | null
): CertificationStatus | null => {
  if (!value) return null;
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z]/g, "_")
    .replace(/__+/g, "_")
    .replace(/^_|_$/g, "");
  const possible = normalized as CertificationStatus;
  return CERTIFICATION_STATUS_SET.has(possible) ? possible : null;
};

const certificationClient = (prisma as any).employeeCertification;

const mapCertificationRecord = (cert: any) => ({
  id: cert.id,
  employeeId: cert.employeeId,
  title: cert.title,
  issuedBy: cert.issuedBy ?? null,
  issueDate: cert.issueDate,
  expiryDate: cert.expiryDate,
  status: cert.status,
  verificationUrl: cert.verificationUrl ?? null,
  createdAt: cert.createdAt,
  updatedAt: cert.updatedAt,
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!certificationClient) {
      return NextResponse.json(
        { message: "Certifications feature is not available" },
        { status: 500 }
      );
    }

    const existing = await certificationClient.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ message: "Certification not found" }, { status: 404 });
    }

    if (
      !(ADMIN_ROLES.has(user.role) || user.employee?.id === existing.employeeId)
    ) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, issuedBy, issueDate, expiryDate, status, verificationUrl } =
      body || {};

    const updates: Record<string, any> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json(
          { message: "Certification title cannot be empty" },
          { status: 400 }
        );
      }
      updates.title = title.trim();
    }

    if (issuedBy !== undefined) {
      updates.issuedBy = typeof issuedBy === "string" && issuedBy.trim()
        ? issuedBy.trim()
        : null;
    }

    if (issueDate !== undefined) {
      if (!issueDate) {
        updates.issueDate = null;
      } else {
        const parsed = new Date(issueDate);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json(
            { message: "Invalid issue date" },
            { status: 400 }
          );
        }
        updates.issueDate = parsed;
      }
    }

    if (expiryDate !== undefined) {
      if (!expiryDate) {
        updates.expiryDate = null;
      } else {
        const parsed = new Date(expiryDate);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json(
            { message: "Invalid expiry date" },
            { status: 400 }
          );
        }
        updates.expiryDate = parsed;
      }
    }

    if (status !== undefined) {
      const normalized = normalizeCertificationStatus(status);
      if (!normalized) {
        return NextResponse.json(
          { message: "Invalid certification status" },
          { status: 400 }
        );
      }
      updates.status = normalized;
    }

    if (verificationUrl !== undefined) {
      updates.verificationUrl =
        typeof verificationUrl === "string" && verificationUrl.trim()
          ? verificationUrl.trim()
          : null;
    }

    const updated = await certificationClient.update({
      where: { id: params.id },
      data: updates,
    });

    return NextResponse.json({ certification: mapCertificationRecord(updated) });
  } catch (error) {
    console.error("Update certification error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!certificationClient) {
      return NextResponse.json(
        { message: "Certifications feature is not available" },
        { status: 500 }
      );
    }

    const existing = await certificationClient.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ message: "Certification not found" }, { status: 404 });
    }

    if (
      !(ADMIN_ROLES.has(user.role) || user.employee?.id === existing.employeeId)
    ) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await certificationClient.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete certification error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
