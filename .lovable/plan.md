

## Plan: Admin Panel for User Management

### Database Changes

**Migration 1: Create `user_roles` table + helper function**
```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function (avoids RLS recursion)
CREATE FUNCTION public.has_role(_user_id UUID, _role app_role) RETURNS boolean ...

-- RLS: admins can read all roles, users can read their own
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
```

**Migration 2: Insert admin roles for your two Gmail accounts**
- Look up user IDs from profiles table by email (`devanshy494@gmail.com`, `sarita70.chauhan@gmail.com`)
- Insert admin role for each

### Edge Function: `admin-users/index.ts`
- **GET**: Fetch all profiles (name, email, created_at) — requires admin role (verified server-side via service role key)
- **DELETE**: Accept a `user_id`, delete all their data (roadmaps, mindmaps, flashcards, flashcard_groups, quiz_results, topics, profile) — requires admin role

### New Files
- **`src/pages/Admin.tsx`**: Protected admin page
  - Checks if current user has admin role via `user_roles` table
  - Shows "Access Denied" if not admin
  - Displays table of all users with email, name, signup date
  - Delete button per user with confirmation dialog
  - Deletes all user progress and profile

### Modified Files
- **`src/pages/Landing.tsx`**: Add "Admin" button (Shield icon) in navbar
- **`src/App.tsx`**: Add `/admin` protected route

### How It Works
1. Admin clicks "Admin" on navbar → navigates to `/admin`
2. If not signed in → redirected to `/auth`
3. Page queries `user_roles` to check if current user is admin
4. If not admin → "Access Denied" message
5. If admin → sees user table, can delete users and all their data

### Security
- Admin status checked server-side in edge function using service role key
- Client-side check is only for UI gating; actual data operations are protected by the edge function
- No hardcoded credentials in client code

