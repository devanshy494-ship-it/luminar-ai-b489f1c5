

## Add Smooth Scroll Animation to Landing Page Anchor Links

The landing page already has `scroll-behavior: smooth` set on the `html` element in `src/index.css`, and the "See How It Works" button uses `scrollIntoView({ behavior: 'smooth' })`. This should already work smoothly.

### Change

**`src/pages/Landing.tsx`** — No additional anchor links exist beyond the "See How It Works" button, which already uses smooth scrolling. To ensure maximum compatibility and a polished feel, we'll:

1. Keep the existing `scrollIntoView({ behavior: 'smooth' })` on the "See How It Works" button
2. Add `scroll-margin-top` to the `#features` section so it doesn't scroll behind the fixed navbar (add a class like `scroll-mt-20`)

### File to edit
- `src/pages/Landing.tsx` — Add `scroll-mt-20` to the `<section id="features">` element (~line 123)

