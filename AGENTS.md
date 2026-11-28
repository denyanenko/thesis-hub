# AGENTS.md — Правила та архітектура проєкту `thesis-hub`

**Thesis Hub** — інформаційна система підтримки вибору наукового керівника та супроводу кваліфікаційних робіт у ЗВО (дипломний проєкт, еталонна структура — КПІ ім. Ігоря Сікорського).

---

## 1. Структура репозиторію

```text
thesis-hub/
├── database/
│   ├── schema.sql                  # Повний актуальний зліпок БД (для чистого старту та диплома)
│   └── migrations/                 # Версіоновані SQL-міграції (0001_..., 0002_..., ...)
├── server/                         # Backend: NestJS 12 + Drizzle ORM + PostgreSQL
│   ├── src/
│   │   ├── auth/                   # JWT у HttpOnly cookies, refresh rotation, RBAC (@Auth, @Roles)
│   │   ├── config/                 # Валідація .env (AppConfigService, API_PREFIX = 'api')
│   │   ├── database/               # Drizzle schema.ts, relations.ts, migrate.ts, check-schema.ts, сіди
│   │   ├── educational-programs/   # Освітні програми (CRUD, scope кафедр, заміна/перейменування)
│   │   ├── groups/                 # Академічні групи (CRUD, архівування/випуск, scope кафедр)
│   │   ├── invitations/            # Запрошення користувачів (одиночні та масові, .xlsx/.csv шаблони й імпорт, активація акаунтів)
│   │   ├── mail/                   # Nodemailer + шаблони листів
│   │   ├── org-units/              # Дерево оргструктури, OrgScopeService, правила ієрархії
│   │   ├── profile/                # Профіль поточного користувача
│   │   └── specialties/            # Довідник спеціальностей (CRUD, перекодування/заміна, правонаступництво)
│   └── seed-output/                # Згенеровані dev-облікові дані (.gitignore — ніколи не комітити)
├── frontend/                       # Frontend: React 19 + Vite + React-Bootstrap + React Query
│   └── src/
│       ├── api/                    # Axios client з auto-refresh (client.ts) та API-модулі
│       ├── auth/                   # ProtectedRoute, useAuth, useProfile
│       ├── components/             # Спільні та доменні компоненти
│       └── pages/                  # Сторінки маршрутів
└── docker-compose.yml              # PostgreSQL
```

---

## 2. Інструменти та пакетний менеджер

- **Пакетний менеджер:** виключно **`pnpm`** (окремі `pnpm-lock.yaml` у `server/` та `frontend/`). Не використовувати `npm` або `yarn` і не створювати `package-lock.json`.
- **Windows PowerShell:** за обмеженої політики виконання скриптів запускати `pnpm.cmd` замість `pnpm`.
- **Основні команди:**
  - `server/`:
    - `pnpm start:dev` — запуск бекенду в watch-режимі (Swagger: `/api/docs`);
    - `pnpm lint` — `oxlint --type-aware src/ test/` (правило `typescript/no-floating-promises: error`);
    - `pnpm build` — `nest build`;
    - `pnpm test` — `vitest run` (`pnpm test:e2e` для e2e);
    - `pnpm db:migrate` / `pnpm db:migrate:status` / `pnpm db:migrate:baseline` / `pnpm db:check` / `pnpm db:migrate:check`;
    - `pnpm seed` (супер-адмін), `pnpm seed:kpi` (структура КПІ), `pnpm seed:specialties` (класифікатор спеціальностей МОН 2024), `pnpm seed:dev:admins`, `pnpm seed:dev:supervisors`, `pnpm seed:dev:users`, `pnpm seed:dev:programs`, `pnpm seed:dev:groups`, `pnpm seed:dev:cleanup`.
  - `frontend/`:
    - `pnpm dev` — Vite dev-сервер;
    - `pnpm lint` — `eslint .`;
    - `pnpm build` — `tsc -b && vite build`.

