

## Plan: Replace Quick Sign-In with Google OAuth + Sign-Out Confirmation

### Current State
- Auth uses anonymous-style "quick sign in" — generates random emails like `abc@luminar.local`
- No Google OAuth, no persistent identity
- Sign out button works without confirmation

### Changes

#### 1. Configure Social Auth
- Use Lovable Cloud's managed Google OAuth (no API keys needed)
- Run the Configure Social Auth tool to generate the `src/integrations/lovable` module

#### 2. Update `src/contexts/AuthContext.tsx`
- Remove `quickSignIn` method entirely
- Add `signInWithGoogle` method using `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
- Keep `signOut` as-is (confirmation will be handled in UI)

#### 3. Redesign `src/pages/Auth.tsx`
- Remove the name input form
- Replace with a single "Sign in with Google" button (with Google icon)
- Keep the decorative left panel
- On click, call `signInWithGoogle()` from context
- If user is already logged in, redirect to `/dashboard`

#### 4. Update `src/pages/Dashboard.tsx` — Sign-Out Confirmation
- Replace the inline `signOut()` call with a confirmation dialog
- Use `AlertDialog` component: "Are you sure you want to sign out?"
- Two buttons: "Cancel" and "Sign Out"
- Only sign out + navigate on confirmation
- Update `userName` to use `user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email`

#### 5. Update `src/pages/Landing.tsx`
- Update "Get Started" button text/behavior if user is already logged in (redirect to dashboard)

### Files to edit
- `src/contexts/AuthContext.tsx`
- `src/pages/Auth.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Landing.tsx` (minor)

### Data persistence
All data is already tied to `user_id` in the database with RLS. Once users sign in with Google, their `auth.users.id` stays the same across sessions, so all progress (roadmaps, mindmaps, flashcards, quizzes) persists automatically.

