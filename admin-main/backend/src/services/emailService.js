import nodemailer from "nodemailer";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Admin email SMTP is not configured. Set EMAIL_USER and EMAIL_PASS in admin-main/backend/.env.");
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export function getVolunteerApprovalTemplate(volunteer) {
  const name = escapeHtml(volunteer.name || "Volunteer");
  const interestArea = escapeHtml(volunteer.interestArea || "volunteering");

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Volunteer Application Approved</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(15,38,61,0.12);">
            <tr>
              <td style="background:#2f5597;padding:32px;text-align:center;color:#ffffff;">
                <h1 style="margin:0;font-size:26px;line-height:1.25;">Volunteer Application Approved</h1>
                <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.82);">UDAI - Upliftment Development Association of India</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 18px;font-size:16px;line-height:1.65;">Dear ${name},</p>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.75;">
                  Thank you for applying to volunteer with UDAI. We are pleased to inform you that your volunteer application has been approved.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8faff;border:1px solid #dbe7fb;border-radius:12px;margin:24px 0;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Approved Interest Area</p>
                      <p style="margin:0;font-size:18px;color:#111827;font-weight:700;">${interestArea}</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.75;">
                  Our team will contact you soon with the next steps, orientation details, and activity schedule. Please keep an eye on your email and phone.
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.75;">
                  We appreciate your willingness to support children and families through UDAI's programs.
                </p>
                <p style="margin:0;font-size:15px;line-height:1.7;">
                  Warm regards,<br />
                  <strong style="color:#2f5597;">Team UDAI</strong>
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#64748b;">This email was sent regarding your volunteer application with UDAI.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendEmail({ to, subject, html }) {
  const transporter = await createTransporter();
  const fromEmail = process.env.EMAIL_USER || "demo@udairehab.org";
  const info = await transporter.sendMail({
    from: `"UDAI" <${fromEmail}>`,
    to,
    subject,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`Volunteer approval email preview: ${previewUrl}`);
  }

  return info;
}