---

## 3. База даних та міграції (SQL-First)

БД активно використовує нативні можливості PostgreSQL: `PL/pgSQL`-функції, `BEFORE`/`AFTER` тригери, `DEFERRABLE INITIALLY DEFERRED` constraint-тригери, часткові індекси, `CHECK`-обмеження, процедури та `GENERATED ALWAYS AS IDENTITY`. Тому **єдиним джерелом правди для структури БД є SQL-міграції**.

### Обов'язковий регламент будь-якої зміни БД

1. **Створити нову міграцію** `database/migrations/000N_<short_snake_name>.sql` (інкрементальна нумерація: `0002_...`, `0003_...`).
   - **ЗАБОРОНЕНО редагувати вже застосовані файли міграцій.** Раннер `server/src/database/migrate.ts` зберігає SHA-256 checksum у таблиці `meta.schema_migrations` і заблокує виконання при розбіжності.
   - Кожна міграція виконується в транзакції (`BEGIN ... COMMIT`).
2. **Синхронно оновити `database/schema.sql`**, щоб він завжди залишався повним, читабельним і актуальним станом БД (використовується для документації диплома та розгортання з нуля).
3. **Точково оновити Drizzle-схему вручну:**
   - `server/src/database/schema.ts` — додати/змінити таблиці, колонки, індекси, constraint-и, `enum`-и.
   - `server/src/database/relations.ts` — оновити зв'язки.
   - **ЗАБОРОНЕНО перезаписувати `schema.ts` та `relations.ts` через `drizzle-kit pull`:** автогенератор ламає ESM-імпорти `.js` (прибирає розширення) і перезаписує кастомні 1-до-1 зв'язки (`users.student`, `users.supervisor`, `users.admin`) на `many(...)`, що ламає `ProfileService`.
4. **Застосувати міграцію та перевірити дрейф схеми** з директорії `server/`:
   ```bash
   pnpm db:migrate:check
   ```
   Скрипт `check-schema.ts` (read-only) звіряє всі таблиці, колонки, SQL-типи, `NOT NULL` і `enum`-и між схемою `public` у PostgreSQL та `server/src/database/schema.ts` (схему `meta` ігнорує).
5. **Прогнати перевірки:** `pnpm lint`, `pnpm build`, `pnpm test`.

### Правила щодо сідів

- Продакшн-сіди (`seed.ts`, `seed-kpi.ts`, `seed-specialties.ts`) мають бути ідемпотентними.
- Dev-сіди (`seed-dev-*.ts`) **обов'язково** перевіряють `NODE_ENV === 'development'` (через `assertDevelopmentEnv()`), не захаращують `.env` зайвими змінними (налаштування задаються константами в коді) та пишуть згенеровані облікові дані лише в `server/seed-output/` (ігнорується Git).

---

## 4. Конвенції Backend (`server/`)

- **ESM + `nodenext`:** усі відносні імпорти локальних модулів **обов'язково** пишуться з розширенням `.js` (наприклад, `import { users } from '../database/schema.js';`).
- **API та валідація:**
  - Глобальний префікс — `/api` (`API_PREFIX` у `src/config/api.constants.ts`), Swagger — `/api/docs`.
  - Глобальний `ValidationPipe` працює з `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` — усі DTO мають бути суворо описані декораторами `class-validator` і `class-transformer` (із повідомленнями українською).
  - Усі контролери та DTO документуються декораторами `@nestjs/swagger` (`@ApiTags`, `@ApiOperation`, `@ApiProperty` тощо).
- **Автентифікація, ролі та область доступу:**
  - Сесія працює через `HttpOnly` cookies (`access_token`, `refresh_token`) із ротацією refresh-токенів.
  - Захист ендпоїнтів — через `@Auth(...)` / `JwtAuthGuard` + `RolesGuard` (`@Roles(...)`).
  - Авторизація адміністраторів у межах дерева підрозділів — через `OrgScopeService` (`org_unit_id IS NULL` — головний адміністратор / superadmin; інакше — адміністратор конкретного підрозділу та його піддерева).
