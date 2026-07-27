const mailersendToken = process.env.MAILERSEND_TOKEN || "mlsn.194bc6d9ec9ac7189982605b502b056f334745d7eb3388368a7a15b911a33161";
const fromEmail = process.env.MAIL_FROM || "MS_kJeLLq@nexovaitsolutions.com";
const fromName = "SPC System";

function ensureMailerConfig() {
  if (!mailersendToken) {
    throw new Error("MAILERSEND_TOKEN is required for email sending");
  }
}

function buildResetTemplate(resetUrl: string) {
  return `
  <div style="font-family: Arial, sans-serif; background:#f7f7fb; padding:24px;">
    <table role="presentation" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #f0e6ed;">
      <tr>
        <td style="background:#A7066A; color:#ffffff; padding:20px 24px; font-size:22px; font-weight:700;">
          SPC Password Reset
        </td>
      </tr>
      <tr>
        <td style="padding:24px; color:#1F1720; line-height:1.6; font-size:15px;">
          <p style="margin:0 0 12px 0;">Hello,</p>
          <p style="margin:0 0 16px 0;">We received a request to reset your SPC account password. Click the button below to continue.</p>
          <p style="margin:24px 0;">
            <a href="${resetUrl}" style="display:inline-block; background:#A7066A; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:999px; font-weight:600;">Reset Password</a>
          </p>
          <p style="margin:0 0 12px 0; color:#6B5A64;">This link will expire in 1 hour.</p>
          <p style="margin:0; color:#6B5A64;">If you did not request this, you can safely ignore this email.</p>
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
      subject: "Reset your SPC password",
      html: buildResetTemplate(params.resetUrl)
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("MailerSend API error:", errorText);
    throw new Error(`Failed to send email: ${response.status} ${response.statusText}`);
  }
}
