

# Fix Blank Preview — Supabase Client Crash

## Problem
`src/lib/supabase.ts` throws `"Missing Supabase environment variables"` at startup, crashing the entire app and producing a blank screen. The `AuthContext.tsx` imports from this file.

## Root Cause
The project has **two** Supabase clients:
1. `src/integrations/supabase/client.ts` — auto-generated, always works
2. `src/lib/supabase.ts` — manual duplicate with a hard `throw` if env vars are missing

## Fix
**Update `src/lib/supabase.ts`** to simply re-export the auto-generated client:

```typescript
export { supabase } from '@/integrations/supabase/client';
```

This is a single-line change. All files importing from `@/lib/supabase` (like `AuthContext.tsx`) will continue to work without modification.

## What is NOT touched
- `src/integrations/supabase/client.ts` — untouched (auto-generated)
- `src/contexts/AuthContext.tsx` — untouched
- `src/integrations/lovable/` — untouched
- All edge functions — untouched

