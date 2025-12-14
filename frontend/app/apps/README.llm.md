# Purpose
Describe the model-specific live app view that renders a simple records table for a selected model by ID.

# User Intent
Users navigate to a generated app page for a model to view sample records and access actions like creating new records.

# Data Flow
- The page receives `modelId` from the route parameter and renders static `mockRecords` data.
- UI displays a header with the model identifier and a "Create record" button, but no actual API calls are performed in this folder.
- Table rows are built directly from the `mockRecords` constant, showing IDs and serialized data objects.

# Key Files
- `[modelId]/page.tsx`: Client component that reads the dynamic route parameter and renders the mock data table and call-to-action button.

# Constraints
- The view currently uses mock data only; no integration with backend APIs or state management exists here.
- The "Create record" button has no handler attached, so it is purely presentational.

# Known Issues / Tech Debt
- Lacks data fetching and persistence; records are hardcoded and not model-specific beyond displaying the route param.
- No loading or error handling paths are defined since there are no network calls.
- Accessibility and validation around the action button are minimal because no form is provided.

# Change Log
- Initial README.llm.md summarizing the mock model app page structure.
