import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { UserRole } from '../auth/auth.service.js';
import { MAX_BULK_INVITATION_ROWS } from './dto/bulk-invitations.dto.js';
import {
  DEGREE_LEVEL_LABELS_UA,
  ORG_UNIT_TYPE_LABELS_UA,
  SUPERADMIN_OPTION_LABEL,
  USER_ROLE_LABELS_UA,
  type BulkInvitationRowInput,
  type InvitationCatalog,
} from './invitations.types.js';

type CanonicalField =
  | 'email'
  | 'lastName'
  | 'firstName'
  | 'patronymic'
  | 'studentNumber'
  | 'groupRef'
  | 'orgUnitRef'
  | 'position'
  | 'academicDegree'
  | 'academicTitle';

interface ColumnSpec {
  key: CanonicalField;
  header: string;
  width: number;
  required?: boolean;
  isTextFormat?: boolean;
}

const ROLE_COLUMNS: Record<UserRole, ColumnSpec[]> = {
  student: [
    { key: 'email', header: 'Email *', width: 32, required: true },
    { key: 'lastName', header: 'Прізвище *', width: 22, required: true },
    { key: 'firstName', header: 'Імʼя *', width: 20, required: true },
    { key: 'patronymic', header: 'По батькові', width: 22 },
    {
      key: 'studentNumber',
      header: 'Номер студентського *',
      width: 24,
      required: true,
      isTextFormat: true,
    },
    { key: 'groupRef', header: 'Група *', width: 52, required: true },
  ],
  supervisor: [
    { key: 'email', header: 'Email *', width: 32, required: true },
    { key: 'lastName', header: 'Прізвище *', width: 22, required: true },
    { key: 'firstName', header: 'Імʼя *', width: 20, required: true },
    { key: 'patronymic', header: 'По батькові', width: 22 },
    { key: 'orgUnitRef', header: 'Кафедра *', width: 52, required: true },
    { key: 'position', header: 'Посада', width: 28 },
    { key: 'academicDegree', header: 'Науковий ступінь', width: 24 },
    { key: 'academicTitle', header: 'Вчене звання', width: 22 },
  ],
  admin: [
    { key: 'email', header: 'Email *', width: 32, required: true },
    { key: 'lastName', header: 'Прізвище *', width: 22, required: true },
    { key: 'firstName', header: 'Імʼя *', width: 20, required: true },
    { key: 'patronymic', header: 'По батькові', width: 22 },
    { key: 'orgUnitRef', header: 'Підрозділ *', width: 52, required: true },
    { key: 'position', header: 'Посада', width: 30 },
  ],
};

const HEADER_ALIASES: Record<string, CanonicalField> = {
  email: 'email',
  'e-mail': 'email',
  пошта: 'email',
  'електронна пошта': 'email',
  'ел. пошта': 'email',

  прізвище: 'lastName',
  lastname: 'lastName',
  last_name: 'lastName',
  surname: 'lastName',

  імя: 'firstName',
  "ім'я": 'firstName',
  firstname: 'firstName',
  first_name: 'firstName',
  name: 'firstName',

  'по батькові': 'patronymic',
  patronymic: 'patronymic',
  middlename: 'patronymic',
  middle_name: 'patronymic',

  'номер студентського': 'studentNumber',
  'номер студентського квитка': 'studentNumber',
  '№ студентського': 'studentNumber',
  студентський: 'studentNumber',
  'номер залікової': 'studentNumber',
  studentnumber: 'studentNumber',
  student_number: 'studentNumber',

  група: 'groupRef',
  'академічна група': 'groupRef',
  group: 'groupRef',
  group_id: 'groupRef',
  groupid: 'groupRef',
  group_name: 'groupRef',

  кафедра: 'orgUnitRef',
  підрозділ: 'orgUnitRef',
  'підрозділ (або головний адмін)': 'orgUnitRef',
  'структурний підрозділ': 'orgUnitRef',
  department: 'orgUnitRef',
  orgunit: 'orgUnitRef',
  org_unit: 'orgUnitRef',
  org_unit_id: 'orgUnitRef',
  orgunitid: 'orgUnitRef',

  посада: 'position',
  position: 'position',

  'науковий ступінь': 'academicDegree',
  ступінь: 'academicDegree',
  academicdegree: 'academicDegree',
  academic_degree: 'academicDegree',

  'вчене звання': 'academicTitle',
  звання: 'academicTitle',
  academictitle: 'academicTitle',
  academic_title: 'academicTitle',
};

