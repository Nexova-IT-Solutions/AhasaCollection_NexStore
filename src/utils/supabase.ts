import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function extractStoragePathFromPublicUrl(publicUrl: string, bucket: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export async function deleteFileByPublicUrl(publicUrl: string, bucket = "giftbox"): Promise<void> {
  // If the URL is an R2 URL or not a Supabase URL, delete it via the API
  if (publicUrl && (!publicUrl.includes("supabase.co") || publicUrl.includes("r2.dev"))) {
    try {
      await fetch(`/api/upload?url=${encodeURIComponent(publicUrl)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("R2 remove warning:", err);
    }
    return;
  }

  if (!supabase) {
    console.warn("[Supabase] Client not initialized. Skipping file deletion.");
    return;
  }
  const existingPath = extractStoragePathFromPublicUrl(publicUrl, bucket);
  if (!existingPath) return;

  const { error } = await supabase.storage.from(bucket).remove([existingPath]);
  if (error) {
    console.warn("Supabase remove warning:", error.message);
  }
}

/**
 * Uploads a file to Cloudflare R2 via internal API and returns the public URL.
 * @param file The File object or a string URL (if string, returns as is).
 * @param path The path/prefix within R2.
 */
export async function uploadFile(
  file: File | string,
  path: string,
  options?: { replacePublicUrl?: string; bucket?: string }
): Promise<string> {
  if (typeof file === "string") return file;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("path", path);
  if (options?.replacePublicUrl) {
    formData.append("replaceUrl", options.replacePublicUrl);
  }

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Failed to upload file to Cloudflare R2");
  }

  const data = await response.json();
  return data.url;
}
