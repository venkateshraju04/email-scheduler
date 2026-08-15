import nodemailer from "nodemailer";

interface SendEmailParams {
    senderEmail: string;
    smtpUser: string;
    smtpPass: string;
    to: string;
    subject: string;
    body: string;
}

interface SendEmailResult {
    success: boolean;
    messageId?: string;
    previewUrl?: string;
    error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const { senderEmail, smtpUser, smtpPass, to, subject, body } = params;

    const transporter = nodemailer.createTransport({
        host: process.env.ETHEREAL_SMTP_HOST || "smtp.ethereal.email",
        port: Number(process.env.ETHEREAL_SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: senderEmail,
            to,
            subject,
            html: body,
        });

        return {
            success: true,
            messageId: info.messageId,
            previewUrl: nodemailer.getTestMessageUrl(info) || undefined,
        };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error sending email",
        };
    }
}