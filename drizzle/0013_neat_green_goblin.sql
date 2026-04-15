CREATE TABLE `instagram_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountId` int NOT NULL,
	`username` varchar(128) NOT NULL,
	`encryptedPassword` text NOT NULL,
	`sessionData` text,
	`lastLoginAt` timestamp,
	`loginStatus` enum('pending','active','failed','requires_2fa') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `instagram_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `instagram_credentials_accountId_unique` UNIQUE(`accountId`)
);
