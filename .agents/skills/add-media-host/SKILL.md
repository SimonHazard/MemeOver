---
name: add-media-host
description: Add a supported MemeOver media host consistently across bot validation, extraction and app CSP.
---

# add-media-host

1. Read [AGENTS.md](../../../AGENTS.md) and verify the real media delivery host from official provider documentation.

2. Add exact allowed hostnames in `bot/src/media/allowlist.ts`; update `img-src` and `media-src` in `app/src-tauri/tauri.conf.json`.

3. Update `bot/src/media/extractor.ts` and its tests; cover lookalike hosts, actual media forms and expiry where applicable.

4. When the requested scope includes Twitch viewer submissions, add the direct-media hostname to `TWITCH_MEDIA_HOSTS` in `app/src/shared/twitch/media-url.ts`. Exercise its URL validation and CSP parity in `media-url.test.ts`.

5. Run extraction, host-validation and app-build gates. Record CORS observations separately from physical WebView playback proof.
