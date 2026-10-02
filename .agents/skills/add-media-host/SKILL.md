---
name: add-media-host
description: Add a supported MemeOver media host consistently across bot validation, extraction and app CSP.
---

# add-media-host

1. Read [AGENTS.md](../../../AGENTS.md) and verify the real media delivery host from official provider documentation.

2. Add exact allowed hostnames in `bot/src/media/allowlist.ts`; update `img-src` and `media-src` in `app/src-tauri/tauri.conf.json`, and `connect-src` when fetched by the preloader.

3. Update `bot/src/media/extractor.ts` and its tests; cover lookalike hosts, actual media forms and expiry where applicable.

4. Run extraction, host-validation and app-build gates. Record CORS observations separately from physical WebView playback proof.
