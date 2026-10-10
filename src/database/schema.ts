import {
    pgTable,
    foreignKey,
    bigint,
    text,
    boolean,
    unique,
    smallint,
    timestamp,
    index,
    check,
    uuid,
    inet,
    primaryKey,
    pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const degreeLevel = pgEnum('degree_level', [
    'bachelor',
    'master',
    'phd',
]);
export const orgUnitType = pgEnum('org_unit_type', [
    'university',
    'institute',
    'faculty',
    'department',
]);
export const userRole = pgEnum('user_role', ['student', 'supervisor', 'admin']);

export const orgUnits = pgTable(
    'org_units',
    {
        id: bigint({ mode: 'number' })
            .primaryKey()
            .generatedAlwaysAsIdentity({ name: 'org_units_id_seq' }),
        parentId: bigint('parent_id', { mode: 'number' }),
        unitType: orgUnitType('unit_type').notNull(),
        name: text().notNull(),
        shortName: text('short_name'),
        isActive: boolean('is_active').default(true).notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.parentId],
            foreignColumns: [table.id],
            name: 'org_units_parent_id_fkey',
        }),
    ],
);

export const specialties = pgTable(
    'specialties',
    {
        id: bigint({ mode: 'number' })
            .primaryKey()
            .generatedAlwaysAsIdentity({ name: 'specialties_id_seq' }),
        code: text().notNull(),
        name: text().notNull(),
        isActive: boolean('is_active').default(true).notNull(),
    },
    (table) => [unique('specialties_code_key').on(table.code)],
);

export const educationalPrograms = pgTable(
    'educational_programs',
    {
        id: bigint({ mode: 'number' })
            .primaryKey()
            .generatedAlwaysAsIdentity({ name: 'educational_programs_id_seq' }),
        specialtyId: bigint('specialty_id', { mode: 'number' }).notNull(),
        orgUnitId: bigint('org_unit_id', { mode: 'number' }).notNull(),
        name: text().notNull(),
        degreeLevel: degreeLevel('degree_level').notNull(),
        isActive: boolean('is_active').default(true).notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.orgUnitId],
            foreignColumns: [orgUnits.id],
            name: 'educational_programs_org_unit_id_fkey',
        }),
        foreignKey({
            columns: [table.specialtyId],
            foreignColumns: [specialties.id],
            name: 'educational_programs_specialty_id_fkey',
        }),
        unique(
            'educational_programs_specialty_id_org_unit_id_name_degree_l_key',
        ).on(table.specialtyId, table.orgUnitId, table.name, table.degreeLevel),
    ],
);

export const orgUnitHierarchyRules = pgTable(
    'org_unit_hierarchy_rules',
    {
        id: bigint({ mode: 'number' })
            .primaryKey()
            .generatedAlwaysAsIdentity({ name: 'org_unit_hierarchy_rules_id_seq' }),
        childType: orgUnitType('child_type').notNull(),
        parentType: orgUnitType('parent_type'),
    },
    (table) => [
        unique('org_unit_hierarchy_rules_child_type_parent_type_key').on(
            table.childType,
            table.parentType,
        ),
    ],
);

export const groups = pgTable(
    'groups',
    {
        id: bigint({ mode: 'number' })
            .primaryKey()
            .generatedAlwaysAsIdentity({ name: 'groups_id_seq' }),
        educationalProgramId: bigint('educational_program_id', {
            mode: 'number',
        }).notNull(),
        name: text().notNull(),
        enrollmentYear: smallint('enrollment_year'),
        isActive: boolean('is_active').default(true).notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.educationalProgramId],
            foreignColumns: [educationalPrograms.id],
            name: 'groups_educational_program_id_fkey',
        }),
        unique('groups_educational_program_id_name_key').on(
            table.educationalProgramId,
            table.name,
        ),
    ],
);

export const users = pgTable(
    'users',
    {
        id: bigint({ mode: 'number' })
            .primaryKey()
            .generatedAlwaysAsIdentity({ name: 'users_id_seq' }),
        email: text().notNull(),
        passwordHash: text('password_hash').notNull(),
        firstName: text('first_name').notNull(),
        lastName: text('last_name').notNull(),
        patronymic: text(),
        isActive: boolean('is_active').default(true).notNull(),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
            .defaultNow()
            .notNull(),
        role: userRole().notNull(),
    },
    (table) => [unique('users_email_key').on(table.email)],
);

