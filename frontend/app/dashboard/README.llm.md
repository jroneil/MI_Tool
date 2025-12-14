# Purpose
Outline the dashboard overview page that surfaces high-level workspace metrics and descriptions.

# User Intent
Users open the dashboard to get a quick snapshot of workspace activity counts (apps, records used, invites) and guidance on managing models.

# Data Flow
- Static `cards` array defines titles, descriptions, and counts rendered on the page.
- The component is fully presentational; it does not request backend data or update state.

# Key Files
- `page.tsx`: Renders the dashboard hero section and metric cards using the static configuration.

# Constraints
- Metrics are hardcoded values; accuracy depends on manual updates elsewhere.
- No navigation actions or interactive controls are provided beyond display.

# Known Issues / Tech Debt
- Lacks real-time data fetching, so displayed counts may not reflect actual usage.
- No error or loading handling exists because the view is static.

# Change Log
- Initial README.llm.md capturing the static dashboard implementation.
