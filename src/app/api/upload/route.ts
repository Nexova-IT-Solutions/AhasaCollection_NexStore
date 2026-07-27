import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToR2, deleteFromR2 } from "@/utils/r2-server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const path = formData.get("path") as string || "uploads";
    const replaceUrl = formData.get("replaceUrl") as string | null;

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    // Delete existing file if replaceUrl is provided
    if (replaceUrl) {
      await deleteFromR2(replaceUrl);
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Generate unique file name
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${path}/${Math.random().toString(36).substring(2, 12)}_${Date.now()}.${fileExt}`;

    // Upload to Cloudflare R2
    const publicUrl = await uploadToR2(fileBuffer, fileName, file.type);

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ message: error.message || "Failed to upload file" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("url");

    if (!fileUrl) {
      return NextResponse.json({ message: "No file URL provided" }, { status: 400 });
    }

    await deleteFromR2(fileUrl);

    return NextResponse.json({ message: "File deleted successfully" });
  } catch (error: any) {
    console.error("Delete API Error:", error);
    return NextResponse.json({ message: error.message || "Failed to delete file" }, { status: 500 });
  }
}
