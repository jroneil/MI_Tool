# Purpose
Document the model management area that lets users browse models, define new schemas, and manage records for individual models.

# User Intent
Users come here to view available models within a workspace, create new model definitions with fields, and inspect or edit records for a selected model slug.

# Data Flow
- `list.tsx` fetches models via `api.get('/models', { params: { workspace_id } })`, stores the workspace ID locally, and filters results client-side.
- `page.tsx` (model builder) collects form data for a model and fields, validates uniqueness/required presence, normalizes slugs, and submits to `api.post('/models')` with `workspace_id` and ordered fields. Success feedback is shown and workspace ID is persisted.
- `[slug]/records/page.tsx` loads model metadata from `/models/by-slug/{slug}` using `workspace_id`, then fetches paginated records from `/models/{id}/records` with sorting/filtering parameters. Record creation posts to the same model endpoint, while updates call `/records/{id}`. Workspace context is synchronized via query params and a shared store. Authentication token from `useAuth` is required for protected endpoints and triggers redirects on 401/403 responses.
- UI state handles search, sorting, filtering, pagination, record creation, and inline editing, updating local state after API operations.

# Key Files
- `list.tsx`: Client component for listing models within a workspace and navigating to records pages.
- `page.tsx`: Model builder form that validates and submits new model definitions with field metadata.
- `[slug]/records/page.tsx`: Record browser supporting filtering, pagination, creation, and editing for a specific model.

# Constraints
- Many interactions depend on a valid `workspace_id`; missing or invalid IDs block fetches or redirect to workspace selection.
- API availability for `/models`, `/models/by-slug/{slug}`, `/models/{id}/records`, and `/records/{id}` is assumed; failures yield generic error messages.
- Client-side validation enforces presence and uniqueness but does not guard against backend schema constraints beyond provided checks.
- The record editor assumes all fields can be represented via simple inputs derived from `data_type` and optional `config`.

# Known Issues / Tech Debt
- No server-side rendering; all data fetching occurs client-side with potential flicker and duplicated requests.
- Error messages are generic and do not map specific backend validation responses.
- Record creation and updates lack confirmation dialogs and granular validation, which may allow invalid data to be sent to the API.
- Pagination uses a simple `hasMore` flag without total pages; usage bar assumes a fixed `planLimit` of 500.

# Change Log
- Initial README.llm.md summarizing model listing, creation, and record management flows.
