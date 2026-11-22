import type { OrgUnitType } from '../org-units/org-units.types.js';

export interface SeedOrgUnitNode {
  unitType: OrgUnitType;
  name: string;
  shortName: string | null;
  children?: SeedOrgUnitNode[];
}

/**
 * Актуальна організаційна структура НТУУ «КПІ ім. Ігоря Сікорського» (станом на 2026 рік):
 * 1 університет, 10 інститутів, 14 факультетів та їхні кафедри.
 */
export const KPI_ORG_STRUCTURE: SeedOrgUnitNode = {
  unitType: 'university',
  name: 'Національний технічний університет України «Київський політехнічний інститут імені Ігоря Сікорського»',
  shortName: 'КПІ ім. Ігоря Сікорського',
  children: [
    // ======================== НАВЧАЛЬНО-НАУКОВІ ІНСТИТУТИ (10) ========================
    {
      unitType: 'institute',
      name: 'Навчально-науковий видавничо-поліграфічний інститут',
      shortName: 'НН ВПІ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра видавничої справи і редагування',
          shortName: 'ВСР',
        },
        {
          unitType: 'department',
          name: 'Кафедра графіки',
          shortName: 'КГ',
        },
        {
          unitType: 'department',
          name: 'Кафедра машин і агрегатів поліграфічного виробництва',
          shortName: 'МАПВ',
        },
        {
          unitType: 'department',
          name: 'Кафедра репрографії',
          shortName: 'КР',
        },
        {
          unitType: 'department',
          name: 'Кафедра технології поліграфічного виробництва',
          shortName: 'ТПВ',
        },
      ],
    },
    {
      unitType: 'institute',
      name: 'Навчально-науковий інститут аерокосмічних технологій',
      shortName: 'НН ІАТ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра авіа- та ракетобудування',
          shortName: 'АРБ',
        },
        {
          unitType: 'department',
          name: 'Кафедра космічної інженерії',
          shortName: 'ККІ',
        },
        {
          unitType: 'department',
          name: 'Кафедра систем керування літальними апаратами',
          shortName: 'СКЛА',
        },
      ],
    },
    {
      unitType: 'institute',
      name: 'Навчально-науковий інститут атомної та теплової енергетики',
      shortName: 'НН ІАТЕ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра автоматизації енергетичних процесів',
          shortName: 'АЕП',
        },
        {
          unitType: 'department',
          name: 'Кафедра атомної енергетики',
          shortName: 'АЕ',
        },
        {
          unitType: 'department',
          name: 'Кафедра інженерії програмного забезпечення в енергетиці',
          shortName: 'ІПЗЕ',
        },
        {
          unitType: 'department',
          name: 'Кафедра теплової та альтернативної енергетики',
          shortName: 'ТАЕ',
        },
        {
          unitType: 'department',
          name: 'Кафедра цифрових технологій в енергетиці',
          shortName: 'ЦТЕ',
        },
      ],
    },
    {
      unitType: 'institute',
      name: 'Навчально-науковий інститут енергозбереження та енергоменеджменту',
      shortName: 'НН ІЕЕ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра автоматизації електротехнічних та мехатронних комплексів',
          shortName: 'АЕМК',
        },
        {
          unitType: 'department',
          name: 'Кафедра геоінженерії',
          shortName: 'ГІ',
        },
        {
          unitType: 'department',
          name: 'Кафедра електропостачання',
          shortName: 'ЕП',
        },
        {
          unitType: 'department',
          name: 'Кафедра охорони праці, промислової та цивільної безпеки',
          shortName: 'ОППЦБ',
        },
      ],
    },
    {
      unitType: 'institute',
      name: 'Навчально-науковий інститут матеріалознавства та зварювання ім. Є.О. Патона',
      shortName: 'НН ІМЗ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра високотемпературних матеріалів та порошкової металургії',
          shortName: 'ВТМПМ',
        },
        {
          unitType: 'department',
          name: 'Кафедра зварювального виробництва',
          shortName: 'ЗВ',
        },
        {
          unitType: 'department',
          name: 'Кафедра лазерної техніки та фізико-технічних технологій',
          shortName: 'ЛТФТТ',
        },
        {
          unitType: 'department',
          name: 'Кафедра ливарного виробництва',
          shortName: 'ЛВ',
        },
        {
          unitType: 'department',
          name: 'Кафедра фізичного матеріалознавства та термічної обробки',
          shortName: 'ФМТО',
        },
      ],
    },
    {
      unitType: 'institute',
      name: 'Навчально-науковий інститут прикладного системного аналізу',
      shortName: 'НН ІПСА',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра математичних методів системного аналізу',
          shortName: 'ММСА',
        },
        {
          unitType: 'department',
          name: 'Кафедра системного проектування',
          shortName: 'СП',
        },
        {
          unitType: 'department',
          name: 'Кафедра штучного інтелекту',
          shortName: 'ШІ',
        },
      ],
    },
    {
      unitType: 'institute',
      name: 'Навчально-науковий інститут телекомунікаційних систем',
      shortName: 'НН ІТС',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра електронних комунікацій та Інтернету речей',
          shortName: 'ЕКІР',
        },
        {
          unitType: 'department',
          name: 'Кафедра інформаційних технологій в телекомунікаціях',
          shortName: 'ІТТ',
        },
        {
          unitType: 'department',
          name: 'Кафедра телекомунікацій',
          shortName: 'ТК',
        },
      ],
    },
    {
      unitType: 'institute',
      name: 'Навчально-науковий механіко-машинобудівний інститут',
      shortName: 'НН ММІ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра динаміки і міцності машин та опору матеріалів',
          shortName: 'ДММОМ',
        },
        {
          unitType: 'department',
          name: 'Кафедра конструювання машин',
          shortName: 'КМ',
        },
        {
          unitType: 'department',
          name: 'Кафедра прикладної гідроаеромеханіки і механотроніки',
          shortName: 'ПГМ',
        },
        {
          unitType: 'department',
          name: 'Кафедра робототехніки',
          shortName: 'КРТ',
        },
        {
          unitType: 'department',
          name: 'Кафедра технології виробництва літальних апаратів',
          shortName: 'ТВЛА',
        },
        {
          unitType: 'department',
          name: 'Кафедра технології машинобудування',
          shortName: 'ТМММІ',
        },
      ],
    },
    {
      unitType: 'institute',
      name: 'Навчально-науковий фізико-технічний інститут',
      shortName: 'НН ФТІ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра інформаційної безпеки',
          shortName: 'ІБ',
        },
        {
          unitType: 'department',
          name: 'Кафедра математичних методів захисту інформації',
          shortName: 'ММЗІ',
        },
        {
          unitType: 'department',
          name: 'Кафедра математичного моделювання та аналізу даних',
          shortName: 'ММАД',
        },
        {
          unitType: 'department',
          name: 'Кафедра прикладної фізики',
          shortName: 'ПФ',
        },
      ],
    },
    {
      unitType: 'institute',
      name: 'Інститут спеціального звʼязку та захисту інформації',
      shortName: 'ІСЗЗІ',
      children: [
        {
          unitType: 'department',
          name: 'Спеціальна кафедра № 1 (Кіберзахисту та безпеки спеціального звʼязку)',
          shortName: 'СК № 1',
        },
        {
          unitType: 'department',
          name: 'Спеціальна кафедра № 2 (Лідерства та управління у військовій сфері)',
          shortName: 'СК № 2',
        },
        {
          unitType: 'department',
          name: 'Спеціальна кафедра № 3 (Інтелектуальних електронних комунікацій системи спеціального звʼязку)',
          shortName: 'СК № 3',
        },
        {
          unitType: 'department',
          name: 'Спеціальна кафедра № 4 (Соціальних наук і стратегічних комунікацій)',
          shortName: 'СК № 4',
        },
        {
          unitType: 'department',
          name: 'Спеціальна кафедра № 5 (Компʼютерних наук та технологій штучного інтелекту в сфері кібербезпеки)',
          shortName: 'СК № 5',
        },
      ],
    },

    // ======================== ФАКУЛЬТЕТИ (14) ========================
    {
      unitType: 'faculty',
      name: 'Радіотехнічний факультет',
      shortName: 'РТФ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра прикладної радіоелектроніки',
          shortName: 'РЕ',
        },
        {
          unitType: 'department',
          name: 'Кафедра радіоінженерії',
          shortName: 'РІ',
        },
        {
          unitType: 'department',
          name: 'Кафедра радіотехнічних систем',
          shortName: 'РТС',
        },
      ],
    },
    {
      unitType: 'faculty',
      name: 'Факультет автоматизації, промислової інженерії та екології',
      shortName: 'ФАПІЕ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра екології та технології рослинних полімерів',
          shortName: 'ЕТРП',
        },
        {
          unitType: 'department',
          name: 'Кафедра машин та апаратів хімічних і нафтопереробних виробництв',
          shortName: 'МАХНВ',
        },
        {
          unitType: 'department',
          name: 'Кафедра технічних та програмних засобів автоматизації',
          shortName: 'ТПЗА',
        },
        {
          unitType: 'department',
          name: 'Кафедра хімічного, полімерного і силікатного машинобудування',
          shortName: 'ХПСМ',
        },
      ],
    },
    {
      unitType: 'faculty',
      name: 'Факультет біомедичної інженерії',
      shortName: 'ФБМІ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра біобезпеки і здоровʼя людини',
          shortName: 'ББЗЛ',
        },
        {
          unitType: 'department',
          name: 'Кафедра біомедичної інженерії',
          shortName: 'БМІ',
        },
        {
          unitType: 'department',
          name: 'Кафедра біомедичної кібернетики',
          shortName: 'БМК',
        },
        {
          unitType: 'department',
          name: 'Кафедра технологій оздоровлення і спорту',
          shortName: 'КТОС',
        },
        {
          unitType: 'department',
          name: 'Кафедра трансляційної медичної біоінженерії',
          shortName: 'ТМБ',
        },
      ],
    },
    {
      unitType: 'faculty',
      name: 'Факультет біотехнології і біотехніки',
      shortName: 'ФБТ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра біоенергетики, біоінформатики та екобіотехнології',
          shortName: 'КББЕ',
        },
        {
          unitType: 'department',
          name: 'Кафедра біотехніки та інженерії',
          shortName: 'БТІ',
        },
        {
          unitType: 'department',
          name: 'Кафедра промислової біотехнології та біофармації',
          shortName: 'ПБТБ',
        },
      ],
    },
    {
      unitType: 'faculty',
      name: 'Факультет електроенерготехніки та автоматики',
      shortName: 'ФЕА',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра автоматизації електромеханічних систем та електроприводу',
          shortName: 'АЕМСЕП',
        },
        {
          unitType: 'department',
          name: 'Кафедра автоматизації енергосистем',
          shortName: 'АЕ',
        },
        {
          unitType: 'department',
          name: 'Кафедра відновлюваних джерел енергії',
          shortName: 'ВДЕ',
        },
        {
          unitType: 'department',
          name: 'Кафедра електричних мереж і систем',
          shortName: 'ЕМС',
        },
        {
          unitType: 'department',
          name: 'Кафедра електромеханіки',
          shortName: 'ЕМ',
        },
        {
          unitType: 'department',
          name: 'Кафедра теоретичної електротехніки',
          shortName: 'ТЕ',
        },
      ],
    },
    {
      unitType: 'faculty',
      name: 'Факультет електроніки',
      shortName: 'ФЕЛ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра акустичних та мультимедійних електронних систем',
          shortName: 'АМЕС',
        },
        {
          unitType: 'department',
          name: 'Кафедра електронних пристроїв та систем',
          shortName: 'ЕПС',
        },
        {
          unitType: 'department',
          name: 'Кафедра електронної інженерії',
          shortName: 'ЕІ',
        },
        {
          unitType: 'department',
          name: 'Кафедра конструювання електронно-обчислювальної апаратури',
          shortName: 'КЕОА',
        },
        {
          unitType: 'department',
          name: 'Кафедра мікроелектроніки',
          shortName: 'МЕ',
        },
      ],
    },
    {
      unitType: 'faculty',
      name: 'Факультет інформатики та обчислювальної техніки',
      shortName: 'ФІОТ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра інформатики та програмної інженерії',
          shortName: 'ІПІ',
        },
        {
          unitType: 'department',
          name: 'Кафедра інформаційних систем та технологій',
          shortName: 'ІСТ',
        },
        {
          unitType: 'department',
          name: 'Кафедра обчислювальної техніки',
          shortName: 'ОТ',
        },
      ],
    },
    {
      unitType: 'faculty',
      name: 'Факультет лінгвістики',
      shortName: 'ФЛ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра англійської мови гуманітарного спрямування № 3',
          shortName: 'КАМГС3',
        },
        {
          unitType: 'department',
          name: 'Кафедра англійської мови технічного спрямування № 1',
          shortName: 'КАМТС1',
        },
        {
          unitType: 'department',
          name: 'Кафедра англійської мови технічного спрямування № 2',
          shortName: 'КАМТС2',
        },
        {
          unitType: 'department',
          name: 'Кафедра теорії, практики та перекладу англійської мови',
          shortName: 'КТППАМ',
        },
        {
          unitType: 'department',
          name: 'Кафедра теорії, практики та перекладу німецької мови',
          shortName: 'КТППНМ',
        },
        {
          unitType: 'department',
          name: 'Кафедра теорії, практики та перекладу французької мови',
          shortName: 'КТППФМ',
        },
        {
          unitType: 'department',
          name: 'Кафедра української мови, літератури та культури',
          shortName: 'КУМЛК',
        },
      ],
    },
    {
      unitType: 'faculty',
      name: 'Факультет менеджменту та маркетингу',
      shortName: 'ФММ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра економіки і підприємництва',
          shortName: 'КЕП',
        },
        {
          unitType: 'department',
          name: 'Кафедра економічної кібернетики',
          shortName: 'ЕК',
        },
        {
          unitType: 'department',
          name: 'Кафедра менеджменту підприємств',
          shortName: 'КМП',
        },
        {
          unitType: 'department',
          name: 'Кафедра міжнародного бізнесу та логістики',
          shortName: 'МБЛ',
        },
        {
          unitType: 'department',
          name: 'Кафедра міжнародної економіки',
          shortName: 'МЕ',
        },
        {
          unitType: 'department',
          name: 'Кафедра промислового маркетингу',
          shortName: 'ПМ',
        },
      ],
    },
    {
      unitType: 'faculty',
      name: 'Фізико-математичний факультет',
      shortName: 'ФМФ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра загальної фізики',
          shortName: 'КЗФ',
        },
        {
          unitType: 'department',
          name: 'Кафедра загальної фізики та моделювання фізичних процесів',
          shortName: 'ЗФМФП',
        },
        {
          unitType: 'department',
          name: 'Кафедра математичного аналізу та теорії ймовірностей',
          shortName: 'МАтаТЙ',
        },
        {
          unitType: 'department',
          name: 'Кафедра математичної фізики та диференціальних рівнянь',
          shortName: 'КМФ та ДР',
        },
        {
          unitType: 'department',
          name: 'Кафедра нарисної геометрії, інженерної та компʼютерної графіки',
          shortName: 'НГІтаКГ',
        },
      ],
    },
    {
      unitType: 'faculty',
      name: 'Факультет програмних систем та прикладної математики',
      shortName: 'ФПСПМ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра прикладної математики',
          shortName: 'ПМА',
        },
        {
          unitType: 'department',
          name: 'Кафедра програмного забезпечення компʼютерних систем',
          shortName: 'ПЗКС',
        },
        {
          unitType: 'department',
          name: 'Кафедра системного програмування і спеціалізованих компʼютерних систем',
          shortName: 'СПСКС',
        },
      ],
    },
    {
      unitType: 'faculty',
      name: 'Факультет робототехніки та приладобудування',
      shortName: 'ФРП',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра автоматизації та систем неруйнівного контролю',
          shortName: 'АСНК',
        },
        {
          unitType: 'department',
          name: 'Кафедра інформаційно-вимірювальних технологій',
          shortName: 'ІВТ',
        },
        {
          unitType: 'department',
          name: 'Кафедра компʼютерно-інтегрованих оптичних та навігаційних систем',
          shortName: 'КІОНС',
        },
        {
          unitType: 'department',
          name: 'Кафедра компʼютерно-інтегрованих технологій виробництва приладів',
          shortName: 'КІТВП',
        },
      ],
    },
    {
      unitType: 'faculty',
      name: 'Факультет соціології і права',
      shortName: 'ФСП',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра інтелектуальної власності та приватного права',
          shortName: 'ІВПП',
        },
        {
          unitType: 'department',
          name: 'Кафедра інформаційного, господарського та адміністративного права',
          shortName: 'КІГАП',
        },
        {
          unitType: 'department',
          name: 'Кафедра історії',
          shortName: 'КІ',
        },
        {
          unitType: 'department',
          name: 'Кафедра психології і педагогіки',
          shortName: 'КПП',
        },
        {
          unitType: 'department',
          name: 'Кафедра соціології',
          shortName: 'КС',
        },
        {
          unitType: 'department',
          name: 'Кафедра теорії та практики управління',
          shortName: 'ТПУ',
        },
        {
          unitType: 'department',
          name: 'Кафедра філософії',
          shortName: 'КФ',
        },
      ],
    },
    {
      unitType: 'faculty',
      name: 'Хіміко-технологічний факультет',
      shortName: 'ХТФ',
      children: [
        {
          unitType: 'department',
          name: 'Кафедра загальної та неорганічної хімії',
          shortName: 'ЗНХ',
        },
        {
          unitType: 'department',
          name: 'Кафедра органічної хімії та технології органічних речовин',
          shortName: 'ОХТОР',
        },
        {
          unitType: 'department',
          name: 'Кафедра технології електрохімічних виробництв',
          shortName: 'ТЕХВ',
        },
        {
          unitType: 'department',
          name: 'Кафедра технології неорганічних речовин, водоочищення та загальної хімічної технології',
          shortName: 'ТНР, В та ЗХТ',
        },
        {
          unitType: 'department',
          name: 'Кафедра фізичної хімії',
          shortName: 'ФХ',
        },
        {
          unitType: 'department',
          name: 'Кафедра хімічної технології кераміки та скла',
          shortName: 'ХТКС',
        },
        {
          unitType: 'department',
          name: 'Кафедра хімічної технології композиційних матеріалів',
          shortName: 'ХТКМ',
        },
      ],
    },
  ],
};
