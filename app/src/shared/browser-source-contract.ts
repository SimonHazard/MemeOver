// What the page and the native server must agree on. A test in `src-tauri/src/browser_source.rs`
// checks the native copies; `vite.config.ts` imports the session header for the dev server.

export const BROWSER_SOURCE_PATH = "/browser-source.html";
/** Public identifier of the serving app instance, sent by the local server with every asset. */
export const BROWSER_SOURCE_SESSION_HEADER = "X-MemeOver-Source-Session";
/** Live skip, clear and moderation state, read by the page on each liveness check. */
export const BROWSER_SOURCE_CONTROLS_HEADER = "X-MemeOver-Source-Controls";
/** A liveness check's query starts with this, unlike the app's own probe and page loads. */
export const BROWSER_SOURCE_HEARTBEAT_PREFIX = "source=";
