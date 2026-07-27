import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "giftbox";
const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || "";

const hasCredentials = Boolean(accountId && accessKeyId && secretAccessKey);

export const r2Client = hasCredentials
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    })
  : null;

/**
 * Uploads a file buffer to Cloudflare R2.
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  if (!r2Client) {
    console.error("[R2] Attempted upload, but R2 client is not configured.");
    throw new Error("Cloudflare R2 is not configured. Please set the required environment variables.");
  }

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );

  const baseUrl = publicUrl.endsWith("/") ? publicUrl.slice(0, -1) : publicUrl;
  return `${baseUrl}/${fileName}`;
}

/**
 * Deletes a file from Cloudflare R2 given its public URL.
 */
export async function deleteFromR2(fileUrl: string): Promise<void> {
  if (!r2Client) return;

  try {
    const url = new URL(fileUrl);
    // pathname starts with a slash, so slice it off to extract the key
    const key = decodeURIComponent(url.pathname.slice(1));
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
  } catch (err) {
    console.warn("[R2] Delete error:", err);
  }
}