export const students = pgTable(
    'students',
    {
        userId: bigint('user_id', { mode: 'number' }).primaryKey().notNull(),
        studentNumber: text('student_number').notNull(),
        groupId: bigint('group_id', { mode: 'number' }),
    },
    (table) => [
        foreignKey({
            columns: [table.groupId],
            foreignColumns: [groups.id],
            name: 'students_group_id_fkey',
        }),
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: 'students_user_id_fkey',
        }).onDelete('cascade'),
        unique('students_student_number_key').on(table.studentNumber),
    ],
);

export const supervisors = pgTable(
    'supervisors',
    {
        userId: bigint('user_id', { mode: 'number' }).primaryKey().notNull(),
        academicDegree: text('academic_degree'),
        academicTitle: text('academic_title'),
        orgUnitId: bigint('org_unit_id', { mode: 'number' }),
        position: text(),
    },
    (table) => [
        foreignKey({
            columns: [table.orgUnitId],
            foreignColumns: [orgUnits.id],
            name: 'supervisors_org_unit_id_fkey',
        }),
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: 'supervisors_user_id_fkey',
        }).onDelete('cascade'),
    ],
);

export const admins = pgTable(
    'admins',
    {
        userId: bigint('user_id', { mode: 'number' }).primaryKey().notNull(),
        orgUnitId: bigint('org_unit_id', { mode: 'number' }),
        position: text(),
    },
    (table) => [
        foreignKey({
            columns: [table.orgUnitId],
            foreignColumns: [orgUnits.id],
            name: 'admins_org_unit_id_fkey',
        }),
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: 'admins_user_id_fkey',
        }).onDelete('cascade'),
    ],
);

export const refreshTokens = pgTable(
    'refresh_tokens',
    {
        id: bigint({ mode: 'number' })
            .primaryKey()
            .generatedAlwaysAsIdentity({ name: 'refresh_tokens_id_seq' }),
        userId: bigint('user_id', { mode: 'number' }).notNull(),
        sessionId: uuid('session_id').notNull(),
        tokenHash: text('token_hash').notNull(),
        expiresAt: timestamp('expires_at', {
            withTimezone: true,
            mode: 'string',
        }).notNull(),
        isRevoked: boolean('is_revoked').default(false).notNull(),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
            .defaultNow()
            .notNull(),
        userAgent: text('user_agent'),
        ipAddress: inet('ip_address'),
        replacedById: bigint('replaced_by_id', { mode: 'number' }),
    },
    (table) => [
        index('idx_refresh_tokens_active')
            .using(
                'btree',
                table.userId.asc().nullsLast().op('int8_ops'),
                table.expiresAt.asc().nullsLast().op('int8_ops'),
            )
            .where(sql`(is_revoked = false)`),
        index('idx_refresh_tokens_session').using(
            'btree',
            table.sessionId.asc().nullsLast().op('uuid_ops'),
        ),
        foreignKey({
            columns: [table.replacedById],
            foreignColumns: [table.id],
            name: 'refresh_tokens_replaced_by_id_fkey',
        }).onDelete('set null'),
        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: 'refresh_tokens_user_id_fkey',
        }).onDelete('cascade'),
        unique('refresh_tokens_token_hash_key').on(table.tokenHash),
        check('chk_expires_after_created', sql`expires_at > created_at`),
    ],
);

export const orgUnitAllowedChildren = pgTable(
    'org_unit_allowed_children',
    {
        orgUnitId: bigint('org_unit_id', { mode: 'number' }).notNull(),
        childType: orgUnitType('child_type').notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.orgUnitId],
            foreignColumns: [orgUnits.id],
            name: 'org_unit_allowed_children_org_unit_id_fkey',
        }).onDelete('cascade'),
        primaryKey({
            columns: [table.orgUnitId, table.childType],
            name: 'org_unit_allowed_children_pkey',
        }),
    ],
);