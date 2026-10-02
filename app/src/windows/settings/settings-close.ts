// A cancelable request lets the active form intercept native window closure.
export const settingsCloseRequests = new EventTarget();

export async function requestSettingsClose(hide: () => Promise<void>) {
	if (settingsCloseRequests.dispatchEvent(new Event("close", { cancelable: true }))) {
		await hide();
	}
}
