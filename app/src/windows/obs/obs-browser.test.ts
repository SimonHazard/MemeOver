import { expect, test } from "bun:test";
import { obsPreviewStatus } from "./obs-browser";

test("the preview pill maps socket states and keeps a revocation sticky", () => {
	expect(obsPreviewStatus("connecting", null)).toBe("connecting");
	expect(obsPreviewStatus("connected", null)).toBe("connected");
	expect(obsPreviewStatus("disconnected", null)).toBe("reconnecting");
	expect(obsPreviewStatus("error", null)).toBe("reconnecting");
	expect(obsPreviewStatus("error", "TOKEN_ROTATED")).toBe("revoked");
	expect(obsPreviewStatus("disconnected", "GUILD_UNREGISTERED")).toBe("revoked");
});
