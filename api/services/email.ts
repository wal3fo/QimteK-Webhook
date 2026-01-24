import nodemailer from 'nodemailer';

const APP_NAME = 'QimteK Webhook';
const FROM_EMAIL = process.env.SMTP_FROM || '"QimteK Support" <noreply@qimtek.ma>';
const BASE_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Helper to get transporter - lazy initialization to handle async test account creation
let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  // Use configured SMTP if available
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter;
  }

  // Fallback to Ethereal (fake SMTP) for development
  console.log('⚠️ SMTP not configured. Creating Ethereal test account...');
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('✅ Ethereal test account created successfully');
    console.log('👤 User:', testAccount.user);
    console.log('🔑 Pass:', testAccount.pass);
    return transporter;
  } catch (err) {
    console.error('❌ Failed to create Ethereal account:', err);
    return null;
  }
}

/**
 * Send verification email to new user
 */
export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  const verificationUrl = `${BASE_URL}/verify-email?token=${token}`;
  const mailTransporter = await getTransporter();

  if (!mailTransporter) {
    console.log('⚠️ Email service unavailable. Verification email skipped.');
    console.log(`📨 Verification Link for ${email}: ${verificationUrl}`);
    return true; // Return true so registration isn't blocked
  }

  try {
    const info = await mailTransporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: `Verify your email for ${APP_NAME}`,
      text: `Welcome to ${APP_NAME}!\n\nPlease verify your email by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to ${APP_NAME}!</h2>
          <p>Please verify your email address to complete your registration.</p>
          <div style="margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours.</p>
          <p style="color: #666; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
        </div>
      `,
    });

    console.log('✅ Verification email sent: %s', info.messageId);

    // If using Ethereal (no SMTP_HOST configured), log the preview URL
    if (!process.env.SMTP_HOST) {
      console.log('🔗 Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    return false;
  }
}
