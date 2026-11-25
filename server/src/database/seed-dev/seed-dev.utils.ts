import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const DEV_SEED_EMAIL_DOMAIN = 'dev.thesis-hub.local';
export const DEV_SEED_PASSWORD = 'DevPass123!';

export type OrgUnitTypeValue =
  | 'university'
  | 'institute'
  | 'faculty'
  | 'department';

export interface OrgUnitRow {
  id: number;
  parentId: number | null;
  unitType: OrgUnitTypeValue;
  name: string;
  shortName: string | null;
  isActive: boolean;
}

export const UNIT_TYPE_LABELS_UA: Record<OrgUnitTypeValue, string> = {
  university: 'Університет',
  institute: 'Інститут',
  faculty: 'Факультет',
  department: 'Кафедра',
};

export const UNIT_TYPE_SORT_ORDER: Record<OrgUnitTypeValue, number> = {
  university: 0,
  institute: 1,
  faculty: 2,
  department: 3,
};

export interface DevSeedConfig {
  databaseUrl: string;
  emailDomain: string;
  password: string;
  outputDir: string;
}

export function assertDevelopmentEnv(): void {
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv !== 'development') {
    throw new Error(
      `Запуск dev-сіду заборонено! Очікується NODE_ENV=development, але отримано "${nodeEnv ?? '(не задано)'}".`,
    );
  }
}

export function getDevSeedConfig(): DevSeedConfig {
  assertDevelopmentEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL не вказано в .env');
  }

  return {
    databaseUrl,
    emailDomain: DEV_SEED_EMAIL_DOMAIN,
    password: DEV_SEED_PASSWORD,
    outputDir: path.resolve(process.cwd(), 'seed-output'),
  };
}

const UA_TRANSLIT_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ie',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'iu',
  я: 'ia',
};

const UA_INITIAL_TRANSLIT_MAP: Record<string, string> = {
  є: 'ye',
  ї: 'yi',
  й: 'y',
  ю: 'yu',
  я: 'ya',
};

export function transliterateToSlug(input: string, maxLength = 32): string {
  const lower = input.toLowerCase().trim();
  let result = '';
  let isWordStart = true;

  for (const ch of lower) {
    if (ch === "'" || ch === 'ʼ' || ch === '’' || ch === '`') {
      continue;
    }

    if (/[a-z0-9]/.test(ch)) {
      result += ch;
      isWordStart = false;
      continue;
    }

    if (isWordStart && ch in UA_INITIAL_TRANSLIT_MAP) {
      result += UA_INITIAL_TRANSLIT_MAP[ch];
      isWordStart = false;
      continue;
    }

    if (ch in UA_TRANSLIT_MAP) {
      result += UA_TRANSLIT_MAP[ch];
      isWordStart = false;
      continue;
    }

    if (result.length > 0 && !result.endsWith('-')) {
      result += '-';
    }
    isWordStart = true;
  }

  return result
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength)
    .replace(/-$/g, '');
}

export function buildUniqueEmail(
  candidates: readonly string[],
  emailDomain: string,
  usedEmails: Set<string>,
): string {
  const sanitized = candidates
    .map((c) =>
      c
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '')
        .replace(/\.{2,}/g, '.')
        .replace(/^\.|\.$/g, ''),
    )
    .filter((c) => c.length > 0);

  for (const local of sanitized) {
    const email = `${local}@${emailDomain}`;
    if (!usedEmails.has(email)) {
      usedEmails.add(email);
      return email;
    }
  }

  const base = sanitized[0] ?? 'user';
  let suffix = 2;
  while (true) {
    const email = `${base}.${suffix}@${emailDomain}`;
    if (!usedEmails.has(email)) {
      usedEmails.add(email);
      return email;
    }
    suffix += 1;
  }
}

/**
 * Повертає ціле число за нормальним розподілом (Box-Muller), обмежене [min, max].
 */
export function sampleGaussianInt(
  avg: number,
  stdDev: number,
  min: number,
  max: number,
): number {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();

  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const raw = Math.round(avg + z * stdDev);
  return Math.max(min, Math.min(max, raw));
}

export function escapeMdCell(value: string | null | undefined): string {
  if (!value) return '—';
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

export function buildOrgPathMap(units: readonly OrgUnitRow[]): Map<number, string> {
  const byId = new Map<number, OrgUnitRow>(units.map((u) => [u.id, u]));
  const result = new Map<number, string>();

  for (const unit of units) {
    const parts: string[] = [];
    let current: OrgUnitRow | undefined = unit;
    let guard = 0;

    while (current && guard < 32) {
      parts.unshift(current.shortName ?? current.name);
      current =
        current.parentId !== null ? byId.get(current.parentId) : undefined;
      guard += 1;
    }

    result.set(unit.id, parts.join(' / '));
  }

  return result;
}

export function formatFullName(
  lastName: string,
  firstName: string,
  patronymic: string | null,
): string {
  return patronymic
    ? `${lastName} ${firstName} ${patronymic}`
    : `${lastName} ${firstName}`;
}

export async function writeSeedMarkdown(
  outputDir: string,
  fileName: string,
  content: string,
): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, fileName);
  await writeFile(filePath, content, 'utf8');
  return filePath;
}

export function chunkArray<T>(items: readonly T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}
