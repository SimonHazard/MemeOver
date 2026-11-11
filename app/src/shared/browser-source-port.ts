/**
 * Default port of the local browser source. Below the dynamic range (49152+)
 * and listed as "Unassigned" in the IANA Service Name and Transport Protocol Port
 * Number Registry, checked on 2026-11-01.
 */
export const DEFAULT_BROWSER_SOURCE_PORT = 4466;
export const MIN_BROWSER_SOURCE_PORT = 1024;
export const MAX_BROWSER_SOURCE_PORT = 65535;

export function isValidBrowserSourcePort(port: unknown): port is number {
	return (
		typeof port === "number" &&
		Number.isInteger(port) &&
		port >= MIN_BROWSER_SOURCE_PORT &&
		port <= MAX_BROWSER_SOURCE_PORT
	);
}
