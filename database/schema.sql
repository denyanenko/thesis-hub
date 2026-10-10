CREATE TYPE user_role AS ENUM ('student', 'supervisor', 'admin');
CREATE TYPE degree_level AS ENUM ('bachelor', 'master', 'phd');
CREATE TYPE org_unit_type AS ENUM ('university', 'institute', 'faculty', 'department');

CREATE TABLE org_units (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id   BIGINT REFERENCES org_units(id),
    unit_type   org_unit_type NOT NULL,
    name        TEXT NOT NULL,
    short_name  TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE org_unit_hierarchy_rules (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    child_type   org_unit_type NOT NULL,
    parent_type  org_unit_type,
    UNIQUE (child_type, parent_type)
);

CREATE TABLE org_unit_allowed_children (
    org_unit_id   BIGINT NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
    child_type    org_unit_type NOT NULL,
    PRIMARY KEY (org_unit_id, child_type)
);

CREATE TABLE specialties (
    id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    TEXT NOT NULL UNIQUE,   -- '126'
    name    TEXT NOT NULL,          -- 'Інформаційні системи та технології'
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE educational_programs (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    specialty_id   BIGINT NOT NULL REFERENCES specialties(id),
    org_unit_id    BIGINT NOT NULL REFERENCES org_units(id),
    name           TEXT NOT NULL,
    degree_level   degree_level NOT NULL,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (specialty_id, org_unit_id, name, degree_level)
);

CREATE TABLE groups (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    educational_program_id  BIGINT NOT NULL REFERENCES educational_programs(id),
    name                    TEXT NOT NULL,
    enrollment_year         SMALLINT,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (educational_program_id, name)
);

CREATE TABLE users
(
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    role          user_role   NOT NULL,
    first_name    TEXT        NOT NULL,
    last_name     TEXT        NOT NULL,
    patronymic    TEXT,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE students (
    user_id         BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    student_number  TEXT NOT NULL UNIQUE,
    group_id        BIGINT REFERENCES groups(id)
);

CREATE TABLE supervisors (
    user_id         BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    academic_degree TEXT,
    academic_title  TEXT,
    org_unit_id   BIGINT REFERENCES org_units(id),
    position        TEXT
);

CREATE TABLE admins (
    user_id         BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    org_unit_id     BIGINT REFERENCES org_units(id),
    position        TEXT
);
CREATE TABLE refresh_tokens (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id    UUID NOT NULL, -- Ідентифікатор ланцюжка ротації (усі токени однієї сесії мають однаковий)
    token_hash    TEXT NOT NULL UNIQUE,
    expires_at    TIMESTAMPTZ NOT NULL,
    is_revoked    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    user_agent    TEXT,
    ip_address    INET,
    replaced_by_id BIGINT REFERENCES refresh_tokens(id) ON DELETE SET NULL,
    CONSTRAINT chk_expires_after_created CHECK (expires_at > created_at)
);

CREATE INDEX idx_refresh_tokens_session ON refresh_tokens(session_id);
CREATE INDEX idx_refresh_tokens_active
ON refresh_tokens(user_id, expires_at)
WHERE is_revoked = FALSE;

INSERT INTO org_unit_hierarchy_rules (child_type, parent_type) VALUES
    ('university', NULL),
    ('institute', NULL),
    ('institute',  'university'),
    ('faculty',    'university'),
    ('faculty',    'institute'),
    ('department', 'institute'),
    ('department', 'faculty');

CREATE OR REPLACE FUNCTION check_org_unit_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    v_parent_type org_unit_type;
    v_parent_is_active BOOLEAN;
BEGIN
    -- Заборона деактивувати одиницю, поки в неї є активні діти.
    IF TG_OP = 'UPDATE' AND OLD.is_active AND NOT NEW.is_active THEN
        IF EXISTS (
            SELECT 1 FROM org_units
            WHERE parent_id = NEW.id AND is_active = TRUE
        ) THEN
            RAISE EXCEPTION
                'Cannot deactivate unit % ("%"): it still has active child unit(s)',
                NEW.id, NEW.name;
        END IF;
    END IF;

    -- Неактивні org_units не зобов'язані відповідати правилам ієрархії.
    IF NOT NEW.is_active THEN
        RETURN NEW;
    END IF;

    IF NEW.parent_id IS NULL THEN
        v_parent_type := NULL;
    ELSE
        SELECT unit_type, is_active INTO v_parent_type, v_parent_is_active
        FROM org_units WHERE id = NEW.parent_id;

        -- Активний підрозділ не може підпорядковуватись неактивному.
        IF NOT v_parent_is_active THEN
            RAISE EXCEPTION 'Active unit % cannot have an inactive parent %', NEW.id, NEW.parent_id;
        END IF;
    END IF;

    -- Рівень 1: чи структурно можливо взагалі (включно з "коренем" — parent NULL)
    IF NOT EXISTS (
        SELECT 1 FROM org_unit_hierarchy_rules
        WHERE child_type = NEW.unit_type
          AND parent_type IS NOT DISTINCT FROM v_parent_type
    ) THEN
        RAISE EXCEPTION 'Structurally invalid: % cannot have parent of type %', NEW.unit_type, v_parent_type;
    END IF;

    -- Рівень 2: чи дозволено саме для цього екземпляра (застосовується лише якщо є батько)
    IF NEW.parent_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM org_unit_allowed_children WHERE org_unit_id = NEW.parent_id)
           AND NOT EXISTS (
               SELECT 1 FROM org_unit_allowed_children
               WHERE org_unit_id = NEW.parent_id AND child_type = NEW.unit_type
           )
        THEN
            RAISE EXCEPTION 'Unit % does not allow children of type %', NEW.parent_id, NEW.unit_type;
        END IF;
    END IF;

    -- Рівень 3: чи лишаються сумісні існуючі АКТИВНІ діти цього підрозділу
    -- з його (можливо щойно зміненим) unit_type. Захищає саме від сценарію
    -- "змінили unit_type батька так, що активні діти стали структурно
    -- невалідними" — без цієї перевірки проблема виявилась би лише пізніше,
    -- випадково, при наступному оновленні самої дитини.
    IF EXISTS (
        SELECT 1
        FROM org_units child
        WHERE child.parent_id = NEW.id
          AND child.is_active = TRUE
          AND NOT EXISTS (
              SELECT 1 FROM org_unit_hierarchy_rules r
              WHERE r.child_type = child.unit_type
                AND r.parent_type = NEW.unit_type
          )
    ) THEN
        RAISE EXCEPTION
            'Cannot change unit % to type %: it has active child unit(s) incompatible with this type',
            NEW.id, NEW.unit_type;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_org_hierarchy
    BEFORE INSERT OR UPDATE ON org_units
    FOR EACH ROW EXECUTE FUNCTION check_org_unit_hierarchy();

CREATE OR REPLACE FUNCTION check_allowed_children_rule()
RETURNS TRIGGER AS $$
DECLARE
    v_unit_type org_unit_type;
BEGIN
    SELECT unit_type INTO v_unit_type
    FROM org_units
    WHERE id = NEW.org_unit_id;

    IF v_unit_type IS NULL THEN
        RAISE EXCEPTION 'Org unit % does not exist', NEW.org_unit_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM org_unit_hierarchy_rules
        WHERE parent_type = v_unit_type
          AND child_type = NEW.child_type
    ) THEN
        RAISE EXCEPTION
            'Cannot allow child type % for unit type % — not permitted by hierarchy rules',
            NEW.child_type, v_unit_type;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_allowed_children_rule
    BEFORE INSERT OR UPDATE ON org_unit_allowed_children
    FOR EACH ROW EXECUTE FUNCTION check_allowed_children_rule();

CREATE OR REPLACE FUNCTION check_org_unit_is_department()
RETURNS TRIGGER AS $$
DECLARE
    v_type org_unit_type;
BEGIN
    SELECT unit_type INTO v_type FROM org_units WHERE id = NEW.org_unit_id;

    IF v_type IS NULL THEN
        RAISE EXCEPTION 'Org unit % does not exist', NEW.org_unit_id;
    END IF;

    IF v_type <> 'department' THEN
        RAISE EXCEPTION 'org_unit_id % must reference a department (got type %)', NEW.org_unit_id, v_type;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_edu_program_org_unit_department
    BEFORE INSERT OR UPDATE ON educational_programs
    FOR EACH ROW EXECUTE FUNCTION check_org_unit_is_department();

CREATE TRIGGER trg_supervisor_org_unit_department
    BEFORE INSERT OR UPDATE ON supervisors
    FOR EACH ROW EXECUTE FUNCTION check_org_unit_is_department();

CREATE OR REPLACE FUNCTION check_hierarchy_rules_consistency()
RETURNS TRIGGER AS $$
DECLARE
    v_details TEXT;
BEGIN
    SELECT string_agg(
        format('id=%s name="%s" type=%s parent_type=%s', ou.id, ou.name, ou.unit_type, parent.unit_type),
        E'\n'
    )
    INTO v_details
    FROM org_units ou
    LEFT JOIN org_units parent ON parent.id = ou.parent_id
    WHERE ou.is_active
      AND NOT EXISTS (
        SELECT 1 FROM org_unit_hierarchy_rules r
        WHERE r.child_type = ou.unit_type
          AND r.parent_type IS NOT DISTINCT FROM parent.unit_type
    );

    IF v_details IS NOT NULL THEN
        RAISE EXCEPTION
            E'Cannot apply changes to org_unit_hierarchy_rules: following ACTIVE org_unit(s) would become invalid:\n%',
            v_details;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_check_hierarchy_rules_consistency
    AFTER INSERT OR UPDATE OR DELETE ON org_unit_hierarchy_rules
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION check_hierarchy_rules_consistency();

CREATE OR REPLACE FUNCTION check_allowed_children_consistency()
RETURNS TRIGGER AS $$
DECLARE
    v_details TEXT;
BEGIN
    SELECT string_agg(
        format('id=%s name="%s" type=%s parent_id=%s',
               child.id, child.name, child.unit_type, child.parent_id),
        E'\n'
    )
    INTO v_details
    FROM org_units child
    WHERE child.parent_id IS NOT NULL
      AND child.is_active
      AND EXISTS (
          SELECT 1 FROM org_unit_allowed_children ac
          WHERE ac.org_unit_id = child.parent_id
      )
      AND NOT EXISTS (
          SELECT 1 FROM org_unit_allowed_children ac
          WHERE ac.org_unit_id = child.parent_id
            AND ac.child_type = child.unit_type
      );

    IF v_details IS NOT NULL THEN
        RAISE EXCEPTION
            E'Cannot apply changes to org_unit_allowed_children: following org_unit(s) would become invalid:\n%',
            v_details;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_check_allowed_children_consistency
    AFTER INSERT OR UPDATE OR DELETE ON org_unit_allowed_children
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION check_allowed_children_consistency();

CREATE OR REPLACE PROCEDURE delete_expired_refresh_tokens()
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < now();
END;
$$;

CREATE OR REPLACE FUNCTION check_user_role_match()
RETURNS TRIGGER AS $$
DECLARE
    v_actual_role user_role;
    v_expected_role user_role := TG_ARGV[0]::user_role;
BEGIN
    SELECT role INTO v_actual_role FROM users WHERE id = NEW.user_id;

    IF v_actual_role <> v_expected_role THEN
        RAISE EXCEPTION 'User % has role "%", cannot create profile in "%" table (expected role "%")',
            NEW.user_id, v_actual_role, TG_TABLE_NAME, v_expected_role;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_students_role_check
    BEFORE INSERT OR UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION check_user_role_match('student');

CREATE TRIGGER trg_supervisors_role_check
    BEFORE INSERT OR UPDATE ON supervisors
    FOR EACH ROW EXECUTE FUNCTION check_user_role_match('supervisor');

CREATE TRIGGER trg_admins_role_check
    BEFORE INSERT OR UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION check_user_role_match('admin');

