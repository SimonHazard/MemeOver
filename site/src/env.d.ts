/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_BOT_CLIENT_ID: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
