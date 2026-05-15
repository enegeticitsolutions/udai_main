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
  const contactPhone = "+91 - 9899681972, 8377066832";
  const contactEmail = "info@udairehab.org";
  const websiteLink = "https://udairehab.org"; // Replace with real URL if different

  return `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
      <h2 style="color: #2f5597; border-bottom: 2px solid #2f5597; padding-bottom: 10px;">Thank You for Investing in Their Future</h2>
      
      <p>Dear <strong>${data.donorName}</strong>,</p>
      
      <p>Thank you for your generous contribution to the "Invest in Their Future" initiative. We have successfully received your donation, and we are grateful for your commitment to creating a lasting impact.</p>
      
      <p>Your support plays a vital role in our mission, and we are pleased to confirm the details of your contribution below:</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2f5597;">Donation Summary</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Transaction ID:</strong> ${data.transactionId}</li>
          <li><strong>Amount Donated:</strong> INR ${data.amount}</li>
          <li><strong>Date:</strong> ${data.date}</li>
          <li><strong>Payment Status:</strong> Successful</li>
        </ul>
      </div>
      
      <div style="margin: 20px 0;">
        <h3 style="color: #2f5597;">Tax Benefit Information (Section 80G)</h3>
        <p>As <strong>UDAI</strong> is a registered entity, your donation is eligible for tax deduction under <strong>Section 80G of the Income Tax Act</strong>.</p>
        <ul>
          <li><strong>Provisional Receipt:</strong> A formal donation receipt is being processed and will be sent to this email address shortly.</li>
          <li><strong>Form 10BE:</strong> As per government regulations, your consolidated donation certificate (Form 10BE) will be issued at the end of the financial year to help you claim your tax benefits.</li>
        </ul>
      </div>
      
      <div style="background-color: #f0f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2f5597;">Need Assistance?</h3>
        <p>If you have any questions regarding your donation, the 80G certificate, or our programs, please feel free to reach out to us:</p>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Phone:</strong> ${contactPhone}</li>
          <li><strong>Email:</strong> ${contactEmail}</li>
          <li><strong>Website:</strong> <a href="${websiteLink}" style="color: #2f5597;">${websiteLink}</a></li>
        </ul>
      </div>
      
      <p>Together, we are building a brighter future. Thank you once again for your kindness and trust.</p>
      
      <p>Warm regards,</p>
      
      <p><strong>Team UDAI</strong><br>
      <em>Invest in Their Future Initiative</em></p>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 0.8em; color: #777; font-style: italic;">
        &gt; This is an automated confirmation email. Please keep this for your records.
      </p>
    </div>
  `;
}
