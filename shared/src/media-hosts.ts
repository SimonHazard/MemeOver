export const MEDIA_CDN_HOSTS: ReadonlySet<string> = new Set([
	"i.imgur.com",
	// Tenor (Google) — media1 subdomain also active
	"media.tenor.com",
	"media1.tenor.com",
	"c.tenor.com",
	// Giphy (Shutterstock) — numbered subdomains media0–media4 for load balancing
	"media.giphy.com",
	"media0.giphy.com",
	"media1.giphy.com",
	"media2.giphy.com",
	"media3.giphy.com",
	"media4.giphy.com",
	"i.giphy.com",
	// KLIPY — current GIF delivery domains
	"static.klipy.com",
	"static1.klipy.com",
	"static2.klipy.com",
]);
