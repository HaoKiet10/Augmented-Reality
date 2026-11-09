import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  let env: Record<string, string | undefined>;
  let sendMail: jest.Mock;

  const resetUrl = 'http://localhost:5173/reset-password?token=abc';

  const build = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: { get: jest.fn((key: string) => env[key]) } },
      ],
    }).compile();
    service = module.get<MailService>(MailService);
  };

  beforeEach(async () => {
    env = { SMTP_USER: 'me@gmail.com', SMTP_PASS: 'app-password', NODE_ENV: 'development' };
    sendMail = jest.fn().mockResolvedValue({ messageId: 'm1' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
    await build();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('mặc định dùng SMTP của Gmail (port 465, TLS) với user/pass từ env', async () => {
    await service.sendPasswordReset('a@test.com', resetUrl);

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: 'me@gmail.com', pass: 'app-password' },
    });
  });

  it('gửi email chứa link reset, from mặc định là SMTP_USER', async () => {
    await service.sendPasswordReset('a@test.com', resetUrl);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.from).toBe('AR Studio <me@gmail.com>');
    expect(mail.to).toBe('a@test.com');
    expect(mail.html).toContain(resetUrl);
    expect(mail.text).toContain(resetUrl);
  });

  it('dùng MAIL_FROM và SMTP_HOST/SMTP_PORT khi có', async () => {
    env.MAIL_FROM = 'AR <no-reply@example.com>';
    env.SMTP_HOST = 'smtp.example.com';
    env.SMTP_PORT = '587';
    await build();

    await service.sendPasswordReset('a@test.com', resetUrl);

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.example.com', port: 587, secure: false }),
    );
    expect(sendMail.mock.calls[0][0].from).toBe('AR <no-reply@example.com>');
  });

  it('throw khi SMTP gửi lỗi', async () => {
    sendMail.mockRejectedValue(new Error('Invalid login'));

    await expect(service.sendPasswordReset('a@test.com', resetUrl)).rejects.toThrow('Invalid login');
  });

  it('ngoài production, thiếu SMTP_USER/SMTP_PASS thì log link thay vì gửi', async () => {
    env.SMTP_PASS = undefined;
    await build();
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await service.sendPasswordReset('a@test.com', resetUrl);

    expect(sendMail).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(resetUrl));
  });

  it('production thiếu SMTP_USER/SMTP_PASS thì throw, không log link', async () => {
    env.SMTP_USER = undefined;
    env.NODE_ENV = 'production';
    await build();
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await expect(service.sendPasswordReset('a@test.com', resetUrl)).rejects.toThrow('SMTP_USER');
    expect(sendMail).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
