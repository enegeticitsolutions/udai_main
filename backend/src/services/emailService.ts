import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function getTransporter() {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Fallback for Demo/Testing: Create a test account on Ethereal.email
  console.log("No EMAIL_USER/PASS found in .env. Creating a test account for demo...");
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    const transporter = await getTransporter();
    const fromEmail = process.env.EMAIL_USER || "demo@udairehab.org";
    
    const info = await transporter.sendMail({
      from: `"UDAI" <${fromEmail}>`,
      to,
      subject,
      html,
    });
    
    console.log("Email sent: %s", info.messageId);
    
    // If using Ethereal, log the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log("-----------------------------------------");
      console.log("DEMO EMAIL SENT!");
      console.log("Preview URL: %s", previewUrl);
      console.log("-----------------------------------------");
    }
    
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    return null;
  }
}

export function getDonationConfirmationTemplate(data: {
  donorName: string;
  transactionId: string;
  amount: number;
  date: string;
}) {
  const contactPhone = "+91-9899681972 / 8377066832";
  const contactEmail = "info@udairehab.org";
  const websiteLink = "https://udairehab.org";
  const ngoName = "UDAI – Upliftment Development Association of India";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Donation Confirmation – UDAI</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Roboto,Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);" cellpadding="0" cellspacing="0">

          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a6e 0%,#2f5597 60%,#4a7fd4 100%);padding:40px 32px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:16px;">❤️</div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Thank You, ${data.donorName}!</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Your generosity is changing lives.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">

              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7;">
                We are deeply grateful for your kind contribution to <strong>${ngoName}</strong>. 
                Your donation empowers children with special needs and helps build a more inclusive society.
              </p>

              <!-- Donation Summary Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;border:1px solid #d1ddf5;border-radius:12px;margin:24px 0;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #e8eef8;">
                    <p style="margin:0;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Donation Summary</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;color:#6b7280;font-size:14px;">Donor Name</td>
                        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;text-align:right;">${data.donorName}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#6b7280;font-size:14px;">Transaction ID</td>
                        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;text-align:right;font-family:monospace;">${data.transactionId}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#6b7280;font-size:14px;">Date</td>
                        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;text-align:right;">${data.date}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#6b7280;font-size:14px;">Payment Status</td>
                        <td style="padding:8px 0;text-align:right;">
                          <span style="background:#dcfce7;color:#166534;font-size:13px;font-weight:600;padding:3px 10px;border-radius:20px;">✓ Successful</span>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding:16px 0 0;border-top:1px solid #e8eef8;margin-top:8px;">
                          <table width="100%">
                            <tr>
                              <td style="color:#374151;font-size:15px;font-weight:600;">Amount Donated</td>
                              <td style="text-align:right;color:#2f5597;font-size:22px;font-weight:700;">₹${data.amount.toLocaleString("en-IN")}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Tax Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;margin:24px 0;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#92400e;">📄 Tax Benefit – Section 80G</p>
                    <p style="margin:0;font-size:13px;color:#78350f;line-height:1.7;">
                      UDAI is a registered NGO. Your donation is eligible for tax deduction under 
                      <strong>Section 80G</strong> of the Income Tax Act. A formal donation receipt will be 
                      sent to this email shortly. Your <strong>Form 10BE</strong> will be issued at the end 
                      of the financial year.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center">
                    <a href="${websiteLink}" style="display:inline-block;background:linear-gradient(135deg,#2f5597,#4a7fd4);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                      Visit Our Website
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;">
                Together, we are building a brighter, more inclusive future. Thank you for your trust and compassion.
              </p>

              <p style="margin:24px 0 0;color:#374151;font-size:15px;">
                Warm regards,<br/>
                <strong style="color:#2f5597;">Team UDAI</strong><br/>
                <span style="color:#6b7280;font-size:13px;">Upliftment Development Association of India</span>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8faff;border-top:1px solid #e8eef8;padding:24px 32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Need help? Reach us at</p>
              <p style="margin:0 0 4px;font-size:13px;color:#374151;">
                📞 <a href="tel:+919899681972" style="color:#2f5597;text-decoration:none;">${contactPhone}</a>
              </p>
              <p style="margin:0 0 4px;font-size:13px;color:#374151;">
                ✉️ <a href="mailto:${contactEmail}" style="color:#2f5597;text-decoration:none;">${contactEmail}</a>
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#9ca3af;font-style:italic;">
                This is an automated confirmation email. Please keep it for your records.<br/>
                © ${new Date().getFullYear()} UDAI – All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- End Card -->

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

