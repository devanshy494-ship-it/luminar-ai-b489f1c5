

## Plan: Two Features

### Feature 1: Enhanced Extra Materials with Roadmap Context

**What:** Pass the full roadmap generation context (topic title, all step titles/descriptions, and the `generation_context` from the topics table) to the `generate-extra-materials` edge function so the AI has rich context about what the user is studying, not just a step title.

**Changes:**

| File | What |
|---|---|
| `src/pages/Roadmap.tsx` | Pass `topicId` to `generate-extra-materials` call, plus all step titles as additional context |
| `supabase/functions/generate-extra-materials/index.ts` | Accept optional `allSteps` array and `generationContext` in request body. Include them in the AI system prompt so the AI understands the full learning path and generates more targeted, contextual resources |

The AI prompt will be enhanced to say: "The learner is studying [topic] and is currently on step [N] of [total]. Here are all steps: [...]. Here is additional context about what they're learning: [generation_context]. Provide resources specifically relevant to this step within this broader learning journey."

### Feature 2: Merge & Rename Flashcard Groups

**What:** Add ability to (a) rename individual flashcard groups (sets), and (b) merge multiple flashcard groups into one with a custom name.

**Changes:**

| File | What |
|---|---|
| `src/pages/Dashboard.tsx` | Add rename button (pencil icon) on each flashcard group card — opens inline edit or small dialog to update the display name. Add multi-select mode with checkboxes on flashcard groups + "Merge Selected" button that combines selected groups. |
| `src/pages/Flashcards.tsx` | Add rename button for the current flashcard set title (editable inline). |
| Database migration | Add `display_name` column (nullable text) to `flashcards` table — used as group label override. OR better: create a `flashcard_groups` table with `id`, `user_id`, `name`, `topic_id`, `created_at` and add `group_id` (nullable FK) to `flashcards`. This allows proper grouping and renaming. |

**Recommended approach — `flashcard_groups` table:**

```text
flashcard_groups
├── id (uuid, PK)
├── user_id (uuid, NOT NULL)
├── name (text, NOT NULL)
├── topic_id (uuid, NOT NULL)
├── created_at (timestamptz)

flashcards (add column)
├── group_id (uuid, nullable, FK → flashcard_groups.id)
```

- **Rename:** Update `flashcard_groups.name`
- **Merge:** Move all flashcards from selected groups into one group, delete the empty groups, set the merged group's name
- Auto-create groups when flashcards are generated (in the edge function or on the frontend after generation)
- Dashboard shows `flashcard_groups` instead of computing groups from raw flashcard data
- RLS: Users can only CRUD their own groups

**UI for merge:**
- Toggle "Select" mode on flashcards tab → checkboxes appear on each group card
- Select 2+ groups → "Merge" button appears → dialog asks for merged group name → combines all flashcards under one group

**UI for rename:**
- Pencil icon on each group card → inline edit or small dialog → saves to `flashcard_groups.name`

