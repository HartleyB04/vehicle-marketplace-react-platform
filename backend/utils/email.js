const nodemailer = require("nodemailer");

// Configure transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Send account suspension email
async function sendSuspensionEmail(toEmail, reason) {
  try {
    await transporter.sendMail({
      from: `"Swap Website" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: "Your account has been suspended",
      text: `Your account has been suspended: ${reason}. Please contact support if this is a mistake.`,
      html: `<p>Your account has been suspended: <strong>${reason}</strong>.</p>
             <p>Contact support if you think this is a mistake.</p>`,
    });
    console.log(`Suspension email sent to ${toEmail}`);
  } catch (err) {
    console.error("Error sending suspension email:", err);
  }
}

module.exports = { sendSuspensionEmail };
