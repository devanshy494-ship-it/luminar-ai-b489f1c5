

## Full Design Overhaul: Futuristic AI Study Platform

This is a comprehensive visual redesign of the entire platform — new color system, typography, glassmorphism effects, neon glows, aurora backgrounds, and refined animations across all pages.

### Files to Modify

| File | Changes |
|---|---|
| `index.html` | Add Inter font import |
| `src/index.css` | Complete CSS variable overhaul: new dark-first color palette (#080B14 bg, #00D4FF cyan, #8B5CF6 purple, #10B981 success, #F59E0B warning), glassmorphism utilities, neon glow classes, aurora background animation, grid overlay, gradient text utility, shimmer animations, dot pattern overlay |
| `tailwind.config.ts` | Add Inter font family, new keyframes (aurora, glow-pulse, neon-border, float-particle), update animation config |
| `src/pages/Landing.tsx` | Aurora animated background, gradient headline text (cyan→purple), neon glow CTA buttons, glassmorphism feature cards with hover glow, particle-like decorative elements, grid overlay on hero |
| `src/pages/Auth.tsx` | Dark glassmorphism panels, cyan neon input focus states, gradient submit button, aurora background on decorative panel |
| `src/pages/Dashboard.tsx` | Glassmorphism nav + stat cards with colored top-border glows, gradient text welcome heading, neon-accent quick action cards, frosted tab list, shimmer loading skeletons (cyan on dark) |
| `src/pages/Learn.tsx` | Glass card for input area, neon cyan ring on focused input, gradient generate button, glassmorphism source panel |
| `src/pages/Roadmap.tsx` | Glass step cards with cyan left-border on active, neon progress bar, gradient topic title, glass lesson content area, frosted action buttons |
| `src/pages/Flashcards.tsx` | Glassmorphism flashcard with neon border glow on flip, gradient progress dots, dark minimal study UI |
| `src/pages/Quiz.tsx` | Neon green pulse on correct answer, red shake on wrong, glass option cards, gradient score bar, frosted result card |
| `src/components/FlashcardCreator.tsx` | Glass mode selector cards, neon active borders, gradient analyze button |
| `src/components/ThemeToggle.tsx` | Keep but style for dark-first theme |
| `src/components/ui/button.tsx` | Add `glow` variant (cyan→purple gradient + glow shadow) |

### CSS Variable System (Dark-First)

The entire `:root` and `.dark` will be replaced. The default theme IS dark (#080B14 background). Light mode will be a secondary option with appropriate mappings.

**Key new CSS custom properties:**
- `--neon-cyan: 190 100% 50%` (#00D4FF)
- `--neon-purple: 258 90% 66%` (#8B5CF6)  
- `--gradient-text: linear-gradient(135deg, #00D4FF, #8B5CF6)`
- `--glass-bg: rgba(15, 23, 42, 0.8)`
- `--glass-border: rgba(0, 212, 255, 0.1)`

**New utility classes:**
- `.glass-card` — backdrop-blur + semi-transparent dark bg + subtle cyan border
- `.neon-glow` — box-shadow with cyan glow
- `.gradient-text` — background-clip text gradient cyan→purple
- `.aurora-bg` — animated background with moving color blobs
- `.grid-overlay` — subtle technical grid/dot pattern
- `.shimmer-cyan` — cyan shimmer on dark base for loading states

### Animation Additions

- **Aurora**: Slow-moving cyan + purple + blue gradient blobs (CSS animation, 15s loop)
- **Neon pulse**: Subtle glow intensity oscillation on active elements
- **Correct answer**: Green ripple pulse outward
- **Wrong answer**: Horizontal shake (translateX oscillation)
- **Card hover**: translateY(-4px) + increased glow shadow
- **Shimmer**: Cyan gradient sweep on dark background for skeletons

### Typography Changes

- Headings: Space Grotesk (already used), weight 700-800, with gradient text applied to key headlines
- Body: Inter (new addition), 16px base, line-height 1.75
- Both fonts loaded via Google Fonts

### Layout Approach

The current centered layout works well. No sidebar is being added (the user's prompt describes sidebar but the app doesn't have one — keeping existing nav pattern). Cards get 16-20px border radius. Section padding increases to 80-100px where appropriate.

