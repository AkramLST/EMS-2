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

async function getAuthorizedEmployeeId(user: any, employeeId: string) {
  const isAdminOrHr = ADMIN_ROLES.includes(user.role);
  const isSelf = user.employee?.id === employeeId;

  if (!isSelf && !isAdminOrHr) {
    throw new Error("FORBIDDEN");
  }

  return employeeId;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const contactId = params.id;
    if (!contactId) {
      return NextResponse.json({ message: "Contact ID is required" }, { status: 400 });
    }

    const existingContact = await prisma.emergencyContact.findUnique({
      where: { id: contactId },
    });

    if (!existingContact) {
      return NextResponse.json({ message: "Emergency contact not found" }, { status: 404 });
    }

    try {
      await getAuthorizedEmployeeId(user, existingContact.employeeId);
    } catch (error) {
      return NextResponse.json(
        { message: "Access denied. You cannot update this contact." },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const data: Record<string, any> = {};
    const fields: Array<[keyof typeof body, string]> = [
      ["name", "name"],
      ["relation", "relation"],
      ["phone", "phone"],
      ["email", "email"],
      ["addressLine1", "addressLine1"],
      ["addressLine2", "addressLine2"],
      ["city", "city"],
      ["state", "state"],
      ["postalCode", "postalCode"],
    ];

    for (const [payloadKey, column] of fields) {
      if (payloadKey in body) {
        const value = body[payloadKey];
        if (typeof value === "string") {
          const trimmed = value.trim();
          data[column] = trimmed.length === 0 ? null : trimmed;
        } else {
          data[column] = value ?? null;
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: "No fields provided to update" },
        { status: 400 }
      );
    }

    if (!data.name || !data.relation || !data.phone) {
      return NextResponse.json(
        {
          message: "Name, relationship, and phone are required",
        },
        { status: 400 }
      );
    }

    const updated = await prisma.emergencyContact.update({
      where: { id: contactId },
      data,
    });

    return NextResponse.json({ success: true, contact: serializeContact(updated) });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    console.error("Emergency contact update error:", error);
    return NextResponse.json(
      { message: "Failed to update emergency contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const contactId = params.id;
    if (!contactId) {
      return NextResponse.json({ message: "Contact ID is required" }, { status: 400 });
    }

    const existingContact = await prisma.emergencyContact.findUnique({
      where: { id: contactId },
    });

    if (!existingContact) {
      return NextResponse.json({ message: "Emergency contact not found" }, { status: 404 });
    }

    try {
      await getAuthorizedEmployeeId(user, existingContact.employeeId);
    } catch (error) {
      return NextResponse.json(
        { message: "Access denied. You cannot delete this contact." },
        { status: 403 }
      );
    }

    await prisma.emergencyContact.delete({ where: { id: contactId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Emergency contact delete error:", error);
    return NextResponse.json(
      { message: "Failed to delete emergency contact" },
      { status: 500 }
    );
  }
}
