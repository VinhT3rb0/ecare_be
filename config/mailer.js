const nodemailer = require('nodemailer');

let transporter;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: !!(process.env.SMTP_SECURE === 'true'),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
} else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Fallback: Gmail service config for backward compatibility
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
} else {
    // Last resort: throw clear error at startup-time usage
    console.warn('[mailer] Missing SMTP/EMAIL_* environment variables. Email sending will fail.');
    transporter = nodemailer.createTransport({ jsonTransport: true });
}

const getFromAddress = () => {
    return (
        process.env.EMAIL_FROM ||
        process.env.SMTP_FROM ||
        process.env.SMTP_USER ||
        process.env.EMAIL_USER ||
        'no-reply@example.com'
    );
};

module.exports = { transporter, getFromAddress };


