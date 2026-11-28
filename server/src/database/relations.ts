import { relations } from 'drizzle-orm/relations';
import {
  orgUnits,
  educationalPrograms,
  specialties,
  groups,
  students,
  users,
  supervisors,
  admins,
  refreshTokens,
  orgUnitAllowedChildren,
  userInvitations,
} from './schema.js';

export const orgUnitsRelations = relations(orgUnits, ({ one, many }) => ({
  orgUnit: one(orgUnits, {
    fields: [orgUnits.parentId],
    references: [orgUnits.id],
    relationName: 'orgUnits_parentId_orgUnits_id',
  }),
  orgUnits: many(orgUnits, {
    relationName: 'orgUnits_parentId_orgUnits_id',
  }),
  replacedBy: one(orgUnits, {
    fields: [orgUnits.replacedById],
    references: [orgUnits.id],
    relationName: 'orgUnits_replacedById_orgUnits_id',
  }),
  replaces: many(orgUnits, {
    relationName: 'orgUnits_replacedById_orgUnits_id',
  }),
  educationalPrograms: many(educationalPrograms),
  supervisors: many(supervisors),
  admins: many(admins),
  orgUnitAllowedChildren: many(orgUnitAllowedChildren),
  userInvitations: many(userInvitations),
}));

export const educationalProgramsRelations = relations(
  educationalPrograms,
  ({ one, many }) => ({
    orgUnit: one(orgUnits, {
      fields: [educationalPrograms.orgUnitId],
      references: [orgUnits.id],
    }),
    specialty: one(specialties, {
      fields: [educationalPrograms.specialtyId],
      references: [specialties.id],
    }),
    replacedBy: one(educationalPrograms, {
      fields: [educationalPrograms.replacedById],
      references: [educationalPrograms.id],
      relationName: 'educationalPrograms_replacedById_educationalPrograms_id',
    }),
    replaces: many(educationalPrograms, {
      relationName: 'educationalPrograms_replacedById_educationalPrograms_id',
    }),
    groups: many(groups),
  }),
);

export const specialtiesRelations = relations(specialties, ({ one, many }) => ({
  replacedBy: one(specialties, {
    fields: [specialties.replacedById],
    references: [specialties.id],
    relationName: 'specialties_replacedById_specialties_id',
  }),
  replaces: many(specialties, {
    relationName: 'specialties_replacedById_specialties_id',
  }),
  educationalPrograms: many(educationalPrograms),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  educationalProgram: one(educationalPrograms, {
    fields: [groups.educationalProgramId],
    references: [educationalPrograms.id],
  }),
  students: many(students),
  userInvitations: many(userInvitations),
}));

export const studentsRelations = relations(students, ({ one }) => ({
  group: one(groups, {
    fields: [students.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  student: one(students),
  supervisor: one(supervisors),
  admin: one(admins),
  refreshTokens: many(refreshTokens),
  sentInvitations: many(userInvitations, {
    relationName: 'userInvitations_invitedByUserId_users_id',
  }),
  acceptedInvitations: many(userInvitations, {
    relationName: 'userInvitations_acceptedUserId_users_id',
  }),
}));

export const supervisorsRelations = relations(supervisors, ({ one }) => ({
  orgUnit: one(orgUnits, {
    fields: [supervisors.orgUnitId],
    references: [orgUnits.id],
  }),
  user: one(users, {
    fields: [supervisors.userId],
    references: [users.id],
  }),
}));

export const adminsRelations = relations(admins, ({ one }) => ({
  orgUnit: one(orgUnits, {
    fields: [admins.orgUnitId],
    references: [orgUnits.id],
  }),
  user: one(users, {
    fields: [admins.userId],
    references: [users.id],
  }),
}));

export const refreshTokensRelations = relations(
  refreshTokens,
  ({ one, many }) => ({
    refreshToken: one(refreshTokens, {
      fields: [refreshTokens.replacedById],
      references: [refreshTokens.id],
      relationName: 'refreshTokens_replacedById_refreshTokens_id',
    }),
    refreshTokens: many(refreshTokens, {
      relationName: 'refreshTokens_replacedById_refreshTokens_id',
    }),
    user: one(users, {
      fields: [refreshTokens.userId],
      references: [users.id],
    }),
  }),
);

export const orgUnitAllowedChildrenRelations = relations(
  orgUnitAllowedChildren,
  ({ one }) => ({
    orgUnit: one(orgUnits, {
      fields: [orgUnitAllowedChildren.orgUnitId],
      references: [orgUnits.id],
    }),
  }),
);

export const userInvitationsRelations = relations(
  userInvitations,
  ({ one }) => ({
    group: one(groups, {
      fields: [userInvitations.groupId],
      references: [groups.id],
    }),
    orgUnit: one(orgUnits, {
      fields: [userInvitations.orgUnitId],
      references: [orgUnits.id],
    }),
    invitedBy: one(users, {
      fields: [userInvitations.invitedByUserId],
      references: [users.id],
      relationName: 'userInvitations_invitedByUserId_users_id',
    }),
    acceptedUser: one(users, {
      fields: [userInvitations.acceptedUserId],
      references: [users.id],
      relationName: 'userInvitations_acceptedUserId_users_id',
    }),
  }),
);
