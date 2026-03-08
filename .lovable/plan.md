

## Plan: Fix Build Error + Add Real Resource Links to Roadmap

### 1. Fix Dashboard.tsx Build Error (lines 298-349)

The quizzes tab has broken JSX — the `motion.div` wrapper was added but the conditional rendering (`loadingQuizzes ? ... : ...`) got split incorrectly. The closing `</motion.div>` is missing, and there's a stray `)` mixed with JSX.

**Fix:** Restructure the quizzes TabsContent so the `motion.div` properly wraps the full conditional content block, with correct JSX syntax.

### 2. Enhance Roadmap Resources with Real Links

Currently, the `generate-roadmap` edge function asks for generic resource names like "Official documentation" or "Video tutorials on X" — just plain text labels with no URLs.

**Changes:**

| File | What changes |
|---|---|
| `supabase/functions/generate-roadmap/index.ts` | Update the AI prompt and tool schema to request structured resources with `name`, `url`, and `type` (website/video/docs/exercise) instead of plain strings. The prompt will instruct the AI to provide real, specific URLs (YouTube lectures, documentation pages, articles). |
| `src/pages/Roadmap.tsx` | Update the `Step` interface to support both old string resources and new structured `{ name, url, type }` resources. Render resources as clickable links with icons (external link icon for websites, play icon for videos, book icon for docs). |

**Resource schema per step:**
```text
resources: [
  { name: "MDN Web Docs - Closures", url: "https://developer.mozilla.org/...", type: "website" },
  { name: "Traversy Media - JS Crash Course", url: "https://youtube.com/...", type: "video" },
  ...
]
```

**AI prompt update:** Will explicitly instruct the model to provide real, working URLs for each resource — official documentation, specific YouTube videos/channels, well-known tutorial sites, and practice platforms. The prompt will emphasize providing actual hyperlinks, not generic descriptions.

**UI rendering:** Each resource will be a clickable chip/link that opens in a new tab, with an icon indicating the type (video, docs, website, exercise).

**Backward compatibility:** The Roadmap page will check if a resource is a string (old format) or an object (new format) and render accordingly.

