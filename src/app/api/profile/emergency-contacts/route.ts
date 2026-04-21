import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_ROLES = ["ADMINISTRATOR", "HR_MANAGER"];

function serializeContact(contact: any) {
  return {
    id: contact.id,
    name: contact.name,
    relation: contact.relation,
    phone: contact.phone,
    email: contact.email,
    addressLine1: contact.addressLine1,
    addressLine2: contact.addressLine2,
    city: contact.city,
    state: contact.state,
    postalCode: contact.postalCode,
    createdAt: contact.createdAt?.toISOString?.() ?? contact.createdAt,
    updatedAt: contact.updatedAt?.toISOString?.() ?? contact.updatedAt,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      employeeId,
      name,
      relation,
      phone,
      email,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
    } = body || {};

    const targetEmployeeId = employeeId ?? user.employee?.id;

    if (!targetEmployeeId) {
      return NextResponse.json(
        { message: "Employee ID is required" },
        { status: 400 }
      );
    }

    const isAdminOrHr = ADMIN_ROLES.includes(user.role);
    const isSelf = user.employee?.id === targetEmployeeId;

    if (!isSelf && !isAdminOrHr) {
      return NextResponse.json(
        {
          message:
            "Access denied. You do not have permission to add contacts for this profile.",
        },
        { status: 403 }
      );
    }

    if (!name || !relation || !phone) {
      return NextResponse.json(
        {
          message: "Name, relationship, and phone are required fields.",
        },
        { status: 400 }
      );
    }

    const contact = await prisma.emergencyContact.create({
      data: {
        employeeId: targetEmployeeId,
        name: String(name).trim(),
        relation: String(relation).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim() : null,
        addressLine1: addressLine1 ? String(addressLine1).trim() : null,
        addressLine2: addressLine2 ? String(addressLine2).trim() : null,
        city: city ? String(city).trim() : null,
        state: state ? String(state).trim() : null,
        postalCode: postalCode ? String(postalCode).trim() : null,
      },
    });

    return NextResponse.json({ success: true, contact: serializeContact(contact) });
  } catch (error) {
    console.error("Emergency contact create error:", error);
    return NextResponse.json(
      { message: "Failed to create emergency contact" },
      { status: 500 }
    );
  }
}
