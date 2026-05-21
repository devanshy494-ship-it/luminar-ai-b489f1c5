## Goal
Ensure only users with the `admin` role can reach the Admin panel at `/admin`. Non-admins (including signed-in regular users and guests) get redirected to the dashboard.

## Changes

**`src/App.tsx`**
- Add a new `AdminRoute` wrapper that:
  - Shows the loading spinner while auth/role is resolving.
  - Redirects to `/auth` if not signed in.
  - Redirects to `/dashboard` if signed in but `isAdmin` is false.
  - Renders children only when `isAdmin` is true.
- Wrap the `/admin` route with `AdminRoute` instead of `ProtectedRoute`.

**`src/pages/Admin.tsx`**
- Remove the now-redundant local `isAdmin` check effect and "Access denied" branch (the route guard handles it), simplifying the component to rely on `useAuth().isAdmin`.

## Why this is safe
- `isAdmin` in `AuthContext` is sourced from the `user_roles` table via the `has_role` pattern, with RLS already restricting non-admin access to admin data.
- Server-side, the `admin-users` edge function already enforces admin via service-role role check, so even if the UI were bypassed, no admin actions could be performed.

## Out of scope
- The other scan findings (SSRF, unauthenticated AI functions, signup-password abuse, HIBP). Those are separate fixes — happy to tackle next if you want.