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

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const employeeIdParam = searchParams.get("employeeId");

    let targetEmployeeId: string | null = null;

    if (employeeIdParam) {
      if (ADMIN_ROLES.has(user.role)) {
        targetEmployeeId = employeeIdParam;
      } else if (user.employee?.id === employeeIdParam) {
        targetEmployeeId = employeeIdParam;
      } else {
        return NextResponse.json(
          { message: "Insufficient permissions" },
          { status: 403 }
        );
      }
    } else {
      targetEmployeeId = user.employee?.id ?? null;
    }

    if (!targetEmployeeId) {
      return NextResponse.json({ certifications: [] });
    }

    const records = await certificationClient.findMany({
      where: { employeeId: targetEmployeeId },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      certifications: records.map(mapCertificationRecord),
    });
  } catch (error) {
    console.error("Get certifications error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      employeeId: employeeIdBody,
      title,
      issuedBy,
      issueDate,
      expiryDate,
      status,
      verificationUrl,
    } = body || {};

    let targetEmployeeId = user.employee?.id ?? null;

    if (employeeIdBody) {
      if (ADMIN_ROLES.has(user.role)) {
        targetEmployeeId = employeeIdBody;
      } else if (user.employee?.id === employeeIdBody) {
        targetEmployeeId = employeeIdBody;
      } else {
        return NextResponse.json(
          { message: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    if (!targetEmployeeId) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 400 }
      );
    }

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { message: "Certification title is required" },
        { status: 400 }
      );
    }

    let parsedIssueDate: Date | null = null;
    if (issueDate) {
      parsedIssueDate = new Date(issueDate);
      if (Number.isNaN(parsedIssueDate.getTime())) {
        return NextResponse.json(
          { message: "Invalid issue date" },
          { status: 400 }
        );
      }
    }

    let parsedExpiryDate: Date | null = null;
    if (expiryDate) {
      parsedExpiryDate = new Date(expiryDate);
      if (Number.isNaN(parsedExpiryDate.getTime())) {
        return NextResponse.json(
          { message: "Invalid expiry date" },
          { status: 400 }
        );
      }
    }

    const normalizedStatus =
      normalizeCertificationStatus(status) ?? "IN_PROGRESS";

    const created = await certificationClient.create({
      data: {
        employeeId: targetEmployeeId,
        title: title.trim(),
        issuedBy: issuedBy?.trim() || null,
        issueDate: parsedIssueDate,
        expiryDate: parsedExpiryDate,
        status: normalizedStatus,
        verificationUrl: verificationUrl?.trim() || null,
      },
    });

    return NextResponse.json(
      { certification: mapCertificationRecord(created) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create certification error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
