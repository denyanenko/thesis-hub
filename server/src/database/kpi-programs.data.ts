import type { DegreeLevel } from '../educational-programs/educational-programs.types.js';

export interface SeedProgramDef {
  departmentName: string;
  specialtyCode: string;
  degreeLevel: DegreeLevel;
  name: string;
}

export interface SeedReplacedPairDef {
  departmentName: string;
  specialtyCode: string;
  degreeLevel: DegreeLevel;
  oldName: string;
  newName: string;
  reason: string;
}

/**
 * Повний перелік освітніх програм для всіх 111 кафедр НТУУ «КПІ ім. Ігоря Сікорського»:
 * - 101 кафедра — за офіційним наказом КПІ № НОД/611/26 від 22.07.2026 (зі змінами № НОД/614/26, № НОД/628/26) на 2026/2027 н.р.;
 * - 3 кафедри (КРТ, КТОС, КМФ та ДР) — за офіційними програмами КПІ попередніх редакцій (2024–2025 рр.);
 * - 7 базових/загальноуніверситетських кафедр (СК № 2, СК № 4 ІСЗЗІ; 4 кафедри ФЛ; ЗНХ ХТФ) — реалістичні профільні ОП для повноти dev-даних.
 */
export const KPI_EDUCATIONAL_PROGRAMS: readonly SeedProgramDef[] = [
  // ======================== НН ВПІ — Навчально-науковий видавничо-поліграфічний інститут ========================
  // Кафедра видавничої справи і редагування (ВСР)
  {
    departmentName: 'Кафедра видавничої справи і редагування',
    specialtyCode: 'C7',
    degreeLevel: 'bachelor',
    name: 'Видавнича справа та редагування',
  },
  {
    departmentName: 'Кафедра видавничої справи і редагування',
    specialtyCode: 'C7',
    degreeLevel: 'bachelor',
    name: 'Реклама і звʼязки з громадськістю',
  },
  {
    departmentName: 'Кафедра видавничої справи і редагування',
    specialtyCode: 'C7',
    degreeLevel: 'master',
    name: 'Видавнича справа та редагування',
  },
  {
    departmentName: 'Кафедра видавничої справи і редагування',
    specialtyCode: 'C7',
    degreeLevel: 'master',
    name: 'Реклама і звʼязки з громадськістю',
  },
  {
    departmentName: 'Кафедра видавничої справи і редагування',
    specialtyCode: 'C7',
    degreeLevel: 'phd',
    name: 'Соціальні комунікації, журналістика',
  },
  // Кафедра графіки (КГ)
  {
    departmentName: 'Кафедра графіки',
    specialtyCode: 'B4',
    degreeLevel: 'bachelor',
    name: 'Образотворче мистецтво',
  },
  {
    departmentName: 'Кафедра графіки',
    specialtyCode: 'B4',
    degreeLevel: 'master',
    name: 'Образотворче мистецтво',
  },
  // Кафедра машин і агрегатів поліграфічного виробництва (МАПВ)
  {
    departmentName: 'Кафедра машин і агрегатів поліграфічного виробництва',
    specialtyCode: 'G11',
    degreeLevel: 'bachelor',
    name: 'Інжиніринг поліграфічних систем',
  },
  {
    departmentName: 'Кафедра машин і агрегатів поліграфічного виробництва',
    specialtyCode: 'G11',
    degreeLevel: 'bachelor',
    name: 'Компʼютеризовані поліграфічні системи',
  },
  {
    departmentName: 'Кафедра машин і агрегатів поліграфічного виробництва',
    specialtyCode: 'G11',
    degreeLevel: 'master',
    name: 'Інжиніринг поліграфічних систем',
  },
  {
    departmentName: 'Кафедра машин і агрегатів поліграфічного виробництва',
    specialtyCode: 'G11',
    degreeLevel: 'phd',
    name: 'Галузеве машинобудування',
  },
  // Кафедра репрографії (КР)
  {
    departmentName: 'Кафедра репрографії',
    specialtyCode: 'G20',
    degreeLevel: 'bachelor',
    name: 'Технології друкованих і електронних видань',
  },
  {
    departmentName: 'Кафедра репрографії',
    specialtyCode: 'G20',
    degreeLevel: 'master',
    name: 'Технології друкованих і електронних видань',
  },
  {
    departmentName: 'Кафедра репрографії',
    specialtyCode: 'G20',
    degreeLevel: 'phd',
    name: 'Видавництво та поліграфія',
  },
  // Кафедра технології поліграфічного виробництва (ТПВ)
  {
    departmentName: 'Кафедра технології поліграфічного виробництва',
    specialtyCode: 'B1',
    degreeLevel: 'bachelor',
    name: 'Медіавиробництво та аудіовізуальні техніки',
  },
  {
    departmentName: 'Кафедра технології поліграфічного виробництва',
    specialtyCode: 'B2',
    degreeLevel: 'bachelor',
    name: 'Дизайн',
  },
  {
    departmentName: 'Кафедра технології поліграфічного виробництва',
    specialtyCode: 'G20',
    degreeLevel: 'bachelor',
    name: 'Технології друкованих і електронних видань',
  },
  {
    departmentName: 'Кафедра технології поліграфічного виробництва',
    specialtyCode: 'G20',
    degreeLevel: 'master',
    name: 'Технології друкованих і електронних видань',
  },
  {
    departmentName: 'Кафедра технології поліграфічного виробництва',
    specialtyCode: 'G20',
    degreeLevel: 'phd',
    name: 'Видавництво та поліграфія',
  },

  // ======================== НН ІАТ — Навчально-науковий інститут аерокосмічних технологій ========================
  // Кафедра авіа- та ракетобудування (АРБ)
  {
    departmentName: 'Кафедра авіа- та ракетобудування',
    specialtyCode: 'G12',
    degreeLevel: 'bachelor',
    name: 'Літаки і вертольоти',
  },
  {
    departmentName: 'Кафедра авіа- та ракетобудування',
    specialtyCode: 'G12',
    degreeLevel: 'master',
    name: 'Літаки і вертольоти',
  },
  {
    departmentName: 'Кафедра авіа- та ракетобудування',
    specialtyCode: 'G12',
    degreeLevel: 'phd',
    name: 'Авіаційна та ракетно-космічна техніка',
  },
  // Кафедра космічної інженерії (ККІ)
  {
    departmentName: 'Кафедра космічної інженерії',
    specialtyCode: 'G12',
    degreeLevel: 'bachelor',
    name: 'Інженерія авіаційних та ракетно-космічних систем',
  },
  {
    departmentName: 'Кафедра космічної інженерії',
    specialtyCode: 'G12',
    degreeLevel: 'bachelor',
    name: 'Інженерія безпілотних та автономних систем',
  },
  {
    departmentName: 'Кафедра космічної інженерії',
    specialtyCode: 'G12',
    degreeLevel: 'master',
    name: 'Інженерія авіаційних та ракетно-космічних систем',
  },
  {
    departmentName: 'Кафедра космічної інженерії',
    specialtyCode: 'G12',
    degreeLevel: 'phd',
    name: 'Авіаційна та ракетно-космічна техніка',
  },
  // Кафедра систем керування літальними апаратами (СКЛА)
  {
    departmentName: 'Кафедра систем керування літальними апаратами',
    specialtyCode: 'G12',
    degreeLevel: 'bachelor',
    name: 'Інтелектуальні системи керування літальними апаратами та авіоніка',
  },
  {
    departmentName: 'Кафедра систем керування літальними апаратами',
    specialtyCode: 'G12',
    degreeLevel: 'bachelor',
    name: 'Системи керування літальними апаратами та комплексами',
  },
  {
    departmentName: 'Кафедра систем керування літальними апаратами',
    specialtyCode: 'G12',
    degreeLevel: 'master',
    name: 'Системи керування літальними апаратами та комплексами',
  },
  {
    departmentName: 'Кафедра систем керування літальними апаратами',
    specialtyCode: 'G12',
    degreeLevel: 'phd',
    name: 'Системи керування літальними апаратами та комплексами',
  },

  // ======================== НН ІАТЕ — Навчально-науковий інститут атомної та теплової енергетики ========================
  // Кафедра автоматизації енергетичних процесів (АЕП)
  {
    departmentName: 'Кафедра автоматизації енергетичних процесів',
    specialtyCode: 'G4',
    degreeLevel: 'bachelor',
    name: 'Компʼютеризовані технології та інжиніринг теплоенергетичних систем',
  },
  {
    departmentName: 'Кафедра автоматизації енергетичних процесів',
    specialtyCode: 'G7',
    degreeLevel: 'bachelor',
    name: 'Інтелектуальна промислова автоматизація',
  },
  {
    departmentName: 'Кафедра автоматизації енергетичних процесів',
    specialtyCode: 'G7',
    degreeLevel: 'bachelor',
    name: 'Автоматизація та компʼютерно-інтегровані технології кібер-енергетичних систем',
  },
  {
    departmentName: 'Кафедра автоматизації енергетичних процесів',
    specialtyCode: 'G7',
    degreeLevel: 'master',
    name: 'Інтелектуальна промислова автоматизація',
  },
  {
    departmentName: 'Кафедра автоматизації енергетичних процесів',
    specialtyCode: 'G7',
    degreeLevel: 'master',
    name: 'Автоматизація та компʼютерно-інтегровані технології',
  },
  {
    departmentName: 'Кафедра автоматизації енергетичних процесів',
    specialtyCode: 'G7',
    degreeLevel: 'master',
    name: 'Автоматизація та компʼютерно-інтегровані технології кібер-енергетичних систем',
  },
  {
    departmentName: 'Кафедра автоматизації енергетичних процесів',
    specialtyCode: 'G7',
    degreeLevel: 'phd',
    name: 'Автоматизація та компʼютерно-інтегровані технології',
  },
  // Кафедра атомної енергетики (АЕ)
  {
    departmentName: 'Кафедра атомної енергетики',
    specialtyCode: 'G4',
    degreeLevel: 'bachelor',
    name: 'Інженерія енергогенеруючого обладнання та системи термостабілізації',
  },
  {
    departmentName: 'Кафедра атомної енергетики',
    specialtyCode: 'G4',
    degreeLevel: 'bachelor',
    name: 'Інженерія і компʼютерні технології теплоенергетичних систем',
  },
  {
    departmentName: 'Кафедра атомної енергетики',
    specialtyCode: 'G4',
    degreeLevel: 'bachelor',
    name: 'Атомні електричні станції',
  },
  {
    departmentName: 'Кафедра атомної енергетики',
    specialtyCode: 'G4',
    degreeLevel: 'bachelor',
    name: 'Енергогенеруюче обладнання та системи термостабілізації',
  },
  {
    departmentName: 'Кафедра атомної енергетики',
    specialtyCode: 'G4',
    degreeLevel: 'master',
    name: 'Інженерія енергогенеруючого обладнання та системи термостабілізації',
  },
  {
    departmentName: 'Кафедра атомної енергетики',
    specialtyCode: 'G4',
    degreeLevel: 'master',
    name: 'Атомні електричні станції',
  },
  {
    departmentName: 'Кафедра атомної енергетики',
    specialtyCode: 'G4',
    degreeLevel: 'master',
    name: 'Атомні електричні станції (ОНП)',
  },
  {
    departmentName: 'Кафедра атомної енергетики',
    specialtyCode: 'G4',
    degreeLevel: 'master',
    name: 'Фізичний захист та облік і контроль ядерних матеріалів',
  },
  {
    departmentName: 'Кафедра атомної енергетики',
    specialtyCode: 'G4',
    degreeLevel: 'phd',
    name: 'Атомна енергетика',
  },
  // Кафедра інженерії програмного забезпечення в енергетиці (ІПЗЕ)
  {
    departmentName: 'Кафедра інженерії програмного забезпечення в енергетиці',
    specialtyCode: 'F2',
    degreeLevel: 'bachelor',
    name: 'Інженерія програмного забезпечення інтелектуальних кібер-фізичних систем в енергетиці',
  },
  {
    departmentName: 'Кафедра інженерії програмного забезпечення в енергетиці',
    specialtyCode: 'F2',
    degreeLevel: 'master',
    name: 'Інженерія програмного забезпечення інтелектуальних кібер-фізичних систем в енергетиці',
  },
  {
    departmentName: 'Кафедра інженерії програмного забезпечення в енергетиці',
    specialtyCode: 'F2',
    degreeLevel: 'master',
    name: 'Інженерія програмного забезпечення інтелектуальних кібер-фізичних систем в енергетиці (ОНП)',
  },
  {
    departmentName: 'Кафедра інженерії програмного забезпечення в енергетиці',
    specialtyCode: 'F2',
    degreeLevel: 'phd',
    name: 'Інженерія програмного забезпечення',
  },
  // Кафедра теплової та альтернативної енергетики (ТАЕ)
  {
    departmentName: 'Кафедра теплової та альтернативної енергетики',
    specialtyCode: 'G4',
    degreeLevel: 'bachelor',
    name: 'Компʼютеризовані технології та інжиніринг теплоенергетичних систем',
  },
  {
    departmentName: 'Кафедра теплової та альтернативної енергетики',
    specialtyCode: 'G4',
    degreeLevel: 'bachelor',
    name: 'Теплоенергетика та теплоенергетичні установки електростанцій',
  },
  {
    departmentName: 'Кафедра теплової та альтернативної енергетики',
    specialtyCode: 'G4',
    degreeLevel: 'master',
    name: 'Теплоенергетика та теплоенергетичні установки електростанцій',
  },
  {
    departmentName: 'Кафедра теплової та альтернативної енергетики',
    specialtyCode: 'G4',
    degreeLevel: 'master',
    name: 'Теплоенергетика та теплоенергетичні установки електростанцій (ОНП)',
  },
  {
    departmentName: 'Кафедра теплової та альтернативної енергетики',
    specialtyCode: 'G4',
    degreeLevel: 'master',
    name: 'Управління енергоефективністю та інжиніринг теплоенергетичних систем',
  },
  {
    departmentName: 'Кафедра теплової та альтернативної енергетики',
    specialtyCode: 'G4',
    degreeLevel: 'phd',
    name: 'Теплоенергетика',
  },
  // Кафедра цифрових технологій в енергетиці (ЦТЕ)
  {
    departmentName: 'Кафедра цифрових технологій в енергетиці',
    specialtyCode: 'F3',
    degreeLevel: 'bachelor',
    name: 'Технології візуальних обчислень',
  },
  {
    departmentName: 'Кафедра цифрових технологій в енергетиці',
    specialtyCode: 'F3',
    degreeLevel: 'bachelor',
    name: 'Цифрові технології в енергетиці',
  },
  {
    departmentName: 'Кафедра цифрових технологій в енергетиці',
    specialtyCode: 'F3',
    degreeLevel: 'master',
    name: 'Компʼютерні науки',
  },
  {
    departmentName: 'Кафедра цифрових технологій в енергетиці',
    specialtyCode: 'F3',
    degreeLevel: 'master',
    name: 'Технології візуальних обчислень',
  },
  {
    departmentName: 'Кафедра цифрових технологій в енергетиці',
    specialtyCode: 'F3',
    degreeLevel: 'master',
    name: 'Цифрові технології в енергетиці',
  },
  {
    departmentName: 'Кафедра цифрових технологій в енергетиці',
    specialtyCode: 'F3',
    degreeLevel: 'phd',
    name: 'Компʼютерні науки',
  },

  // ======================== НН ІЕЕ — Навчально-науковий інститут енергозбереження та енергоменеджменту ========================
  // Кафедра автоматизації електротехнічних та мехатронних комплексів (АЕМК)
  {
    departmentName: 'Кафедра автоматизації електротехнічних та мехатронних комплексів',
    specialtyCode: 'G1',
    degreeLevel: 'master',
    name: 'Енергоефективні хімічні технології та системна інженерія біопаливних і водневих виробництв',
  },
  {
    departmentName: 'Кафедра автоматизації електротехнічних та мехатронних комплексів',
    specialtyCode: 'G11',
    degreeLevel: 'bachelor',
    name: 'Енергоощадне обладнання біопаливних та водневих технологій',
  },
  {
    departmentName: 'Кафедра автоматизації електротехнічних та мехатронних комплексів',
    specialtyCode: 'G3',
    degreeLevel: 'bachelor',
    name: 'Інжиніринг інтелектуальних електротехнічних та мехатронних комплексів',
  },
  {
    departmentName: 'Кафедра автоматизації електротехнічних та мехатронних комплексів',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Інжиніринг інтелектуальних електротехнічних та мехатронних комплексів',
  },
  {
    departmentName: 'Кафедра автоматизації електротехнічних та мехатронних комплексів',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Енергоменеджмент, електропостачання та інжиніринг електротехнічних комплексів',
  },
  {
    departmentName: 'Кафедра автоматизації електротехнічних та мехатронних комплексів',
    specialtyCode: 'G3',
    degreeLevel: 'phd',
    name: 'Електроенергетика, електротехніка та електромеханіка',
  },
  // Кафедра геоінженерії (ГІ)
  {
    departmentName: 'Кафедра геоінженерії',
    specialtyCode: 'G16',
    degreeLevel: 'bachelor',
    name: 'Геоінженерія',
  },
  {
    departmentName: 'Кафедра геоінженерії',
    specialtyCode: 'G16',
    degreeLevel: 'master',
    name: 'Геоінженерія',
  },
  {
    departmentName: 'Кафедра геоінженерії',
    specialtyCode: 'G16',
    degreeLevel: 'phd',
    name: 'Геоінженерія',
  },
  {
    departmentName: 'Кафедра геоінженерії',
    specialtyCode: 'G19',
    degreeLevel: 'bachelor',
    name: 'Цивільна інженерія та підземна інфраструктура',
  },
  {
    departmentName: 'Кафедра геоінженерії',
    specialtyCode: 'G2',
    degreeLevel: 'bachelor',
    name: 'Екоінженерія та природоохоронні технології',
  },
  {
    departmentName: 'Кафедра геоінженерії',
    specialtyCode: 'G2',
    degreeLevel: 'bachelor',
    name: 'Технології захисту навколишнього середовища та гуманітарне розмінування',
  },
  {
    departmentName: 'Кафедра геоінженерії',
    specialtyCode: 'G2',
    degreeLevel: 'master',
    name: 'Екоефективне повоєнне відновлення забруднених територій',
  },
  // Кафедра електропостачання (ЕП)
  {
    departmentName: 'Кафедра електропостачання',
    specialtyCode: 'G3',
    degreeLevel: 'bachelor',
    name: 'Енергетичний менеджмент та енергоефективні технології',
  },
  {
    departmentName: 'Кафедра електропостачання',
    specialtyCode: 'G3',
    degreeLevel: 'bachelor',
    name: 'Енергоменеджмент та енергоефективні технології',
  },
  {
    departmentName: 'Кафедра електропостачання',
    specialtyCode: 'G3',
    degreeLevel: 'bachelor',
    name: 'Системи забезпечення споживачів електричною енергією',
  },
  {
    departmentName: 'Кафедра електропостачання',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Енергоменеджмент та енергоефективні технології',
  },
  {
    departmentName: 'Кафедра електропостачання',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Енергоменеджмент, електропостачання та інжиніринг електротехнічних комплексів',
  },
  {
    departmentName: 'Кафедра електропостачання',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Системи забезпечення споживачів електричною енергією',
  },
  {
    departmentName: 'Кафедра електропостачання',
    specialtyCode: 'G3',
    degreeLevel: 'phd',
    name: 'Електроенергетика, електротехніка та електромеханіка',
  },
  // Кафедра охорони праці, промислової та цивільної безпеки (ОППЦБ)
  {
    departmentName: 'Кафедра охорони праці, промислової та цивільної безпеки',
    specialtyCode: 'J4',
    degreeLevel: 'master',
    name: 'Безпека праці та управління професійними ризиками',
  },

  // ======================== НН ІМЗ — Навчально-науковий інститут матеріалознавства та зварювання ім. Є.О. Патона ========================
  // Кафедра високотемпературних матеріалів та порошкової металургії (ВТМПМ)
  {
    departmentName: 'Кафедра високотемпературних матеріалів та порошкової металургії',
    specialtyCode: 'G10',
    degreeLevel: 'phd',
    name: 'Металургія',
  },
  {
    departmentName: 'Кафедра високотемпературних матеріалів та порошкової металургії',
    specialtyCode: 'G8',
    degreeLevel: 'bachelor',
    name: 'Інженерія порошкових та композиційних матеріалів',
  },
  {
    departmentName: 'Кафедра високотемпературних матеріалів та порошкової металургії',
    specialtyCode: 'G8',
    degreeLevel: 'bachelor',
    name: 'Нанотехнології та компʼютерний дизайн матеріалів',
  },
  {
    departmentName: 'Кафедра високотемпературних матеріалів та порошкової металургії',
    specialtyCode: 'G8',
    degreeLevel: 'bachelor',
    name: 'Передові технології та матеріали в авіакосмічній техніці',
  },
  {
    departmentName: 'Кафедра високотемпературних матеріалів та порошкової металургії',
    specialtyCode: 'G8',
    degreeLevel: 'master',
    name: 'Інженерія порошкових та композиційних матеріалів',
  },
  {
    departmentName: 'Кафедра високотемпературних матеріалів та порошкової металургії',
    specialtyCode: 'G8',
    degreeLevel: 'master',
    name: 'Матеріалознавство',
  },
  {
    departmentName: 'Кафедра високотемпературних матеріалів та порошкової металургії',
    specialtyCode: 'G8',
    degreeLevel: 'phd',
    name: 'Матеріалознавство',
  },
  // Кафедра зварювального виробництва (ЗВ)
  {
    departmentName: 'Кафедра зварювального виробництва',
    specialtyCode: 'G9',
    degreeLevel: 'bachelor',
    name: 'Інжиніринг зварювання, лазерних та споріднених технологій',
  },
  {
    departmentName: 'Кафедра зварювального виробництва',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Інжиніринг зварювання, лазерних та споріднених технологій',
  },
  {
    departmentName: 'Кафедра зварювального виробництва',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Прикладна механіка',
  },
  {
    departmentName: 'Кафедра зварювального виробництва',
    specialtyCode: 'G9',
    degreeLevel: 'phd',
    name: 'Прикладна механіка',
  },
  // Кафедра лазерної техніки та фізико-технічних технологій (ЛТФТТ)
  {
    departmentName: 'Кафедра лазерної техніки та фізико-технічних технологій',
    specialtyCode: 'G9',
    degreeLevel: 'bachelor',
    name: 'Інжиніринг зварювання, лазерних та споріднених технологій',
  },
  {
    departmentName: 'Кафедра лазерної техніки та фізико-технічних технологій',
    specialtyCode: 'G9',
    degreeLevel: 'bachelor',
    name: 'Лазерні технології та цифрове виробництво',
  },
  {
    departmentName: 'Кафедра лазерної техніки та фізико-технічних технологій',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Інжиніринг зварювання, лазерних та споріднених технологій',
  },
  {
    departmentName: 'Кафедра лазерної техніки та фізико-технічних технологій',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Прикладна механіка',
  },
  {
    departmentName: 'Кафедра лазерної техніки та фізико-технічних технологій',
    specialtyCode: 'G9',
    degreeLevel: 'phd',
    name: 'Прикладна механіка',
  },
  // Кафедра ливарного виробництва (ЛВ)
  {
    departmentName: 'Кафедра ливарного виробництва',
    specialtyCode: 'G10',
    degreeLevel: 'bachelor',
    name: 'Компʼютеризовані процеси лиття',
  },
  {
    departmentName: 'Кафедра ливарного виробництва',
    specialtyCode: 'G10',
    degreeLevel: 'bachelor',
    name: 'Цифрові технології інженерії матеріалів',
  },
  {
    departmentName: 'Кафедра ливарного виробництва',
    specialtyCode: 'G10',
    degreeLevel: 'master',
    name: 'Компʼютеризовані процеси лиття',
  },
  {
    departmentName: 'Кафедра ливарного виробництва',
    specialtyCode: 'G10',
    degreeLevel: 'phd',
    name: 'Металургія',
  },
  // Кафедра фізичного матеріалознавства та термічної обробки (ФМТО)
  {
    departmentName: 'Кафедра фізичного матеріалознавства та термічної обробки',
    specialtyCode: 'G8',
    degreeLevel: 'bachelor',
    name: 'Інженерія металевих матеріалів програмними засобами штучного інтелекту',
  },
  {
    departmentName: 'Кафедра фізичного матеріалознавства та термічної обробки',
    specialtyCode: 'G8',
    degreeLevel: 'bachelor',
    name: 'Інжиніринг та компʼютерне моделювання в матеріалознавстві',
  },
  {
    departmentName: 'Кафедра фізичного матеріалознавства та термічної обробки',
    specialtyCode: 'G8',
    degreeLevel: 'master',
    name: 'Інжиніринг та компʼютерне моделювання в матеріалознавстві',
  },
  {
    departmentName: 'Кафедра фізичного матеріалознавства та термічної обробки',
    specialtyCode: 'G8',
    degreeLevel: 'master',
    name: 'Матеріалознавство',
  },
  {
    departmentName: 'Кафедра фізичного матеріалознавства та термічної обробки',
    specialtyCode: 'G8',
    degreeLevel: 'phd',
    name: 'Матеріалознавство',
  },

  // ======================== НН ІПСА — Навчально-науковий інститут прикладного системного аналізу ========================
  // Кафедра математичних методів системного аналізу (ММСА)
  {
    departmentName: 'Кафедра математичних методів системного аналізу',
    specialtyCode: 'F4',
    degreeLevel: 'bachelor',
    name: 'Системний аналіз і управління',
  },
  {
    departmentName: 'Кафедра математичних методів системного аналізу',
    specialtyCode: 'F4',
    degreeLevel: 'master',
    name: 'Інтелектуальні системи та методи управління роями БПЛА',
  },
  {
    departmentName: 'Кафедра математичних методів системного аналізу',
    specialtyCode: 'F4',
    degreeLevel: 'master',
    name: 'Системний аналіз фінансового ринку',
  },
  {
    departmentName: 'Кафедра математичних методів системного аналізу',
    specialtyCode: 'F4',
    degreeLevel: 'master',
    name: 'Системний аналіз і управління',
  },
  {
    departmentName: 'Кафедра математичних методів системного аналізу',
    specialtyCode: 'F4',
    degreeLevel: 'phd',
    name: 'Системний аналіз',
  },
  // Кафедра системного проектування (СП)
  {
    departmentName: 'Кафедра системного проектування',
    specialtyCode: 'F3',
    degreeLevel: 'bachelor',
    name: 'Інтелектуальні сервіс-орієнтовані розподілені обчислювання',
  },
  {
    departmentName: 'Кафедра системного проектування',
    specialtyCode: 'F3',
    degreeLevel: 'master',
    name: 'Інтелектуальні сервіс-орієнтовані розподілені обчислювання',
  },
  {
    departmentName: 'Кафедра системного проектування',
    specialtyCode: 'F3',
    degreeLevel: 'master',
    name: 'Компʼютерні науки',
  },
  {
    departmentName: 'Кафедра системного проектування',
    specialtyCode: 'F3',
    degreeLevel: 'phd',
    name: 'Компʼютерні науки',
  },
  // Кафедра штучного інтелекту (ШІ)
  {
    departmentName: 'Кафедра штучного інтелекту',
    specialtyCode: 'F3',
    degreeLevel: 'bachelor',
    name: 'Системи і методи штучного інтелекту',
  },
  {
    departmentName: 'Кафедра штучного інтелекту',
    specialtyCode: 'F3',
    degreeLevel: 'master',
    name: 'Компʼютерні науки',
  },
  {
    departmentName: 'Кафедра штучного інтелекту',
    specialtyCode: 'F3',
    degreeLevel: 'master',
    name: 'Системи і методи штучного інтелекту',
  },
  {
    departmentName: 'Кафедра штучного інтелекту',
    specialtyCode: 'F3',
    degreeLevel: 'phd',
    name: 'Компʼютерні науки',
  },

  // ======================== НН ІТС — Навчально-науковий інститут телекомунікаційних систем ========================
  // Кафедра електронних комунікацій та Інтернету речей (ЕКІР)
  {
    departmentName: 'Кафедра електронних комунікацій та Інтернету речей',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Інженерія систем телекомунікацій безпілотних авіаційних комплексів',
  },
  {
    departmentName: 'Кафедра електронних комунікацій та Інтернету речей',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Системи електронних комунікацій та Інтернету речей',
  },
  {
    departmentName: 'Кафедра електронних комунікацій та Інтернету речей',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Інженерія інноваційних інформаційно-телекомунікаційних технологій та систем',
  },
  {
    departmentName: 'Кафедра електронних комунікацій та Інтернету речей',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Системи електронних комунікацій та Інтернету речей',
  },
  {
    departmentName: 'Кафедра електронних комунікацій та Інтернету речей',
    specialtyCode: 'G5',
    degreeLevel: 'phd',
    name: 'Телекомунікації та радіотехніка',
  },
  // Кафедра інформаційних технологій в телекомунікаціях (ІТТ)
  {
    departmentName: 'Кафедра інформаційних технологій в телекомунікаціях',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Інженерія систем штучного інтелекту в електронних комунікаціях',
  },
  {
    departmentName: 'Кафедра інформаційних технологій в телекомунікаціях',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Інформаційно-комунікаційні технології',
  },
  {
    departmentName: 'Кафедра інформаційних технологій в телекомунікаціях',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Інженерія інноваційних інформаційно-телекомунікаційних технологій та систем',
  },
  {
    departmentName: 'Кафедра інформаційних технологій в телекомунікаціях',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Інформаційно-комунікаційні технології',
  },
  {
    departmentName: 'Кафедра інформаційних технологій в телекомунікаціях',
    specialtyCode: 'G5',
    degreeLevel: 'phd',
    name: 'Телекомунікації та радіотехніка',
  },
  // Кафедра телекомунікацій (ТК)
  {
    departmentName: 'Кафедра телекомунікацій',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Інженерія та програмування інфокомунікацій',
  },
  {
    departmentName: 'Кафедра телекомунікацій',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Інженерія та програмування інфокомунікацій',
  },
  {
    departmentName: 'Кафедра телекомунікацій',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Інженерія інноваційних інформаційно-телекомунікаційних технологій та систем',
  },
  {
    departmentName: 'Кафедра телекомунікацій',
    specialtyCode: 'G5',
    degreeLevel: 'phd',
    name: 'Телекомунікації та радіотехніка',
  },

  // ======================== НН ММІ — Навчально-науковий механіко-машинобудівний інститут ========================
  // Кафедра динаміки і міцності машин та опору матеріалів (ДММОМ)
  {
    departmentName: 'Кафедра динаміки і міцності машин та опору матеріалів',
    specialtyCode: 'G9',
    degreeLevel: 'bachelor',
    name: 'Динаміка і міцність машин',
  },
  {
    departmentName: 'Кафедра динаміки і міцності машин та опору матеріалів',
    specialtyCode: 'G9',
    degreeLevel: 'bachelor',
    name: 'Штучний інтелект у механічній інженерії',
  },
  {
    departmentName: 'Кафедра динаміки і міцності машин та опору матеріалів',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Динаміка і міцність машин',
  },
  {
    departmentName: 'Кафедра динаміки і міцності машин та опору матеріалів',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Прикладна механіка',
  },
  {
    departmentName: 'Кафедра динаміки і міцності машин та опору матеріалів',
    specialtyCode: 'G9',
    degreeLevel: 'phd',
    name: 'Прикладна механіка',
  },
  // Кафедра конструювання машин (КМ)
  {
    departmentName: 'Кафедра конструювання машин',
    specialtyCode: 'G9',
    degreeLevel: 'bachelor',
    name: 'Конструювання машин',
  },
  {
    departmentName: 'Кафедра конструювання машин',
    specialtyCode: 'G9',
    degreeLevel: 'bachelor',
    name: 'Конструювання та дизайн машин',
  },
  {
    departmentName: 'Кафедра конструювання машин',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Конструювання машин',
  },
  {
    departmentName: 'Кафедра конструювання машин',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Прикладна механіка',
  },
  {
    departmentName: 'Кафедра конструювання машин',
    specialtyCode: 'G9',
    degreeLevel: 'phd',
    name: 'Прикладна механіка',
  },
  // Кафедра прикладної гідроаеромеханіки і механотроніки (ПГМ)
  {
    departmentName: 'Кафедра прикладної гідроаеромеханіки і механотроніки',
    specialtyCode: 'G9',
    degreeLevel: 'bachelor',
    name: 'Інженерія роботів і дронів',
  },
  {
    departmentName: 'Кафедра прикладної гідроаеромеханіки і механотроніки',
    specialtyCode: 'G9',
    degreeLevel: 'bachelor',
    name: 'Автоматизовані та роботизовані механічні системи',
  },
  {
    departmentName: 'Кафедра прикладної гідроаеромеханіки і механотроніки',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Інженерія роботів і дронів',
  },
  {
    departmentName: 'Кафедра прикладної гідроаеромеханіки і механотроніки',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Автоматизовані та роботизовані механічні системи',
  },
  {
    departmentName: 'Кафедра прикладної гідроаеромеханіки і механотроніки',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Прикладна механіка',
  },
  {
    departmentName: 'Кафедра прикладної гідроаеромеханіки і механотроніки',
    specialtyCode: 'G9',
    degreeLevel: 'phd',
    name: 'Прикладна механіка',
  },
  // Кафедра робототехніки (КРТ) [офіційні ОП КПІ попередніх редакцій]
  {
    departmentName: 'Кафедра робототехніки',
    specialtyCode: 'G9',
    degreeLevel: 'bachelor',
    name: 'Робототехніка',
  },
  {
    departmentName: 'Кафедра робототехніки',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Робототехніка',
  },
  // Кафедра технології виробництва літальних апаратів (ТВЛА)
  {
    departmentName: 'Кафедра технології виробництва літальних апаратів',
    specialtyCode: 'G9',
    degreeLevel: 'bachelor',
    name: 'Технології виробництва літальних апаратів',
  },
  {
    departmentName: 'Кафедра технології виробництва літальних апаратів',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Прикладна механіка',
  },
  {
    departmentName: 'Кафедра технології виробництва літальних апаратів',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Технології виробництва літальних апаратів',
  },
  {
    departmentName: 'Кафедра технології виробництва літальних апаратів',
    specialtyCode: 'G9',
    degreeLevel: 'phd',
    name: 'Прикладна механіка',
  },
  // Кафедра технології машинобудування (ТМММІ)
  {
    departmentName: 'Кафедра технології машинобудування',
    specialtyCode: 'G9',
    degreeLevel: 'bachelor',
    name: 'Інтелектуальні виробничі системи',
  },
  {
    departmentName: 'Кафедра технології машинобудування',
    specialtyCode: 'G9',
    degreeLevel: 'bachelor',
    name: 'Технології машинобудування',
  },
  {
    departmentName: 'Кафедра технології машинобудування',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Прикладна механіка',
  },
  {
    departmentName: 'Кафедра технології машинобудування',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Технології машинобудування',
  },
  {
    departmentName: 'Кафедра технології машинобудування',
    specialtyCode: 'G9',
    degreeLevel: 'phd',
    name: 'Прикладна механіка',
  },

  // ======================== НН ФТІ — Навчально-науковий фізико-технічний інститут ========================
  // Кафедра інформаційної безпеки (ІБ)
  {
    departmentName: 'Кафедра інформаційної безпеки',
    specialtyCode: 'F5',
    degreeLevel: 'bachelor',
    name: 'Системи технічного захисту інформації',
  },
  {
    departmentName: 'Кафедра інформаційної безпеки',
    specialtyCode: 'F5',
    degreeLevel: 'bachelor',
    name: 'Системи, технології та математичні методи кібербезпеки',
  },
  {
    departmentName: 'Кафедра інформаційної безпеки',
    specialtyCode: 'F5',
    degreeLevel: 'master',
    name: 'Системи технічного захисту інформації',
  },
  {
    departmentName: 'Кафедра інформаційної безпеки',
    specialtyCode: 'F5',
    degreeLevel: 'master',
    name: 'Системи, технології та математичні методи кібербезпеки',
  },
  {
    departmentName: 'Кафедра інформаційної безпеки',
    specialtyCode: 'F5',
    degreeLevel: 'master',
    name: 'Системи, технології та математичні методи кібербезпеки (ОНП)',
  },
  {
    departmentName: 'Кафедра інформаційної безпеки',
    specialtyCode: 'F5',
    degreeLevel: 'phd',
    name: 'Кібербезпека',
  },
  // Кафедра математичних методів захисту інформації (ММЗІ)
  {
    departmentName: 'Кафедра математичних методів захисту інформації',
    specialtyCode: 'F1',
    degreeLevel: 'bachelor',
    name: 'Математичні методи криптографічного захисту інформації',
  },
  {
    departmentName: 'Кафедра математичних методів захисту інформації',
    specialtyCode: 'F1',
    degreeLevel: 'master',
    name: 'Математичні методи криптографічного захисту інформації',
  },
  {
    departmentName: 'Кафедра математичних методів захисту інформації',
    specialtyCode: 'F1',
    degreeLevel: 'phd',
    name: 'Прикладна математика',
  },
  {
    departmentName: 'Кафедра математичних методів захисту інформації',
    specialtyCode: 'F5',
    degreeLevel: 'bachelor',
    name: 'Криптографічний захист інформації в системах кібербезпеки',
  },
  // Кафедра математичного моделювання та аналізу даних (ММАД)
  {
    departmentName: 'Кафедра математичного моделювання та аналізу даних',
    specialtyCode: 'F1',
    degreeLevel: 'bachelor',
    name: 'Математичні методи моделювання, розпізнавання образів та компʼютерного зору',
  },
  {
    departmentName: 'Кафедра математичного моделювання та аналізу даних',
    specialtyCode: 'F1',
    degreeLevel: 'master',
    name: 'Математичні методи моделювання, розпізнавання образів та компʼютерного зору',
  },
  {
    departmentName: 'Кафедра математичного моделювання та аналізу даних',
    specialtyCode: 'F1',
    degreeLevel: 'phd',
    name: 'Прикладна математика',
  },
  // Кафедра прикладної фізики (ПФ)
  {
    departmentName: 'Кафедра прикладної фізики',
    specialtyCode: 'E6',
    degreeLevel: 'bachelor',
    name: 'Прикладна фізика',
  },
  {
    departmentName: 'Кафедра прикладної фізики',
    specialtyCode: 'E6',
    degreeLevel: 'master',
    name: 'Прикладна фізика',
  },
  {
    departmentName: 'Кафедра прикладної фізики',
    specialtyCode: 'E6',
    degreeLevel: 'phd',
    name: 'Прикладна фізика',
  },

  // ======================== ІСЗЗІ — Інститут спеціального звʼязку та захисту інформації ========================
  // Спеціальна кафедра № 1 (Кіберзахисту та безпеки спеціального звʼязку) (СК № 1)
  {
    departmentName: 'Спеціальна кафедра № 1 (Кіберзахисту та безпеки спеціального звʼязку)',
    specialtyCode: 'F5',
    degreeLevel: 'bachelor',
    name: 'Безпека державних інформаційних ресурсів',
  },
  {
    departmentName: 'Спеціальна кафедра № 1 (Кіберзахисту та безпеки спеціального звʼязку)',
    specialtyCode: 'F5',
    degreeLevel: 'master',
    name: 'Безпека державних інформаційних ресурсів',
  },
  {
    departmentName: 'Спеціальна кафедра № 1 (Кіберзахисту та безпеки спеціального звʼязку)',
    specialtyCode: 'F5',
    degreeLevel: 'phd',
    name: 'Безпека державних інформаційних ресурсів',
  },
  // Спеціальна кафедра № 2 (Лідерства та управління у військовій сфері) (СК № 2) [загальноосвітня/базова кафедра — реалістичні dev-ОП]
  {
    departmentName: 'Спеціальна кафедра № 2 (Лідерства та управління у військовій сфері)',
    specialtyCode: 'K5',
    degreeLevel: 'bachelor',
    name: 'Військове управління та організація спеціального звʼязку',
  },
  {
    departmentName: 'Спеціальна кафедра № 2 (Лідерства та управління у військовій сфері)',
    specialtyCode: 'K5',
    degreeLevel: 'master',
    name: 'Лідерство та управління у сфері спеціального звʼязку',
  },
  // Спеціальна кафедра № 3 (Інтелектуальних електронних комунікацій системи спеціального звʼязку) (СК № 3)
  {
    departmentName: 'Спеціальна кафедра № 3 (Інтелектуальних електронних комунікацій системи спеціального звʼязку)',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Спеціальні системи електронних комунікацій',
  },
  {
    departmentName: 'Спеціальна кафедра № 3 (Інтелектуальних електронних комунікацій системи спеціального звʼязку)',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Спеціальні системи електронних комунікацій',
  },
  {
    departmentName: 'Спеціальна кафедра № 3 (Інтелектуальних електронних комунікацій системи спеціального звʼязку)',
    specialtyCode: 'G5',
    degreeLevel: 'phd',
    name: 'Спеціальні системи електронних комунікацій',
  },
  {
    departmentName: 'Спеціальна кафедра № 3 (Інтелектуальних електронних комунікацій системи спеціального звʼязку)',
    specialtyCode: 'G5',
    degreeLevel: 'phd',
    name: 'Спеціальні телекомунікаційні системи',
  },
  // Спеціальна кафедра № 4 (Соціальних наук і стратегічних комунікацій) (СК № 4) [загальноосвітня/базова кафедра — реалістичні dev-ОП]
  {
    departmentName: 'Спеціальна кафедра № 4 (Соціальних наук і стратегічних комунікацій)',
    specialtyCode: 'K3',
    degreeLevel: 'bachelor',
    name: 'Стратегічні комунікації та інформаційна стійкість у сфері безпеки',
  },
  {
    departmentName: 'Спеціальна кафедра № 4 (Соціальних наук і стратегічних комунікацій)',
    specialtyCode: 'K3',
    degreeLevel: 'master',
    name: 'Стратегічні комунікації та соціальна безпека',
  },
  // Спеціальна кафедра № 5 (Компʼютерних наук та технологій штучного інтелекту в сфері кібербезпеки) (СК № 5)
  {
    departmentName: 'Спеціальна кафедра № 5 (Компʼютерних наук та технологій штучного інтелекту в сфері кібербезпеки)',
    specialtyCode: 'F3',
    degreeLevel: 'bachelor',
    name: 'Компʼютерні системи і технології спеціального звʼязку',
  },
  {
    departmentName: 'Спеціальна кафедра № 5 (Компʼютерних наук та технологій штучного інтелекту в сфері кібербезпеки)',
    specialtyCode: 'F3',
    degreeLevel: 'master',
    name: 'Компʼютерні системи і технології спеціального звʼязку',
  },
  {
    departmentName: 'Спеціальна кафедра № 5 (Компʼютерних наук та технологій штучного інтелекту в сфері кібербезпеки)',
    specialtyCode: 'F3',
    degreeLevel: 'phd',
    name: 'Компʼютерні системи і технології спеціального звʼязку',
  },

  // ======================== РТФ — Радіотехнічний факультет ========================
  // Кафедра прикладної радіоелектроніки (РЕ)
  {
    departmentName: 'Кафедра прикладної радіоелектроніки',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Інтелектуальні технології радіоелектронної техніки',
  },
  {
    departmentName: 'Кафедра прикладної радіоелектроніки',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Технології радіоелектронної боротьби',
  },
  {
    departmentName: 'Кафедра прикладної радіоелектроніки',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Інтелектуальні технології радіоелектронної техніки',
  },
  {
    departmentName: 'Кафедра прикладної радіоелектроніки',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Радіоелектронна інженерія',
  },
  {
    departmentName: 'Кафедра прикладної радіоелектроніки',
    specialtyCode: 'G5',
    degreeLevel: 'phd',
    name: 'Телекомунікації та радіотехніка',
  },
  // Кафедра радіоінженерії (РІ)
  {
    departmentName: 'Кафедра радіоінженерії',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Інформаційна та комунікаційна радіоінженерія',
  },
  {
    departmentName: 'Кафедра радіоінженерії',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Технології радіоелектронної боротьби',
  },
  {
    departmentName: 'Кафедра радіоінженерії',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Інформаційна та комунікаційна радіоінженерія',
  },
  {
    departmentName: 'Кафедра радіоінженерії',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Радіоелектронна інженерія',
  },
  {
    departmentName: 'Кафедра радіоінженерії',
    specialtyCode: 'G5',
    degreeLevel: 'phd',
    name: 'Телекомунікації та радіотехніка',
  },
  // Кафедра радіотехнічних систем (РТС)
  {
    departmentName: 'Кафедра радіотехнічних систем',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Радіотехнічні компʼютеризовані системи',
  },
  {
    departmentName: 'Кафедра радіотехнічних систем',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Технології радіоелектронної боротьби',
  },
  {
    departmentName: 'Кафедра радіотехнічних систем',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Радіоелектронна інженерія',
  },
  {
    departmentName: 'Кафедра радіотехнічних систем',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Радіотехнічні компʼютеризовані системи',
  },
  {
    departmentName: 'Кафедра радіотехнічних систем',
    specialtyCode: 'G5',
    degreeLevel: 'phd',
    name: 'Телекомунікації та радіотехніка',
  },

  // ======================== ФАПІЕ — Факультет автоматизації, промислової інженерії та екології ========================
  // Кафедра екології та технології рослинних полімерів (ЕТРП)
  {
    departmentName: 'Кафедра екології та технології рослинних полімерів',
    specialtyCode: 'E2',
    degreeLevel: 'bachelor',
    name: 'Екологічна безпека',
  },
  {
    departmentName: 'Кафедра екології та технології рослинних полімерів',
    specialtyCode: 'E2',
    degreeLevel: 'bachelor',
    name: 'Цифрові технології захисту довкілля',
  },
  {
    departmentName: 'Кафедра екології та технології рослинних полімерів',
    specialtyCode: 'E2',
    degreeLevel: 'master',
    name: 'Екологічна безпека',
  },
  {
    departmentName: 'Кафедра екології та технології рослинних полімерів',
    specialtyCode: 'E2',
    degreeLevel: 'master',
    name: 'Цифрові технології захисту довкілля',
  },
  {
    departmentName: 'Кафедра екології та технології рослинних полімерів',
    specialtyCode: 'E2',
    degreeLevel: 'phd',
    name: 'Екологія',
  },
  {
    departmentName: 'Кафедра екології та технології рослинних полімерів',
    specialtyCode: 'G1',
    degreeLevel: 'bachelor',
    name: 'Промислова екологія та ресурсоефективні чисті технології',
  },
  {
    departmentName: 'Кафедра екології та технології рослинних полімерів',
    specialtyCode: 'G1',
    degreeLevel: 'bachelor',
    name: 'Ресурсоефективні чисті технології',
  },
  {
    departmentName: 'Кафедра екології та технології рослинних полімерів',
    specialtyCode: 'G1',
    degreeLevel: 'master',
    name: 'Ресурсоефективні чисті технології',
  },
  {
    departmentName: 'Кафедра екології та технології рослинних полімерів',
    specialtyCode: 'G1',
    degreeLevel: 'master',
    name: 'Хімічні технології та інженерія',
  },
  {
    departmentName: 'Кафедра екології та технології рослинних полімерів',
    specialtyCode: 'G1',
    degreeLevel: 'phd',
    name: 'Хімічні технології та інженерія',
  },
  // Кафедра машин та апаратів хімічних і нафтопереробних виробництв (МАХНВ)
  {
    departmentName: 'Кафедра машин та апаратів хімічних і нафтопереробних виробництв',
    specialtyCode: 'G11',
    degreeLevel: 'bachelor',
    name: 'Інженерія промислових процесів та обладнання',
  },
  {
    departmentName: 'Кафедра машин та апаратів хімічних і нафтопереробних виробництв',
    specialtyCode: 'G11',
    degreeLevel: 'bachelor',
    name: 'Компʼютерно-інтегровані технології проектування обладнання хімічної інженерії',
  },
  {
    departmentName: 'Кафедра машин та апаратів хімічних і нафтопереробних виробництв',
    specialtyCode: 'G11',
    degreeLevel: 'master',
    name: 'Інжиніринг інноваційного галузевого обладнання',
  },
  {
    departmentName: 'Кафедра машин та апаратів хімічних і нафтопереробних виробництв',
    specialtyCode: 'G11',
    degreeLevel: 'phd',
    name: 'Галузеве машинобудування',
  },
  // Кафедра технічних та програмних засобів автоматизації (ТПЗА)
  {
    departmentName: 'Кафедра технічних та програмних засобів автоматизації',
    specialtyCode: 'G7',
    degreeLevel: 'bachelor',
    name: 'Технічні та програмні засоби автоматизації',
  },
  {
    departmentName: 'Кафедра технічних та програмних засобів автоматизації',
    specialtyCode: 'G7',
    degreeLevel: 'master',
    name: 'Автоматизація та компʼютерно-інтегровані технології',
  },
  {
    departmentName: 'Кафедра технічних та програмних засобів автоматизації',
    specialtyCode: 'G7',
    degreeLevel: 'master',
    name: 'Технічні та програмні засоби автоматизації',
  },
  {
    departmentName: 'Кафедра технічних та програмних засобів автоматизації',
    specialtyCode: 'G7',
    degreeLevel: 'phd',
    name: 'Автоматизація та компʼютерно-інтегровані технології',
  },
  // Кафедра хімічного, полімерного і силікатного машинобудування (ХПСМ)
  {
    departmentName: 'Кафедра хімічного, полімерного і силікатного машинобудування',
    specialtyCode: 'G11',
    degreeLevel: 'bachelor',
    name: 'Інжиніринг обладнання виробництва полімерних та будівельних матеріалів і виробів',
  },
  {
    departmentName: 'Кафедра хімічного, полімерного і силікатного машинобудування',
    specialtyCode: 'G11',
    degreeLevel: 'master',
    name: 'Інжиніринг інноваційного галузевого обладнання',
  },
  {
    departmentName: 'Кафедра хімічного, полімерного і силікатного машинобудування',
    specialtyCode: 'G11',
    degreeLevel: 'phd',
    name: 'Галузеве машинобудування',
  },
  {
    departmentName: 'Кафедра хімічного, полімерного і силікатного машинобудування',
    specialtyCode: 'G9',
    degreeLevel: 'bachelor',
    name: 'Інжиніринг паковань та пакувального обладнання',
  },
  {
    departmentName: 'Кафедра хімічного, полімерного і силікатного машинобудування',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Інжиніринг паковань та пакувального обладнання',
  },
  {
    departmentName: 'Кафедра хімічного, полімерного і силікатного машинобудування',
    specialtyCode: 'G9',
    degreeLevel: 'master',
    name: 'Прикладна механіка',
  },
  {
    departmentName: 'Кафедра хімічного, полімерного і силікатного машинобудування',
    specialtyCode: 'G9',
    degreeLevel: 'phd',
    name: 'Прикладна механіка',
  },

  // ======================== ФБМІ — Факультет біомедичної інженерії ========================
  // Кафедра біобезпеки і здоровʼя людини (ББЗЛ)
  {
    departmentName: 'Кафедра біобезпеки і здоровʼя людини',
    specialtyCode: 'G22',
    degreeLevel: 'master',
    name: 'Інженерія у біобезпеці та біозахисті',
  },
  {
    departmentName: 'Кафедра біобезпеки і здоровʼя людини',
    specialtyCode: 'I7',
    degreeLevel: 'bachelor',
    name: 'Фізична терапія, ерготерапія',
  },
  {
    departmentName: 'Кафедра біобезпеки і здоровʼя людини',
    specialtyCode: 'I7',
    degreeLevel: 'master',
    name: 'Фізична терапія',
  },
  {
    departmentName: 'Кафедра біобезпеки і здоровʼя людини',
    specialtyCode: 'I7',
    degreeLevel: 'phd',
    name: 'Фізична терапія, ерготерапія',
  },
  // Кафедра біомедичної інженерії (БМІ)
  {
    departmentName: 'Кафедра біомедичної інженерії',
    specialtyCode: 'G22',
    degreeLevel: 'bachelor',
    name: 'Медична інженерія',
  },
  {
    departmentName: 'Кафедра біомедичної інженерії',
    specialtyCode: 'G22',
    degreeLevel: 'master',
    name: 'Медична інженерія',
  },
  {
    departmentName: 'Кафедра біомедичної інженерії',
    specialtyCode: 'G22',
    degreeLevel: 'phd',
    name: 'Біомедична інженерія',
  },
  // Кафедра біомедичної кібернетики (БМК)
  {
    departmentName: 'Кафедра біомедичної кібернетики',
    specialtyCode: 'F3',
    degreeLevel: 'bachelor',
    name: 'Компʼютерні технології в біології та медицині',
  },
  {
    departmentName: 'Кафедра біомедичної кібернетики',
    specialtyCode: 'F3',
    degreeLevel: 'bachelor',
    name: 'Симуляції та імерсивні середовища користувача',
  },
  {
    departmentName: 'Кафедра біомедичної кібернетики',
    specialtyCode: 'F3',
    degreeLevel: 'bachelor',
    name: 'Технології штучного інтелекту у біомедичних системах',
  },
  {
    departmentName: 'Кафедра біомедичної кібернетики',
    specialtyCode: 'F3',
    degreeLevel: 'master',
    name: 'Компʼютерні науки',
  },
  {
    departmentName: 'Кафедра біомедичної кібернетики',
    specialtyCode: 'F3',
    degreeLevel: 'master',
    name: 'Технології штучного інтелекту у біомедичних системах',
  },
  {
    departmentName: 'Кафедра біомедичної кібернетики',
    specialtyCode: 'F3',
    degreeLevel: 'phd',
    name: 'Компʼютерні науки',
  },
  // Кафедра технологій оздоровлення і спорту (КТОС) [офіційні ОП КПІ попередніх редакцій]
  {
    departmentName: 'Кафедра технологій оздоровлення і спорту',
    specialtyCode: 'A7',
    degreeLevel: 'master',
    name: 'Фізкультурно-спортивне відновлення людини та діяльність оздоровчо-спортивних закладів',
  },
  // Кафедра трансляційної медичної біоінженерії (ТМБ)
  {
    departmentName: 'Кафедра трансляційної медичної біоінженерії',
    specialtyCode: 'E1',
    degreeLevel: 'phd',
    name: 'Прикладна біологія',
  },
  {
    departmentName: 'Кафедра трансляційної медичної біоінженерії',
    specialtyCode: 'G22',
    degreeLevel: 'bachelor',
    name: 'Регенеративна та біофармацевтична інженерія',
  },
  {
    departmentName: 'Кафедра трансляційної медичної біоінженерії',
    specialtyCode: 'G22',
    degreeLevel: 'master',
    name: 'Інженерія у біобезпеці та біозахисті',
  },
  {
    departmentName: 'Кафедра трансляційної медичної біоінженерії',
    specialtyCode: 'G22',
    degreeLevel: 'master',
    name: 'Регенеративна та біофармацевтична інженерія',
  },
  {
    departmentName: 'Кафедра трансляційної медичної біоінженерії',
    specialtyCode: 'G22',
    degreeLevel: 'phd',
    name: 'Біомедична інженерія',
  },

  // ======================== ФБТ — Факультет біотехнології і біотехніки ========================
  // Кафедра біоенергетики, біоінформатики та екобіотехнології (КББЕ)
  {
    departmentName: 'Кафедра біоенергетики, біоінформатики та екобіотехнології',
    specialtyCode: 'E1',
    degreeLevel: 'phd',
    name: 'Прикладна біологія',
  },
  {
    departmentName: 'Кафедра біоенергетики, біоінформатики та екобіотехнології',
    specialtyCode: 'G21',
    degreeLevel: 'bachelor',
    name: 'Біотехнології',
  },
  {
    departmentName: 'Кафедра біоенергетики, біоінформатики та екобіотехнології',
    specialtyCode: 'G21',
    degreeLevel: 'master',
    name: 'Біотехнології',
  },
  {
    departmentName: 'Кафедра біоенергетики, біоінформатики та екобіотехнології',
    specialtyCode: 'G21',
    degreeLevel: 'master',
    name: 'Біотехнології (ОНП)',
  },
  {
    departmentName: 'Кафедра біоенергетики, біоінформатики та екобіотехнології',
    specialtyCode: 'G21',
    degreeLevel: 'phd',
    name: 'Біотехнології',
  },
  // Кафедра біотехніки та інженерії (БТІ)
  {
    departmentName: 'Кафедра біотехніки та інженерії',
    specialtyCode: 'G11',
    degreeLevel: 'phd',
    name: 'Галузеве машинобудування',
  },
  {
    departmentName: 'Кафедра біотехніки та інженерії',
    specialtyCode: 'G21',
    degreeLevel: 'bachelor',
    name: 'Біотехнології',
  },
  {
    departmentName: 'Кафедра біотехніки та інженерії',
    specialtyCode: 'G21',
    degreeLevel: 'master',
    name: 'Біотехнології',
  },
  {
    departmentName: 'Кафедра біотехніки та інженерії',
    specialtyCode: 'G21',
    degreeLevel: 'master',
    name: 'Біотехнології (ОНП)',
  },
  {
    departmentName: 'Кафедра біотехніки та інженерії',
    specialtyCode: 'G21',
    degreeLevel: 'phd',
    name: 'Біотехнології',
  },
  // Кафедра промислової біотехнології та біофармації (ПБТБ)
  {
    departmentName: 'Кафедра промислової біотехнології та біофармації',
    specialtyCode: 'E1',
    degreeLevel: 'phd',
    name: 'Прикладна біологія',
  },
  {
    departmentName: 'Кафедра промислової біотехнології та біофармації',
    specialtyCode: 'G21',
    degreeLevel: 'bachelor',
    name: 'Біотехнології',
  },
  {
    departmentName: 'Кафедра промислової біотехнології та біофармації',
    specialtyCode: 'G21',
    degreeLevel: 'master',
    name: 'Біотехнології',
  },
  {
    departmentName: 'Кафедра промислової біотехнології та біофармації',
    specialtyCode: 'G21',
    degreeLevel: 'master',
    name: 'Біотехнології (ОНП)',
  },
  {
    departmentName: 'Кафедра промислової біотехнології та біофармації',
    specialtyCode: 'G21',
    degreeLevel: 'phd',
    name: 'Біотехнології',
  },

  // ======================== ФЕА — Факультет електроенерготехніки та автоматики ========================
  // Кафедра автоматизації електромеханічних систем та електроприводу (АЕМСЕП)
  {
    departmentName: 'Кафедра автоматизації електромеханічних систем та електроприводу',
    specialtyCode: 'G3',
    degreeLevel: 'bachelor',
    name: 'Електромеханічні системи автоматизації, електропривод та електромобільність',
  },
  {
    departmentName: 'Кафедра автоматизації електромеханічних систем та електроприводу',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Електроенергетика та електромеханіка',
  },
  {
    departmentName: 'Кафедра автоматизації електромеханічних систем та електроприводу',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Електромеханічні системи автоматизації, електропривод та електромобільність',
  },
  {
    departmentName: 'Кафедра автоматизації електромеханічних систем та електроприводу',
    specialtyCode: 'G3',
    degreeLevel: 'phd',
    name: 'Електроенергетика, електротехніка та електромеханіка',
  },
  // Кафедра автоматизації енергосистем (АЕ)
  {
    departmentName: 'Кафедра автоматизації енергосистем',
    specialtyCode: 'G3',
    degreeLevel: 'bachelor',
    name: 'Управління, захист та автоматизація енергосистем',
  },
  {
    departmentName: 'Кафедра автоматизації енергосистем',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Електроенергетика та електромеханіка',
  },
  {
    departmentName: 'Кафедра автоматизації енергосистем',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Управління, захист та автоматизація енергосистем',
  },
  {
    departmentName: 'Кафедра автоматизації енергосистем',
    specialtyCode: 'G3',
    degreeLevel: 'phd',
    name: 'Електроенергетика, електротехніка та електромеханіка',
  },
  // Кафедра відновлюваних джерел енергії (ВДЕ)
  {
    departmentName: 'Кафедра відновлюваних джерел енергії',
    specialtyCode: 'G3',
    degreeLevel: 'bachelor',
    name: 'Електричні станції',
  },
  {
    departmentName: 'Кафедра відновлюваних джерел енергії',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Електричні станції',
  },
  {
    departmentName: 'Кафедра відновлюваних джерел енергії',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Електроенергетика та електромеханіка',
  },
  {
    departmentName: 'Кафедра відновлюваних джерел енергії',
    specialtyCode: 'G3',
    degreeLevel: 'phd',
    name: 'Електроенергетика, електротехніка та електромеханіка',
  },
  {
    departmentName: 'Кафедра відновлюваних джерел енергії',
    specialtyCode: 'G4',
    degreeLevel: 'bachelor',
    name: 'Нетрадиційні та відновлювані джерела енергії',
  },
  {
    departmentName: 'Кафедра відновлюваних джерел енергії',
    specialtyCode: 'G4',
    degreeLevel: 'master',
    name: 'Нетрадиційні та відновлювані джерела енергії',
  },
  {
    departmentName: 'Кафедра відновлюваних джерел енергії',
    specialtyCode: 'G4',
    degreeLevel: 'phd',
    name: 'Відновлювані джерела енергії та гідроенергетика',
  },
  // Кафедра електричних мереж і систем (ЕМС)
  {
    departmentName: 'Кафедра електричних мереж і систем',
    specialtyCode: 'G3',
    degreeLevel: 'bachelor',
    name: 'Електричні системи і мережі',
  },
  {
    departmentName: 'Кафедра електричних мереж і систем',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Електричні системи і мережі',
  },
  {
    departmentName: 'Кафедра електричних мереж і систем',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Електроенергетика та електромеханіка',
  },
  {
    departmentName: 'Кафедра електричних мереж і систем',
    specialtyCode: 'G3',
    degreeLevel: 'phd',
    name: 'Електроенергетика, електротехніка та електромеханіка',
  },
  // Кафедра електромеханіки (ЕМ)
  {
    departmentName: 'Кафедра електромеханіки',
    specialtyCode: 'G3',
    degreeLevel: 'bachelor',
    name: 'Електричні машини і апарати',
  },
  {
    departmentName: 'Кафедра електромеханіки',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Електричні машини і апарати',
  },
  {
    departmentName: 'Кафедра електромеханіки',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Електроенергетика та електромеханіка',
  },
  {
    departmentName: 'Кафедра електромеханіки',
    specialtyCode: 'G3',
    degreeLevel: 'phd',
    name: 'Електроенергетика, електротехніка та електромеханіка',
  },
  // Кафедра теоретичної електротехніки (ТЕ)
  {
    departmentName: 'Кафедра теоретичної електротехніки',
    specialtyCode: 'G3',
    degreeLevel: 'bachelor',
    name: 'Електротехнічні пристрої та електротехнологічні комплекси',
  },
  {
    departmentName: 'Кафедра теоретичної електротехніки',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Електроенергетика та електромеханіка',
  },
  {
    departmentName: 'Кафедра теоретичної електротехніки',
    specialtyCode: 'G3',
    degreeLevel: 'master',
    name: 'Електротехнічні пристрої та електротехнологічні комплекси',
  },
  {
    departmentName: 'Кафедра теоретичної електротехніки',
    specialtyCode: 'G3',
    degreeLevel: 'phd',
    name: 'Електроенергетика, електротехніка та електромеханіка',
  },

  // ======================== ФЕЛ — Факультет електроніки ========================
  // Кафедра акустичних та мультимедійних електронних систем (АМЕС)
  {
    departmentName: 'Кафедра акустичних та мультимедійних електронних систем',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Акустичні електронні системи та технології обробки акустичної інформації',
  },
  {
    departmentName: 'Кафедра акустичних та мультимедійних електронних систем',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Електронні системи мультимедіа та засоби Інтернету речей',
  },
  {
    departmentName: 'Кафедра акустичних та мультимедійних електронних систем',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Акустичні електронні системи та технології обробки акустичної інформації',
  },
  {
    departmentName: 'Кафедра акустичних та мультимедійних електронних систем',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Електронні системи мультимедіа та засоби Інтернету речей',
  },
  {
    departmentName: 'Кафедра акустичних та мультимедійних електронних систем',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Електроніка',
  },
  {
    departmentName: 'Кафедра акустичних та мультимедійних електронних систем',
    specialtyCode: 'G5',
    degreeLevel: 'phd',
    name: 'Електроніка',
  },
  // Кафедра електронних пристроїв та систем (ЕПС)
  {
    departmentName: 'Кафедра електронних пристроїв та систем',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Електронні компоненти і системи',
  },
  {
    departmentName: 'Кафедра електронних пристроїв та систем',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Електронні прилади та пристрої',
  },
  {
    departmentName: 'Кафедра електронних пристроїв та систем',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Електронні компоненти, пристрої та системи',
  },
  {
    departmentName: 'Кафедра електронних пристроїв та систем',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Електроніка',
  },
  {
    departmentName: 'Кафедра електронних пристроїв та систем',
    specialtyCode: 'G5',
    degreeLevel: 'phd',
    name: 'Електроніка',
  },
  // Кафедра електронної інженерії (ЕІ)
  {
    departmentName: 'Кафедра електронної інженерії',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Електронні мікро- і наносистеми та технології',
  },
  {
    departmentName: 'Кафедра електронної інженерії',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Електронні мікро- і наносистеми та технології',
  },
  // Кафедра конструювання електронно-обчислювальної апаратури (КЕОА)
  {
    departmentName: 'Кафедра конструювання електронно-обчислювальної апаратури',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Інформаційно-обчислювальні засоби радіоелектронних систем',
  },
  {
    departmentName: 'Кафедра конструювання електронно-обчислювальної апаратури',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Інформаційно-обчислювальні засоби радіоелектронних систем',
  },
  {
    departmentName: 'Кафедра конструювання електронно-обчислювальної апаратури',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Радіоелектронна інженерія',
  },
  {
    departmentName: 'Кафедра конструювання електронно-обчислювальної апаратури',
    specialtyCode: 'G5',
    degreeLevel: 'phd',
    name: 'Телекомунікації та радіотехніка',
  },
  // Кафедра мікроелектроніки (МЕ)
  {
    departmentName: 'Кафедра мікроелектроніки',
    specialtyCode: 'G5',
    degreeLevel: 'bachelor',
    name: 'Мікро- та наноелектроніка',
  },
  {
    departmentName: 'Кафедра мікроелектроніки',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Мікро- та наноелектроніка',
  },
  {
    departmentName: 'Кафедра мікроелектроніки',
    specialtyCode: 'G5',
    degreeLevel: 'master',
    name: 'Мікро- та наносистемна техніка',
  },
  {
    departmentName: 'Кафедра мікроелектроніки',
    specialtyCode: 'G5',
    degreeLevel: 'phd',
    name: 'Мікро- та наносистемна техніка',
  },

  // ======================== ФІОТ — Факультет інформатики та обчислювальної техніки ========================
  // Кафедра інформатики та програмної інженерії (ІПІ)
  {
    departmentName: 'Кафедра інформатики та програмної інженерії',
    specialtyCode: 'F2',
    degreeLevel: 'bachelor',
    name: 'Інженерія програмного забезпечення інформаційних систем',
  },
  {
    departmentName: 'Кафедра інформатики та програмної інженерії',
    specialtyCode: 'F2',
    degreeLevel: 'master',
    name: 'Інженерія квантового програмного забезпечення',
  },
  {
    departmentName: 'Кафедра інформатики та програмної інженерії',
    specialtyCode: 'F2',
    degreeLevel: 'master',
    name: 'Інженерія програмного забезпечення інформаційних систем',
  },
  {
    departmentName: 'Кафедра інформатики та програмної інженерії',
    specialtyCode: 'F2',
    degreeLevel: 'master',
    name: 'Інженерія програмного забезпечення інформаційних систем (ОНП)',
  },
  {
    departmentName: 'Кафедра інформатики та програмної інженерії',
    specialtyCode: 'F2',
    degreeLevel: 'phd',
    name: 'Інженерія програмного забезпечення',
  },
  // Кафедра інформаційних систем та технологій (ІСТ)
  {
    departmentName: 'Кафедра інформаційних систем та технологій',
    specialtyCode: 'F6',
    degreeLevel: 'bachelor',
    name: 'Інтегровані інформаційні системи',
  },
  {
    departmentName: 'Кафедра інформаційних систем та технологій',
    specialtyCode: 'F6',
    degreeLevel: 'bachelor',
    name: 'Інформаційне забезпечення робототехнічних систем',
  },
  {
    departmentName: 'Кафедра інформаційних систем та технологій',
    specialtyCode: 'F6',
    degreeLevel: 'bachelor',
    name: 'Інформаційні управляючі системи та технології',
  },
  {
    departmentName: 'Кафедра інформаційних систем та технологій',
    specialtyCode: 'F6',
    degreeLevel: 'master',
    name: 'Інтегровані інформаційні системи',
  },
  {
    departmentName: 'Кафедра інформаційних систем та технологій',
    specialtyCode: 'F6',
    degreeLevel: 'master',
    name: 'Інформаційне забезпечення робототехнічних систем',
  },
  {
    departmentName: 'Кафедра інформаційних систем та технологій',
    specialtyCode: 'F6',
    degreeLevel: 'master',
    name: 'Інформаційні системи та технології',
  },
  {
    departmentName: 'Кафедра інформаційних систем та технологій',
    specialtyCode: 'F6',
    degreeLevel: 'master',
    name: 'Інформаційні управляючі системи та технології',
  },
  {
    departmentName: 'Кафедра інформаційних систем та технологій',
    specialtyCode: 'F6',
    degreeLevel: 'phd',
    name: 'Інформаційні системи та технології',
  },
  // Кафедра обчислювальної техніки (ОТ)
  {
    departmentName: 'Кафедра обчислювальної техніки',
    specialtyCode: 'F2',
    degreeLevel: 'bachelor',
    name: 'Інженерія програмного забезпечення компʼютерних систем',
  },
  {
    departmentName: 'Кафедра обчислювальної техніки',
    specialtyCode: 'F2',
    degreeLevel: 'master',
    name: 'Інженерія програмного забезпечення компʼютерних систем',
  },
  {
    departmentName: 'Кафедра обчислювальної техніки',
    specialtyCode: 'F2',
    degreeLevel: 'master',
    name: 'Інженерія програмного забезпечення компʼютерних систем (ОНП)',
  },
  {
    departmentName: 'Кафедра обчислювальної техніки',
    specialtyCode: 'F2',
    degreeLevel: 'phd',
    name: 'Інженерія програмного забезпечення',
  },
  {
    departmentName: 'Кафедра обчислювальної техніки',
    specialtyCode: 'F7',
    degreeLevel: 'bachelor',
    name: 'Компʼютерні системи та мережі',
  },
  {
    departmentName: 'Кафедра обчислювальної техніки',
    specialtyCode: 'F7',
    degreeLevel: 'master',
    name: 'Вбудовані системи штучного інтелекту',
  },
  {
    departmentName: 'Кафедра обчислювальної техніки',
    specialtyCode: 'F7',
    degreeLevel: 'master',
    name: 'Компʼютерні системи та мережі',
  },
  {
    departmentName: 'Кафедра обчислювальної техніки',
    specialtyCode: 'F7',
    degreeLevel: 'master',
    name: 'Компʼютерні системи та мережі (ОНП)',
  },
  {
    departmentName: 'Кафедра обчислювальної техніки',
    specialtyCode: 'F7',
    degreeLevel: 'phd',
    name: 'Компʼютерна інженерія',
  },

  // ======================== ФЛ — Факультет лінгвістики ========================
  // Кафедра англійської мови гуманітарного спрямування № 3 (КАМГС3) [загальноосвітня/базова кафедра — реалістичні dev-ОП]
  {
    departmentName: 'Кафедра англійської мови гуманітарного спрямування № 3',
    specialtyCode: 'B11',
    degreeLevel: 'bachelor',
    name: 'Прикладна лінгвістика та англійська мова у соціогуманітарній сфері',
  },
  {
    departmentName: 'Кафедра англійської мови гуманітарного спрямування № 3',
    specialtyCode: 'B11',
    degreeLevel: 'master',
    name: 'Професійна англомовна комунікація в гуманітарній сфері',
  },
  // Кафедра англійської мови технічного спрямування № 1 (КАМТС1) [загальноосвітня/базова кафедра — реалістичні dev-ОП]
  {
    departmentName: 'Кафедра англійської мови технічного спрямування № 1',
    specialtyCode: 'B11',
    degreeLevel: 'bachelor',
    name: 'Англійська мова та переклад у галузі інженерії й технологій',
  },
  {
    departmentName: 'Кафедра англійської мови технічного спрямування № 1',
    specialtyCode: 'B11',
    degreeLevel: 'master',
    name: 'Науково-технічна англомовна комунікація та термінознавство',
  },
  // Кафедра англійської мови технічного спрямування № 2 (КАМТС2) [загальноосвітня/базова кафедра — реалістичні dev-ОП]
  {
    departmentName: 'Кафедра англійської мови технічного спрямування № 2',
    specialtyCode: 'B11',
    degreeLevel: 'bachelor',
    name: 'Англійська мова та переклад у сфері інформаційних технологій',
  },
  {
    departmentName: 'Кафедра англійської мови технічного спрямування № 2',
    specialtyCode: 'B11',
    degreeLevel: 'master',
    name: 'Англомовна комунікація в ІТ та інженерному середовищі',
  },
  // Кафедра теорії, практики та перекладу англійської мови (КТППАМ)
  {
    departmentName: 'Кафедра теорії, практики та перекладу англійської мови',
    specialtyCode: 'A1',
    degreeLevel: 'phd',
    name: 'Сучасні науково-педагогічні студії',
  },
  {
    departmentName: 'Кафедра теорії, практики та перекладу англійської мови',
    specialtyCode: 'B11',
    degreeLevel: 'bachelor',
    name: 'Германські мови та літератури (переклад включно), перша – англійська',
  },
  {
    departmentName: 'Кафедра теорії, практики та перекладу англійської мови',
    specialtyCode: 'B11',
    degreeLevel: 'master',
    name: 'Галузевий переклад: англійська та друга західноєвропейська мови',
  },
  {
    departmentName: 'Кафедра теорії, практики та перекладу англійської мови',
    specialtyCode: 'B11',
    degreeLevel: 'phd',
    name: 'Філологія',
  },
  // Кафедра теорії, практики та перекладу німецької мови (КТППНМ)
  {
    departmentName: 'Кафедра теорії, практики та перекладу німецької мови',
    specialtyCode: 'B11',
    degreeLevel: 'bachelor',
    name: 'Германські мови та літератури (переклад включно), перша – німецька',
  },
  {
    departmentName: 'Кафедра теорії, практики та перекладу німецької мови',
    specialtyCode: 'B11',
    degreeLevel: 'master',
    name: 'Галузевий переклад: німецька та друга західноєвропейська мови',
  },
  {
    departmentName: 'Кафедра теорії, практики та перекладу німецької мови',
    specialtyCode: 'B11',
    degreeLevel: 'phd',
    name: 'Філологія',
  },
  // Кафедра теорії, практики та перекладу французької мови (КТППФМ)
  {
    departmentName: 'Кафедра теорії, практики та перекладу французької мови',
    specialtyCode: 'B11',
    degreeLevel: 'bachelor',
    name: 'Романські мови та літератури (переклад включно), перша – французька',
  },
  {
    departmentName: 'Кафедра теорії, практики та перекладу французької мови',
    specialtyCode: 'B11',
    degreeLevel: 'master',
    name: 'Галузевий переклад: французька та друга західноєвропейська мови',
  },
  {
    departmentName: 'Кафедра теорії, практики та перекладу французької мови',
    specialtyCode: 'B11',
    degreeLevel: 'phd',
    name: 'Філологія',
  },
  // Кафедра української мови, літератури та культури (КУМЛК) [загальноосвітня/базова кафедра — реалістичні dev-ОП]
  {
    departmentName: 'Кафедра української мови, літератури та культури',
    specialtyCode: 'B11',
    degreeLevel: 'bachelor',
    name: 'Українська мова, література та професійні комунікації',
  },
  {
    departmentName: 'Кафедра української мови, літератури та культури',
    specialtyCode: 'B11',
    degreeLevel: 'master',
    name: 'Українська філологія та академічна комунікація',
  },

  // ======================== ФММ — Факультет менеджменту та маркетингу ========================
  // Кафедра економіки і підприємництва (КЕП)
  {
    departmentName: 'Кафедра економіки і підприємництва',
    specialtyCode: 'C1',
    degreeLevel: 'bachelor',
    name: 'Економіка',
  },
  {
    departmentName: 'Кафедра економіки і підприємництва',
    specialtyCode: 'C1',
    degreeLevel: 'bachelor',
    name: 'Економіка і бізнес',
  },
  {
    departmentName: 'Кафедра економіки і підприємництва',
    specialtyCode: 'C1',
    degreeLevel: 'master',
    name: 'Економіка',
  },
  {
    departmentName: 'Кафедра економіки і підприємництва',
    specialtyCode: 'C1',
    degreeLevel: 'phd',
    name: 'Економіка',
  },
  {
    departmentName: 'Кафедра економіки і підприємництва',
    specialtyCode: 'D7',
    degreeLevel: 'bachelor',
    name: 'Комерція і торгівля',
  },
  // Кафедра економічної кібернетики (ЕК)
  {
    departmentName: 'Кафедра економічної кібернетики',
    specialtyCode: 'C1',
    degreeLevel: 'bachelor',
    name: 'Економічна аналітика',
  },
  {
    departmentName: 'Кафедра економічної кібернетики',
    specialtyCode: 'C1',
    degreeLevel: 'bachelor',
    name: 'Цифрова економіка та менеджмент',
  },
  {
    departmentName: 'Кафедра економічної кібернетики',
    specialtyCode: 'C1',
    degreeLevel: 'master',
    name: 'Економічна аналітика',
  },
  {
    departmentName: 'Кафедра економічної кібернетики',
    specialtyCode: 'C1',
    degreeLevel: 'phd',
    name: 'Економіка',
  },
  {
    departmentName: 'Кафедра економічної кібернетики',
    specialtyCode: 'D2',
    degreeLevel: 'bachelor',
    name: 'Управління фінансами',
  },
  {
    departmentName: 'Кафедра економічної кібернетики',
    specialtyCode: 'D2',
    degreeLevel: 'bachelor',
    name: 'Фінансовий менеджмент',
  },
  // Кафедра менеджменту підприємств (КМП)
  {
    departmentName: 'Кафедра менеджменту підприємств',
    specialtyCode: 'C1',
    degreeLevel: 'bachelor',
    name: 'Цифрова економіка та менеджмент',
  },
  {
    departmentName: 'Кафедра менеджменту підприємств',
    specialtyCode: 'D3',
    degreeLevel: 'bachelor',
    name: 'Менеджмент проєктів',
  },
  {
    departmentName: 'Кафедра менеджменту підприємств',
    specialtyCode: 'D3',
    degreeLevel: 'bachelor',
    name: 'Менеджмент та інженерія виробництва',
  },
  {
    departmentName: 'Кафедра менеджменту підприємств',
    specialtyCode: 'D3',
    degreeLevel: 'bachelor',
    name: 'Менеджмент і бізнес-адміністрування',
  },
  {
    departmentName: 'Кафедра менеджменту підприємств',
    specialtyCode: 'D3',
    degreeLevel: 'master',
    name: 'Менеджмент і бізнес-адміністрування',
  },
  {
    departmentName: 'Кафедра менеджменту підприємств',
    specialtyCode: 'D3',
    degreeLevel: 'phd',
    name: 'Менеджмент',
  },
  // Кафедра міжнародного бізнесу та логістики (МБЛ)
  {
    departmentName: 'Кафедра міжнародного бізнесу та логістики',
    specialtyCode: 'D3',
    degreeLevel: 'bachelor',
    name: 'Логістика',
  },
  {
    departmentName: 'Кафедра міжнародного бізнесу та логістики',
    specialtyCode: 'D3',
    degreeLevel: 'bachelor',
    name: 'Менеджмент міжнародного бізнесу',
  },
  {
    departmentName: 'Кафедра міжнародного бізнесу та логістики',
    specialtyCode: 'D3',
    degreeLevel: 'master',
    name: 'Логістика',
  },
  {
    departmentName: 'Кафедра міжнародного бізнесу та логістики',
    specialtyCode: 'D3',
    degreeLevel: 'master',
    name: 'Менеджмент міжнародного бізнесу',
  },
  {
    departmentName: 'Кафедра міжнародного бізнесу та логістики',
    specialtyCode: 'D3',
    degreeLevel: 'master',
    name: 'Менеджмент підприємств оборонно-промислового комплексу',
  },
  {
    departmentName: 'Кафедра міжнародного бізнесу та логістики',
    specialtyCode: 'D3',
    degreeLevel: 'phd',
    name: 'Менеджмент',
  },
  // Кафедра міжнародної економіки (МЕ)
  {
    departmentName: 'Кафедра міжнародної економіки',
    specialtyCode: 'C1',
    degreeLevel: 'bachelor',
    name: 'Міжнародна економіка',
  },
  {
    departmentName: 'Кафедра міжнародної економіки',
    specialtyCode: 'C1',
    degreeLevel: 'master',
    name: 'Міжнародна економіка',
  },
  {
    departmentName: 'Кафедра міжнародної економіки',
    specialtyCode: 'C1',
    degreeLevel: 'phd',
    name: 'Економіка',
  },
  // Кафедра промислового маркетингу (ПМ)
  {
    departmentName: 'Кафедра промислового маркетингу',
    specialtyCode: 'D5',
    degreeLevel: 'bachelor',
    name: 'Промисловий маркетинг',
  },
  {
    departmentName: 'Кафедра промислового маркетингу',
    specialtyCode: 'D5',
    degreeLevel: 'bachelor',
    name: 'Цифровий маркетинг',
  },
  {
    departmentName: 'Кафедра промислового маркетингу',
    specialtyCode: 'D5',
    degreeLevel: 'master',
    name: 'Промисловий маркетинг',
  },
  {
    departmentName: 'Кафедра промислового маркетингу',
    specialtyCode: 'D5',
    degreeLevel: 'phd',
    name: 'Маркетинг',
  },

  // ======================== ФМФ — Фізико-математичний факультет ========================
  // Кафедра загальної фізики (КЗФ)
  {
    departmentName: 'Кафедра загальної фізики',
    specialtyCode: 'E5',
    degreeLevel: 'phd',
    name: 'Фізика',
  },
  // Кафедра загальної фізики та моделювання фізичних процесів (ЗФМФП)
  {
    departmentName: 'Кафедра загальної фізики та моделювання фізичних процесів',
    specialtyCode: 'E5',
    degreeLevel: 'bachelor',
    name: 'Компʼютерне моделювання фізичних процесів',
  },
  {
    departmentName: 'Кафедра загальної фізики та моделювання фізичних процесів',
    specialtyCode: 'E5',
    degreeLevel: 'bachelor',
    name: 'Моделювання фізичних процесів',
  },
  {
    departmentName: 'Кафедра загальної фізики та моделювання фізичних процесів',
    specialtyCode: 'E5',
    degreeLevel: 'master',
    name: 'Моделювання фізичних процесів',
  },
  {
    departmentName: 'Кафедра загальної фізики та моделювання фізичних процесів',
    specialtyCode: 'E5',
    degreeLevel: 'phd',
    name: 'Фізика',
  },
  // Кафедра математичного аналізу та теорії ймовірностей (МАтаТЙ)
  {
    departmentName: 'Кафедра математичного аналізу та теорії ймовірностей',
    specialtyCode: 'E7',
    degreeLevel: 'bachelor',
    name: 'Страхова та фінансова математика',
  },
  {
    departmentName: 'Кафедра математичного аналізу та теорії ймовірностей',
    specialtyCode: 'E7',
    degreeLevel: 'master',
    name: 'Страхова та фінансова математика',
  },
  {
    departmentName: 'Кафедра математичного аналізу та теорії ймовірностей',
    specialtyCode: 'E7',
    degreeLevel: 'master',
    name: 'Страхова та фінансова математика (ОНП)',
  },
  {
    departmentName: 'Кафедра математичного аналізу та теорії ймовірностей',
    specialtyCode: 'E7',
    degreeLevel: 'phd',
    name: 'Математика',
  },
  // Кафедра математичної фізики та диференціальних рівнянь (КМФ та ДР) [офіційні ОП КПІ попередніх редакцій]
  {
    departmentName: 'Кафедра математичної фізики та диференціальних рівнянь',
    specialtyCode: 'E7',
    degreeLevel: 'bachelor',
    name: 'Математичні та компʼютерні методи в моделюванні динамічних систем',
  },
  {
    departmentName: 'Кафедра математичної фізики та диференціальних рівнянь',
    specialtyCode: 'E7',
    degreeLevel: 'master',
    name: 'Математичні та компʼютерні методи в моделюванні динамічних систем',
  },
  {
    departmentName: 'Кафедра математичної фізики та диференціальних рівнянь',
    specialtyCode: 'E7',
    degreeLevel: 'phd',
    name: 'Математичні та компʼютерні методи в моделюванні динамічних систем',
  },
  // Кафедра нарисної геометрії, інженерної та компʼютерної графіки (НГІтаКГ)
  {
    departmentName: 'Кафедра нарисної геометрії, інженерної та компʼютерної графіки',
    specialtyCode: 'F3',
    degreeLevel: 'phd',
    name: 'Компʼютерні науки',
  },
  {
    departmentName: 'Кафедра нарисної геометрії, інженерної та компʼютерної графіки',
    specialtyCode: 'G9',
    degreeLevel: 'phd',
    name: 'Прикладна механіка',
  },

  // ======================== ФПСПМ — Факультет програмних систем та прикладної математики ========================
  // Кафедра прикладної математики (ПМА)
  {
    departmentName: 'Кафедра прикладної математики',
    specialtyCode: 'F1',
    degreeLevel: 'bachelor',
    name: 'Машинне навчання та математичне моделювання',
  },
  {
    departmentName: 'Кафедра прикладної математики',
    specialtyCode: 'F1',
    degreeLevel: 'bachelor',
    name: 'Наука про дані та математичне моделювання',
  },
  {
    departmentName: 'Кафедра прикладної математики',
    specialtyCode: 'F1',
    degreeLevel: 'master',
    name: 'Машинне навчання та математичне моделювання',
  },
  {
    departmentName: 'Кафедра прикладної математики',
    specialtyCode: 'F1',
    degreeLevel: 'master',
    name: 'Машинне навчання та математичне моделювання (ОНП)',
  },
  {
    departmentName: 'Кафедра прикладної математики',
    specialtyCode: 'F1',
    degreeLevel: 'phd',
    name: 'Прикладна математика',
  },
  // Кафедра програмного забезпечення компʼютерних систем (ПЗКС)
  {
    departmentName: 'Кафедра програмного забезпечення компʼютерних систем',
    specialtyCode: 'F2',
    degreeLevel: 'bachelor',
    name: 'Інженерія програмного забезпечення мультимедійних систем та смарттехнологій',
  },
  {
    departmentName: 'Кафедра програмного забезпечення компʼютерних систем',
    specialtyCode: 'F2',
    degreeLevel: 'bachelor',
    name: 'Інженерія програмного забезпечення мультимедійних та інформаційно-пошукових систем',
  },
  {
    departmentName: 'Кафедра програмного забезпечення компʼютерних систем',
    specialtyCode: 'F2',
    degreeLevel: 'master',
    name: 'Інженерія програмного забезпечення мультимедійних систем та смарттехнологій',
  },
  {
    departmentName: 'Кафедра програмного забезпечення компʼютерних систем',
    specialtyCode: 'F2',
    degreeLevel: 'master',
    name: 'Інженерія програмного забезпечення мультимедійних та інформаційно-пошукових систем',
  },
  {
    departmentName: 'Кафедра програмного забезпечення компʼютерних систем',
    specialtyCode: 'F2',
    degreeLevel: 'master',
    name: 'Інженерія програмного забезпечення мультимедійних та інформаційно-пошукових систем (ОНП)',
  },
  {
    departmentName: 'Кафедра програмного забезпечення компʼютерних систем',
    specialtyCode: 'F2',
    degreeLevel: 'master',
    name: 'Інженерія програмного забезпечення імерсивних систем та платформ цифрових двійників',
  },
  {
    departmentName: 'Кафедра програмного забезпечення компʼютерних систем',
    specialtyCode: 'F2',
    degreeLevel: 'phd',
    name: 'Інженерія програмного забезпечення',
  },
  // Кафедра системного програмування і спеціалізованих компʼютерних систем (СПСКС)
  {
    departmentName: 'Кафедра системного програмування і спеціалізованих компʼютерних систем',
    specialtyCode: 'F7',
    degreeLevel: 'bachelor',
    name: 'Системне програмування та спеціалізовані компʼютерні системи',
  },
  {
    departmentName: 'Кафедра системного програмування і спеціалізованих компʼютерних систем',
    specialtyCode: 'F7',
    degreeLevel: 'master',
    name: 'Системне програмування та спеціалізовані компʼютерні системи',
  },
  {
    departmentName: 'Кафедра системного програмування і спеціалізованих компʼютерних систем',
    specialtyCode: 'F7',
    degreeLevel: 'master',
    name: 'Системне програмування та спеціалізовані компʼютерні системи (ОНП)',
  },
  {
    departmentName: 'Кафедра системного програмування і спеціалізованих компʼютерних систем',
    specialtyCode: 'F7',
    degreeLevel: 'phd',
    name: 'Компʼютерна інженерія',
  },

  // ======================== ФРП — Факультет робототехніки та приладобудування ========================
  // Кафедра автоматизації та систем неруйнівного контролю (АСНК)
  {
    departmentName: 'Кафедра автоматизації та систем неруйнівного контролю',
    specialtyCode: 'G7',
    degreeLevel: 'bachelor',
    name: 'Компʼютерно-інтегровані системи та технології в приладобудуванні',
  },
  {
    departmentName: 'Кафедра автоматизації та систем неруйнівного контролю',
    specialtyCode: 'G7',
    degreeLevel: 'bachelor',
    name: 'Компʼютерно-інтегровані технології та робототехніка',
  },
  {
    departmentName: 'Кафедра автоматизації та систем неруйнівного контролю',
    specialtyCode: 'G7',
    degreeLevel: 'master',
    name: 'Автоматизація та компʼютерно-інтегровані технології',
  },
  {
    departmentName: 'Кафедра автоматизації та систем неруйнівного контролю',
    specialtyCode: 'G7',
    degreeLevel: 'master',
    name: 'Компʼютерно-інтегровані технології та робототехніка',
  },
  {
    departmentName: 'Кафедра автоматизації та систем неруйнівного контролю',
    specialtyCode: 'G7',
    degreeLevel: 'phd',
    name: 'Автоматизація та компʼютерно-інтегровані технології',
  },
  // Кафедра інформаційно-вимірювальних технологій (ІВТ)
  {
    departmentName: 'Кафедра інформаційно-вимірювальних технологій',
    specialtyCode: 'G6',
    degreeLevel: 'bachelor',
    name: 'Інформаційні вимірювальні технології',
  },
  {
    departmentName: 'Кафедра інформаційно-вимірювальних технологій',
    specialtyCode: 'G6',
    degreeLevel: 'bachelor',
    name: 'Інформаційні вимірювальні технології для гнучких роботизованих систем',
  },
  {
    departmentName: 'Кафедра інформаційно-вимірювальних технологій',
    specialtyCode: 'G6',
    degreeLevel: 'master',
    name: 'Інформаційні вимірювальні технології',
  },
  {
    departmentName: 'Кафедра інформаційно-вимірювальних технологій',
    specialtyCode: 'G6',
    degreeLevel: 'phd',
    name: 'Метрологія та інформаційно-вимірювальна техніка',
  },
  // Кафедра компʼютерно-інтегрованих оптичних та навігаційних систем (КІОНС)
  {
    departmentName: 'Кафедра компʼютерно-інтегрованих оптичних та навігаційних систем',
    specialtyCode: 'G7',
    degreeLevel: 'bachelor',
    name: 'Компʼютерно-інтегровані системи та технології в приладобудуванні',
  },
  {
    departmentName: 'Кафедра компʼютерно-інтегрованих оптичних та навігаційних систем',
    specialtyCode: 'G7',
    degreeLevel: 'bachelor',
    name: 'Компʼютерно-інтегровані технології та робототехніка',
  },
  {
    departmentName: 'Кафедра компʼютерно-інтегрованих оптичних та навігаційних систем',
    specialtyCode: 'G7',
    degreeLevel: 'master',
    name: 'Автоматизація та компʼютерно-інтегровані технології',
  },
  {
    departmentName: 'Кафедра компʼютерно-інтегрованих оптичних та навігаційних систем',
    specialtyCode: 'G7',
    degreeLevel: 'master',
    name: 'Компʼютерно-інтегровані технології та робототехніка',
  },
  {
    departmentName: 'Кафедра компʼютерно-інтегрованих оптичних та навігаційних систем',
    specialtyCode: 'G7',
    degreeLevel: 'phd',
    name: 'Автоматизація та компʼютерно-інтегровані технології',
  },
  // Кафедра компʼютерно-інтегрованих технологій виробництва приладів (КІТВП)
  {
    departmentName: 'Кафедра компʼютерно-інтегрованих технологій виробництва приладів',
    specialtyCode: 'G7',
    degreeLevel: 'bachelor',
    name: 'Компʼютерний зір роботів',
  },
  {
    departmentName: 'Кафедра компʼютерно-інтегрованих технологій виробництва приладів',
    specialtyCode: 'G7',
    degreeLevel: 'bachelor',
    name: 'Компʼютерно-інтегровані системи та технології в приладобудуванні',
  },
  {
    departmentName: 'Кафедра компʼютерно-інтегрованих технологій виробництва приладів',
    specialtyCode: 'G7',
    degreeLevel: 'bachelor',
    name: 'Компʼютерно-інтегровані технології та робототехніка',
  },
  {
    departmentName: 'Кафедра компʼютерно-інтегрованих технологій виробництва приладів',
    specialtyCode: 'G7',
    degreeLevel: 'master',
    name: 'Автоматизація та компʼютерно-інтегровані технології',
  },
  {
    departmentName: 'Кафедра компʼютерно-інтегрованих технологій виробництва приладів',
    specialtyCode: 'G7',
    degreeLevel: 'master',
    name: 'Компʼютерно-інтегровані технології та робототехніка',
  },
  {
    departmentName: 'Кафедра компʼютерно-інтегрованих технологій виробництва приладів',
    specialtyCode: 'G7',
    degreeLevel: 'phd',
    name: 'Автоматизація та компʼютерно-інтегровані технології',
  },

  // ======================== ФСП — Факультет соціології і права ========================
  // Кафедра інтелектуальної власності та приватного права (ІВПП)
  {
    departmentName: 'Кафедра інтелектуальної власності та приватного права',
    specialtyCode: 'D8',
    degreeLevel: 'bachelor',
    name: 'Право',
  },
  {
    departmentName: 'Кафедра інтелектуальної власності та приватного права',
    specialtyCode: 'D8',
    degreeLevel: 'master',
    name: 'Інформаційне право та право інтелектуальної власності',
  },
  {
    departmentName: 'Кафедра інтелектуальної власності та приватного права',
    specialtyCode: 'D8',
    degreeLevel: 'phd',
    name: 'Право',
  },
  // Кафедра інформаційного, господарського та адміністративного права (КІГАП)
  {
    departmentName: 'Кафедра інформаційного, господарського та адміністративного права',
    specialtyCode: 'D8',
    degreeLevel: 'bachelor',
    name: 'Господарське та адміністративне право і процес',
  },
  {
    departmentName: 'Кафедра інформаційного, господарського та адміністративного права',
    specialtyCode: 'D8',
    degreeLevel: 'bachelor',
    name: 'Право',
  },
  {
    departmentName: 'Кафедра інформаційного, господарського та адміністративного права',
    specialtyCode: 'D8',
    degreeLevel: 'master',
    name: 'Господарське та адміністративне право і процес',
  },
  {
    departmentName: 'Кафедра інформаційного, господарського та адміністративного права',
    specialtyCode: 'D8',
    degreeLevel: 'phd',
    name: 'Право',
  },
  // Кафедра історії (КІ)
  {
    departmentName: 'Кафедра історії',
    specialtyCode: 'B9',
    degreeLevel: 'master',
    name: 'Європейські студії',
  },
  {
    departmentName: 'Кафедра історії',
    specialtyCode: 'B9',
    degreeLevel: 'phd',
    name: 'Історія',
  },
  // Кафедра психології і педагогіки (КПП)
  {
    departmentName: 'Кафедра психології і педагогіки',
    specialtyCode: 'C4',
    degreeLevel: 'bachelor',
    name: 'Прикладна психологія',
  },
  {
    departmentName: 'Кафедра психології і педагогіки',
    specialtyCode: 'C4',
    degreeLevel: 'master',
    name: 'Психологія',
  },
  {
    departmentName: 'Кафедра психології і педагогіки',
    specialtyCode: 'C4',
    degreeLevel: 'phd',
    name: 'Психологія',
  },
  // Кафедра соціології (КС)
  {
    departmentName: 'Кафедра соціології',
    specialtyCode: 'C5',
    degreeLevel: 'bachelor',
    name: 'Врегулювання конфліктів та медіація',
  },
  {
    departmentName: 'Кафедра соціології',
    specialtyCode: 'C5',
    degreeLevel: 'master',
    name: 'Аналітика соціальних даних',
  },
  {
    departmentName: 'Кафедра соціології',
    specialtyCode: 'C5',
    degreeLevel: 'master',
    name: 'Врегулювання конфліктів та медіація',
  },
  {
    departmentName: 'Кафедра соціології',
    specialtyCode: 'C5',
    degreeLevel: 'phd',
    name: 'Соціологія',
  },
  // Кафедра теорії та практики управління (ТПУ)
  {
    departmentName: 'Кафедра теорії та практики управління',
    specialtyCode: 'C3',
    degreeLevel: 'bachelor',
    name: 'Міжнародні відносини та цифрова дипломатія',
  },
  {
    departmentName: 'Кафедра теорії та практики управління',
    specialtyCode: 'D4',
    degreeLevel: 'bachelor',
    name: 'Адміністративний менеджмент',
  },
  {
    departmentName: 'Кафедра теорії та практики управління',
    specialtyCode: 'D4',
    degreeLevel: 'bachelor',
    name: 'Публічне управління та адміністрування',
  },
  {
    departmentName: 'Кафедра теорії та практики управління',
    specialtyCode: 'D4',
    degreeLevel: 'master',
    name: 'Публічне адміністрування та електронне урядування',
  },
  {
    departmentName: 'Кафедра теорії та практики управління',
    specialtyCode: 'D4',
    degreeLevel: 'phd',
    name: 'Публічне управління та адміністрування',
  },
  // Кафедра філософії (КФ)
  {
    departmentName: 'Кафедра філософії',
    specialtyCode: 'B10',
    degreeLevel: 'phd',
    name: 'Філософія',
  },
  {
    departmentName: 'Кафедра філософії',
    specialtyCode: 'B9',
    degreeLevel: 'master',
    name: 'Європейські студії',
  },
  {
    departmentName: 'Кафедра філософії',
    specialtyCode: 'I10',
    degreeLevel: 'bachelor',
    name: 'Міжнародні соціальні проєкти та волонтерська діяльність',
  },
  {
    departmentName: 'Кафедра філософії',
    specialtyCode: 'I10',
    degreeLevel: 'master',
    name: 'Міжнародні соціальні проєкти та волонтерська діяльність',
  },
  {
    departmentName: 'Кафедра філософії',
    specialtyCode: 'I10',
    degreeLevel: 'phd',
    name: 'Соціальна робота',
  },

  // ======================== ХТФ — Хіміко-технологічний факультет ========================
  // Кафедра загальної та неорганічної хімії (ЗНХ) [загальноосвітня/базова кафедра — реалістичні dev-ОП]
  {
    departmentName: 'Кафедра загальної та неорганічної хімії',
    specialtyCode: 'E3',
    degreeLevel: 'bachelor',
    name: 'Загальна та неорганічна хімія',
  },
  {
    departmentName: 'Кафедра загальної та неорганічної хімії',
    specialtyCode: 'E3',
    degreeLevel: 'master',
    name: 'Хімія неорганічних сполук та функціональних матеріалів',
  },
  // Кафедра органічної хімії та технології органічних речовин (ОХТОР)
  {
    departmentName: 'Кафедра органічної хімії та технології органічних речовин',
    specialtyCode: 'G1',
    degreeLevel: 'bachelor',
    name: 'Хімічні технології та інженерія',
  },
  {
    departmentName: 'Кафедра органічної хімії та технології органічних речовин',
    specialtyCode: 'G1',
    degreeLevel: 'master',
    name: 'Хімічні технології синтезу та фізико-хімічні властивості органічних матеріалів',
  },
  {
    departmentName: 'Кафедра органічної хімії та технології органічних речовин',
    specialtyCode: 'G1',
    degreeLevel: 'master',
    name: 'Хімічні технології та інженерія',
  },
  {
    departmentName: 'Кафедра органічної хімії та технології органічних речовин',
    specialtyCode: 'G1',
    degreeLevel: 'phd',
    name: 'Хімічні технології та інженерія',
  },
  // Кафедра технології електрохімічних виробництв (ТЕХВ)
  {
    departmentName: 'Кафедра технології електрохімічних виробництв',
    specialtyCode: 'G1',
    degreeLevel: 'bachelor',
    name: 'Хімічні технології та інженерія',
  },
  {
    departmentName: 'Кафедра технології електрохімічних виробництв',
    specialtyCode: 'G1',
    degreeLevel: 'master',
    name: 'Хімічні технології неорганічних, електродних матеріалів та водоочищення',
  },
  {
    departmentName: 'Кафедра технології електрохімічних виробництв',
    specialtyCode: 'G1',
    degreeLevel: 'master',
    name: 'Хімічні технології та інженерія',
  },
  {
    departmentName: 'Кафедра технології електрохімічних виробництв',
    specialtyCode: 'G1',
    degreeLevel: 'phd',
    name: 'Хімічні технології та інженерія',
  },
  // Кафедра технології неорганічних речовин, водоочищення та загальної хімічної технології (ТНР, В та ЗХТ)
  {
    departmentName: 'Кафедра технології неорганічних речовин, водоочищення та загальної хімічної технології',
    specialtyCode: 'G1',
    degreeLevel: 'bachelor',
    name: 'Хімічні технології та інженерія',
  },
  {
    departmentName: 'Кафедра технології неорганічних речовин, водоочищення та загальної хімічної технології',
    specialtyCode: 'G1',
    degreeLevel: 'master',
    name: 'Хімічні технології неорганічних, електродних матеріалів та водоочищення',
  },
  {
    departmentName: 'Кафедра технології неорганічних речовин, водоочищення та загальної хімічної технології',
    specialtyCode: 'G1',
    degreeLevel: 'master',
    name: 'Хімічні технології та інженерія',
  },
  {
    departmentName: 'Кафедра технології неорганічних речовин, водоочищення та загальної хімічної технології',
    specialtyCode: 'G1',
    degreeLevel: 'phd',
    name: 'Хімічні технології та інженерія',
  },
  // Кафедра фізичної хімії (ФХ)
  {
    departmentName: 'Кафедра фізичної хімії',
    specialtyCode: 'G1',
    degreeLevel: 'bachelor',
    name: 'Хімічні технології та інженерія',
  },
  {
    departmentName: 'Кафедра фізичної хімії',
    specialtyCode: 'G1',
    degreeLevel: 'master',
    name: 'Хімічні технології синтезу та фізико-хімічні властивості органічних матеріалів',
  },
  {
    departmentName: 'Кафедра фізичної хімії',
    specialtyCode: 'G1',
    degreeLevel: 'master',
    name: 'Хімічні технології та інженерія',
  },
  {
    departmentName: 'Кафедра фізичної хімії',
    specialtyCode: 'G1',
    degreeLevel: 'phd',
    name: 'Хімічні технології та інженерія',
  },
  // Кафедра хімічної технології кераміки та скла (ХТКС)
  {
    departmentName: 'Кафедра хімічної технології кераміки та скла',
    specialtyCode: 'G1',
    degreeLevel: 'bachelor',
    name: 'Хімічні технології та інженерія',
  },
  {
    departmentName: 'Кафедра хімічної технології кераміки та скла',
    specialtyCode: 'G1',
    degreeLevel: 'master',
    name: 'Хімічні технології неорганічних вʼяжучих речовин, кераміки, скла та полімерних і композиційних матеріалів',
  },
  {
    departmentName: 'Кафедра хімічної технології кераміки та скла',
    specialtyCode: 'G1',
    degreeLevel: 'master',
    name: 'Хімічні технології та інженерія',
  },
  {
    departmentName: 'Кафедра хімічної технології кераміки та скла',
    specialtyCode: 'G1',
    degreeLevel: 'phd',
    name: 'Хімічні технології та інженерія',
  },
  // Кафедра хімічної технології композиційних матеріалів (ХТКМ)
  {
    departmentName: 'Кафедра хімічної технології композиційних матеріалів',
    specialtyCode: 'G1',
    degreeLevel: 'bachelor',
    name: 'Хімічні технології та інженерія',
  },
  {
    departmentName: 'Кафедра хімічної технології композиційних матеріалів',
    specialtyCode: 'G1',
    degreeLevel: 'master',
    name: 'Хімічні технології неорганічних вʼяжучих речовин, кераміки, скла та полімерних і композиційних матеріалів',
  },
  {
    departmentName: 'Кафедра хімічної технології композиційних матеріалів',
    specialtyCode: 'G1',
    degreeLevel: 'master',
    name: 'Хімічні технології та інженерія',
  },
  {
    departmentName: 'Кафедра хімічної технології композиційних матеріалів',
    specialtyCode: 'G1',
    degreeLevel: 'phd',
    name: 'Хімічні технології та інженерія',
  },
];

// Демонстраційна історична пара (перейменування ОП із збереженням правонаступництва)
export const DEV_REPLACED_PROGRAM_PAIRS: readonly SeedReplacedPairDef[] = [
  {
    departmentName: 'Кафедра інформаційних систем та технологій',
    specialtyCode: 'F6',
    degreeLevel: 'bachelor',
    oldName: 'Інтегровані інформаційні системи (архівна редакція)',
    newName: 'Інформаційні управляючі системи та технології',
    reason: 'Оновлення та обʼєднання освітньої програми рішенням Вченої ради',
  },
];
