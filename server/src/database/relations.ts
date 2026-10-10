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
  educationalPrograms: many(educationalPrograms),
  supervisors: many(supervisors),
  admins: many(admins),
  orgUnitAllowedChildren: many(orgUnitAllowedChildren),
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
    groups: many(groups),
  }),
);

export const specialtiesRelations = relations(specialties, ({ many }) => ({
  educationalPrograms: many(educationalPrograms),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  educationalProgram: one(educationalPrograms, {
    fields: [groups.educationalProgramId],
    references: [educationalPrograms.id],
  }),
  students: many(students),
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
