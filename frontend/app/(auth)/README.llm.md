# Purpose
Summarize the authentication pages that provide login and registration forms for the ExceliorHire frontend.

# User Intent
Users access this area to register a new account or log in, receive a JWT token, and proceed to workspace-specific features.

# Data Flow
- Forms collect email and password in client components (`page.tsx` under `login` and `register`).
- `api` client posts credentials to `/auth/token` for login and `/auth/register` for account creation, expecting responses containing `access_token` or created user data.
- Successful authentication stores the token through `useAuth().setToken` and redirects users to `/workspaces` using the Next.js router.
- Error messages are derived from Axios error responses (`detail` field) or fallback strings and displayed inline.

# Key Files
- `login/page.tsx`: Handles credential submission, token retrieval, and redirect after login.
- `register/page.tsx`: Creates a user via `/auth/register`, then immediately requests a token to establish a session.

# Constraints
- Assumes backend endpoints `/auth/token` and `/auth/register` are available and return the expected shapes.
- Token persistence depends on `useAuth` context implementation outside this folder.
- Client components rely on browser-side routing and state hooks; no server-rendered fallback is provided.

# Known Issues / Tech Debt
- No field-level validation beyond required presence; password/email formatting is not enforced client-side.
- Error handling depends on `detail` in the Axios response and may show generic messages for other error shapes.
- Redirect destinations are fixed to `/workspaces`; preserving originating route requires manual `next` query support outside this folder.

# Change Log
- Initial README.llm.md documenting the authentication feature folder based on existing implementation.