function normalizeHeader(raw: string): string {
  return raw
    .replaceAll('\uFEFF', '')
    .replaceAll(/[’ʼ'`]/g, "'")
    .replaceAll('*', '')
    .trim()
    .replaceAll(/\s+/g, ' ')
    .toLowerCase();
}

function cellValueToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') {
      return value.text.trim();
    }
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText
        .map((chunk) => chunk.text)
        .join('')
        .trim();
    }
    if ('result' in value) {
      return cellValueToString(value.result as ExcelJS.CellValue);
    }
  }
  return '';
}

function detectCsvDelimiter(headerLine: string): string {
  const candidates = [';', ',', '\t'];
  let bestDelimiter = ',';
  let bestCount = -1;

  for (const delimiter of candidates) {
    let count = 0;
    let inQuotes = false;
    for (const ch of headerLine) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        count += 1;
      }
    }
    if (count > bestCount) {
      bestCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestCount > 0 ? bestDelimiter : ',';
}

/**
 * Коректний RFC-4180 CSV-парсер із підтримкою лапок, переносів рядків усередині полів
 * та автовизначенням роздільника (`,` або `;` — типово для українського Excel).
 */
function parseCsvMatrix(content: string): string[][] {
  const cleaned = content.replace(/^\uFEFF/, '');
  const firstNewline = cleaned.search(/\r?\n/);
  const headerSample =
    firstNewline === -1 ? cleaned : cleaned.slice(0, firstNewline);
  const delimiter = detectCsvDelimiter(headerSample);

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
      continue;
    }

    if (ch === '"' && currentField.length === 0) {
      inQuotes = true;
    } else if (ch === delimiter) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (ch === '\r' && next === '\n') {
      currentRow.push(currentField.trim());
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      i += 1;
    } else if (ch === '\n' || ch === '\r') {
      currentRow.push(currentField.trim());
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

@Injectable()
export class InvitationSpreadsheetService {
  /**
   * Генерує динамічний .xlsx-шаблон для обраної ролі з випадаючими списками
   * груп / кафедр / підрозділів у межах прав поточного адміністратора.
   */
  async generateTemplateBuffer(
    role: UserRole,
    catalog: InvitationCatalog,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Thesis Hub';
    workbook.created = new Date();

    const dataSheet = workbook.addWorksheet('Дані', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    const refSheet = workbook.addWorksheet('Довідник', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    const helpSheet = workbook.addWorksheet('Інструкція');

    const columns = ROLE_COLUMNS[role];
    dataSheet.columns = columns.map((col) => ({
      header:
        role === 'admin' && col.key === 'orgUnitRef' && catalog.isSuperAdmin
          ? 'Підрозділ (або Головний адмін)'
          : col.header,
      key: col.key,
      width: col.width,
    }));

    const headerRow = dataSheet.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D6EFD' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF0A58CA' } },
      };
    });

    for (let idx = 0; idx < columns.length; idx += 1) {
      if (columns[idx].isTextFormat) {
        dataSheet.getColumn(idx + 1).numFmt = '@';
      }
    }

    // Заповнюємо аркуш «Довідник» актуальними варіантами для поточного адміна
    let refCount = 0;
    if (role === 'student') {
      refSheet.columns = [
        { header: 'Значення для вибору (не змінювати)', key: 'opt', width: 54 },
        { header: 'Група', key: 'name', width: 16 },
        { header: 'Освітня програма', key: 'program', width: 38 },
        { header: 'Рівень', key: 'degree', width: 18 },
        { header: 'Спеціальність', key: 'spec', width: 34 },
        { header: 'Кафедра', key: 'dept', width: 32 },
      ];
      for (const group of catalog.groups) {
        refSheet.addRow({
          opt: group.templateOption,
          name: group.name,
          program: group.educationalProgramName,
          degree: DEGREE_LEVEL_LABELS_UA[group.degreeLevel],
          spec: `${group.specialtyCode} ${group.specialtyName}`,
          dept: group.departmentName,
        });
      }
      refCount = catalog.groups.length;
    } else if (role === 'supervisor') {
      refSheet.columns = [
        { header: 'Значення для вибору (не змінювати)', key: 'opt', width: 54 },
        { header: 'Кафедра', key: 'name', width: 42 },
        { header: 'Скорочення', key: 'shortName', width: 16 },
        { header: 'Шлях у структурі', key: 'path', width: 48 },
      ];
      for (const dept of catalog.departments) {
        refSheet.addRow({
          opt: dept.templateOption,
          name: dept.name,
          shortName: dept.shortName ?? '',
          path: dept.orgPath,
        });
      }
      refCount = catalog.departments.length;
    } else {
      refSheet.columns = [
        { header: 'Значення для вибору (не змінювати)', key: 'opt', width: 54 },
        { header: 'Підрозділ', key: 'name', width: 42 },
        { header: 'Тип', key: 'type', width: 16 },
        { header: 'Шлях у структурі', key: 'path', width: 48 },
      ];
      if (catalog.isSuperAdmin) {
        refSheet.addRow({
          opt: SUPERADMIN_OPTION_LABEL,
          name: 'Увесь університет (суперадмін)',
          type: 'Головний адмін',
          path: 'Увесь університет',
        });
        refCount += 1;
      }
      for (const unit of catalog.orgUnits) {
        refSheet.addRow({
          opt: unit.templateOption,
          name: unit.name,
          type: ORG_UNIT_TYPE_LABELS_UA[unit.unitType],
          path: unit.orgPath,
        });
      }
      refCount += catalog.orgUnits.length;
    }

    const refHeaderRow = refSheet.getRow(1);
    refHeaderRow.height = 22;
    refHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF495057' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });

    // Навішуємо Excel Data Validation (випадаючий список) на колонку групи/кафедри/підрозділу
    if (refCount > 0) {
      const refColIndex =
        columns.findIndex(
          (col) => col.key === 'groupRef' || col.key === 'orgUnitRef',
        ) + 1;
      const colLetter = String.fromCharCode(64 + refColIndex);
      const listFormula = `'Довідник'!$A$2:$A$${refCount + 1}`;
      const promptTitle =
        role === 'student'
          ? 'Вибір групи'
          : role === 'supervisor'
            ? 'Вибір кафедри'
            : 'Вибір підрозділу';

      const validationRange = `${colLetter}2:${colLetter}${MAX_BULK_INVITATION_ROWS + 1}`;
      (
        dataSheet as unknown as {
          dataValidations: {
            add: (address: string, validation: ExcelJS.DataValidation) => void;
          };
        }
      ).dataValidations.add(validationRange, {
        type: 'list',
        allowBlank: true,
        formulae: [listFormula],
        showInputMessage: true,
        promptTitle,
        prompt: 'Оберіть значення зі списку або вкажіть точну назву / ID.',
        showErrorMessage: false,
      });
    }

    // Аркуш «Інструкція»
    helpSheet.columns = [{ width: 92 }];
    const instructions = [
      `Шаблон для масового запрошення: ${USER_ROLE_LABELS_UA[role]}`,
      '',
      '1. Заповнюйте дані на аркуші «Дані», починаючи з 2-го рядка (1-й рядок із заголовками не видаляйте).',
      '2. Колонки, позначені зірочкою (*), є обовʼязковими для заповнення.',
      role === 'student'
        ? '3. У колонці «Група *» оберіть потрібну академічну групу з випадаючого списку (актуальні групи вашого підрозділу зібрано на аркуші «Довідник»).'
        : role === 'supervisor'
          ? '3. У колонці «Кафедра *» оберіть активну кафедру з випадаючого списку (список формується згідно з вашими правами на аркуші «Довідник»).'
          : catalog.isSuperAdmin
            ? `3. У колонці «Підрозділ» оберіть підрозділ або значення «${SUPERADMIN_OPTION_LABEL}» (або залиште порожнім для головного адміністратора).`
            : '3. У колонці «Підрозділ *» оберіть свій або підпорядкований підрозділ із випадаючого списку.',
      `4. За одне завантаження підтримується до ${MAX_BULK_INVITATION_ROWS} рядків.`,
      '5. Підтримуються формати .xlsx та .csv (UTF-8, роздільник «,» або «;»).',
      '6. Після завантаження файлу система перевірить кожен рядок до відправки листів — помилки можна виправити прямо в інтерфейсі.',
    ];

    instructions.forEach((line, index) => {
      const row = helpSheet.addRow([line]);
      if (index === 0) {
        row.font = { bold: true, size: 13 };
      } else {
        row.font = { size: 11 };
      }
      row.alignment = { wrapText: true };
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Парсить завантажений .xlsx або .csv файл у масив рядків-кандидатів із номерами рядків.
   */
  async parseUploadedFile(
    buffer: Buffer,
    originalName: string,
    role: UserRole,
  ): Promise<BulkInvitationRowInput[]> {
    const ext = originalName.toLowerCase().trim().split('.').pop() ?? '';

    let rawRows: Array<{ rowNumber: number; values: string[] }>;

    if (ext === 'xlsx') {
      rawRows = await this.readXlsxRows(buffer);
    } else if (ext === 'csv') {
      rawRows = this.readCsvRows(buffer);
    } else {
      throw new BadRequestException(
        'Підтримуються лише файли у форматах .xlsx та .csv',
      );
    }

    if (rawRows.length === 0) {
      throw new BadRequestException('Файл порожній');
    }

    const headerRow = rawRows[0];
    const columnMap = new Map<number, CanonicalField>();

    headerRow.values.forEach((cell, idx) => {
      const normalized = normalizeHeader(cell);
      const mapped = HEADER_ALIASES[normalized];
      if (mapped && !Array.from(columnMap.values()).includes(mapped)) {
        columnMap.set(idx, mapped);
      }
    });

    const mappedFields = new Set(columnMap.values());
    if (!mappedFields.has('email')) {
      const expectedHeaders = ROLE_COLUMNS[role]
        .map((c) => c.header.replace(' *', ''))
        .join(', ');
      throw new BadRequestException(
        `Не вдалося розпізнати заголовки таблиці (обовʼязково має бути колонка Email). Очікувані колонки: ${expectedHeaders}.`,
      );
    }

    const parsed: BulkInvitationRowInput[] = [];

    for (const entry of rawRows.slice(1)) {
      const hasAnyValue = entry.values.some((v) => v.trim().length > 0);
      if (!hasAnyValue) {
        continue;
      }

      const row: BulkInvitationRowInput = {
        rowNumber: entry.rowNumber,
        email: '',
        lastName: '',
        firstName: '',
        patronymic: null,
        studentNumber: null,
        groupId: null,
        groupRef: null,
        orgUnitId: null,
        orgUnitRef: null,
        position: null,
        academicDegree: null,
        academicTitle: null,
      };

      for (const [colIdx, field] of columnMap.entries()) {
        const value = (entry.values[colIdx] ?? '').trim();
        if (!value) continue;

        switch (field) {
          case 'email':
            row.email = value;
            break;
          case 'lastName':
            row.lastName = value;
            break;
          case 'firstName':
            row.firstName = value;
            break;
          case 'patronymic':
            row.patronymic = value;
            break;
          case 'studentNumber':
            row.studentNumber = value;
            break;
          case 'groupRef':
            row.groupRef = value;
            break;
          case 'orgUnitRef':
            row.orgUnitRef = value;
            break;
          case 'position':
            row.position = value;
            break;
          case 'academicDegree':
            row.academicDegree = value;
            break;
          case 'academicTitle':
            row.academicTitle = value;
            break;
        }
      }

      parsed.push(row);

      if (parsed.length > MAX_BULK_INVITATION_ROWS) {
        throw new BadRequestException(
          `Файл містить понад ${MAX_BULK_INVITATION_ROWS} рядків. Розбийте список на кілька частин.`,
        );
      }
    }

    if (parsed.length === 0) {
      throw new BadRequestException(
        'У файлі немає жодного заповненого рядка даних після заголовка',
      );
    }

    return parsed;
  }

  private async readXlsxRows(
    buffer: Buffer,
  ): Promise<Array<{ rowNumber: number; values: string[] }>> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    } catch {
      throw new BadRequestException(
        'Не вдалося прочитати .xlsx-файл. Перевірте, що файл не пошкоджений.',
      );
    }

    const sheet =
      workbook.worksheets.find(
        (ws) => ws.name.trim().toLowerCase() === 'дані',
      ) ?? workbook.worksheets[0];

    if (!sheet) {
      throw new BadRequestException('Файл Excel не містить жодного аркуша');
    }

    const rows: Array<{ rowNumber: number; values: string[] }> = [];
    const columnCount = Math.max(sheet.columnCount, 12);

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const values: string[] = [];
      for (let col = 1; col <= columnCount; col += 1) {
        values.push(cellValueToString(row.getCell(col).value));
      }
      rows.push({ rowNumber, values });
    });

    return rows;
  }

  private readCsvRows(
    buffer: Buffer,
  ): Array<{ rowNumber: number; values: string[] }> {
    const text = buffer.toString('utf8');
    const matrix = parseCsvMatrix(text);
    return matrix.map((values, index) => ({
      rowNumber: index + 1,
      values,
    }));
  }
}