- **Помилки БД:** коректно мапити коди помилок PostgreSQL (`23505` unique violation, `23503` FK violation, `23514` CHECK violation, `P0001` винятки тригерів) у зрозумілі HTTP-винятки NestJS (`ConflictException`, `BadRequestException` тощо) з повідомленнями українською.
- **Тести:** бізнес-логіку сервісів покривати unit-тестами у `*.spec.ts` (Vitest) поруч із сервісом.

---

## 5. Конвенції Frontend (`frontend/`)

- **HTTP та стан сервера:**
  - Усі запити до API виконуються через спільний екземпляр `http` із `src/api/client.ts` (вже налаштовані `baseURL: '/api'`, `withCredentials: true`, автоматичний refresh токена та приведення помилок до `ApiError`).
  - Кешування, завантаження та інвалідація серверних даних — через `@tanstack/react-query` з експортованими ключами запитів (`*_KEY`).
- **UI та адаптивність:**
  - Компоненти — `react-bootstrap` + `bootstrap-icons`, додаткові стилі — у `src/index.css`.
  - Інтерфейс має бути однаково зручним на десктопі та мобільних екранах (`< 992px`, `< 576px`): уникати жорстких фіксованих ширин, довгі українські назви підрозділів/ОП мають коректно переноситися без обрізання важливого змісту.
- **Навігація та маршрути:**
  - Маршрути реєструються у `src/App.tsx` (захищені — через `<ProtectedRoute roles={[...]} />`).
  - Пункти верхнього меню додаються в масив `NAV_LINKS` у `src/components/Header.tsx`.

---

## 6. Мова, домен та цілісність історичних даних

- **Мова:** увесь UI, повідомлення про помилки (бекенд і фронтенд), email-шаблони, коментарі в коді та тестові дані — **виключно літературною українською мовою** (без суржику й русизмів).
- **Доменні інваріанти ЗВО:**
  - Наукові керівники (`supervisors`) та освітні програми (`educational_programs`) прив'язуються виключно до кафедр (`org_units.unit_type = 'department'`, що контролюється тригерами БД).
  - Нові (та активні) освітні програми можуть прив'язуватися лише до активної спеціальності (`trg_edu_program_active_specialty`).
- **Цілісність історичних даних:** зміни у довідниках (перекодування спеціальностей, перейменування ОП чи підрозділів) не мають заднім числом переписувати дані минулих наборів і випускників — застарілі записи деактивуються (`is_active = false`, автоматичний `deactivated_at` та опціональний `deactivation_reason`) зі зв'язком `replaced_by_id` на активного правонаступника (із тригерним захистом від циклів), `created_at`/`updated_at` підтримуються тригерами БД (`touch_updated_at`), а зафіксовані архівні документи зберігають незмінний знімок атрибутів.

---

## 7. Чекліст перед завершенням задачі та Git

- **Backend змінено:** `pnpm lint` → `pnpm build` → `pnpm test` (+ `pnpm db:migrate:check`, якщо змінювалася БД).
- **Frontend змінено:** `pnpm lint` → `pnpm build`.
- **Актуальність `AGENTS.md`:** якщо змінилася структура репозиторію (додано/перейменовано модуль, каталог чи ключовий скрипт на бекенді, фронтенді або в `database/`) чи з'явилися нові архітектурні конвенції — синхронно оновити відповідні розділи `AGENTS.md`.
- **Коміти:** дотримуватися формату Conventional Commits (наприклад, `feat(org-units): ...`, `feat(database): ...`, `fix(auth): ...`, `chore: ...`).
- **Секрети:** ніколи не комітити `.env`, паролі, SMTP-ключі або вміст `server/seed-output/`.
