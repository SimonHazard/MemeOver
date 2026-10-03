import { JOIN_ACK_ERRORS } from "@memeover/shared";

const JOIN_ERROR_KEYS: Record<string, string> = {
	[JOIN_ACK_ERRORS.unknownGuild]: "connection.joinUnknownGuild",
	[JOIN_ACK_ERRORS.invalidToken]: "connection.joinInvalidToken",
};

/** Translation key for a bot JOIN_ACK error; unknown texts fall back to the generic message. */
export function joinErrorKey(error: string | null): string {
	return (error && JOIN_ERROR_KEYS[error]) || "connection.error";
}
