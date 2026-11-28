import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MailModule } from '../mail/mail.module.js';
import { OrgUnitsModule } from '../org-units/org-units.module.js';
import { InvitationSpreadsheetService } from './invitation-spreadsheet.service.js';
import { InvitationsController } from './invitations.controller.js';
import { InvitationsService } from './invitations.service.js';

@Module({
  imports: [AuthModule, MailModule, OrgUnitsModule],
  controllers: [InvitationsController],
  providers: [InvitationsService, InvitationSpreadsheetService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
