-- Система запрошень користувачів адміністраторами (одиночні та масові запрошення)

CREATE TYPE invitation_email_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE user_invitations (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email              TEXT NOT NULL,
    role               user_role NOT NULL,
    first_name         TEXT NOT NULL,
    last_name          TEXT NOT NULL,
    patronymic         TEXT,
    student_number     TEXT,
    group_id           BIGINT REFERENCES groups(id),
    org_unit_id        BIGINT REFERENCES org_units(id),
    position           TEXT,
    academic_degree    TEXT,
    academic_title     TEXT,
    token_hash         TEXT NOT NULL UNIQUE,
    expires_at         TIMESTAMPTZ NOT NULL,
    invited_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    accepted_at        TIMESTAMPTZ,
    accepted_user_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    revoked_at         TIMESTAMPTZ,
    email_status       invitation_email_status NOT NULL DEFAULT 'pending',
    email_error        TEXT,
    email_sent_at      TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_user_invitations_expires_after_created
        CHECK (expires_at > created_at),
    CONSTRAINT chk_user_invitations_not_both_accepted_and_revoked
        CHECK (NOT (accepted_at IS NOT NULL AND revoked_at IS NOT NULL)),
    CONSTRAINT chk_user_invitations_accepted_user_consistency
        CHECK (accepted_user_id IS NULL OR accepted_at IS NOT NULL),
    CONSTRAINT chk_user_invitations_role_fields CHECK (
        (
            role = 'student'
            AND student_number IS NOT NULL
            AND group_id IS NOT NULL
            AND org_unit_id IS NULL
            AND position IS NULL
            AND academic_degree IS NULL
            AND academic_title IS NULL
        )
        OR (
            role = 'supervisor'
            AND org_unit_id IS NOT NULL
            AND student_number IS NULL
            AND group_id IS NULL
        )
        OR (
            role = 'admin'
            AND student_number IS NULL
            AND group_id IS NULL
            AND academic_degree IS NULL
            AND academic_title IS NULL
        )
    )
);

CREATE UNIQUE INDEX uq_user_invitations_active_email
    ON user_invitations (lower(email))
    WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE UNIQUE INDEX uq_user_invitations_active_student_number
    ON user_invitations (student_number)
    WHERE student_number IS NOT NULL AND accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX idx_user_invitations_role_created
    ON user_invitations (role, created_at DESC);

CREATE INDEX idx_user_invitations_org_unit
    ON user_invitations (org_unit_id)
    WHERE org_unit_id IS NOT NULL;

CREATE INDEX idx_user_invitations_group
    ON user_invitations (group_id)
    WHERE group_id IS NOT NULL;

CREATE TRIGGER trg_user_invitations_touch_updated_at
    BEFORE UPDATE ON user_invitations
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE FUNCTION check_user_invitation_references()
RETURNS TRIGGER AS $$
DECLARE
    v_unit_type org_unit_type;
    v_is_active BOOLEAN;
BEGIN
    IF TG_OP = 'UPDATE'
       AND NEW.role = OLD.role
       AND NEW.org_unit_id IS NOT DISTINCT FROM OLD.org_unit_id
       AND NEW.group_id IS NOT DISTINCT FROM OLD.group_id
    THEN
        RETURN NEW;
    END IF;

    IF NEW.role = 'supervisor' THEN
        SELECT unit_type, is_active INTO v_unit_type, v_is_active
        FROM org_units
        WHERE id = NEW.org_unit_id;

        IF v_unit_type IS NULL THEN
            RAISE EXCEPTION 'Org unit % does not exist', NEW.org_unit_id;
        END IF;

        IF v_unit_type <> 'department' THEN
            RAISE EXCEPTION 'Supervisor invitation org_unit_id % must reference a department (got type %)',
                NEW.org_unit_id, v_unit_type;
        END IF;

        IF NOT v_is_active THEN
            RAISE EXCEPTION 'Cannot invite supervisor to inactive department %', NEW.org_unit_id;
        END IF;
    ELSIF NEW.role = 'admin' AND NEW.org_unit_id IS NOT NULL THEN
        SELECT is_active INTO v_is_active
        FROM org_units
        WHERE id = NEW.org_unit_id;

        IF v_is_active IS NULL THEN
            RAISE EXCEPTION 'Org unit % does not exist', NEW.org_unit_id;
        END IF;

        IF NOT v_is_active THEN
            RAISE EXCEPTION 'Cannot invite admin to inactive org unit %', NEW.org_unit_id;
        END IF;
    ELSIF NEW.role = 'student' THEN
        SELECT is_active INTO v_is_active
        FROM groups
        WHERE id = NEW.group_id;

        IF v_is_active IS NULL THEN
            RAISE EXCEPTION 'Group % does not exist', NEW.group_id;
        END IF;

        IF NOT v_is_active THEN
            RAISE EXCEPTION 'Cannot invite student to inactive group %', NEW.group_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_invitations_validate_references
    BEFORE INSERT OR UPDATE ON user_invitations
    FOR EACH ROW EXECUTE FUNCTION check_user_invitation_references();
