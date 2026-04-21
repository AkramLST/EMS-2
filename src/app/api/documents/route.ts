import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DOCUMENTS_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET || "documents";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "";

const MIME_EXTENSION_MAP: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

function sanitizeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

function deriveExtension(fileName: string, mimeType: string) {
  const explicitExt = fileName.split(".").pop();
  if (explicitExt && explicitExt.trim().length > 0) {
    return explicitExt.toLowerCase();
  }
  return MIME_EXTENSION_MAP[mimeType] || "bin";
}

// GET /api/documents - List documents for the authenticated user's employee profile
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get the employee record for this user
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      include: {
        documents: {
          orderBy: {
            uploadedAt: "desc",
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { message: "Employee profile not found" },
        { status: 404 }
      );
    }

    const documentsWithUrls = employee.documents.map((document) => {
      const isSupabasePath =
        typeof document.filePath === "string" &&
        document.filePath.trim().length > 0 &&
        !document.filePath.startsWith("/");

      let fileUrl: string | null = null;

      if (isSupabasePath) {
        const { data } = supabase.storage
          .from(DOCUMENTS_BUCKET)
          .getPublicUrl(document.filePath);
        fileUrl = data?.publicUrl ?? null;
      } else if (
        typeof document.filePath === "string" &&
        document.filePath.startsWith("/")
      ) {
        fileUrl = BASE_URL ? `${BASE_URL}${document.filePath}` : document.filePath;
      }

      return {
        ...document,
        fileUrl,
      };
    });

    return NextResponse.json({
      documents: documentsWithUrls,
    });
  } catch (error) {
    console.error("Get documents error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/documents - Upload a new document
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;
    const name = formData.get("name") as string;
    const expiryDate = formData.get("expiryDate") as string;

    console.log("Upload request data:", {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      documentType: type,
      documentName: name,
      expiryDate: expiryDate
    });

    if (!file || !type || !name) {
      return NextResponse.json(
        { message: "File, type, and name are required" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { message: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: "Only PDF, DOC, DOCX, JPG, JPEG, and PNG files are allowed" },
        { status: 400 }
      );
    }

    // Get the employee record for this user
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    });

    if (!employee) {
      return NextResponse.json(
        { message: "Employee profile not found" },
        { status: 404 }
      );
    }

    // Prepare file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const extension = deriveExtension(file.name, file.type);
    const originalBaseName = file.name.replace(/\.[^/.]+$/, "");
    const sanitizedBaseName = sanitizeFileName(originalBaseName) || "document";
    const uniqueFileName = `${uuidv4()}-${sanitizedBaseName}.${extension}`;
    const storagePath = `${employee.employeeId}/${uniqueFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload document error (storage):", uploadError);
      return NextResponse.json(
        { message: "Failed to upload document to storage" },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(DOCUMENTS_BUCKET)
      .getPublicUrl(storagePath);

    // Save document record to database
    const document = await prisma.document.create({
      data: {
        employeeId: employee.id,
        type: type.toUpperCase() as any,
        name,
        filePath: storagePath,
        fileSize: file.size,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });

    return NextResponse.json({
      document: {
        ...document,
        fileUrl: publicUrlData?.publicUrl ?? null,
      },
      message: "Document uploaded successfully",
    });
  } catch (error) {
    console.error("Upload document error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return NextResponse.json(
      { 
        message: "Failed to upload document",
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
