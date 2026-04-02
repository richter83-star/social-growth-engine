CREATE TABLE `oauth_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountId` int NOT NULL,
	`platform` enum('twitter','reddit','linkedin','instagram','tiktok') NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`tokenType` varchar(32) NOT NULL DEFAULT 'Bearer',
	`scope` text,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oauth_tokens_id` PRIMARY KEY(`id`)
);
