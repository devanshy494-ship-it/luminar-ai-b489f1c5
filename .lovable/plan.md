

## Plan: Three Flashcard Improvements

### 1. Add CSV Export Option
**File: `src/pages/Flashcards.tsx`** (lines 319-335)
- Add a CSV export button next to the existing "Export to Anki" button
- CSV format: `Front,Back` header row, values properly escaped (wrap in quotes if they contain commas/quotes)
- Downloads as `{topicTitle}-flashcards.csv`

### 2. Fix "Create More" on Done Screen
**File: `src/components/FlashcardCreator.tsx`** (lines 460-487)
- Add new states: `addMoreCount` (default 10), `showAddMore` (boolean)
- Replace the current "Create More" button with an "Add More Cards" button that shows a +/- stepper picker inline
- When confirmed, call `supabase.functions.invoke('generate-flashcards', { body: { topicId: result.topicId, cardCount: addMoreCount } })`
- On success, update `result.cardsGenerated` and show a toast, staying on the done screen
- Keep a separate "Start New" button that resets everything (current behavior)

### 3. Replace Preset Chips with +/- Stepper on Flashcards Page
**File: `src/pages/Flashcards.tsx`** (lines 296-311)
- Replace the preset buttons (5, 10, 15, 20, 30) with a stepper: `[−]` button, editable `<Input type="number">` in the center, `[+]` button
- +/− buttons change count by 5, min 1, max 50
- User can also type a number directly into the input
- Keep the "Generate" button below

### Files to Edit
1. `src/pages/Flashcards.tsx` — CSV export + stepper UI
2. `src/components/FlashcardCreator.tsx` — "Add More Cards" flow with stepper on done screen

