import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { InvitationSpreadsheetService } from './invitation-spreadsheet.service.js';
import {
  SUPERADMIN_OPTION_LABEL,
  type InvitationCatalog,
} from './invitations.types.js';

function makeCatalog(isSuperAdmin = true): InvitationCatalog {
  return {
    isSuperAdmin,
    actorOrgUnitId: isSuperAdmin ? null : 10,
    groups: [
      {
        id: 15,
        name: 'ІП-21',
        enrollmentYear: 2022,
        educationalProgramId: 5,
        educationalProgramName: 'Інженерія програмного забезпечення',
        degreeLevel: 'bachelor',
        specialtyCode: 'F2',
        specialtyName: 'Інженерія програмного забезпечення',
        departmentId: 42,
        departmentName: 'Кафедра інформатики та програмної інженерії',
        departmentShortName: 'ІПІ',
        orgPath: 'КПІ / ФІОТ / ІПІ',
        templateOption:
          'ІП-21 — Інженерія програмного забезпечення (Бакалавр) [#15]',
      },
    ],
    departments: [
      {
        id: 42,
        name: 'Кафедра інформатики та програмної інженерії',
        shortName: 'ІПІ',
        unitType: 'department',
        parentId: 10,
        orgPath: 'КПІ / ФІОТ / ІПІ',
        templateOption:
          'Кафедра інформатики та програмної інженерії (ІПІ) [#42]',
      },
    ],
    orgUnits: [
      {
        id: 10,
        name: 'Факультет інформатики та обчислювальної техніки',
        shortName: 'ФІОТ',
        unitType: 'faculty',
        parentId: 1,
        orgPath: 'КПІ / ФІОТ',
        templateOption:
          'Факультет інформатики та обчислювальної техніки (ФІОТ) [#10]',
      },
      {
        id: 42,
        name: 'Кафедра інформатики та програмної інженерії',
        shortName: 'ІПІ',
        unitType: 'department',
        parentId: 10,
        orgPath: 'КПІ / ФІОТ / ІПІ',
        templateOption:
          'Кафедра інформатики та програмної інженерії (ІПІ) [#42]',
      },
    ],
  };
}

describe('InvitationSpreadsheetService', () => {
  const service = new InvitationSpreadsheetService();

  it('генерує .xlsx-шаблон для студентів із випадаючим списком груп і коректно парсить заповнений файл', async () => {
    const catalog = makeCatalog(true);
    const buffer = await service.generateTemplateBuffer('student', catalog);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);

    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Дані',
      'Довідник',
      'Інструкція',
    ]);

    const dataSheet = wb.getWorksheet('Дані')!;
    const refSheet = wb.getWorksheet('Довідник')!;
    expect(refSheet.getCell('A2').value).toBe(catalog.groups[0].templateOption);
    expect(dataSheet.getCell('F2').dataValidation?.formulae).toEqual([
      "'Довідник'!$A$2:$A$2",
    ]);

    // Імітуємо заповнення шаблону користувачем у 2-му рядку
    dataSheet.getRow(2).values = [
      'student1@lll.kpi.ua',
      'Іваненко',
      'Іван',
      'Іванович',
      'КВ12345678',
      catalog.groups[0].templateOption,
    ];
    const filledBuffer = Buffer.from(await wb.xlsx.writeBuffer());

    const rows = await service.parseUploadedFile(
      filledBuffer,
      'students.xlsx',
      'student',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rowNumber: 2,
      email: 'student1@lll.kpi.ua',
      lastName: 'Іваненко',
      firstName: 'Іван',
      patronymic: 'Іванович',
      studentNumber: 'КВ12345678',
      groupRef: catalog.groups[0].templateOption,
    });
  });

  it('генерує шаблон для адміністраторів із опцією головного адміна для суперадміна і розпізнає її при імпорті', async () => {
    const catalog = makeCatalog(true);
    const buffer = await service.generateTemplateBuffer('admin', catalog);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);

    const refSheet = wb.getWorksheet('Довідник')!;
    expect(refSheet.getCell('A2').value).toBe(SUPERADMIN_OPTION_LABEL);

    const dataSheet = wb.getWorksheet('Дані')!;
    dataSheet.addRow([
      'admin.new@kpi.ua',
      'Коваленко',
      'Олена',
      '',
      SUPERADMIN_OPTION_LABEL,
      'Головний координатор',
    ]);
    const filledBuffer = Buffer.from(await wb.xlsx.writeBuffer());

    const rows = await service.parseUploadedFile(
      filledBuffer,
      'admins.xlsx',
      'admin',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: 'admin.new@kpi.ua',
      lastName: 'Коваленко',
      firstName: 'Олена',
      orgUnitRef: SUPERADMIN_OPTION_LABEL,
      position: 'Головний координатор',
    });
  });

  it('парсить CSV із крапкою з комою, UTF-8 BOM та лапками', async () => {
    const csv = [
      '\uFEFFEmail;Прізвище;Імʼя;По батькові;Кафедра;Посада;Науковий ступінь;Вчене звання',
      'docent@kpi.ua;Петренко;Олег;Сергійович;"Кафедра інформатики та програмної інженерії (ІПІ) [#42]";Доцент;к.т.н.;доцент',
      ';;;;;;;',
    ].join('\r\n');

    const rows = await service.parseUploadedFile(
      Buffer.from(csv, 'utf8'),
      'supervisors.csv',
      'supervisor',
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rowNumber: 2,
      email: 'docent@kpi.ua',
      lastName: 'Петренко',
      firstName: 'Олег',
      patronymic: 'Сергійович',
      orgUnitRef: 'Кафедра інформатики та програмної інженерії (ІПІ) [#42]',
      position: 'Доцент',
      academicDegree: 'к.т.н.',
      academicTitle: 'доцент',
    });
  });

  it('відхиляє непідтримувані розширення файлів та файли без заголовка Email', async () => {
    await expect(
      service.parseUploadedFile(Buffer.from('hello'), 'list.pdf', 'student'),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.parseUploadedFile(
        Buffer.from('Невідома1,Невідома2\nval1,val2', 'utf8'),
        'bad.csv',
        'student',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
