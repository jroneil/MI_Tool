Below is a **clean, complete, production-oriented document** you can give to Codex or keep as your internal engineering standard.

It is tailored for **Next.js 15/16 (App Router)** + **Python FastAPI backend** with **SSR authentication**, **Supabase auth**, **secure cookies**, and **server-side API calls**.

You can paste this directly into your repo as:

`/docs/NEXTJS_FASTAPI_SECURITY_GUIDE.md`

---

# **Next.js + FastAPI Security Architecture Guide (Server-Side Auth Calls)**

## **Overview**

This guide documents a secure, modern architecture for using **Next.js (App Router)** as the frontend and **FastAPI** as the backend API layer. It focuses on:

* Server-side authentication & token handling
* Secure communication between Next.js and FastAPI
* Using Supabase Auth on the frontend securely
* Passing tokens to FastAPI without exposing them to the browser
* Cookie security
* Backend verification & RBAC
* API proxying patterns
* Deployment considerations

This is the exact approach used in **ExceliorHire** and intended for any new project.

---

# **1. Authentication Model Overview**

### **Auth System**

* The *source of truth* for user authentication is **Supabase Auth**.
* Supabase sets two HTTP-only cookies:

  * `sb-access-token`
  * `sb-refresh-token`
* In Next.js 15/16, `cookies()` is **async** in Route Handlers, and requires special helpers.

### **Where Tokens Live**

Tokens **never** go to the browser.
Tokens stay in **HTTP-only cookies** and **server-side memory only**.

### **The backend (FastAPI)** receives:

* A **validated access token** via the `Authorization: Bearer <token>` header.
* Optional: X-User-Id header (set by Next.js) for convenience.

---

# **2. Secure Token Extraction in Next.js (SSR)**

Create a helper:

`/lib/authHeaders.ts`

```ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function authHeaders(): Promise<Headers> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return new Headers();

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${session.access_token}`);

  // Optional convenience for backend
  headers.set("X-User-Id", session.user.id);

  return headers;
}
```

### **Why this is secure**

* The browser **never sees** the token.
* Only the server returns the `Authorization` header during SSR.
* No token is stored in localStorage/sessionStorage.

---

# **3. Making Secure Server-Side Calls From Next.js**

Use server actions or route handlers to call FastAPI **with authHeaders()**.

### **Example: Server Action**

```ts
"use server";

import { authHeaders } from "@/lib/authHeaders";

export async function loadUserProfile() {
  const headers = await authHeaders();

  const res = await fetch(`${process.env.API_URL}/profile/me`, {
    method: "GET",
    headers,
    cache: "no-store", // ALWAYS
  });

  if (!res.ok) throw new Error("Failed to load profile");

  return res.json();
}
```

### **Example: Next.js Route Handler → FastAPI**

`/app/api/profile/route.ts`

```ts
import { authHeaders } from "@/lib/authHeaders";

export async function GET() {
  const headers = await authHeaders();

  const res = await fetch(`${process.env.API_URL}/profile/me`, {
    method: "GET",
    headers,
  });

  return new Response(await res.text(), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
```

Your frontend components call your *internal* route handlers, not FastAPI directly.

---

# **4. FastAPI Security Layer**

### **Verify JWT From Supabase**

Use the Supabase JWT secret (`SUPABASE_JWT_SECRET`) to validate access tokens.

`security.py`

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

bearer = HTTPBearer()

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
):
    token = creds.credentials
    
    try:
        payload = jwt.decode(
            token,
            os.getenv("SUPABASE_JWT_SECRET"),
            algorithms=["HS256"],
            audience="authenticated"
        )

        return payload

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
```

### **Use in Router**

```python
@router.get("/profile/me")
def get_profile(user = Depends(get_current_user)):
    # `user` contains Supabase claims
    return {"user_id": user["sub"], "email": user["email"]}
```

---

# **5. Role-Based Access Control (RBAC)**

Supabase includes role claims inside the JWT:

```
app_metadata: { "role": "admin" }
```

Create a decorator/helper:

```python
def require_role(role: str):
    def wrapper(user=Depends(get_current_user)):
        if user.get("role") != role:
            raise HTTPException(403, "Forbidden")
        return user
    return wrapper
```

Then:

```python
@router.get("/admin/stats")
def admin_stats(user = Depends(require_role("admin"))):
    return {"ok": True}
```

---

# **6. Secure Cookie Standards (Next.js)**

All cookies from Supabase must be:

* `HttpOnly`
* `Secure`
* `SameSite="lax"` or `strict` (for dashboard apps)
* Expiration tied to refresh token policy

Next.js automatically enforces this when using the Supabase SSR client.

---

# **7. API Proxying Pattern (Recommended)**

Instead of:

```
Client → FastAPI
```

Use:

```
Client → Next.js Route Handler → FastAPI
```

Benefits:

* Hide backend URL
* Prevent CORS issues
* Inject authentication server-side
* Logging / rate limiting inside Next.js
* Avoid token exposure

### Example

The browser calls:

```
GET /api/profile
```

Route handler:

```
/api/profile → Python/FastAPI with server-side token
```

---

# **8. Environment Variables**

### **Next.js**

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_ANON_KEY=
API_URL=https://your-fastapi-url
```

### **FastAPI**

```
SUPABASE_URL=
SUPABASE_JWT_SECRET=
DATABASE_URL=
```

Never expose:

* service keys
* supabase role key
* JWT secret
* stripe secret key

---

# **9. Deployment Considerations**

### **Requirements**

* Enable HTTPS everywhere
* Place FastAPI behind a reverse proxy:

  * nginx
  * Traefik
  * Caddy

### **Frontend**

* Vercel
* Docker + Node
* Cloudflare Pages (SSR supported)

### **Backend**

* Fly.io
* Railway
* Docker Swarm / Kubernetes
* Hostinger VPS (your current scenario)

### **Important**

When deploying to Vercel:

* You *must* use **route handlers** for any FastAPI communication
* Do not use `fetch()` directly on the client for sensitive endpoints

---

# **10. Example Folder Structure**

```
frontend/
  app/
    api/
      profile/
        route.ts
    dashboard/
      page.tsx
  lib/
    authHeaders.ts
  env

backend/
  app/
    api/
      profile.py
    security.py
    deps.py
  core/
    supabase.py
  main.py
docs/
  NEXTJS_FASTAPI_SECURITY_GUIDE.md
```

---

# **11. Common Errors & Fixes**

### **“Token undefined on server”**

Cause: Using Supabase client in a client component.

Fix: Use `createServerClient` inside **server-only code**.

---

### **“502 Bad Gateway” from FastAPI**

Cause: Missing Authorization header from Next.js.

Fix: Ensure you use:

```ts
const headers = await authHeaders();
```

---

### **“JWT signature invalid”**

Cause: Wrong secret.
Use `SUPABASE_JWT_SECRET`, **not** the anon key.

---

### **“CORS error”**

Solution:
Use **route handlers** as a proxy instead of calling FastAPI directly from the browser.

---

# **12. Summary**

This system ensures:

✔ Tokens never hit the browser
✔ All FastAPI calls are routed through secure SSR Next.js handlers
✔ JWTs are validated on the backend
✔ Role-based authorization is enforced
✔ Cookies remain secure and HttpOnly
✔ The API URL is never exposed on the client

This is the recommended architecture for any **Next.js + FastAPI + Supabase** application in production.

---

If you want, I can create:

✅ A ZIP starter repo
— Next.js 16 starter
— FastAPI starter
— Shared types
— Docker Compose
— Pre-built security files

Just say **“Generate the starter repo ZIP.”**
