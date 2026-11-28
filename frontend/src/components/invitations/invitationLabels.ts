import type { UserRole } from '../../api/auth';
import type {
    DegreeLevel,
    InvitationEmailStatus,
    InvitationLifecycleStatus,
    OrgUnitType,
} from '../../api/invitations';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
    student: 'Студент',
    supervisor: 'Науковий керівник',
    admin: 'Адміністратор',
};

export const USER_ROLE_PLURAL_LABELS: Record<UserRole, string> = {
    student: 'Студенти',
    supervisor: 'Наукові керівники',
    admin: 'Адміністратори',
};

export const USER_ROLE_BADGE_VARIANTS: Record<UserRole, string> = {
    student: 'primary',
    supervisor: 'info',
    admin: 'dark',
};

export const INVITATION_STATUS_LABELS: Record<InvitationLifecycleStatus, string> = {
    pending: 'Очікує активації',
    accepted: 'Прийнято',
    expired: 'Прострочено',
    revoked: 'Відкликано',
};

export const INVITATION_STATUS_VARIANTS: Record<InvitationLifecycleStatus, string> = {
    pending: 'warning',
    accepted: 'success',
    expired: 'secondary',
    revoked: 'danger',
};

export const EMAIL_STATUS_LABELS: Record<InvitationEmailStatus, string> = {
    pending: 'Надсилається…',
    sent: 'Лист надіслано',
    failed: 'Помилка відправки',
};

export const EMAIL_STATUS_VARIANTS: Record<InvitationEmailStatus, string> = {
    pending: 'info',
    sent: 'success',
    failed: 'danger',
};

export const DEGREE_LEVEL_LABELS: Record<DegreeLevel, string> = {
    bachelor: 'Бакалавр',
    master: 'Магістр',
    phd: 'PhD',
};

export const ORG_UNIT_TYPE_LABELS: Record<OrgUnitType, string> = {
    university: 'Університет',
    institute: 'Інститут',
    faculty: 'Факультет',
    department: 'Кафедра',
};

export const SUPERADMIN_LABEL = 'Головний адміністратор (увесь університет)';

export function formatFullName(
    lastName: string,
    firstName: string,
    patronymic?: string | null,
): string {
    return [lastName, firstName, patronymic]
        .filter((part): part is string => Boolean(part && part.trim()))
        .join(' ');
}

export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('uk-UA', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(iso));
}
