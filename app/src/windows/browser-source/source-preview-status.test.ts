import { expect, test } from "bun:test";
import { sourcePreviewStatus } from "./source-preview-status";

test("the preview pill maps socket states and keeps a revocation or rejection sticky", () => {
	expect(sourcePreviewStatus("connecting", null, false)).toBe("connecting");
	expect(sourcePreviewStatus("connected", null, false)).toBe("connected");
	expect(sourcePreviewStatus("disconnected", null, false)).toBe("reconnecting");
	expect(sourcePreviewStatus("error", null, false)).toBe("reconnecting");
	expect(sourcePreviewStatus("error", null, true)).toBe("rejected");
	expect(sourcePreviewStatus("error", "TOKEN_ROTATED", false)).toBe("revoked");
	expect(sourcePreviewStatus("disconnected", "GUILD_UNREGISTERED", false)).toBe("revoked");
});
