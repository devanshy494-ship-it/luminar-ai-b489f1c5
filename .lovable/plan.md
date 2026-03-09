

## Why This Happens

The Admin page checks `authLoading || isAdmin === null` to show a loading spinner. For guest users, `user` is `null` (guests don't have a Supabase auth user), so the admin-check `useEffect` exits early without ever setting `isAdmin`. It stays `null` forever, keeping the spinner spinning indefinitely.

## Fix

In `src/pages/Admin.tsx`, update the `useEffect` that checks admin status (line 64-76) to handle the case where there's no authenticated user — set `isAdmin = false` instead of returning early. Also update the loading condition to account for guest users.

Specifically:
1. Import `guestUser` from `useAuth()`
2. In the admin-check `useEffect`: if `!user`, set `isAdmin(false)` and return (instead of just returning)
3. Update the loading guard (line 222) to: `if (authLoading) return spinner` — once auth is loaded, if `isAdmin === null` and there's no `user`, show Access Denied immediately

This is a ~5 line change in one file.

