export const DISCORD_MESSAGE_CONTENT_INTENT_ERROR =
	"Discord rejected the bot gateway intents. MemeOver needs the privileged Message Content Intent to read Discord messages and send media/text to the overlay. In the Discord Developer Portal, open your application, go to Bot > Privileged Gateway Intents, enable Message Content Intent, save changes, then restart the MemeOver server.";

function errorMessage(err: unknown): string {
	if (err instanceof Error) return err.message;
	return String(err);
}

export function isDisallowedIntentsError(err: unknown): boolean {
	const message = errorMessage(err);
	return message.includes("Used disallowed intents") || message.includes("Disallowed intent");
}

export function normalizeBotLoginError(err: unknown): Error {
	if (isDisallowedIntentsError(err)) {
		const normalized = new Error(
			`${DISCORD_MESSAGE_CONTENT_INTENT_ERROR} Original Discord error: ${errorMessage(err)}`,
		);
		normalized.name = "DiscordDisallowedIntentsError";
		return normalized;
	}

	if (err instanceof Error) return err;
	return new Error(errorMessage(err));
}
