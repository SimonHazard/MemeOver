import { store } from "./store";

export interface StatsSnapshot {
	connections: { total: number; active: number };
	joins: { success: number; rejected: number };
	messages: { broadcast: number };
	errors: {
		rateLimit: number;
		parseError: number;
		validationError: number;
		heartbeatTimeout: number;
	};
	guilds: { active: number };
	uptime: number;
	startedAt: string;
}

class Stats {
	private readonly startedAt = new Date().toISOString();

	private connectionsTotal = 0;
	private connectionsActive = 0;
	private joinsSuccess = 0;
	private joinsRejected = 0;
	private messagesBroadcast = 0;
	private errorsRateLimit = 0;
	private errorsParseError = 0;
	private errorsValidationError = 0;
	private errorsHeartbeatTimeout = 0;

	connectionOpened(): void {
		this.connectionsTotal++;
		this.connectionsActive++;
	}

	connectionClosed(): void {
		if (this.connectionsActive > 0) this.connectionsActive--;
	}

	joinSuccess(): void {
		this.joinsSuccess++;
	}

	joinRejected(): void {
		this.joinsRejected++;
	}

	messageBroadcast(): void {
		this.messagesBroadcast++;
	}

	errorRateLimit(): void {
		this.errorsRateLimit++;
	}

	errorParse(): void {
		this.errorsParseError++;
	}

	errorValidation(): void {
		this.errorsValidationError++;
	}

	errorHeartbeatTimeout(): void {
		this.errorsHeartbeatTimeout++;
	}

	snapshot(): StatsSnapshot {
		return {
			connections: { total: this.connectionsTotal, active: this.connectionsActive },
			joins: { success: this.joinsSuccess, rejected: this.joinsRejected },
			messages: { broadcast: this.messagesBroadcast },
			errors: {
				rateLimit: this.errorsRateLimit,
				parseError: this.errorsParseError,
				validationError: this.errorsValidationError,
				heartbeatTimeout: this.errorsHeartbeatTimeout,
			},
			guilds: { active: store.getGuildCount() },
			uptime: process.uptime(),
			startedAt: this.startedAt,
		};
	}
}

export const stats = new Stats();
