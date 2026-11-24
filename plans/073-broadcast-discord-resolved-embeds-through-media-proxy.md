# 073 · Deliver media from resolved Discord embeds

## Entry gate

A direct embed URL already passes through `isAllowedAndFresh` in [the extractor](../bot/src/media/extractor.ts). The missing path is Discord’s proxied media when the original host is rejected. Before changing extraction or the CSP, the operator supplies nine sanitized fixtures under `bot/src/media/__fixtures__/embeds/`.

| Fixture | Expected outcome |
| --- | --- |
| `picker-gif.json`, `favorite-attachment-gif.json`, `offlist-direct-gif.json` | One GIF each |
| `x-image.json`, `x-gallery.json` | One image and four distinct images respectively |
| `x-video.json`, `fxtwitter-video.json` | One direct video each |
| `x-text.json`, `youtube.json` | No item from an avatar, page thumbnail or embedded player |

Record observed hostnames and whether the original image and video proxy links still work outside Discord more than one hour after capture. Only the redacted fixture shapes, media extensions and hostnames belong in Git. Replace live signatures, IDs and personal content with synthetic values. Preserve expiry behavior using a controlled test clock or synthetic timestamps.

Stop if evidence is missing, an observed proxy is outside `images-ext-1.discordapp.net`, `images-ext-2.discordapp.net`, `media.discordapp.net` and `cdn.discordapp.com`, the X video lacks a proxy URL, or the lifetime/playback check fails. Unexpected media fields or an extensionless video-backed GIF need a revised design.

## Implementation and acceptance

1. Add only verified exact hosts to the [bot allowlist](../bot/src/media/allowlist.ts) and the [desktop CSP](../app/src-tauri/tauri.conf.json). Test host lookalikes, HTTPS, expiry and CSP parity. Twitch viewer submissions are a separate input.
2. For each embedded asset prefer an allowed, fresh original URL, then an allowed, fresh proxy URL. Prefer a direct video with a supported extension (GIF for a `gifv` embed), then an image. Only `image` and `gifv` embed types may use a thumbnail. Leave attachments and ordinary message URLs on their existing paths.
3. In the [dispatcher](../bot/src/media/dispatcher.ts), let a cached message with zero embeds transition to one or more embeds. Preserve the partial-message guard and deduplication. A rejected content URL followed by a valid resolved embed delivers once. An already delivered item followed by its preview also delivers once.
4. Run the fixture cases through extraction and the two create/update cases through dispatch. Every delivered URL must satisfy the allowlist and freshness checks. Cover individual gallery items and retain the per-author queue cap.
5. Update the en/fr supported-sources text to reflect what the fixtures demonstrate. Keep the existing WebSocket contract and overlay renderer. Use [prepare-pr](../.agents/skills/prepare-pr/SKILL.md) for the bot and app/site minor bumps at delivery. Record actual WebView playback separately from browser or fixture results.

Player embeds, forwarded messages, AVIF, captions from embed descriptions and changes to Discord intents or cache policy are outside this plan.
