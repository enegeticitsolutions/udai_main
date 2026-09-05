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
    from: `"UDAI Admin Portal" <${fromEmail}>`,
    to,
    subject,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`Email preview: ${previewUrl}`);
  }

  return info;
}

export function getNewAdminWelcomeTemplate({ name, email, password, role, permissions = [], portalUrl = "http://localhost:5191" }) {
  const safeName = escapeHtml(name || "Administrator");
  const safeEmail = escapeHtml(email);
  const safePassword = escapeHtml(password);
  const safeRole = role === "super_admin" ? "Super Administrator" : "Standard Administrator";
  const permissionsCount = Array.isArray(permissions) ? permissions.length : 0;

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your UDAI Admin Credentials</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
            <tr>
              <td style="background:linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);padding:32px 24px;text-align:center;color:#ffffff;">
                <h1 style="margin:0;font-size:24px;font-weight:700;">Welcome to UDAI Admin Portal</h1>
                <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.88);">Healthcare & Clinic Operations Management</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Hello <strong>${safeName}</strong>,</p>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">
                  An administrator account has been created for you on the <strong>UDAI Portal</strong>. Below are your login credentials to access the administrative dashboard:
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:20px 0;">
                  <tr>
                    <td style="padding:20px;">
                      <div style="margin-bottom:14px;">
                        <span style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:0.05em;display:block;">Login ID / Email</span>
                        <span style="font-size:16px;color:#0f172a;font-weight:600;font-family:monospace;">${safeEmail}</span>
                      </div>
                      <div style="margin-bottom:14px;">
                        <span style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:0.05em;display:block;">Initial Password</span>
                        <span style="font-size:16px;color:#1d4ed8;font-weight:700;font-family:monospace;background:#eff6ff;padding:3px 8px;border-radius:6px;border:1px solid #bfdbfe;display:inline-block;">${safePassword}</span>
                      </div>
                      <div>
                        <span style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:0.05em;display:block;">Assigned Role</span>
                        <span style="font-size:14px;color:#334155;font-weight:600;">${safeRole} (${permissionsCount} system modules granted)</span>
                      </div>
                    </td>
                  </tr>
                </table>

                <div style="text-align:center;margin:28px 0 24px;">
                  <a href="${portalUrl}" style="background:#2563eb;color:#ffffff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;box-shadow:0 2px 6px rgba(37,99,235,0.3);">
                    Login to Admin Panel →
                  </a>
                </div>

                <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:10px;padding:14px 16px;margin:20px 0;">
                  <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
                    🔒 <strong>Security Note:</strong> You can reset or change your email and password at any time via the <em>"Reset ID / Password"</em> option inside the portal or on the login page.
                  </p>
                </div>

                <p style="margin:24px 0 0;font-size:14px;color:#64748b;line-height:1.5;">
                  Best regards,<br />
                  <strong style="color:#0f172a;">Team UDAI Administration</strong>
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 24px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#94a3b8;">This is an automated credential notification. Please keep your login details safe.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

