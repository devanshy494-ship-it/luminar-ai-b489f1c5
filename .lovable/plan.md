

## Plan: Redirect Admin Users to Admin Panel After Sign-In

### What changes
When an admin (`devanshy494@gmail.com` or `sarita70.chauhan@gmail.com`) signs in, they should land on `/admin` instead of `/dashboard`.

### Implementation

#### 1. `src/pages/Auth.tsx`
- After detecting `user` is set, check the `user_roles` table for admin role
- If admin → redirect to `/admin`
- If regular user → redirect to `/dashboard`

#### 2. `src/contexts/AuthContext.tsx`
- Add `isAdmin` state and expose it in the context
- After auth state changes and user is set, query `user_roles` for admin role
- This makes `isAdmin` available app-wide for other components too

### Files to edit
- `src/contexts/AuthContext.tsx` — add `isAdmin` boolean to context
- `src/pages/Auth.tsx` — use `isAdmin` to choose redirect target

