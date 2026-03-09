const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: 'bcodingninja@gmail.com', pass: 'optwdzeqmlchkmwa' }
});

const student = { name: 'Rajveer' };
const otp = '849201';

const htmlTemplate = `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; padding: 40px 20px; text-align: center;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #0f2027, #203a43, #2c5364); padding: 40px 20px;">
            <h1 style="color: #00ff88; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">🥷 NinjaHackers</h1>
            <p style="color: #c8d8e8; margin-top: 10px; font-size: 16px;">Security & Learning Portal</p>
        </div>
        <div style="padding: 40px 30px; text-align: left;">
            <h2 style="color: #1a202c; font-size: 22px; margin-bottom: 20px;">Hi ${student.name},</h2>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                You recently requested to reset your password for your NinjaHackers account. Please use the secure verification code below to reset your credentials.
            </p>
            <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
                <span style="display: block; font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 700; color: #0ea5e9; letter-spacing: 10px;">${otp}</span>
            </div>
            <p style="color: #718096; font-size: 14px; line-height: 1.5; margin-bottom: 0;">
                For security reasons, this code will expire in <b>10 minutes</b>. If you did not request a password reset, you can safely ignore this email.
            </p>
        </div>
        <div style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #e2e8f0;">
            <p style="color: #4a5568; font-size: 15px; font-weight: 600; margin-bottom: 15px;">Stay connected and keep learning!</p>
            <a href="https://linkedin.com/in/" target="_blank" style="display: inline-block; background-color: #0077b5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Follow me on LinkedIn 
            </a>
            <p style="color: #a0aec0; font-size: 12px; margin-top: 25px;">
                &copy; ${new Date().getFullYear()} NinjaHackers. All rights reserved.
            </p>
        </div>
    </div>
</div>`;

transporter.sendMail({
    from: 'bcodingninja@gmail.com',
    to: 'codingwarriorhu@gmail.com',
    subject: '[NinjaHackers] Password Reset Code (UI Preview)',
    html: htmlTemplate
}).then(info => {
    console.log("Preview sent:", info.messageId);
    process.exit(0);
}).catch(err => {
    console.error("Error sending:", err);
    process.exit(1);
});
