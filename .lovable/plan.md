# Preview not showing — recovery plan

## Diagnosis

- Vite dev server is healthy: responds `200` on `http://localhost:8080/` and serves `index.html` normally.
- No runtime errors and no browser console logs were captured from the preview.
- Session replay shows the page started painting but no further activity — consistent with a wedged preview iframe, not a code error.
- No recent source changes appear to have broken the build.

## Proposed steps

1. **Restart the Vite dev server** in the sandbox to clear any stuck HMR/iframe state.
2. **Hard-reload the preview** on your side (Cmd/Ctrl+Shift+R) so the iframe re-establishes its connection.
3. If the preview is still blank after that, **open the browser devtools console** on the preview and share any red errors — I'll investigate from there.
4. As a fallback, verify on the **published URL** (`https://luminar-ai.lovable.app`) to confirm the app itself is fine and the issue is preview-only.
5. Problem is in published URL too

## Out of scope

- No code changes. Nothing in the repo currently indicates a bug; jumping into edits would risk breaking working code.

Approve and I'll restart the dev server.