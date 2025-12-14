# Purpose
Explain the workspace selection and creation page that routes users to model management within a chosen workspace.

# User Intent
Users visit this page to view workspaces they belong to, switch the active workspace, or create a new workspace before proceeding to model lists.

# Data Flow
- On mount, the page calls `api.get('/workspaces/me')` to fetch memberships and renders each workspace with its role.
- Selecting a workspace stores the ID via `storeWorkspaceId` and navigates to `/models/list?ws={workspaceId}` using the Next.js router.
- Creating a workspace submits `api.post('/workspaces', { name })`, then refreshes memberships, stores the new ID, and redirects to the models list for that workspace.
- Local state tracks loading, errors, modal visibility, input values, and submission status for workspace creation.

# Key Files
- `page.tsx`: Client component handling workspace fetch, selection, and creation flows.

# Constraints
- Depends on authenticated access to `/workspaces/me` and `/workspaces`; failure surfaces generic error messages.
- Workspace context persistence relies on the shared `workspace-store` implementation outside this folder.
- No pagination or search is implemented for large workspace lists.

# Known Issues / Tech Debt
- Error handling is coarse and does not differentiate specific backend failure reasons.
- Creation form lacks validation beyond non-empty name and provides no duplicate name checks.
- Modal visibility and navigation are client-only; there is no SSR fallback or prefetching.

# Change Log
- Initial README.llm.md describing workspace selection and creation flows.
