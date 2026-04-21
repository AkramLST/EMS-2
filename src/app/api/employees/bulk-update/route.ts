import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { employeeIds, updates } = await request.json();

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { message: "Employee IDs are required" },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { message: "Updates object is required" },
        { status: 400 }
      );
    }

    // Validate and clean update data
    const allowedFields = [
      'status', 'designation', 'departmentId', 'managerId', 'employmentType', 
      'workLocation', 'resignationDate', 'lastWorkingDay'
    ];

    const updateData: any = {};
    
    // Only include allowed fields
    allowedFields.forEach(field => {
      if (updates.hasOwnProperty(field)) {
        updateData[field] = updates[field];
      }
    });

    // Handle date conversions
    const dateFields = ['resignationDate', 'lastWorkingDay'];
    
    for (const field of dateFields) {
      if (updateData[field] !== undefined) {
        if (updateData[field] === null || updateData[field] === '') {
          updateData[field] = null;
        } else {
          const dateValue = new Date(updateData[field]);
          if (isNaN(dateValue.getTime())) {
            return NextResponse.json(
              { message: `Invalid date format for ${field}` },
              { status: 400 }
            );
          }
          updateData[field] = dateValue;
        }
      }
    }

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "No valid update fields provided" },
        { status: 400 }
      );
    }

    // Perform bulk update
    const result = await prisma.employee.updateMany({
      where: {
        id: {
          in: employeeIds
        }
      },
      data: updateData
    });

    // Create audit logs for bulk update
    const auditPromises = employeeIds.map(employeeId => 
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE',
          resource: 'employee',
          resourceId: employeeId,
          details: `Bulk update: ${JSON.stringify(updateData)}`,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })
    );

    await Promise.all(auditPromises);

    return NextResponse.json({ 
      message: `Successfully updated ${result.count} employees`,
      updated: result.count 
    });

  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
