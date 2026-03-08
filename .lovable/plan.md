

## Fix: Page Gets Stuck When Scrolling to Bottom on Landing Page

### Root Cause
The `.aurora-bg::before` pseudo-element uses `inset: -50%`, which creates a massive invisible element extending far beyond the page boundaries. Combined with `overflow-x: hidden`, this can cause scroll position to get stuck at the bottom because the browser calculates content height incorrectly.

There is **no sidebar** on the Landing page — the sidebar component exists in the project but is not used on the `/` route.

### Solution
Constrain the aurora pseudo-element so it doesn't extend beyond the container:

**`src/index.css`** (~line 180-191):
- Change `inset: -50%` to `inset: 0` on `.aurora-bg::before`
- Add `width: 100%; height: 100%` to keep it contained
- Increase the gradient sizes slightly to compensate for the smaller area

This keeps the visual aurora effect while preventing scroll issues caused by the oversized pseudo-element.

