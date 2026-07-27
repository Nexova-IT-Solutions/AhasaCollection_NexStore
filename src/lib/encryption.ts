import crypto from "crypto";

const RAW_KEY = process.env.MASTER_ENCRYPTION_KEY || "giftboxlk_default_secure_encryption_key_2026";
const IV_LENGTH = 16; // For AES, this is always 16

// 1. KEY DERIVATION (SHA-256)
// This ensures the key is ALWAYS exactly 32 bytes for aes-256-cbc
const VALID_KEY_BUFFER = crypto
  .createHash("sha256")
  .update(String(RAW_KEY))
  .digest();

if (!process.env.MASTER_ENCRYPTION_KEY) {
  console.warn("⚠️ MASTER_ENCRYPTION_KEY is missing in .env. Using fallback key.");
} else if (process.env.MASTER_ENCRYPTION_KEY.length !== 32) {
  console.log("ℹ️ MASTER_ENCRYPTION_KEY is not 32 characters. Deriving 32-byte key via SHA-256.");
}

export function encrypt(text: string): string {
  if (!text) return "";
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", VALID_KEY_BUFFER, iv);
    
    let encrypted = cipher.update(text, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  } catch (error) {
    console.error("Encryption failed:", error);
    return text;
  }
}

export function decrypt(text: string): string {
  if (!text) return "";

  try {
    const textParts = text.split(":");
    if (textParts.length !== 2) return text;

    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    
    const decipher = crypto.createDecipheriv("aes-256-cbc", VALID_KEY_BUFFER, iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString("utf8");
  } catch (error) {
    // If decryption fails, it might not be encrypted or key changed
    console.error("Decryption failed:", error);
    return text;
  }
}
