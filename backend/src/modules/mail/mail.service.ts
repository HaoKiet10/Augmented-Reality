import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

// Mặc định là Gmail SMTP — SMTP_PASS phải là App Password (Google Account >
// Security > App passwords, cần bật 2FA), không phải mật khẩu Gmail thường.
const DEFAULT_SMTP_HOST = 'smtp.gmail.com';
const DEFAULT_SMTP_PORT = 465;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? DEFAULT_SMTP_PORT);

    this.transporter = user && pass
      ? createTransport({
        host: this.configService.get<string>('SMTP_HOST') ?? DEFAULT_SMTP_HOST,
        port,
        secure: port === 465, // 465 = TLS ngay từ đầu; 587 = STARTTLS
        auth: { user, pass },
      })
      : null;
    this.from = this.configService.get<string>('MAIL_FROM') || `AR Studio <${user}>`;
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.send({
      to,
      subject: 'Reset your password',
      text: `Someone requested a password reset for your account.\n\nOpen this link to choose a new password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
      html: `<p>Someone requested a password reset for your account.</p>
<p><a href="${resetUrl}">Choose a new password</a> (link expires in 1 hour).</p>
<p>If you didn't request this, you can ignore this email.</p>`,
      devLog: `[DEV ONLY] Password reset link for ${to}: ${resetUrl}`,
    });
  }

  private async send(mail: { to: string; subject: string; text: string; html: string; devLog: string }) {
    if (!this.transporter) {
      // Chỉ ngoài production mới được in link ra log — ở production ai đọc được
      // log server (Render dashboard) sẽ lấy được link reset của bất kỳ ai.
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        throw new Error('SMTP_USER / SMTP_PASS are not set — cannot send email');
      }
      this.logger.warn(mail.devLog);
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  }
}
