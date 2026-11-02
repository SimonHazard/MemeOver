import { expect, test } from "bun:test";
import { sourcePreviewStatus } from "./source-environment";

test("the preview pill maps socket states and keeps a revocation sticky", () => {
	expect(sourcePreviewStatus("connecting", null)).toBe("connecting");
	expect(sourcePreviewStatus("connected", null)).toBe("connected");
	expect(sourcePreviewStatus("disconnected", null)).toBe("reconnecting");
	expect(sourcePreviewStatus("error", null)).toBe("reconnecting");
	expect(sourcePreviewStatus("error", "TOKEN_ROTATED")).toBe("revoked");
	expect(sourcePreviewStatus("disconnected", "GUILD_UNREGISTERED")).toBe("revoked");
});
