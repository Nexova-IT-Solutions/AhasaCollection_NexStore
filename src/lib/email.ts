const mailersendToken = process.env.MAILERSEND_TOKEN || "mlsn.194bc6d9ec9ac7189982605b502b056f334745d7eb3388368a7a15b911a33161";
const fromEmail = process.env.MAIL_FROM || "MS_kJeLLq@nexovaitsolutions.com";
const fromName = "Ahasa System";

function ensureMailerConfig() {
  if (!mailersendToken) {
    throw new Error("MAILERSEND_TOKEN is required for email sending");
  }
}

function buildResetTemplate(resetUrl: string) {
  return `
  <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:24px;">
    <table role="presentation" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #e2e8f0;">
      <tr>
        <td style="background:#2563EB; color:#ffffff; padding:20px 24px; font-size:22px; font-weight:700;">
          Ahasa Password Reset
        </td>
      </tr>
      <tr>
        <td style="padding:24px; color:#0f172a; line-height:1.6; font-size:15px;">
          <p style="margin:0 0 12px 0;">Hello,</p>
          <p style="margin:0 0 16px 0;">We received a request to reset your Ahasa account password. Click the button below to continue.</p>
          <p style="margin:24px 0;">
            <a href="${resetUrl}" style="display:inline-block; background:#2563EB; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:999px; font-weight:600;">Reset Password</a>
          </p>
          <p style="margin:0 0 12px 0; color:#64748b;">This link will expire in 1 hour.</p>
          <p style="margin:0; color:#64748b;">If you did not request this, you can safely ignore this email.</p>
        </td>
      </tr>
    </table>
  </div>`;
}

export async function sendPasswordResetEmail(params: { to: string; resetUrl: string }) {
  ensureMailerConfig();

  const response = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "Authorization": `Bearer ${mailersendToken}`
    },
    body: JSON.stringify({
      from: {
        email: fromEmail,
        name: fromName
      },
      to: [
        {
          email: params.to
        }
      ],
      subject: "Reset your Ahasa password",
      html: buildResetTemplate(params.resetUrl)
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("MailerSend API error:", errorText);
    throw new Error(`Failed to send email: ${response.status} ${response.statusText}`);
  }
}
