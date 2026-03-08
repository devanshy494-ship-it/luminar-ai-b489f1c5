

## Fix: Admin User Delete Failing

### Root Cause
The `supabase.functions.invoke()` client sends requests as **POST** regardless of the `method` option. The edge function checks `req.method === "DELETE"` which never matches, so it falls through to "Method not allowed" (405), which the client reports as a fetch failure.

### Solution
Change the edge function to use **POST** for all operations, distinguishing actions via the request body (e.g., `{ action: "delete", user_id: "..." }`).

Also replace `getClaims()` (which may not exist) with `getUser()` for extracting the caller's identity.

### Changes

#### 1. `supabase/functions/admin-users/index.ts`
- Change the DELETE branch to check for `req.method === "POST"` and look for `action: "delete"` in the body
- Keep GET as-is for listing users
- Replace `getClaims` with `getUser` to get the caller's user ID

#### 2. `src/pages/Admin.tsx`
- Change the delete call from `method: 'DELETE'` to standard POST with `body: { action: 'delete', user_id: ... }`

### Files to edit
- `supabase/functions/admin-users/index.ts`
- `src/pages/Admin.tsx`

