

## Fix: "See How It Works" Button Scroll Gets Stuck

### Root Cause
The Landing page root `div` has `overflow-hidden` (part of the `aurora-bg` class styling). When `scrollIntoView` scrolls down to the `#features` section, the `overflow-hidden` prevents the user from scrolling back up or continuing to scroll normally.

### Solution
In `src/pages/Landing.tsx`, change `overflow-hidden` to `overflow-x-hidden` on the root div. This keeps horizontal overflow hidden (needed for aurora background effects) while allowing vertical scrolling.

### File to edit
- `src/pages/Landing.tsx` — line ~53: replace `overflow-hidden` with `overflow-x-hidden`

