BEGIN;

-- Users: align password column name and add optional display name
ALTER TABLE IF EXISTS users RENAME COLUMN hashed_password TO password_hash;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Workspaces: rename organizations and track creator
ALTER TABLE IF EXISTS organizations RENAME TO workspaces;
ALTER TABLE IF EXISTS workspaces ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- Workspace members: rename memberships and align role type
ALTER TABLE IF EXISTS memberships RENAME TO workspace_members;
ALTER TABLE IF EXISTS workspace_members RENAME COLUMN organization_id TO workspace_id;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_role_enum') THEN
        CREATE TYPE workspace_role_enum AS ENUM ('owner', 'admin', 'member');
    END IF;
END$$;
ALTER TABLE IF EXISTS workspace_members
    ALTER COLUMN role DROP DEFAULT,
    ALTER COLUMN role TYPE workspace_role_enum USING (
        CASE WHEN role IN ('owner','admin','member') THEN role ELSE 'member' END::workspace_role_enum
    ),
    ALTER COLUMN role SET DEFAULT 'member',
    ALTER COLUMN role SET NOT NULL;

-- Models: workspace scoping and creator tracking
ALTER TABLE IF EXISTS models RENAME COLUMN organization_id TO workspace_id;
ALTER TABLE IF EXISTS models ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE IF EXISTS models DROP CONSTRAINT IF EXISTS uq_model_slug;
ALTER TABLE IF EXISTS models ADD CONSTRAINT uq_model_slug UNIQUE (workspace_id, slug);
-- Provide a generated compatibility column for legacy queries that still reference organization_id
ALTER TABLE IF EXISTS models ADD COLUMN IF NOT EXISTS organization_id INTEGER GENERATED ALWAYS AS (workspace_id) STORED;

-- Model fields: rename table/columns, enforce enumerated types, add uniqueness/position metadata
ALTER TABLE IF EXISTS fields RENAME TO model_fields;
ALTER TABLE IF EXISTS model_fields RENAME COLUMN key TO slug;
ALTER TABLE IF EXISTS model_fields RENAME COLUMN field_type TO data_type;
ALTER TABLE IF EXISTS model_fields RENAME COLUMN required TO is_required;
ALTER TABLE IF EXISTS model_fields RENAME COLUMN options TO config;
ALTER TABLE IF EXISTS model_fields ALTER COLUMN config TYPE JSONB USING config::jsonb;
UPDATE model_fields SET data_type = 'text' WHERE data_type = 'longtext';
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'model_field_data_type') THEN
        CREATE TYPE model_field_data_type AS ENUM('string','text','number','boolean','date','datetime','enum','relation');
    END IF;
END$$;
ALTER TABLE IF EXISTS model_fields
    ALTER COLUMN data_type TYPE model_field_data_type USING (
        CASE
            WHEN data_type IN ('string','text','number','boolean','date','datetime','enum','relation') THEN data_type
            WHEN data_type = 'longtext' THEN 'text'
            ELSE 'string'
        END::model_field_data_type
    );
ALTER TABLE IF EXISTS model_fields ADD COLUMN IF NOT EXISTS is_unique BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS model_fields ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS model_fields ALTER COLUMN is_required SET NOT NULL;
ALTER TABLE IF EXISTS model_fields ALTER COLUMN is_unique SET NOT NULL;
ALTER TABLE IF EXISTS model_fields ALTER COLUMN position SET NOT NULL;

-- Records: capture workspace scope, track modifiers, and use JSONB
ALTER TABLE IF EXISTS records ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id);
UPDATE records r SET workspace_id = m.workspace_id FROM models m WHERE r.model_id = m.id AND r.workspace_id IS NULL;
ALTER TABLE IF EXISTS records ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE IF EXISTS records ALTER COLUMN data TYPE JSONB USING data::jsonb;
ALTER TABLE IF EXISTS records ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

-- Compatibility view for legacy `organizations` table name
CREATE OR REPLACE VIEW organizations AS
SELECT id, name, created_at FROM workspaces;

CREATE OR REPLACE FUNCTION organizations_view_bridge() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO workspaces (id, name, created_at)
        VALUES (NEW.id, NEW.name, COALESCE(NEW.created_at, CURRENT_TIMESTAMP))
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, created_at = EXCLUDED.created_at;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE workspaces SET name = NEW.name, created_at = NEW.created_at WHERE id = OLD.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM workspaces WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organizations_view_bridge_trigger ON organizations;
CREATE TRIGGER organizations_view_bridge_trigger
INSTEAD OF INSERT OR UPDATE OR DELETE ON organizations
FOR EACH ROW EXECUTE PROCEDURE organizations_view_bridge();

-- Compatibility view for legacy `memberships`
CREATE OR REPLACE VIEW memberships AS
SELECT id, user_id, workspace_id AS organization_id, role FROM workspace_members;

CREATE OR REPLACE FUNCTION memberships_view_bridge() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO workspace_members (user_id, workspace_id, role)
        VALUES (NEW.user_id, NEW.organization_id, COALESCE(NEW.role, 'member'))
        ON CONFLICT DO NOTHING;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE workspace_members SET user_id = NEW.user_id, workspace_id = NEW.organization_id, role = NEW.role
        WHERE id = OLD.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM workspace_members WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS memberships_view_bridge_trigger ON memberships;
CREATE TRIGGER memberships_view_bridge_trigger
INSTEAD OF INSERT OR UPDATE OR DELETE ON memberships
FOR EACH ROW EXECUTE PROCEDURE memberships_view_bridge();

-- Compatibility view for legacy `fields`
CREATE OR REPLACE VIEW fields AS
SELECT id, model_id, name, slug AS key, data_type AS field_type, is_required AS required, config AS options FROM model_fields;

CREATE OR REPLACE FUNCTION fields_view_bridge() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO model_fields (model_id, name, slug, data_type, is_required, config)
        VALUES (
            NEW.model_id,
            NEW.name,
            NEW.key,
            NEW.field_type::model_field_data_type,
            COALESCE(NEW.required, FALSE),
            NEW.options
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE model_fields SET
            model_id = NEW.model_id,
            name = NEW.name,
            slug = NEW.key,
            data_type = NEW.field_type::model_field_data_type,
            is_required = NEW.required,
            config = NEW.options
        WHERE id = OLD.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM model_fields WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fields_view_bridge_trigger ON fields;
CREATE TRIGGER fields_view_bridge_trigger
INSTEAD OF INSERT OR UPDATE OR DELETE ON fields
FOR EACH ROW EXECUTE PROCEDURE fields_view_bridge();

COMMIT;
