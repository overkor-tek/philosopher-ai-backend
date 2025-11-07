// Email Service - SendGrid Integration
// Created by: C1 Mechanic - Autonomous Mode
// Date: November 7, 2025

const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key from environment
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@consciousnessrevolution.io';
const FROM_NAME = process.env.FROM_NAME || 'Consciousness Revolution';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://consciousnessrevolution.io';

// Initialize SendGrid if API key is available
if (SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
    console.log('✅ SendGrid email service initialized');
} else {
    console.warn('⚠️  SENDGRID_API_KEY not set - emails will be logged only');
}

/**
 * Send email via SendGrid
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (fallback)
 */
async function sendEmail({ to, subject, html, text }) {
    try {
        // If SendGrid is not configured, log the email instead
        if (!SENDGRID_API_KEY) {
            console.log('📧 EMAIL (not sent - no API key):', {
                to,
                subject,
                text: text || 'See HTML content'
            });
            return { success: true, mode: 'logged' };
        }

        const msg = {
            to,
            from: {
                email: FROM_EMAIL,
                name: FROM_NAME
            },
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
        };

        await sgMail.send(msg);
        console.log(`✅ Email sent to ${to}: ${subject}`);
        return { success: true, mode: 'sent' };

    } catch (error) {
        console.error('❌ Email send failed:', error.message);
        if (error.response) {
            console.error('SendGrid error:', error.response.body);
        }
        return { success: false, error: error.message };
    }
}

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name (optional)
 */
async function sendPasswordResetEmail(email, resetToken, userName = 'there') {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Reset Your Password</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${userName},
                            </p>

                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                We received a request to reset your password for your Consciousness Revolution account.
                                Click the button below to create a new password:
                            </p>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${resetUrl}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                Or copy and paste this link into your browser:
                            </p>
                            <p style="color: #667eea; font-size: 14px; word-break: break-all; margin: 10px 0 20px 0;">
                                ${resetUrl}
                            </p>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                <strong>This link will expire in 1 hour.</strong>
                            </p>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                If you didn't request this password reset, you can safely ignore this email.
                                Your password will remain unchanged.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">
                                Questions? Contact us at support@consciousnessrevolution.io
                            </p>
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} Consciousness Revolution. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const text = `
Hi ${userName},

We received a request to reset your password for your Consciousness Revolution account.

Click this link to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.

Questions? Contact us at support@consciousnessrevolution.io

© ${new Date().getFullYear()} Consciousness Revolution. All rights reserved.
    `;

    return sendEmail({
        to: email,
        subject: 'Reset Your Password - Consciousness Revolution',
        html,
        text
    });
}

/**
 * Send email verification email
 * @param {string} email - User email
 * @param {string} verificationToken - Email verification token
 * @param {string} userName - User's name (optional)
 */
async function sendEmailVerification(email, verificationToken, userName = 'there') {
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Verify Your Email</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${userName},
                            </p>

                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Thanks for signing up for Consciousness Revolution!
                                Please verify your email address to activate your account:
                            </p>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${verifyUrl}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                            Verify Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                Or copy and paste this link into your browser:
                            </p>
                            <p style="color: #667eea; font-size: 14px; word-break: break-all; margin: 10px 0 20px 0;">
                                ${verifyUrl}
                            </p>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                <strong>This link will expire in 24 hours.</strong>
                            </p>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                If you didn't create an account with us, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">
                                Questions? Contact us at support@consciousnessrevolution.io
                            </p>
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} Consciousness Revolution. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const text = `
Hi ${userName},

Thanks for signing up for Consciousness Revolution! Please verify your email address to activate your account.

Click this link to verify your email:
${verifyUrl}

This link will expire in 24 hours.

If you didn't create an account with us, you can safely ignore this email.

Questions? Contact us at support@consciousnessrevolution.io

© ${new Date().getFullYear()} Consciousness Revolution. All rights reserved.
    `;

    return sendEmail({
        to: email,
        subject: 'Verify Your Email - Consciousness Revolution',
        html,
        text
    });
}

/**
 * Send welcome email after successful registration
 * @param {string} email - User email
 * @param {string} userName - User's name
 */
async function sendWelcomeEmail(email, userName = 'there') {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Consciousness Revolution</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to Consciousness Revolution! 🧠</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hi ${userName},
                            </p>

                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Welcome to Consciousness Revolution! We're excited to have you join our community.
                            </p>

                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Your account is now active and ready to use. Start exploring:
                            </p>

                            <ul style="color: #333333; font-size: 16px; line-height: 1.8; margin: 20px 0; padding-left: 20px;">
                                <li>Ask philosophical questions</li>
                                <li>Track your consciousness level</li>
                                <li>Explore advanced features</li>
                                <li>Join our community</li>
                            </ul>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${FRONTEND_URL}/dashboard" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                                            Get Started
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                Need help? Check out our <a href="${FRONTEND_URL}/docs" style="color: #667eea;">documentation</a>
                                or contact us at support@consciousnessrevolution.io
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">
                                Questions? Contact us at support@consciousnessrevolution.io
                            </p>
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} Consciousness Revolution. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    const text = `
Hi ${userName},

Welcome to Consciousness Revolution! We're excited to have you join our community.

Your account is now active and ready to use. Start exploring:

• Ask philosophical questions
• Track your consciousness level
• Explore advanced features
• Join our community

Visit your dashboard: ${FRONTEND_URL}/dashboard

Need help? Check out our documentation at ${FRONTEND_URL}/docs or contact us at support@consciousnessrevolution.io

© ${new Date().getFullYear()} Consciousness Revolution. All rights reserved.
    `;

    return sendEmail({
        to: email,
        subject: 'Welcome to Consciousness Revolution! 🧠',
        html,
        text
    });
}

module.exports = {
    sendEmail,
    sendPasswordResetEmail,
    sendEmailVerification,
    sendWelcomeEmail
};
