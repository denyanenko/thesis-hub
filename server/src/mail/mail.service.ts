import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import { AppConfigService } from '../config/app-config.service.js';
import { MAIL_TRANSPORTER } from './mail.constants.js';
import {
  passwordChangedTemplate,
  resetPasswordTemplate,
} from './mail.templates.js';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(MAIL_TRANSPORTER) private readonly transporter: Transporter,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Перевірка SMTP-з'єднання під час старту. Не блокує запуск застосунку,
   * лише логує попередження, якщо налаштування некоректні.
   */
  async onModuleInit() {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP-з’єднання встановлено');
    } catch (err) {
      this.logger.warn(
        `Не вдалося підключитися до SMTP: ${(err as Error).message}`,
      );
    }
  }

  async send({ to, subject, html, text }: SendMailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get('MAIL_FROM'),
        to,
        subject,
        html,
        text,
      });
    } catch (err) {
      this.logger.error(
        `Не вдалося надіслати лист на ${String(to)}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException('Не вдалося надіслати лист');
    }
  }

  /** Лист із посиланням для скидання пароля. Посилання формує викликаюча сторона. */
  async sendResetPasswordEmail(to: string, link: string): Promise<void> {
    await this.send({ to, ...resetPasswordTemplate(link) });
  }

  /** Сповіщення про успішну зміну пароля (без посилань). */
  async sendPasswordChangedEmail(to: string): Promise<void> {
    await this.send({ to, ...passwordChangedTemplate() });
  }
}
