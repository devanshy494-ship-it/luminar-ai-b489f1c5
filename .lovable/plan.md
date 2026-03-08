

## Dark Mode Toggle

### Approach
The project already has `next-themes` installed, dark mode CSS variables defined in `index.css`, and `darkMode: ["class"]` in Tailwind config. Everything is ready — just need to:

1. **Create a `ThemeProvider` wrapper** using `next-themes` in `App.tsx`
2. **Create a `ThemeToggle` component** — a small Sun/Moon icon button
3. **Add the toggle to the Auth page and Dashboard page**

### Changes

**New: `src/components/ThemeToggle.tsx`**
- Small button with Sun/Moon icon from lucide-react
- Uses `useTheme()` from `next-themes` to toggle between light/dark
- Ghost variant, compact sizing

**Edit: `src/App.tsx`**
- Wrap the app with `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>` from `next-themes`

**Edit: `src/pages/Auth.tsx`**
- Add `<ThemeToggle />` in the top-right corner (absolute positioned)

**Edit: `src/pages/Dashboard.tsx`**
- Add `<ThemeToggle />` next to the logout button in the header

No CSS changes needed — dark mode variables are already defined in `index.css`.

