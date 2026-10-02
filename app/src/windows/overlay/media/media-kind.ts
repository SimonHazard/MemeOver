const VIDEO_URL_PATTERN = /\.(mp4|webm|mov)(?:\?.*)?$/i;
/** Discord gifv embeds use a video transport. */
export function isVideoBackedGif(mediaType: string, url: string): boolean {
	return mediaType === "gif" && VIDEO_URL_PATTERN.test(url);
}
