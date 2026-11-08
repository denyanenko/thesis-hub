import { Module } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { AppConfigService } from '../config/app-config.service.js';
import { MAIL_TRANSPORTER } from './mail.constants.js';
import { MailService } from './mail.service.js';

@Module({
  providers: [
    {
      provide: MAIL_TRANSPORTER,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        nodemailer.createTransport({
          host: config.get('SMTP_HOST'),
          port: config.get('SMTP_PORT'),
          // 465 - неявний TLS; для 587 використовується STARTTLS (secure: false)
          secure: config.get('SMTP_PORT') === 465,
          auth: {
            user: config.get('SMTP_USER'),
            pass: config.get('SMTP_PASS'),
          },
        }),
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
