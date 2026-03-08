

## Plan: Add Mindmap Persistence and Dashboard Section

### Problem
Mindmaps are currently ephemeral — passed via `location.state` and lost on refresh/navigation. Unlike roadmaps, flashcards, and quizzes, they have no database storage or dashboard section.

### Changes

#### 1. Database: Create `mindmaps` table
```sql
CREATE TABLE public.mindmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  mindmap_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mindmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own mindmaps"
  ON public.mindmaps FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### 2. Edge Function: `generate-mindmap/index.ts`
- Add auth (extract user from JWT like `generate-roadmap` does)
- Save generated mindmap to `mindmaps` table
- Return `mindmapId` in response

#### 3. Frontend: `src/pages/Learn.tsx`
- Update `handleGenerateMindmap` to navigate with `mindmapId` instead of raw state
- Navigate to `/mindmap/:id` instead of `/mindmap`

#### 4. Frontend: `src/pages/Mindmap.tsx`
- Change route from `/mindmap` to `/mindmap/:mindmapId`
- On mount, load mindmap from DB by ID (fallback to location.state for backward compat)
- Update nav to save expanded nodes back to DB on changes

#### 5. Frontend: `src/App.tsx`
- Update route: `/mindmap/:mindmapId`

#### 6. Frontend: `src/pages/Dashboard.tsx`
- Add `mindmaps` state + fetch from DB
- Add Mindmaps tab (between Roadmaps and Flashcards) with:
  - List of saved mindmaps (title, date, delete button, click to open)
  - Same card style as roadmaps
- Add mindmap count to stats row (4 columns: Roadmaps, Mindmaps, Flashcards, Quizzes)
- Add quick action card for "New Mindmap" (4-column grid)
- Add mindmap history to History tab

### Technical Details
- The `mindmap_data` column stores the full `MindmapData` JSON (title + branches)
- RLS ensures users only see their own mindmaps
- The Mindmap page loads by ID from URL params, making it bookmarkable and refreshable
- Dashboard uses `GitBranch` icon for mindmaps (green color, matching existing theme)

