CREATE TABLE `churn_reasons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plan` enum('free','pro','agency') NOT NULL,
	`reason` enum('too_expensive','not_using','missing_features','other') NOT NULL,
	`canceledAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `churn_reasons_id` PRIMARY KEY(`id`)
);
