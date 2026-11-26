-- Підтримка правонаступництва (перекодування/перейменування) для спеціальностей
-- та освітніх програм зі збереженням історичних даних минулих наборів.

ALTER TABLE specialties
    ADD COLUMN replaced_by_id BIGINT REFERENCES specialties(id) ON DELETE RESTRICT,
    ADD CONSTRAINT chk_specialties_not_self_replaced
        CHECK (replaced_by_id IS NULL OR replaced_by_id <> id),
    ADD CONSTRAINT chk_specialties_replaced_inactive
        CHECK (replaced_by_id IS NULL OR is_active = FALSE);

CREATE INDEX idx_specialties_replaced_by
    ON specialties(replaced_by_id)
    WHERE replaced_by_id IS NOT NULL;

ALTER TABLE educational_programs
    ADD COLUMN replaced_by_id BIGINT REFERENCES educational_programs(id) ON DELETE RESTRICT,
    ADD CONSTRAINT chk_edu_programs_not_self_replaced
        CHECK (replaced_by_id IS NULL OR replaced_by_id <> id),
    ADD CONSTRAINT chk_edu_programs_replaced_inactive
        CHECK (replaced_by_id IS NULL OR is_active = FALSE);

CREATE INDEX idx_edu_programs_replaced_by
    ON educational_programs(replaced_by_id)
    WHERE replaced_by_id IS NOT NULL;

-- Перевірка правонаступництва спеціальностей:
-- цільова спеціальність має бути активною та не утворювати цикл у ланцюжку замін.
CREATE OR REPLACE FUNCTION check_specialty_replacement()
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
        FROM specialties
        WHERE id = NEW.replaced_by_id;

        IF v_target_active IS NULL THEN
            RAISE EXCEPTION 'Replacement specialty % does not exist', NEW.replaced_by_id;
        END IF;

        IF NOT v_target_active THEN
            RAISE EXCEPTION 'Specialty % cannot be replaced by inactive specialty %', NEW.id, NEW.replaced_by_id;
        END IF;

        WITH RECURSIVE chain AS (
            SELECT id, replaced_by_id, 1 AS depth
            FROM specialties
            WHERE id = NEW.replaced_by_id
            UNION ALL
            SELECT s.id, s.replaced_by_id, c.depth + 1
            FROM specialties s
            INNER JOIN chain c ON s.id = c.replaced_by_id
            WHERE c.depth < 64
        )
        SELECT EXISTS (SELECT 1 FROM chain WHERE id = NEW.id) INTO v_has_cycle;

        IF v_has_cycle THEN
            RAISE EXCEPTION 'Cycle detected in specialties.replaced_by_id for specialty %', NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_specialty_replacement
    BEFORE INSERT OR UPDATE ON specialties
    FOR EACH ROW EXECUTE FUNCTION check_specialty_replacement();

-- Перевірка правонаступництва освітніх програм:
-- цільова ОП має бути активною та не утворювати цикл у ланцюжку замін.
CREATE OR REPLACE FUNCTION check_edu_program_replacement()
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
        FROM educational_programs
        WHERE id = NEW.replaced_by_id;

        IF v_target_active IS NULL THEN
            RAISE EXCEPTION 'Replacement educational program % does not exist', NEW.replaced_by_id;
        END IF;

        IF NOT v_target_active THEN
            RAISE EXCEPTION 'Educational program % cannot be replaced by inactive educational program %', NEW.id, NEW.replaced_by_id;
        END IF;

        WITH RECURSIVE chain AS (
            SELECT id, replaced_by_id, 1 AS depth
            FROM educational_programs
            WHERE id = NEW.replaced_by_id
            UNION ALL
            SELECT ep.id, ep.replaced_by_id, c.depth + 1
            FROM educational_programs ep
            INNER JOIN chain c ON ep.id = c.replaced_by_id
            WHERE c.depth < 64
        )
        SELECT EXISTS (SELECT 1 FROM chain WHERE id = NEW.id) INTO v_has_cycle;

        IF v_has_cycle THEN
            RAISE EXCEPTION 'Cycle detected in educational_programs.replaced_by_id for program %', NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_edu_program_replacement
    BEFORE INSERT OR UPDATE ON educational_programs
    FOR EACH ROW EXECUTE FUNCTION check_edu_program_replacement();

-- Нові освітні програми можна створювати (та активувати чи переприв'язувати)
-- лише для активної спеціальності.
CREATE OR REPLACE FUNCTION check_edu_program_active_specialty()
RETURNS TRIGGER AS $$
DECLARE
    v_specialty_active BOOLEAN;
BEGIN
    IF TG_OP = 'INSERT'
       OR (NEW.is_active AND NOT OLD.is_active)
       OR (NEW.is_active AND NEW.specialty_id IS DISTINCT FROM OLD.specialty_id)
    THEN
        SELECT is_active INTO v_specialty_active
        FROM specialties
        WHERE id = NEW.specialty_id;

        IF v_specialty_active IS NULL THEN
            RAISE EXCEPTION 'Specialty % does not exist', NEW.specialty_id;
        END IF;

        IF NOT v_specialty_active THEN
            RAISE EXCEPTION 'Cannot link educational program to inactive specialty %', NEW.specialty_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_edu_program_active_specialty
    BEFORE INSERT OR UPDATE ON educational_programs
    FOR EACH ROW EXECUTE FUNCTION check_edu_program_active_specialty();
