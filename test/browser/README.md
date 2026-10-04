# Browser regression tests

Use Bun 1.4.2+, Google Chrome and Playwright's WebKit browser:

```sh
bun install --frozen-lockfile
bunx playwright install webkit
bun run typecheck:browser
bun run test:browser
```

The suite starts its own Vite server on port 1429 and runs on Chrome and WebKit.
Google Chrome must be installed for the `chrome` project. To run one engine:

```sh
bun run test:browser --project=webkit
```

Coverage includes every overlay slider, keyboard and pointer input, bounds,
save/reload, switches, selection menus, text and media toggles, color controls,
accordion panels, tab activation, dialog focus/escape, button hover/reduced motion, disabled controls,
tooltips, scrolling, progress width, avatar fallback, toasts, hold confirmation,
profiles (create/replace/apply/import/export/delete), history (replay/mute/unmute/
clear), connection validation, language/theme, reduced motion and a small window.
First configuration (back/next/finish), screen selection and the About dialog/update check
are also covered. Failure cases include invalid profile files and failed persistence.
Overlay rendering tests also check centered author badges, a single badge background,
text/media with the configurable background on/off, long names and anonymous media.

`app/test/browser/settings.ts` mounts the actual settings application with Tauri's
official IPC/event mocks. Stores live only in the browser context's localStorage;
tests never read or write native settings, launch servers, or contact Discord.
`components.tsx` mounts the shared components in isolation for cases not exposed
by the application (range sliders, disabled options, tabs, progress).
The test pages are not production build entrypoints.

These tests verify the React interface in both engines. Native window actions,
autostart, updater installation, live Discord and operating-system dialogs still
require testing inside the packaged Tauri application.

On failure, `test-results/` contains Playwright's trace and error context. Both
`test-results/` and `playwright-report/` are ignored by Git.
