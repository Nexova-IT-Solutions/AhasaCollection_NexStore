import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "mail.nexstoreapps.com";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = (process.env.SMTP_SECURE || "false") === "true";
const smtpUser = process.env.SMTP_USER || "soharpetcenter@nexstoreapps.com";
const smtpPass = process.env.SMTP_PASS || "M-?Wf#wB6lZF(.3G";
const fromEmail = process.env.MAIL_FROM || smtpUser || "soharpetcenter@nexstoreapps.com";
const fromName = "SPC System";

/**
 * Sends a gift card email using Nodemailer (SMTP).
 * Uses the same working configuration as the Password Reset logic.
 */
export async function sendGiftCardEmail(giftCard: any) {
  const { 
    recipientEmail, 
    recipientName, 
    senderName, 
    personalMessage, 
    code, 
    initialValue, 
    expiresAt 
  } = giftCard;

  if (!recipientEmail) {
    throw new Error("Recipient email is required to send gift card email");
  }

  console.log(`[sendGiftCardEmail] Attempting to send email to: ${recipientEmail} for card: ${code}`);

  if (!smtpUser || !smtpPass) {
    throw new Error("SMTP_USER and SMTP_PASS are required for email sending. Please check your .env file.");
  }

  const expiryDate = expiresAt ? new Date(expiresAt).toLocaleDateString() : 'N/A';

  const html = `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9f9f9; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #eee;">
        <!-- Header -->
        <div style="background-color: #A7066A; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">SPC</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px; color: #333; line-height: 1.6;">
          <h2 style="color: #1a1a1a; margin-top: 0; font-size: 20px;">Hello ${recipientName || 'there'},</h2>
          
          <p style="font-size: 16px; color: #555;">
            Someone special has sent you a gift! 
            ${senderName ? `<strong>${senderName}</strong> has sent you a SPC e-gift card.` : 'You have received a SPC e-gift card.'}
          </p>

          ${personalMessage ? `
          <div style="background-color: #fff0f6; border-left: 4px solid #A7066A; padding: 20px; margin: 25px 0; font-style: italic; color: #A7066A; border-radius: 0 8px 8px 0;">
            "${personalMessage}"
          </div>
          ` : ''}

          <div style="text-align: center; margin: 40px 0; padding: 30px; background: linear-gradient(135deg, #A7066A 0%, #7d0450 100%); border-radius: 12px; color: #ffffff;">
            <p style="margin: 0; text-transform: uppercase; font-size: 12px; font-weight: 600; opacity: 0.9; letter-spacing: 1px;">Gift Card Value</p>
            <p style="margin: 5px 0 20px 0; font-size: 36px; font-weight: 800;">LKR ${initialValue.toLocaleString()}</p>
            
            <p style="margin: 20px 0 5px 0; text-transform: uppercase; font-size: 11px; font-weight: 600; opacity: 0.9; letter-spacing: 1px;">Voucher Code</p>
            <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 8px; font-family: 'Courier New', Courier, monospace; font-size: 22px; font-weight: 700; letter-spacing: 2px; border: 1px dashed rgba(255,255,255,0.3);">
              ${code}
            </div>
          </div>

          <p style="font-size: 15px; color: #666; text-align: center; margin-top: 30px;">
            <strong>How to redeem:</strong><br>
            Enter this code at checkout on <a href="https://soharpets.com" style="color: #A7066A; text-decoration: none; font-weight: 600;">soharpets.com</a> to redeem your gift.
          </p>
          
          <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #eee; font-size: 13px; color: #999; text-align: center;">
            <p>This gift card expires on: <strong>${expiryDate}</strong></p>
            <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} SPC. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false,
      },
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail,
      subject: `You received a LKR ${initialValue.toLocaleString()} Gift Card!`,
      html: html,
    });

    console.log(`[sendGiftCardEmail] Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[sendGiftCardEmail] SMTP Error:`, error);
    throw error;
  }
}

