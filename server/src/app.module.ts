import { Module } from '@nestjs/common';
import { ThrottlerModule, minutes, normalizeIp } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AppConfigModule } from './config/config.module.js';
import { MailModule } from './mail/mail.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { OrgUnitsModule } from './org-units/org-units.module.js';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRoot({
      errorMessage: 'Забагато спроб. Спробуйте ще раз трохи пізніше.',
      throttlers: [
        {
          // Індивідуальний ліміт: userId для залогінених або IP + email для публічних auth-маршрутів,
          // щоб користувачі на одному університетському Wi-Fi не блокували одне одного
          name: 'account',
          ttl: minutes(1),
          limit: 10,
          getTracker: (req: Record<string, unknown>) => {
            const user = req.user as { sub?: number } | undefined;
            if (typeof user?.sub === 'number') {
              return `user:${user.sub}`;
            }
            const ip = normalizeIp(typeof req.ip === 'string' ? req.ip : '');
            const body = req.body as { email?: unknown } | undefined;
            const email =
              typeof body?.email === 'string'
                ? body.email.trim().toLowerCase()
                : '';
            return email ? `${ip}:${email}` : ip;
          },
        },
        {
          // Запасний захисний ліміт по IP від автоматизованого перебору різних email
          name: 'ip',
          ttl: minutes(1),
          limit: 60,
        },
      ],
    }),
    DatabaseModule,
    AuthModule,
    ProfileModule,
    OrgUnitsModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
