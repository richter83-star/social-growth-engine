CREATE TABLE `sync_job_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobType` varchar(64) NOT NULL DEFAULT 'daily_account_sync',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`totalAccounts` int NOT NULL DEFAULT 0,
	`succeeded` int NOT NULL DEFAULT 0,
	`failed` int NOT NULL DEFAULT 0,
	`skipped` int NOT NULL DEFAULT 0,
	`durationMs` int,
	`summary` json,
	`error` text,
	CONSTRAINT `sync_job_logs_id` PRIMARY KEY(`id`)
);
