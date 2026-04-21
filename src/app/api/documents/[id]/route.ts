import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { unlink } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DOCUMENTS_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET || "documents";

// GET /api/documents/[id] - Download a specific document
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const documentId = params.id;

    // Get the document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        employee: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 }
      );
    }

    // Check if the user owns this document
    if (document.employee.userId !== user.id) {
      return NextResponse.json(
        { message: "Access denied" },
        { status: 403 }
      );
    }

    const isSupabasePath =
      typeof document.filePath === "string" &&
      document.filePath.trim().length > 0 &&
      !document.filePath.startsWith("/");

    if (isSupabasePath) {
      const { data, error } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .download(document.filePath);

      if (error || !data) {
        console.error("Download document error (storage):", error);
        return NextResponse.json(
          { message: "File not found in storage" },
          { status: 404 }
        );
      }

      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": getContentType(document.filePath),
          "Content-Disposition": `attachment; filename="${document.name}"`,
        },
      });
    }

    const filePath = join(process.cwd(), "public", document.filePath);
    try {
      const fileBuffer = await require("fs").promises.readFile(filePath);

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": getContentType(document.filePath),
          "Content-Disposition": `attachment; filename="${document.name}"`,
        },
      });
    } catch (fileError) {
      return NextResponse.json(
        { message: "File not found on server" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Download document error:", error);
    return NextResponse.json(
      { message: "Failed to download document" },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete a specific document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const documentId = params.id;

    // Get the document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        employee: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 }
      );
    }

    // Check if the user owns this document
    if (document.employee.userId !== user.id) {
      return NextResponse.json(
        { message: "Access denied" },
        { status: 403 }
      );
    }

    const isSupabasePath =
      typeof document.filePath === "string" &&
      document.filePath.trim().length > 0 &&
      !document.filePath.startsWith("/");

    if (isSupabasePath) {
      const { error: removeError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .remove([document.filePath]);

      if (removeError) {
        console.warn("Failed to delete file from storage:", removeError);
      }
    } else {
      const filePath = join(process.cwd(), "public", document.filePath);
      try {
        await unlink(filePath);
      } catch (fileError) {
        console.warn("Failed to delete file from disk:", fileError);
      }
    }

    // Delete document record from database
    await prisma.document.delete({
      where: { id: documentId },
    });

    return NextResponse.json({
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { message: "Failed to delete document" },
      { status: 500 }
    );
  }
}

// Helper function to determine content type based on file extension
function getContentType(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}
