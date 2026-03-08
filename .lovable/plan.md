

## Dynamic Welcome Message

### Problem
Dashboard always shows "Welcome back" even for first-time users.

### Approach
Track whether the user has logged in before by checking if they have any existing topics in the database. On first sign-in (no topics), show "Welcome, {name}". On subsequent visits, show "Welcome back, {name}".

### Changes

**`src/pages/Dashboard.tsx`**
- Add a state `isFirstVisit` (default `true`)
- In the existing data-fetching `useEffect`, check if the user has any topics. If topics exist, set `isFirstVisit = false`.
- Change heading from hardcoded `"Welcome back, {userName}"` to conditional: `isFirstVisit ? "Welcome, {userName}" : "Welcome back, {userName}"`
- Update subtitle accordingly: "Let's start your learning journey." vs "Continue your learning journey."

