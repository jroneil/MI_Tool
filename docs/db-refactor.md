# Dynamic Data Model Realignment

## Updated Core Schema
- **users**: `id`, `email`, `password_hash`, `name`, `created_at`
- **workspaces**: `id`, `name`, `created_at`, `created_by`
- **workspace_members**: `id`, `workspace_id`, `user_id`, `role (owner|admin|member)`
- **models**: `id`, `workspace_id`, `name`, `slug`, `description`, `created_at`, `created_by`
- **model_fields**: `id`, `model_id`, `name`, `slug`, `data_type (string|text|number|boolean|date|datetime|enum|relation)`, `is_required`, `is_unique`, `position`, `config jsonb`
- **records**: `id`, `model_id`, `workspace_id`, `data jsonb`, `created_at`, `updated_at`, `created_by`, `updated_by`

## Migration Safety
- Legacy names (`organizations`, `memberships`, `fields`) remain available as updatable views with triggers to forward writes.
- `models.organization_id` is preserved as a generated column to keep compatibility with legacy queries while `workspace_id` becomes canonical.
- New JSONB columns and enums reuse existing data by coercing and normalizing values.

## JSONB Querying
- Use `Record.data["<slug>"].astext` for filtering/sorting against dynamic fields.
- Prefer casting to the expected type in application code when applying advanced filters.

## Adding Models/Fields
- Create a `Model` scoped to a workspace, then append `ModelField` entries with ordered `position` values.
- `config` holds field-specific options (e.g., enum values) as JSON.
- Avoid schema migrations per dynamic model; records remain JSONB documents.

## Indexing Guidance
- Add expression indexes per frequently queried field, e.g.:
  ```sql
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_title ON records ((data->>'title'));
  ```
- Consider partial indexes for boolean flags or status fields to keep bloat low.

## Decommission Plan
- Once clients stop using legacy names, drop compatibility views/triggers and remove the generated `organization_id` column from `models`.
