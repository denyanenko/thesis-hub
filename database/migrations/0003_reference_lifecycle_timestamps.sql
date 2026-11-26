-- Єдина модель життєвого циклу довідників (created_at, updated_at, deactivated_at,
-- deactivation_reason) та правонаступництво для підрозділів (org_units.replaced_by_id).

-- 1. Додаємо часові мітки життєвого циклу та правонаступництво для org_units
ALTER TABLE org_units
    ADD COLUMN created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN deactivated_at      TIMESTAMPTZ,
    ADD COLUMN deactivation_reason TEXT,
    ADD COLUMN replaced_by_id      BIGINT REFERENCES org_units(id) ON DELETE RESTRICT;

UPDATE org_units
SET deactivated_at = now()
WHERE is_active = FALSE AND deactivated_at IS NULL;

ALTER TABLE org_units
    ADD CONSTRAINT chk_org_units_not_self_replaced
        CHECK (replaced_by_id IS NULL OR replaced_by_id <> id),
    ADD CONSTRAINT chk_org_units_replaced_inactive
        CHECK (replaced_by_id IS NULL OR is_active = FALSE),
    ADD CONSTRAINT chk_org_units_deactivated_at_consistency
        CHECK (is_active = FALSE OR deactivated_at IS NULL),
    ADD CONSTRAINT chk_org_units_deactivation_reason_consistency
        CHECK (is_active = FALSE OR deactivation_reason IS NULL);

CREATE INDEX idx_org_units_replaced_by
    ON org_units(replaced_by_id)
    WHERE replaced_by_id IS NOT NULL;

-- 2. Часові мітки життєвого циклу для specialties
ALTER TABLE specialties
    ADD COLUMN created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN deactivated_at      TIMESTAMPTZ,
    ADD COLUMN deactivation_reason TEXT;

UPDATE specialties
SET deactivated_at = now()
WHERE is_active = FALSE AND deactivated_at IS NULL;

ALTER TABLE specialties
    ADD CONSTRAINT chk_specialties_deactivated_at_consistency
        CHECK (is_active = FALSE OR deactivated_at IS NULL),
    ADD CONSTRAINT chk_specialties_deactivation_reason_consistency
        CHECK (is_active = FALSE OR deactivation_reason IS NULL);

-- 3. Часові мітки життєвого циклу для educational_programs
ALTER TABLE educational_programs
    ADD COLUMN created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN deactivated_at      TIMESTAMPTZ,
    ADD COLUMN deactivation_reason TEXT;

UPDATE educational_programs
SET deactivated_at = now()
WHERE is_active = FALSE AND deactivated_at IS NULL;

ALTER TABLE educational_programs
    ADD CONSTRAINT chk_edu_programs_deactivated_at_consistency
        CHECK (is_active = FALSE OR deactivated_at IS NULL),
    ADD CONSTRAINT chk_edu_programs_deactivation_reason_consistency
        CHECK (is_active = FALSE OR deactivation_reason IS NULL);

-- 4. Часові мітки життєвого циклу для groups
ALTER TABLE groups
    ADD COLUMN created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN deactivated_at TIMESTAMPTZ;

UPDATE groups
SET deactivated_at = now()
WHERE is_active = FALSE AND deactivated_at IS NULL;

ALTER TABLE groups
    ADD CONSTRAINT chk_groups_deactivated_at_consistency
        CHECK (is_active = FALSE OR deactivated_at IS NULL);

-- 5. Спільний тригер автоматичного оновлення updated_at і захисту created_at
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at := OLD.created_at;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_touch_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_org_units_touch_updated_at
    BEFORE UPDATE ON org_units
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_specialties_touch_updated_at
    BEFORE UPDATE ON specialties
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_edu_programs_touch_updated_at
    BEFORE UPDATE ON educational_programs
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_groups_touch_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- 6. Автоматична синхронізація deactivated_at та deactivation_reason із is_active
CREATE OR REPLACE FUNCTION sync_deactivated_state_with_reason()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active THEN
        NEW.deactivated_at := NULL;
        NEW.deactivation_reason := NULL;
    ELSE
        IF NEW.deactivated_at IS NULL THEN
            IF TG_OP = 'UPDATE' AND NOT OLD.is_active AND OLD.deactivated_at IS NOT NULL THEN
                NEW.deactivated_at := OLD.deactivated_at;
            ELSE
                NEW.deactivated_at := now();
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_deactivated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active THEN
        NEW.deactivated_at := NULL;
    ELSE
        IF NEW.deactivated_at IS NULL THEN
            IF TG_OP = 'UPDATE' AND NOT OLD.is_active AND OLD.deactivated_at IS NOT NULL THEN
                NEW.deactivated_at := OLD.deactivated_at;
            ELSE
                NEW.deactivated_at := now();
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_org_units_sync_deactivated
    BEFORE INSERT OR UPDATE ON org_units
    FOR EACH ROW EXECUTE FUNCTION sync_deactivated_state_with_reason();

CREATE TRIGGER trg_specialties_sync_deactivated
    BEFORE INSERT OR UPDATE ON specialties
    FOR EACH ROW EXECUTE FUNCTION sync_deactivated_state_with_reason();

CREATE TRIGGER trg_edu_programs_sync_deactivated
    BEFORE INSERT OR UPDATE ON educational_programs
    FOR EACH ROW EXECUTE FUNCTION sync_deactivated_state_with_reason();

CREATE TRIGGER trg_groups_sync_deactivated
    BEFORE INSERT OR UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION sync_deactivated_at();

-- 7. Перевірка правонаступництва підрозділів (відсутність циклів і активний правонаступник)
CREATE OR REPLACE FUNCTION check_org_unit_replacement()
RETURNS TRIGGER AS $$
DECLARE
    v_target_active BOOLEAN;
    v_has_cycle BOOLEAN;
BEGIN
    IF NEW.replaced_by_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' OR NEW.replaced_by_id IS DISTINCT FROM OLD.replaced_by_id THEN
        SELECT is_active INTO v_target_active
        FROM org_units
        WHERE id = NEW.replaced_by_id;

        IF v_target_active IS NULL THEN
            RAISE EXCEPTION 'Replacement org unit % does not exist', NEW.replaced_by_id;
        END IF;

        IF NOT v_target_active THEN
            RAISE EXCEPTION 'Org unit % cannot be replaced by inactive org unit %', NEW.id, NEW.replaced_by_id;
        END IF;

        WITH RECURSIVE chain AS (
            SELECT id, replaced_by_id, 1 AS depth
            FROM org_units
            WHERE id = NEW.replaced_by_id
            UNION ALL
            SELECT ou.id, ou.replaced_by_id, c.depth + 1
            FROM org_units ou
            INNER JOIN chain c ON ou.id = c.replaced_by_id
            WHERE c.depth < 64
        )
        SELECT EXISTS (SELECT 1 FROM chain WHERE id = NEW.id) INTO v_has_cycle;

        IF v_has_cycle THEN
            RAISE EXCEPTION 'Cycle detected in org_units.replaced_by_id for org unit %', NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_org_unit_replacement
    BEFORE INSERT OR UPDATE ON org_units
    FOR EACH ROW EXECUTE FUNCTION check_org_unit_replacement();
